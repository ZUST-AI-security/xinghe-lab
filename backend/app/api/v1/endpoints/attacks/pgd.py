"""
星河智安 (XingHe ZhiAn) - PGD攻击API路由
提供PGD攻击算法的完整RESTful API接口
"""

import time
import torch
import numpy as np
import logging
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Query
from sqlalchemy.orm import Session
from typing import Any, Optional

from .....core.database import get_db
from .....core.security import get_current_active_user
from .....models.user import User
from .....schemas.attacks.pgd import (
    PGDAttackRequest,
    PGDAttackResponse,
    PGDAsyncTaskResponse,
    PGDTaskStatusResponse,
    PGDHistoryListResponse
)
from .....core.models import model_registry
from .....services.attacks.registry import get_attack_registry
from .....workers.tasks.pgd_task import run_pgd_attack
from .....utils.image_utils import base64_to_image, image_to_base64
from .....core.exceptions import ModelNotFoundError, AttackError, ValidationError
from .....core.utils.imagenet_classes import search_classes, get_class_by_id, get_popular_classes

router = APIRouter(prefix="/pgd", tags=["PGD Attack"])
logger = logging.getLogger(__name__)


@router.post("/run", response_model=PGDAttackResponse)
async def run_pgd_attack_sync(
    request: PGDAttackRequest,
    db: Session = Depends(get_db)
    # current_user: User = Depends(get_current_active_user)  # 暂时注释掉认证
):
    """
    同步运行PGD攻击（适用于快速演示）
    
    Args:
        request: PGD攻击请求
        db: 数据库会话
        
    Returns:
        PGDAttackResponse: 攻击结果
        
    Raises:
        HTTPException: 攻击失败时抛出
    """
    start_time = time.time()
    
    try:
        # 1. 解码图片
        image = base64_to_image(request.image)
        
        # 2. 加载模型（使用缓存）
        model = model_registry.get_model(request.model_name or "resnet100_imagenet", load_weights=True, use_cache=True)
        if not model:
            raise ModelNotFoundError(request.model_name or "resnet100_imagenet")
        
        # 3. 预处理
        from PIL import Image
        pil_image = Image.fromarray(image)
        input_tensor = model.preprocess(pil_image)
        input_tensor = input_tensor.unsqueeze(0)  # 添加batch维度
        input_tensor = input_tensor.to(model.device)
        
        # 4. 获取原始预测
        with torch.no_grad():
            original_pred = model.predict(input_tensor)
            original_logits = original_pred["logits"]
            original_label = original_logits.argmax(dim=1)
        
        # 5. 运行攻击 - 快速模式优化
        attack_registry = get_attack_registry()
        attack = attack_registry.get_attack("pgd", model)
        if not attack:
            raise AttackError("PGD攻击算法未找到")
        
        # 快速模式：使用合理参数（PGD本身就很快）
        fast_params = {
            'epsilon': request.params.epsilon,
            'alpha': request.params.alpha,
            'num_iter': min(request.params.num_iter, 100),  # 限制最大100次迭代
            'targeted': request.params.targeted,
            'random_start': request.params.random_start,
            'loss_type': request.params.loss_type,
            'norm': request.params.norm
        }
        
        # 确定目标标签
        if request.params.targeted:
            # 定向攻击：使用指定的目标标签（如果有）或默认使用下一个类别
            target_label = (original_label + 1) % model.get_num_classes()
        else:
            # 非定向攻击：目标是原始标签
            target_label = original_label
        
        adv_images, metadata = attack.generate(
            images=input_tensor,
            targets=target_label,
            **fast_params
        )
        
        # 6. 后处理结果
        # 获取对抗样本的numpy数组用于可视化
        adv_np = adv_images[0].cpu().numpy()
        adv_np = adv_np.transpose(1, 2, 0)  # CHW -> HWC
        adv_np = (adv_np * 255).astype(np.uint8)
        
        # 热力图处理
        heatmap_np = metadata['heatmap'][0].cpu().numpy()
        
        # 7. 构建响应
        execution_time = time.time() - start_time
        
        # 获取预测类别
        original_probs = metadata['original_probs'][0].tolist()
        adv_probs = metadata['adv_probs'][0].tolist()
        original_class_id = np.argmax(original_probs)
        adversarial_class_id = np.argmax(adv_probs)
        
        response = PGDAttackResponse(
            original_image=request.image,
            adversarial_image=image_to_base64(adv_np),
            heatmap=image_to_base64(heatmap_np, is_heatmap=True),
            original_probs=original_probs,
            adversarial_probs=adv_probs,
            success=metadata['success_rate'] > 0.5,
            time_elapsed=execution_time,
            metadata={
                'l2_norm': metadata['avg_l2_norm'],
                'linf_norm': metadata.get('avg_linf_norm', 0),
                'iterations': len(metadata['history']['losses']),
                'success_rate': metadata['success_rate'],
                'targeted': request.params.targeted,
                'model_name': request.model_name or "resnet100_imagenet",
                'original_class_id': int(original_class_id),
                'adversarial_class_id': int(adversarial_class_id),
                'original_class_name': get_class_by_id(int(original_class_id)).get('name', 'Unknown') if int(original_class_id) >= 0 else 'Unknown',
                'adversarial_class_name': get_class_by_id(int(adversarial_class_id)).get('name', 'Unknown') if int(adversarial_class_id) >= 0 else 'Unknown'
            }
        )
        
        # 8. 保存历史记录（异步）
        # TODO: 实现历史记录保存
        
        return response
        
    except Exception as e:
        logger.error(f"PGD同步攻击失败: {str(e)}", exc_info=True)
        
        if isinstance(e, (ModelNotFoundError, AttackError, ValidationError)):
            raise HTTPException(status_code=400, detail=str(e))
        else:
            raise HTTPException(status_code=500, detail=f"攻击执行失败: {str(e)}")


