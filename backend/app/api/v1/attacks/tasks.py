"""
Shared task status / cancellation endpoints for all attack algorithms.

All attack algorithms submit Celery tasks and share the same polling interface.
"""

import logging
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Any, Optional

from app.core.security import get_current_active_user
from app.models.user import User
from app.workers.celery_app import celery_app

router = APIRouter(prefix="/tasks", tags=["Attack Tasks"])
logger = logging.getLogger(__name__)


class TaskStatusResponse(BaseModel):
    task_id: str
    status: str           # pending | running | completed | failed
    progress: Optional[float] = None
    result: Optional[Any] = None
    error: Optional[str] = None
    completed_at: Optional[str] = None


@router.get("/{task_id}", response_model=TaskStatusResponse)
async def get_task_status(
    task_id: str,
    current_user: User = Depends(get_current_active_user),
):
    """Poll the status and result of a submitted attack task."""
    try:
        from celery.result import AsyncResult

        task = AsyncResult(task_id, app=celery_app)

        if task.ready():
            if task.successful():
                return TaskStatusResponse(
                    task_id=task_id,
                    status="completed",
                    result=task.get(),
                    completed_at=str(task.date_done),
                )
            return TaskStatusResponse(
                task_id=task_id,
                status="failed",
                error=str(task.info) if task.info else "Task failed",
                completed_at=str(task.date_done),
            )

        progress = task.info.get("progress") if isinstance(task.info, dict) else None
        return TaskStatusResponse(task_id=task_id, status="pending", progress=progress)

    except Exception as e:
        logger.error(f"Get task status failed for {task_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


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
    except Exception as e:
        logger.error(f"Cancel task failed for {task_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
