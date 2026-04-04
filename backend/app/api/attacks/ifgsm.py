"""
星河智安 (XingHe ZhiAn) - I-FGSM攻击API路由
提供I-FGSM攻击算法的RESTful API接口
"""

import time
import gc
import torch
import numpy as np
import logging
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ...db.session import get_db
from ...core.security import get_current_active_user
from ...db.entities import User
from ...schemas.ifgsm import (
    IFGSMAttackRequest, 
    IFGSMAttackResponse,
    IFGSMAsyncTaskResponse,
    IFGSMTaskStatusResponse,
    IFGSMHistoryResponse,
    IFGSMHistoryListResponse,
)
from app.services.model_manager import model_registry
from app.services.attacks.registry import get_attack_registry
from app.tasks.ifgsm_task import run_ifgsm_attack
from app.utils.image_utils import base64_to_image, image_to_base64
from app.core.exceptions import ModelNotFoundError
from app.utils.imagenet_classes import search_classes, get_class_by_id, get_popular_classes


router = APIRouter(prefix="/i-fgsm", tags=["I-FGSM Attack"])
logger = logging.getLogger(__name__)


def _release_torch_memory() -> None:
    """释放PyTorch内存"""
    gc.collect()
    if torch.cuda.is_available():
        torch.cuda.empty_cache()


