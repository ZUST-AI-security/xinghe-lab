"""
DeepFool attack API routes.

POST /deepfool/run     — synchronous execution
POST /deepfool/submit  — async via Celery
GET  /deepfool/params/schema — parameter schema for frontend
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
from app.models.attack_history import AttackHistory
from app.schemas.attacks.deepfool import (
    DeepFoolAttackRequest,
    DeepFoolAttackResponse,
    DeepFoolAsyncTaskResponse,
    DeepFoolHistoryListResponse,
)
from app.utils.image_utils import base64_to_image, image_to_base64
from app.utils.attack_response import build_prediction_summary
from app.core.exceptions import AttackError, ValidationError, safe_error_detail
from app.utils.imagenet_classes import search_classes, get_class_by_id, get_popular_classes

router = APIRouter(prefix="/deepfool", tags=["DeepFool Attack"])
logger = logging.getLogger(__name__)

_model_cache: Dict[str, Any] = {}


def _get_or_load_model(model_name: str):
    if model_name not in _model_cache:
        from app.ml_models.registry import create as create_model
        model = create_model(model_name)
        if model is None:
            raise ValueError(f"模型 '{model_name}' 未在注册表中找到")
        model.load()
        _model_cache[model_name] = model
    return _model_cache[model_name]


@router.post("/run", response_model=DeepFoolAttackResponse, summary="同步执行 DeepFool 攻击")
async def run_deepfool_sync(
    request: DeepFoolAttackRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """同步执行 DeepFool 最小 L2 扰动攻击。"""
    start_time = time.time()
    try:
        image_np = base64_to_image(request.image)
        model = _get_or_load_model(request.model_name or "resnet100_imagenet")
        input_tensor = model.preprocess(image_np).to(model.device)

        with torch.no_grad():
            orig_pred = model.predict(input_tensor)
            original_label = orig_pred["logits"].argmax(dim=1)

        from app.algorithms.registry import get as get_algorithm
        algo_cls = get_algorithm("deepfool")
        if algo_cls is None:
            raise AttackError("DeepFool 算法未注册")

        adv_images, metadata = algo_cls().generate(
            model=model,
            images=input_tensor,
            labels=original_label,
            max_iter=request.params.max_iter,
            overshoot=request.params.overshoot,
            num_classes=request.params.num_classes,
        )

        adv_np = (adv_images[0].cpu().numpy().transpose(1, 2, 0) * 255).astype(np.uint8)
        heatmap_np = metadata["heatmap"][0].cpu().numpy()
        original_summary = build_prediction_summary(model, metadata["original_probs"])
        adversarial_summary = build_prediction_summary(model, metadata["adv_probs"])
        elapsed = time.time() - start_time

        try:
            db.add(AttackHistory(
                user_id=0,
                algorithm="deepfool",
                model_name=request.model_name or "resnet100_imagenet",
                params=request.params.model_dump(),
                success=metadata["success_rate"] > 0.5,
                success_rate=metadata["success_rate"],
                l2_norm=metadata.get("avg_l2_norm"),
                linf_norm=metadata.get("avg_linf_norm"),
                execution_time=elapsed,
            ))
            db.commit()
        except Exception:
            db.rollback()

        return DeepFoolAttackResponse(
            original_image=request.image,
            adversarial_image=image_to_base64(adv_np),
            heatmap=image_to_base64(heatmap_np, is_heatmap=True),
            original_probs=metadata["original_probs"][0].tolist(),
            adversarial_probs=metadata["adv_probs"][0].tolist(),
            success=metadata["success_rate"] > 0.5,
            time_elapsed=elapsed,
            metadata={
                "l2_norm": metadata.get("avg_l2_norm", 0.0),
                "linf_norm": metadata.get("avg_linf_norm", 0.0),
                "max_iter": metadata.get("max_iter"),
                "overshoot": metadata.get("overshoot"),
                "num_classes": metadata.get("num_classes"),
                "avg_iterations": metadata.get("avg_iterations"),
                "model_name": request.model_name or "resnet100_imagenet",
                "original_prediction": original_summary["prediction"],
                "adversarial_prediction": adversarial_summary["prediction"],
                "original_top5": original_summary["top5"],
                "adversarial_top5": adversarial_summary["top5"],
            },
        )

    except Exception as e:
        logger.error(f"DeepFool attack failed: {e}", exc_info=True)
        if isinstance(e, (AttackError, ValidationError, ValueError)):
            raise HTTPException(status_code=400, detail=safe_error_detail(str(e), "攻击执行失败"))
        raise HTTPException(status_code=500, detail=safe_error_detail(str(e), "攻击执行失败"))


@router.post("/submit", response_model=DeepFoolAsyncTaskResponse, summary="异步提交 DeepFool 攻击")
async def submit_deepfool_async(
    request: DeepFoolAttackRequest,
    current_user: User = Depends(get_current_active_user),
):
    """提交 DeepFool 攻击为 Celery 异步任务。"""
    try:
        from app.workers.attack_task import run_attack
        task = run_attack.delay(
            algorithm="deepfool",
            model_name=request.model_name or "resnet100_imagenet",
            image=request.image,
            params=request.params.model_dump(),
            user_id=current_user.id,
        )
        return DeepFoolAsyncTaskResponse(task_id=task.id, status="pending")
    except Exception as e:
        logger.error(f"DeepFool task submit failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=safe_error_detail(str(e), "任务提交失败"))


@router.get("/params/schema", summary="获取 DeepFool 参数 Schema")
async def get_deepfool_params_schema():
    """返回 DeepFool 参数 schema，供前端动态渲染参数表单。"""
    from app.algorithms.registry import get as get_algorithm
    algo_cls = get_algorithm("deepfool")
    if algo_cls is None:
        raise HTTPException(status_code=404, detail="DeepFool 算法未注册")
    return algo_cls.get_params_schema()


@router.get("/classes/search", summary="搜索 ImageNet 类别")
async def search_imagenet_classes(
    q: str = Query(..., description="搜索关键词"),
    limit: int = Query(20, ge=1, le=100),
):
    return {"results": search_classes(q, limit)}


@router.get("/classes/popular", summary="获取热门 ImageNet 类别")
async def get_popular_imagenet_classes(limit: int = Query(50, ge=1, le=100)):
    return {"results": get_popular_classes(limit)}
