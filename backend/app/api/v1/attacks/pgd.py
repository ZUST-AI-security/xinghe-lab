"""
PGD attack API routes.

Provides two execution modes:
  POST /pgd/run     — synchronous (blocks until complete, capped at 40 iters for demo)
  POST /pgd/submit  — asynchronous via Celery (returns task_id for polling)

Task polling is at /attacks/tasks/{task_id} (shared across all algorithms).
"""

import time
import logging
from typing import Any, Dict

import numpy as np
import torch
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_active_user
from app.models.user import User
from app.schemas.attacks.pgd import (
    PGDAttackRequest,
    PGDAttackResponse,
    PGDAsyncTaskResponse,
    PGDHistoryListResponse,
)
from app.utils.image_utils import base64_to_image, image_to_base64
from app.utils.attack_response import build_prediction_summary
from app.core.exceptions import AttackError, ValidationError
from app.utils.imagenet_classes import search_classes, get_class_by_id, get_popular_classes

router = APIRouter(prefix="/pgd", tags=["PGD Attack"])
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


@router.post("/run", response_model=PGDAttackResponse)
async def run_pgd_sync(
    request: PGDAttackRequest,
    db: Session = Depends(get_db),
):
    """
    Run PGD attack synchronously and return results immediately.
    Iterations are capped at 40 for demo speed; use /submit for full-quality runs.
    """
    start_time = time.time()
    try:
        image_np = base64_to_image(request.image)
        model = _get_or_load_model(request.model_name or "resnet100_imagenet")
        input_tensor = model.preprocess(image_np).to(model.device)

        # Original prediction (no_grad)
        with torch.no_grad():
            orig_pred = model.predict(input_tensor)
            original_label = orig_pred["logits"].argmax(dim=1)

        # Run PGD algorithm
        from app.algorithms.registry import get as get_algorithm
        algo_cls = get_algorithm("pgd")
        if algo_cls is None:
            raise AttackError("PGD algorithm not registered")

        # Cap iterations for sync/demo mode
        adv_images, metadata = algo_cls().generate(
            model=model,
            images=input_tensor,
            labels=original_label,
            epsilon=request.params.epsilon,
            alpha=request.params.alpha,
            num_iter=min(request.params.num_iter, 40),
            targeted=request.params.targeted,
            random_start=request.params.random_start,
            loss_type=request.params.loss_type,
            norm=request.params.norm,
        )

        adv_np = (adv_images[0].cpu().numpy().transpose(1, 2, 0) * 255).astype(np.uint8)
        heatmap_np = metadata["heatmap"][0].cpu().numpy()
        original_summary = build_prediction_summary(model, metadata["original_probs"])
        adversarial_summary = build_prediction_summary(model, metadata["adv_probs"])

        return PGDAttackResponse(
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
                "iterations": metadata.get("num_iter", request.params.num_iter),
                "success_rate": metadata.get("success_rate", 0.0),
                "epsilon": metadata.get("epsilon", request.params.epsilon),
                "alpha": metadata.get("alpha", request.params.alpha),
                "norm": metadata.get("norm", request.params.norm),
                "loss_type": metadata.get("loss_type", request.params.loss_type),
                "targeted": metadata.get("targeted", request.params.targeted),
                "model_name": request.model_name or "resnet100_imagenet",
                "original_prediction": original_summary["prediction"],
                "adversarial_prediction": adversarial_summary["prediction"],
                "original_top5": original_summary["top5"],
                "adversarial_top5": adversarial_summary["top5"],
            },
        )

    except Exception as e:
        logger.error(f"PGD sync attack failed: {e}", exc_info=True)
        if isinstance(e, (AttackError, ValidationError, ValueError)):
            raise HTTPException(status_code=400, detail=str(e))
        raise HTTPException(status_code=500, detail=f"Attack failed: {e}")


@router.post("/submit", response_model=PGDAsyncTaskResponse)
async def submit_pgd_async(
    request: PGDAttackRequest,
    current_user: User = Depends(get_current_active_user),
):
    """
    Submit PGD attack as a Celery task and return a task_id for polling.
    Poll status at GET /attacks/tasks/{task_id}.
    """
    try:
        from app.workers.attack_task import run_attack

        task = run_attack.delay(
            algorithm="pgd",
            model_name=request.model_name or "resnet100_imagenet",
            image=request.image,
            params=request.params.model_dump(),
            user_id=current_user.id,
        )
        return PGDAsyncTaskResponse(task_id=task.id, status="pending")

    except Exception as e:
        logger.error(f"PGD task submit failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Task submission failed: {e}")


@router.get("/params/schema")
async def get_pgd_params_schema():
    """Return the PGD parameter schema for frontend rendering."""
    try:
        from app.algorithms.registry import get as get_algorithm
        algo_cls = get_algorithm("pgd")
        if algo_cls is None:
            raise HTTPException(status_code=404, detail="PGD algorithm not registered")
        return algo_cls.get_params_schema()
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get PGD params schema failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/history", response_model=PGDHistoryListResponse)
async def get_pgd_history(
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Get PGD attack history for the current user."""
    # TODO: implement DB history storage
    return PGDHistoryListResponse(histories=[], total=0, page=page, size=size, pages=0)


@router.get("/classes/search")
async def search_imagenet_classes(
    q: str = Query(..., description="Search query"),
    limit: int = Query(20, ge=1, le=100),
):
    """Search ImageNet class names."""
    try:
        return {"results": search_classes(q, limit)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/classes/popular")
async def get_popular_imagenet_classes(
    limit: int = Query(50, ge=1, le=100),
):
    """Get popular/common ImageNet classes."""
    try:
        return {"results": get_popular_classes(limit)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


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
async def get_pgd_stats(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Get PGD attack statistics for the current user."""
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
