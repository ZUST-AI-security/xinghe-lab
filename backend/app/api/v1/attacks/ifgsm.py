"""
I-FGSM attack API routes.

POST /ifgsm/run     — synchronous execution
POST /ifgsm/submit  — async via Celery (returns task_id)
GET  /ifgsm/params/schema — parameter schema for frontend
"""

import time
import logging
from typing import Any, Dict

import numpy as np
import torch
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_active_user
from app.models.user import User
from app.models.attack_history import AttackHistory
from app.schemas.attacks.ifgsm import (
    IFGSMAttackRequest,
    IFGSMAttackResponse,
    IFGSMAsyncTaskResponse,
    IFGSMHistoryListResponse,
)
from app.utils.image_utils import base64_to_image, image_to_base64
from app.utils.attack_response import build_prediction_summary
from app.core.exceptions import AttackError, ValidationError
from app.utils.imagenet_classes import search_classes, get_class_by_id, get_popular_classes

router = APIRouter(prefix="/ifgsm", tags=["I-FGSM Attack"])
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


@router.post("/run", response_model=IFGSMAttackResponse, summary="同步执行 I-FGSM 攻击")
async def run_ifgsm_sync(
    request: IFGSMAttackRequest,
    db: Session = Depends(get_db),
):
    """同步执行 I-FGSM 迭代对抗攻击，适合快速演示。长任务请使用 /submit。"""
    start_time = time.time()
    try:
        image_np = base64_to_image(request.image)
        model = _get_or_load_model(request.model_name or "resnet100_imagenet")
        input_tensor = model.preprocess(image_np).to(model.device)

        with torch.no_grad():
            orig_pred = model.predict(input_tensor)
            original_label = orig_pred["logits"].argmax(dim=1)

        from app.algorithms.registry import get as get_algorithm
        algo_cls = get_algorithm("ifgsm")
        if algo_cls is None:
            raise AttackError("I-FGSM 算法未注册")

        adv_images, metadata = algo_cls().generate(
            model=model,
            images=input_tensor,
            labels=original_label,
            epsilon=request.params.epsilon,
            alpha=request.params.alpha,
            num_iterations=request.params.num_iterations,
            targeted=request.params.targeted,
        )

        adv_np = (adv_images[0].cpu().numpy().transpose(1, 2, 0) * 255).astype(np.uint8)
        heatmap_np = metadata["heatmap"][0].cpu().numpy()
        original_summary = build_prediction_summary(model, metadata["original_probs"])
        adversarial_summary = build_prediction_summary(model, metadata["adv_probs"])
        elapsed = time.time() - start_time

        # 记录攻击历史（同步端点无认证，user_id 记为 0 表示匿名）
        try:
            db.add(AttackHistory(
                user_id=0,
                algorithm="ifgsm",
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

        return IFGSMAttackResponse(
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
                "epsilon": metadata.get("epsilon"),
                "alpha": metadata.get("alpha"),
                "num_iterations": metadata.get("num_iterations"),
                "targeted": metadata.get("targeted"),
                "model_name": request.model_name or "resnet100_imagenet",
                "original_prediction": original_summary["prediction"],
                "adversarial_prediction": adversarial_summary["prediction"],
                "original_top5": original_summary["top5"],
                "adversarial_top5": adversarial_summary["top5"],
            },
        )

    except Exception as e:
        logger.error(f"I-FGSM attack failed: {e}", exc_info=True)
        if isinstance(e, (AttackError, ValidationError, ValueError)):
            raise HTTPException(status_code=400, detail=str(e))
        raise HTTPException(status_code=500, detail=f"攻击执行失败: {e}")


@router.post("/submit", response_model=IFGSMAsyncTaskResponse, summary="异步提交 I-FGSM 攻击")
async def submit_ifgsm_async(
    request: IFGSMAttackRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """提交 I-FGSM 攻击为 Celery 异步任务，通过 GET /attacks/tasks/{task_id} 轮询状态。
    I-FGSM 为迭代算法 → 路由到 'default' 优先级队列。
    """
    try:
        from app.workers.attack_task import run_attack
        from app.core.task_scheduler import evaluate_complexity, get_queue_name, check_concurrent_limit
        from app.core.config import settings
        from app.utils.upload_recorder import record_attack_image

        # 记录上传图片到文件库
        record_attack_image(db, current_user.id, request.image)

        # 并发任务数限制检查
        active_count = check_concurrent_limit(current_user.id, db)
        if active_count >= settings.max_concurrent_tasks_per_user:
            return JSONResponse(
                status_code=429,
                content={
                    "detail": f"当前已有 {active_count} 个任务在运行，请等待任务完成后再提交",
                    "active_tasks": active_count,
                },
            )

        priority = evaluate_complexity("ifgsm", request.params.model_dump())
        queue_name = get_queue_name(priority)

        task = run_attack.apply_async(
            kwargs=dict(
                algorithm="ifgsm",
                model_name=request.model_name or "resnet100_imagenet",
                image=request.image,
                params=request.params.model_dump(),
                user_id=current_user.id,
            ),
            queue=queue_name,
        )
        return IFGSMAsyncTaskResponse(task_id=task.id, status="pending")
    except Exception as e:
        logger.error(f"I-FGSM task submit failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"任务提交失败: {e}")


@router.get("/params/schema", summary="获取 I-FGSM 参数 Schema")
async def get_ifgsm_params_schema():
    """返回 I-FGSM 参数 schema，供前端动态渲染参数表单。"""
    from app.algorithms.registry import get as get_algorithm
    algo_cls = get_algorithm("ifgsm")
    if algo_cls is None:
        raise HTTPException(status_code=404, detail="I-FGSM 算法未注册")
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


@router.get("/classes/{class_id}", summary="获取单个 ImageNet 类别")
async def get_imagenet_class(class_id: int):
    if class_id < 0 or class_id > 999:
        raise HTTPException(status_code=400, detail="class_id 必须在 0–999 范围内")
    result = get_class_by_id(class_id)
    if not result:
        raise HTTPException(status_code=404, detail="类别不存在")
    return result
