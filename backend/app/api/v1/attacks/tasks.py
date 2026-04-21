"""
Shared task status, history, and cancellation endpoints for attack jobs.
"""

from datetime import datetime
import logging
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from app.core.database import SessionLocal
from app.core.security import get_current_active_user
from app.models.attack_history import AttackHistory
from app.models.task_record import TaskRecord
from app.models.user import User
from app.workers.celery_app import celery_app

router = APIRouter(prefix="/tasks", tags=["Attack Tasks"])
logger = logging.getLogger(__name__)


class TaskStatusResponse(BaseModel):
    task_id: str
    status: str
    progress: Optional[float] = None
    message: Optional[str] = None
    result: Optional[Any] = None
    error: Optional[str] = None
    completed_at: Optional[str] = None


class TaskHistoryItem(BaseModel):
    id: int
    task_id: Optional[str] = None
    algorithm_name: str
    model_name: Optional[str] = None
    status: str
    success: Optional[bool] = None
    success_rate: Optional[float] = None
    execution_time: Optional[float] = None
    created_at: Optional[str] = None
    completed_at: Optional[str] = None
    result: Optional[Any] = None
    error: Optional[str] = None


class TaskHistoryResponse(BaseModel):
    items: list[TaskHistoryItem]
    total: int
    page: int
    size: int
    pages: int


def _to_iso(value: Optional[datetime]) -> Optional[str]:
    return value.isoformat() if value else None


@router.get("/history", response_model=TaskHistoryResponse)
async def get_task_history(
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    algorithm: str = Query("", description="Filter by algorithm name"),
    status: str = Query("", description="Filter by task status"),
    current_user: User = Depends(get_current_active_user),
):
    """Get attack task history for the current user."""
    db = SessionLocal()
    try:
        query = db.query(TaskRecord).filter(TaskRecord.user_id == current_user.id)
        if algorithm:
            query = query.filter(TaskRecord.algorithm_name == algorithm)
        if status == "completed":
            query = query.filter(TaskRecord.status.in_(("completed", "success")))
        elif status:
            query = query.filter(TaskRecord.status == status)

        total = query.count()
        pages = (total + size - 1) // size if total else 0
        records = (
            query.order_by(TaskRecord.created_at.desc(), TaskRecord.id.desc())
            .offset((page - 1) * size)
            .limit(size)
            .all()
        )

        items: list[TaskHistoryItem] = []
        for record in records:
            result = record.result if isinstance(record.result, dict) else None
            metadata = result.get("metadata", {}) if result else {}
            items.append(
                TaskHistoryItem(
                    id=record.id,
                    task_id=result.get("task_id") if result else None,
                    algorithm_name=record.algorithm_name,
                    model_name=metadata.get("model_name"),
                    status=record.status,
                    success=result.get("success") if result else None,
                    success_rate=metadata.get("success_rate"),
                    execution_time=result.get("time_elapsed") if result else None,
                    created_at=_to_iso(record.created_at),
                    completed_at=_to_iso(record.completed_at),
                    result=result,
                    error=(result or {}).get("error"),
                )
            )

        return TaskHistoryResponse(
            items=items,
            total=total,
            page=page,
            size=size,
            pages=pages,
        )
    finally:
        db.close()


@router.get("/stats")
async def get_task_stats(current_user: User = Depends(get_current_active_user)):
    """Get aggregated attack history statistics for the current user."""
    db = SessionLocal()
    try:
        history_query = db.query(AttackHistory).filter(AttackHistory.user_id == current_user.id)
        total_attacks = history_query.count()
        successful_attacks = history_query.filter(AttackHistory.success.is_(True)).count()
        avg_time = history_query.with_entities(AttackHistory.execution_time).all()
        latest = history_query.order_by(AttackHistory.created_at.desc()).first()

        algorithm_rows = (
            history_query.with_entities(
                AttackHistory.algorithm,
                AttackHistory.success,
            )
            .all()
        )
        by_algorithm: dict[str, dict[str, int]] = {}
        for algorithm_name, success in algorithm_rows:
            item = by_algorithm.setdefault(algorithm_name, {"total": 0, "successful": 0})
            item["total"] += 1
            if success:
                item["successful"] += 1

        execution_times = [row[0] for row in avg_time if row[0] is not None]
        return {
            "total_attacks": total_attacks,
            "successful_attacks": successful_attacks,
            "failed_attacks": total_attacks - successful_attacks,
            "success_rate": successful_attacks / total_attacks if total_attacks else 0,
            "avg_time_elapsed": sum(execution_times) / len(execution_times) if execution_times else 0,
            "last_attack_time": _to_iso(latest.created_at if latest else None),
            "by_algorithm": by_algorithm,
        }
    finally:
        db.close()


@router.get("/{task_id}", response_model=TaskStatusResponse)
async def get_task_status(
    task_id: str,
    current_user: User = Depends(get_current_active_user),
):
    """Poll the status and result of a submitted attack task."""
    try:
        from celery.result import AsyncResult

        task = AsyncResult(task_id, app=celery_app)
        state = (task.state or "PENDING").upper()
        info = task.info if isinstance(task.info, dict) else {}
        progress = info.get("progress")
        message = info.get("status")

        if state == "SUCCESS":
            return TaskStatusResponse(
                task_id=task_id,
                status="completed",
                result=task.get(),
                progress=100,
                message="Completed",
                completed_at=str(task.date_done),
            )

        if state in {"FAILURE", "REVOKED"}:
            return TaskStatusResponse(
                task_id=task_id,
                status="failed",
                progress=progress,
                message=message,
                error=str(task.info) if task.info else "Task failed",
                completed_at=str(task.date_done),
            )

        if state in {"STARTED", "RECEIVED", "RETRY", "PROGRESS"}:
            return TaskStatusResponse(
                task_id=task_id,
                status="running",
                progress=progress,
                message=message,
            )

        return TaskStatusResponse(
            task_id=task_id,
            status="pending",
            progress=progress,
            message=message,
        )
    except Exception as exc:
        logger.error("Get task status failed for %s: %s", task_id, exc, exc_info=True)
        raise HTTPException(status_code=500, detail=str(exc))


@router.delete("/{task_id}")
async def cancel_task(
    task_id: str,
    current_user: User = Depends(get_current_active_user),
):
    """Cancel a pending or running attack task."""
    try:
        from celery.result import AsyncResult

        task = AsyncResult(task_id, app=celery_app)
        if task.ready():
            raise HTTPException(status_code=400, detail="Task already completed")
        task.revoke(terminate=True)
        return {"message": "Task cancelled", "task_id": task_id}
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Cancel task failed for %s: %s", task_id, exc, exc_info=True)
        raise HTTPException(status_code=500, detail=str(exc))