@router.post("/async", response_model=PGDAsyncTaskResponse)
async def run_pgd_attack_async(
    request: PGDAttackRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_active_user)
):
    """
    异步运行PGD攻击（适用于耗时任务）
    
    Args:
        request: PGD攻击请求
        background_tasks: 后台任务
        current_user: 当前用户
        
    Returns:
        PGDAsyncTaskResponse: 任务信息
    """
    try:
        # 提交到Celery
        task = run_pgd_attack.delay(
            image=request.image,
            params=request.params.dict(),
            model_name=request.model_name or "resnet100_imagenet",
            user_id=current_user.id
        )
        
        return PGDAsyncTaskResponse(
            task_id=task.id,
            status="pending"
        )
        
    except Exception as e:
        logger.error(f"PGD异步任务提交失败: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"任务提交失败: {str(e)}")


@router.get("/task/{task_id}", response_model=PGDTaskStatusResponse)
async def get_task_status(
    task_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """
    获取异步任务状态
    
    Args:
        task_id: 任务ID
        current_user: 当前用户
        
    Returns:
        PGDTaskStatusResponse: 任务状态
    """
    try:
        from celery.result import AsyncResult
        from .....workers.celery_app import celery_app
        
        task = AsyncResult(task_id, app=celery_app)
        
        if task.ready():
            if task.successful():
                result = task.get()
                return PGDTaskStatusResponse(
                    task_id=task_id,
                    status="completed",
                    result=result,
                    completed_at=task.date_done
                )
            else:
                error_msg = str(task.info) if task.info else "任务执行失败"
                return PGDTaskStatusResponse(
                    task_id=task_id,
                    status="failed",
                    error=error_msg,
                    completed_at=task.date_done
                )
        else:
            # 获取进度信息（如果支持）
            progress = None
            if hasattr(task, 'info') and isinstance(task.info, dict):
                progress = task.info.get('progress', None)
            
            return PGDTaskStatusResponse(
                task_id=task_id,
                status="pending",
                progress=progress
            )
            
    except Exception as e:
        logger.error(f"获取任务状态失败: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"获取任务状态失败: {str(e)}")


@router.delete("/task/{task_id}")
async def cancel_task(
    task_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """
    取消异步任务
    
    Args:
        task_id: 任务ID
        current_user: 当前用户
        
    Returns:
        dict: 取消结果
    """
    try:
        from celery.result import AsyncResult
        from .....workers.celery_app import celery_app
        
        task = AsyncResult(task_id, app=celery_app)
        
        if task.ready():
            raise HTTPException(status_code=400, detail="任务已完成，无法取消")
        
        # 撤销任务
        task.revoke(terminate=True)
        
        return {"message": "任务已取消", "task_id": task_id}
        
    except Exception as e:
        logger.error(f"取消任务失败: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"取消任务失败: {str(e)}")


@router.get("/params/schema")
async def get_pgd_params_schema():
    """
    获取PGD攻击参数配置schema
    
    Returns:
        dict: 参数配置schema
    """
    try:
        from .....services.attacks.pgd import PGDAttack
        return PGDAttack.get_params_schema()
    except Exception as e:
        logger.error(f"获取参数schema失败: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"获取参数配置失败: {str(e)}")


@router.get("/history", response_model=PGDHistoryListResponse)
async def get_attack_history(
    page: int = Query(1, ge=1, description="页码"),
    size: int = Query(10, ge=1, le=100, description="每页数量"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    获取用户的PGD攻击历史
    
    Args:
        page: 页码
        size: 每页数量
        current_user: 当前用户
        db: 数据库会话
        
    Returns:
        PGDHistoryListResponse: 攻击历史列表
    """
    try:
        # TODO: 实现历史记录查询
        return PGDHistoryListResponse(
            histories=[],
            total=0,
            page=page,
            size=size,
            pages=0
        )
    except Exception as e:
        logger.error(f"获取攻击历史失败: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"获取历史记录失败: {str(e)}")


@router.get("/stats")
async def get_attack_statistics(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    获取PGD攻击统计信息
    
    Args:
        current_user: 当前用户
        db: 数据库会话
        
    Returns:
        dict: 统计信息
    """
    try:
        # TODO: 实现统计信息查询
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
        logger.error(f"获取攻击统计失败: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"获取统计信息失败: {str(e)}")