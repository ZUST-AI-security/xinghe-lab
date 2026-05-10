"""
FGSM attack API routes.

Provides two execution modes:
  POST /fgsm/run     — synchronous (blocks until complete, suitable for fast attacks)
  POST /fgsm/submit  — asynchronous via Celery (returns task_id for polling)

Task polling is at /attacks/tasks/{task_id} (shared across all algorithms).
"""

import time
import logging
from typing import Any, Dict, Optional

import numpy as np
import torch
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_active_user
from app.models.user import User
from app.schemas.attacks.fgsm import (
    FGSMAttackRequest,
    FGSMAttackResponse,
    FGSMAsyncTaskResponse,
    FGSMHistoryListResponse,
)
from app.utils.image_utils import base64_to_image, image_to_base64
from app.utils.attack_response import build_prediction_summary
from app.core.exceptions import AttackError, ValidationError, safe_error_detail
from app.utils.imagenet_classes import search_classes, get_class_by_id, get_popular_classes

router = APIRouter(prefix="/fgsm", tags=["FGSM Attack"])
logger = logging.getLogger(__name__)

# In-process model cache for sync endpoint (avoids re-loading on every request)
_model_cache: Dict[str, Any] = {}


def _get_or_load_model(model_name: str):
    if model_name not in _model_cache:
        from app.ml_models.registry import create as create_model
        model = create_model(model_name)
        if model is None:
            raise ValueError(f"Model '{model_name}' not found in registry")
        model.load()
        _model_cache[model_name] = model
        logger.info(f"Loaded model '{model_name}' into sync cache")
    return _model_cache[model_name]


@router.post("/run", response_model=FGSMAttackResponse)
async def run_fgsm_sync(
    request: FGSMAttackRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Run FGSM attack synchronously and return results immediately.
    Suitable for quick demonstrations; use /submit for long-running jobs.
    """
    start_time = time.time()
    try:
        # Decode and preprocess image
        image_np = base64_to_image(request.image)
        model = _get_or_load_model(request.model_name or "resnet100_imagenet")
        input_tensor = model.preprocess(image_np).to(model.device)

        # Original prediction (no_grad)
        with torch.no_grad():
            orig_pred = model.predict(input_tensor)
            original_label = orig_pred["logits"].argmax(dim=1)

        # Run FGSM algorithm
        from app.algorithms.registry import get as get_algorithm
        algo_cls = get_algorithm("fgsm")
        if algo_cls is None:
            raise AttackError("FGSM algorithm not registered")

        adv_images, metadata = algo_cls().generate(
            model=model,
            images=input_tensor,
            labels=original_label,
            epsilon=request.params.epsilon,
            targeted=request.params.targeted,
        )

        # Convert outputs
        adv_np = (adv_images[0].cpu().numpy().transpose(1, 2, 0) * 255).astype(np.uint8)
        heatmap_np = metadata["heatmap"][0].cpu().numpy()
        original_summary = build_prediction_summary(model, metadata["original_probs"])
        adversarial_summary = build_prediction_summary(model, metadata["adv_probs"])

        return FGSMAttackResponse(
            original_image=request.image,
            adversarial_image=image_to_base64(adv_np),
            heatmap=image_to_base64(heatmap_np, is_heatmap=True),
            original_probs=metadata["original_probs"][0].tolist(),
            adversarial_probs=metadata["adv_probs"][0].tolist(),
            success=metadata["success_rate"] > 0.5,
            time_elapsed=time.time() - start_time,
            metadata={
                "l2_norm": metadata.get("avg_l2_norm", 0.0),
                "linf_norm": metadata.get("avg_linf_norm", 0.0),
                "epsilon": metadata.get("epsilon", request.params.epsilon),
                "targeted": metadata.get("targeted", request.params.targeted),
                "model_name": request.model_name or "resnet100_imagenet",
                "original_prediction": original_summary["prediction"],
                "adversarial_prediction": adversarial_summary["prediction"],
                "original_top5": original_summary["top5"],
                "adversarial_top5": adversarial_summary["top5"],
            },
        )

    except Exception as e:
        logger.error(f"FGSM sync attack failed: {e}", exc_info=True)
        if isinstance(e, (AttackError, ValidationError, ValueError)):
            raise HTTPException(status_code=400, detail=safe_error_detail(str(e), "攻击执行失败"))
        raise HTTPException(status_code=500, detail=safe_error_detail(str(e), "攻击执行失败"))


@router.post("/submit", response_model=FGSMAsyncTaskResponse)
async def submit_fgsm_async(
    request: FGSMAttackRequest,
    current_user: User = Depends(get_current_active_user),
):
    """
    Submit FGSM attack as a Celery task and return a task_id for polling.
    Poll status at GET /attacks/tasks/{task_id}.
    """
    try:
        from app.workers.attack_task import run_attack

        task = run_attack.delay(
            algorithm="fgsm",
            model_name=request.model_name or "resnet100_imagenet",
            image=request.image,
            params=request.params.model_dump(),
            user_id=current_user.id,
        )
        return FGSMAsyncTaskResponse(task_id=task.id, status="pending")

    except Exception as e:
        logger.error(f"FGSM task submit failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=safe_error_detail(str(e), "任务提交失败"))


@router.get("/params/schema")
async def get_fgsm_params_schema():
    """Return the FGSM parameter schema for frontend rendering."""
    try:
        from app.algorithms.registry import get as get_algorithm
        algo_cls = get_algorithm("fgsm")
        if algo_cls is None:
            raise HTTPException(status_code=404, detail="FGSM algorithm not registered")
        return algo_cls.get_params_schema()
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get FGSM params schema failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=safe_error_detail(str(e), "获取参数配置失败"))


@router.get("/history", response_model=FGSMHistoryListResponse)
async def get_fgsm_history(
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Get FGSM attack history for the current user."""
    # TODO: implement DB history storage
    return FGSMHistoryListResponse(histories=[], total=0, page=page, size=size, pages=0)


@router.get("/classes/search")
async def search_imagenet_classes(
    q: str = Query(..., description="Search query"),
    limit: int = Query(20, ge=1, le=100),
):
    """Search ImageNet class names."""
    try:
        return {"results": search_classes(q, limit)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=safe_error_detail(str(e), "搜索类别失败"))


@router.get("/classes/popular")
async def get_popular_imagenet_classes(
    limit: int = Query(50, ge=1, le=100),
):
    """Get popular/common ImageNet classes."""
    try:
        return {"results": get_popular_classes(limit)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=safe_error_detail(str(e), "获取类别失败"))


@router.get("/classes/{class_id}")
async def get_imagenet_class(class_id: int):
    """Get a single ImageNet class by numeric id (0–999)."""
    if class_id < 0 or class_id > 999:
        raise HTTPException(status_code=400, detail="class_id must be 0–999")
    result = get_class_by_id(class_id)
    if not result:
        raise HTTPException(status_code=404, detail="Class not found")
    return result


@router.get("/stats")
async def get_fgsm_stats(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Get FGSM attack statistics for the current user."""
    # TODO: implement DB stats query
    return {
        "total_attacks": 0,
        "successful_attacks": 0,
        "failed_attacks": 0,
        "success_rate": 0.0,
        "avg_time_elapsed": 0.0,
        "avg_perturbation_norm": 0.0,
        "last_attack_time": None,
    }
