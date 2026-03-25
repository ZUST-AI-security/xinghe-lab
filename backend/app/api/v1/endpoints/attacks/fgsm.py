"""
XingHe ZhiAn - FGSM attack API routes.
"""

import time
import torch
import numpy as np
import logging
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Query
from sqlalchemy.orm import Session

from .....core.database import get_db
from .....core.security import get_current_active_user
from .....models.user import User
from .....schemas.attacks.fgsm import (
    FGSMAttackRequest,
    FGSMAttackResponse,
    FGSMAsyncTaskResponse,
    FGSMTaskStatusResponse,
    FGSMHistoryListResponse
)
from .....core.models import model_registry
from .....services.attacks.registry import get_attack_registry
from .....workers.tasks.fgsm_task import run_fgsm_attack
from .....utils.image_utils import base64_to_image, image_to_base64
from .....core.exceptions import ModelNotFoundError, AttackError, ValidationError
from .....core.utils.imagenet_classes import search_classes, get_class_by_id, get_popular_classes

router = APIRouter(prefix="/fgsm", tags=["FGSM Attack"])
logger = logging.getLogger(__name__)


@router.post("/run", response_model=FGSMAttackResponse)
async def run_fgsm_attack_sync(
    request: FGSMAttackRequest,
    db: Session = Depends(get_db)
    # current_user: User = Depends(get_current_active_user)
):
    """
    Synchronous FGSM attack (legacy endpoint path).
    """
    start_time = time.time()

    try:
        # 1. Decode image
        image = base64_to_image(request.image)

        # 2. Load model
        model = model_registry.get_model(request.model_name or "resnet100_imagenet", load_weights=True, use_cache=True)
        if not model:
            raise ModelNotFoundError(request.model_name or "resnet100_imagenet")

        # 3. Preprocess
        from PIL import Image
        pil_image = Image.fromarray(image)
        input_tensor = model.preprocess(pil_image)
        input_tensor = input_tensor.unsqueeze(0)
        input_tensor = input_tensor.to(model.device)

        # 4. Original prediction
        with torch.no_grad():
            original_pred = model.predict(input_tensor)
            original_logits = original_pred["logits"]
            original_label = original_logits.argmax(dim=1)

        # 5. Run FGSM
        attack_registry = get_attack_registry()
        attack = attack_registry.get_attack("fgsm", model)
        if not attack:
            raise AttackError("FGSM attack not found")

        attack_params = {
            "epsilon": request.params.epsilon,
            "targeted": request.params.targeted
        }

        adv_images, metadata = attack.generate(
            images=input_tensor,
            targets=original_label,
            **attack_params
        )

        # 6. Postprocess
        adv_np = adv_images[0].cpu().numpy()
        adv_np = adv_np.transpose(1, 2, 0)
        adv_np = (adv_np * 255).astype(np.uint8)

        heatmap_np = metadata['heatmap'][0].cpu().numpy()

        execution_time = time.time() - start_time

        response = FGSMAttackResponse(
            original_image=request.image,
            adversarial_image=image_to_base64(adv_np),
            heatmap=image_to_base64(heatmap_np, is_heatmap=True),
            original_probs=metadata['original_probs'][0].tolist(),
            adversarial_probs=metadata['adv_probs'][0].tolist(),
            success=metadata['success_rate'] > 0.5,
            time_elapsed=execution_time,
            metadata={
                'l2_norm': metadata.get('avg_l2_norm', 0.0),
                'linf_norm': metadata.get('avg_linf_norm', 0.0),
                'epsilon': metadata.get('epsilon', request.params.epsilon),
                'targeted': metadata.get('targeted', request.params.targeted),
                'model_name': request.model_name or "resnet100_imagenet"
            }
        )

        return response

    except Exception as e:
        logger.error(f"FGSM sync attack failed: {str(e)}", exc_info=True)

        if isinstance(e, (ModelNotFoundError, AttackError, ValidationError)):
            raise HTTPException(status_code=400, detail=str(e))
        raise HTTPException(status_code=500, detail=f"Attack failed: {str(e)}")