@router.post("/run", response_model=IFGSMAttackResponse)
async def run_ifgsm_attack_sync(
    request: IFGSMAttackRequest,
    db: Session = Depends(get_db)
):
    """同步运行I-FGSM攻击"""
    start_time = time.time()

    try:
        image = base64_to_image(request.image)

        model = model_registry.get_model(request.model_name or "resnet100_imagenet")
        if not model:
            raise ModelNotFoundError(request.model_name or "resnet100_imagenet")

        input_tensor = model.preprocess(image)
        if input_tensor.dim() == 3:
            input_tensor = input_tensor.unsqueeze(0)
        input_tensor = input_tensor.to(model.device)

        with torch.no_grad():
            original_pred = model.predict(input_tensor)
            original_logits = original_pred["logits"]
            original_probs = torch.softmax(original_logits, dim=1)
            original_label = original_logits.argmax(dim=1)

        attack_registry = get_attack_registry()
        attack = attack_registry.get_attack("i-fgsm", model)
        if not attack:
            raise ValueError("I-FGSM攻击算法未找到")

        # 运行攻击
        params = request.params.dict() if request.params else {}
        orig_images, adv_images, metadata = attack.generate(
            images=input_tensor,
            targets=original_label,
            **params
        )

        adv_np = adv_images[0].cpu().numpy()
        adv_np = adv_np.transpose(1, 2, 0)
        adv_np = (adv_np * 255).astype(np.uint8)

        original_np = orig_images[0].cpu().numpy()
        original_np = original_np.transpose(1, 2, 0)
        original_np = (original_np * 255).astype(np.uint8)

        noise_np = adv_np.astype(np.float32) - original_np.astype(np.float32)
        noise_abs = np.abs(noise_np)
        max_val = np.max(noise_abs)
        if max_val > 0:
            noise_visual = (noise_abs / max_val * 255).astype(np.uint8)
        else:
            noise_visual = noise_abs.astype(np.uint8)

        with torch.no_grad():
            adv_pred = model.predict(adv_images)
            adv_logits = adv_pred["logits"]
            adv_probs = torch.softmax(adv_logits, dim=1)
            adv_label = adv_logits.argmax(dim=1)

        def build_summary(probs, label):
            class_id = int(label.item())
            confidence = float(probs[0, class_id].item())
            class_name = None
            if hasattr(model, "get_class_name"):
                try:
                    class_name = model.get_class_name(class_id)
                except Exception:
                    pass

            top5_probs, top5_indices = torch.topk(probs, 5, dim=1)
            top5 = []
            for idx, prob in zip(top5_indices[0].tolist(), top5_probs[0].tolist()):
                name = None
                if hasattr(model, "get_class_name"):
                    try:
                        name = model.get_class_name(int(idx))
                    except Exception:
                        pass
                top5.append({"class_id": int(idx), "class_name": name, "confidence": float(prob)})

            return {
                "class_id": class_id,
                "class_name": class_name,
                "confidence": confidence,
                "top5": top5
            }

        execution_time = time.time() - start_time

        result = {
            "original_image": request.image,
            "adversarial_image": image_to_base64(adv_np),
            "heatmap": image_to_base64(noise_visual, is_heatmap=True),
            "original_probs": original_probs[0].cpu().tolist(),
            "adversarial_probs": adv_probs[0].cpu().tolist(),
            "original_prediction": build_summary(original_probs, original_label),
            "adversarial_prediction": build_summary(adv_probs, adv_label),
            "success": metadata.get("success_rate", 0) > 0,
            "time_elapsed": execution_time,
            "metadata": {
                # 直接从算法打包好的 metadata 里把对应的包裹拿出来
                "attack_parameters": metadata.get("parameters", {}),
                "success_rate": metadata.get("success_rate", 0),
                "l2_norm": metadata.get("avg_l2_norm", 0),
                "linf_norm": metadata.get("avg_linf_norm", 0), 
                
                # 算法里叫 'history'，我们传给前端（前端不管是叫 history 还是 iteration_logs 都能兼容）
                "history": metadata.get("history", []), 
                "iteration_logs": metadata.get("history", []), 
                
                # 顺便把前端可能需要的模型名字带上
                "model_name": request.model_name or "resnet100_imagenet"
            }
        }

        return result

    except Exception as e:
        logger.error(f"I-FGSM攻击失败: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"攻击执行失败: {str(e)}")
    finally:
        _release_torch_memory()

@router.post("/async", response_model=IFGSMAsyncTaskResponse)
async def run_ifgsm_attack_async(
    request: IFGSMAttackRequest,
    db: Session = Depends(get_db)
):
    """异步执行I-FGSM攻击"""
    try:
        task = run_ifgsm_attack.delay(
            image=request.image,
            params=request.params.dict() if request.params else {},
            model_name=request.model_name or "resnet100_imagenet",
            user_id=1  # 简化处理，使用固定用户ID
        )
        
        return {
            "task_id": task.id,
            "status": "PENDING"
        }
        
    except Exception as e:
        logger.error(f"异步任务提交失败: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"任务提交失败: {str(e)}")


@router.get("/task/{task_id}", response_model=IFGSMTaskStatusResponse)
async def get_task_status(task_id: str):
    """获取异步任务状态"""
    try:
        from celery.result import AsyncResult
        from app.workers.celery_app import celery_app
        
        result = AsyncResult(task_id, app=celery_app)
        
        if result.ready():
            if result.successful():
                return {
                    "task_id": task_id,
                    "status": "SUCCESS",
                    "result": result.get(),
                    "error": None
                }
            else:
                return {
                    "task_id": task_id,
                    "status": "FAILURE",
                    "result": None,
                    "error": str(result.result)
                }
        else:
            return {
                "task_id": task_id,
                "status": result.state,
                "result": None,
                "error": None
            }
            
    except Exception as e:
        logger.error(f"获取任务状态失败: {str(e)}", exc_info=True)
        return {
            "task_id": task_id,
            "status": "FAILED",
            "result": None,
            "error": f"获取任务状态失败: {str(e)}"
        }

# ================= 以下 ImageNet 相关的路由 =================

@router.get("/classes/search")
async def search_imagenet_classes(
    q: str = Query(..., description="搜索关键词"),
    limit: int = Query(20, ge=1, le=100)
):
    """搜索ImageNet类别"""
    try:
        results = search_classes(q, limit)
        return {"results": results}
    except Exception as e:
        logger.error(f"搜索失败: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"搜索失败: {str(e)}")


@router.get("/classes/popular")
async def get_popular_imagenet_classes(
    limit: int = Query(50, ge=1, le=100)
):
    """获取热门ImageNet类别"""
    try:
        results = get_popular_classes(limit)
        return {"results": results}
    except Exception as e:
        logger.error(f"获取热门类别失败: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"获取热门类别失败: {str(e)}")
