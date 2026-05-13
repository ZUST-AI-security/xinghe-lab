"""
鲁棒性评估 API (Robustness Evaluation API)

Endpoints:
  POST /api/v1/robustness/evaluate  — Submit a robustness evaluation task (auth required)
  GET  /api/v1/robustness/result/{task_id} — Poll task result (auth required)

关联需求：Requirement 7
"""

import logging
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from celery.result import AsyncResult

from app.core.security import get_current_active_user
from app.models.user import User
from app.workers.celery_app import celery_app

router = APIRouter(prefix="/robustness", tags=["鲁棒性评估"])
logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Request / Response schemas
# ---------------------------------------------------------------------------

class RobustnessEvaluateRequest(BaseModel):
    image: str = Field(..., description="Base64-encoded input image")
    algorithms: List[str] = Field(
        ...,
        min_length=1,
        description="List of attack algorithm names to evaluate (e.g. ['fgsm', 'pgd'])",
    )
    model_name: str = Field(
        default="resnet100_imagenet",
        description="Registered model ID to use for evaluation",
    )


class RobustnessEvaluateResponse(BaseModel):
    task_id: str
    status: str = "pending"


class RobustnessResultResponse(BaseModel):
    status: str  # "pending" | "running" | "completed" | "failed"
    matrix: Optional[Dict[str, Dict[str, float]]] = None
    algorithms: Optional[List[str]] = None
    defenses: Optional[List[str]] = None
    time_elapsed: Optional[float] = None
    error: Optional[str] = None


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/evaluate", response_model=RobustnessEvaluateResponse)
async def submit_robustness_evaluation(
    request: RobustnessEvaluateRequest,
    current_user: User = Depends(get_current_active_user),
):
    """
    Submit a robustness evaluation task.

    Generates adversarial examples for each specified algorithm and evaluates
    attack success rates after applying three defense transforms:
    - Gaussian Blur
    - JPEG Compression
    - Bit-Depth Reduction

    Returns a task_id for polling the result.
    The task has a 120-second soft time limit.
    """
    try:
        from app.workers.robustness_task import run_robustness_evaluation

        # Validate algorithms list
        if not request.algorithms:
            raise HTTPException(status_code=422, detail="至少需要选择一种攻击算法")

        task = run_robustness_evaluation.apply_async(
            kwargs=dict(
                image_b64=request.image,
                algorithms=request.algorithms,
                model_id=request.model_name,
                user_id=current_user.id,
            ),
            queue="low",  # Robustness evaluation is compute-intensive → low priority queue
        )

        logger.info(
            "Robustness evaluation task submitted (task_id=%s, user=%s, algorithms=%s)",
            task.id,
            current_user.id,
            request.algorithms,
        )
        return RobustnessEvaluateResponse(task_id=task.id, status="pending")

    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Failed to submit robustness evaluation: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail=f"任务提交失败: {exc}")


@router.get("/result/{task_id}", response_model=RobustnessResultResponse)
async def get_robustness_result(
    task_id: str,
    current_user: User = Depends(get_current_active_user),
):
    """
    Poll the status and result of a robustness evaluation task.

    Returns:
      - status: "pending" | "running" | "completed" | "failed"
      - matrix: attacks × defenses success rate matrix (when completed)
      - error: error message (when failed)
    """
    try:
        task = AsyncResult(task_id, app=celery_app)
        state = (task.state or "PENDING").upper()
        info = task.info if isinstance(task.info, dict) else {}

        if state == "SUCCESS":
            result: Dict[str, Any] = task.get()
            return RobustnessResultResponse(
                status="completed",
                matrix=result.get("matrix"),
                algorithms=result.get("algorithms"),
                defenses=result.get("defenses"),
                time_elapsed=result.get("time_elapsed"),
                error=None,
            )

        if state in {"FAILURE", "REVOKED"}:
            # Determine if this was a timeout
            error_info = task.info
            if isinstance(error_info, Exception):
                error_str = str(error_info)
            else:
                error_str = str(error_info) if error_info else "任务执行失败"

            # Check for soft time limit exceeded
            if "SoftTimeLimitExceeded" in error_str or "TimeLimitExceeded" in error_str:
                error_str = "评估任务超时（超过 120 秒限制），请减少算法数量后重试"

            return RobustnessResultResponse(
                status="failed",
                error=error_str,
            )

        if state in {"STARTED", "RECEIVED", "RETRY", "PROGRESS"}:
            return RobustnessResultResponse(
                status="running",
                error=None,
            )

        # PENDING or unknown
        return RobustnessResultResponse(
            status="pending",
            error=None,
        )

    except Exception as exc:
        logger.error(
            "Failed to get robustness result for task %s: %s", task_id, exc, exc_info=True
        )
        raise HTTPException(status_code=500, detail=f"获取任务结果失败: {exc}")