@router.post("/async", response_model=FGSMAsyncTaskResponse)
async def run_fgsm_attack_async(
    request: FGSMAttackRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_active_user)
):
    """
    Asynchronous FGSM attack (legacy endpoint path).
    """
    try:
        task = run_fgsm_attack.delay(
            image=request.image,
            params=request.params.dict(),
            model_name=request.model_name or "resnet100_imagenet",
            user_id=current_user.id
        )

        return FGSMAsyncTaskResponse(
            task_id=task.id,
            status="pending"
        )

    except Exception as e:
        logger.error(f"FGSM async task submit failed: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Task submit failed: {str(e)}")


@router.get("/task/{task_id}", response_model=FGSMTaskStatusResponse)
async def get_task_status(
    task_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """Get async task status."""
    try:
        from celery.result import AsyncResult
        from .....workers.celery_app import celery_app

        task = AsyncResult(task_id, app=celery_app)

        if task.ready():
            if task.successful():
                result = task.get()
                return FGSMTaskStatusResponse(
                    task_id=task_id,
                    status="completed",
                    result=result,
                    completed_at=task.date_done
                )
            error_msg = str(task.info) if task.info else "Task failed"
            return FGSMTaskStatusResponse(
                task_id=task_id,
                status="failed",
                error=error_msg,
                completed_at=task.date_done
            )

        progress = None
        if hasattr(task, 'info') and isinstance(task.info, dict):
            progress = task.info.get('progress', None)

        return FGSMTaskStatusResponse(
            task_id=task_id,
            status="pending",
            progress=progress
        )

    except Exception as e:
        logger.error(f"Get task status failed: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Get task status failed: {str(e)}")


@router.delete("/task/{task_id}")
async def cancel_task(
    task_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """Cancel async task."""
    try:
        from celery.result import AsyncResult
        from .....workers.celery_app import celery_app

        task = AsyncResult(task_id, app=celery_app)

        if task.ready():
            raise HTTPException(status_code=400, detail="Task already completed")

        task.revoke(terminate=True)
        return {"message": "Task cancelled", "task_id": task_id}

    except Exception as e:
        logger.error(f"Cancel task failed: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Cancel task failed: {str(e)}")


@router.get("/params/schema")
async def get_fgsm_params_schema():
    """Get FGSM parameter schema (legacy endpoint path)."""
    try:
        from .....services.attacks.fgsm import FGSMAttack
        return FGSMAttack.get_params_schema()
    except Exception as e:
        logger.error(f"Get params schema failed: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Get params schema failed: {str(e)}")


@router.get("/history", response_model=FGSMHistoryListResponse)
async def get_attack_history(
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(10, ge=1, le=100, description="Page size"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get FGSM attack history (stub)."""
    try:
        return FGSMHistoryListResponse(
            histories=[],
            total=0,
            page=page,
            size=size,
            pages=0
        )
    except Exception as e:
        logger.error(f"Get history failed: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Get history failed: {str(e)}")


@router.get("/classes/search")
async def search_imagenet_classes(
    q: str = Query(..., description="Search query"),
    limit: int = Query(20, ge=1, le=100, description="Result limit")
):
    """Search ImageNet classes."""
    try:
        results = search_classes(q, limit)
        return {"results": results}
    except Exception as e:
        logger.error(f"Search classes failed: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")


@router.get("/classes/{class_id}")
async def get_imagenet_class(class_id: int):
    """Get a single ImageNet class by id."""
    try:
        if class_id < 0 or class_id > 999:
            raise HTTPException(status_code=400, detail="class_id must be between 0 and 999")

        result = get_class_by_id(class_id)
        if not result:
            raise HTTPException(status_code=404, detail="Class not found")

        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get class failed: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Get class failed: {str(e)}")


@router.get("/classes/popular")
async def get_popular_imagenet_classes(
    limit: int = Query(50, ge=1, le=100, description="Result limit")
):
    """Get popular ImageNet classes."""
    try:
        results = get_popular_classes(limit)
        return {"results": results}
    except Exception as e:
        logger.error(f"Get popular classes failed: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Get popular classes failed: {str(e)}")


@router.get("/stats")
async def get_attack_statistics(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get attack statistics (stub)."""
    try:
        return {
            "total_attacks": 0,
            "successful_attacks": 0,
            "failed_attacks": 0,
            "success_rate": 0.0,
            "avg_time_elapsed": 0.0,
            "avg_perturbation_norm": 0.0,
            "last_attack_time": None
        }
    except Exception as e:
        logger.error(f"Get stats failed: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Get stats failed: {str(e)}")
