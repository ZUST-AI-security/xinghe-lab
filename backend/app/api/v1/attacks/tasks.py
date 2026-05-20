"""
Shared task status, history, and cancellation endpoints for attack jobs.
"""

from datetime import datetime
import logging
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_active_user
from app.models.attack_history import AttackHistory
from app.models.task_record import TaskRecord
from app.models.user import User
from app.workers.celery_app import celery_app
from app.core.exceptions import safe_error_detail

router = APIRouter(prefix="/tasks", tags=["Attack Tasks"])
logger = logging.getLogger(__name__)


def _verify_task_ownership(task_id: str, current_user: User, db: Session) -> None:
    """Verify the current user owns the task. Raises 403 if not."""
    from celery.result import AsyncResult

    task = AsyncResult(task_id, app=celery_app)
    state = (task.state or "PENDING").upper()

    # PENDING tasks: Celery returns PENDING for unknown IDs too.
    # Ownership can't be determined from Celery alone, so allow through
    # (the task either doesn't exist or is genuinely pending).
    if state == "PENDING":
        return

    # For all other states (STARTED, SUCCESS, FAILURE, REVOKED, etc.),
    # check user_id from the task result metadata.
    try:
        info = task.info if isinstance(task.info, dict) else {}
        # Celery tasks store user_id in result metadata
        task_user_id = (
            info.get("metadata", {}).get("user_id")
            or info.get("user_id")
        )
        if task_user_id is not None and int(task_user_id) != current_user.id:
            raise HTTPException(status_code=403, detail="无权操作此任务")
    except HTTPException:
        raise
    except Exception:
        # If we can't determine ownership (e.g. unpickling error), deny access
        raise HTTPException(status_code=403, detail="无法验证任务所有权")


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
    db: Session = Depends(get_db),
):
    """Get attack task history for the current user."""
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


@router.get("/stats")
async def get_task_stats(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Get aggregated attack history statistics for the current user."""
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


@router.get("/{task_id}", response_model=TaskStatusResponse)
async def get_task_status(
    task_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Poll the status and result of a submitted attack task."""
    _verify_task_ownership(task_id, current_user, db)
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
        raise HTTPException(status_code=500, detail=safe_error_detail(str(exc), "获取任务状态失败"))


@router.delete("/{task_id}")
async def cancel_task(
    task_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Cancel a pending or running attack task."""
    _verify_task_ownership(task_id, current_user, db)
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
        raise HTTPException(status_code=500, detail=safe_error_detail(str(exc), "取消任务失败"))


@router.post("/{task_id}/pause")
async def pause_task(
    task_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Pause a running attack task."""
    _verify_task_ownership(task_id, current_user, db)
    try:
        import redis
        from app.core.config import settings

        r = redis.from_url(settings.redis_url)
        r.set(f"pause:{task_id}", "1", ex=3600)  # 1 hour expiry
        logger.info(f"Task {task_id} paused by user {current_user.id}")
        return {"message": "Task paused", "task_id": task_id}
    except Exception as exc:
        logger.error("Pause task failed for %s: %s", task_id, exc, exc_info=True)
        raise HTTPException(status_code=500, detail=safe_error_detail(str(exc), "暂停任务失败"))


@router.post("/{task_id}/resume")
async def resume_task(
    task_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Resume a paused attack task."""
    _verify_task_ownership(task_id, current_user, db)
    try:
        import redis
        from app.core.config import settings

        r = redis.from_url(settings.redis_url)
        r.delete(f"pause:{task_id}")
        logger.info(f"Task {task_id} resumed by user {current_user.id}")
        return {"message": "Task resumed", "task_id": task_id}
    except Exception as exc:
        logger.error("Resume task failed for %s: %s", task_id, exc, exc_info=True)
        raise HTTPException(status_code=500, detail=safe_error_detail(str(exc), "恢复任务失败"))
