"""
星河智安 (XingHe ZhiAn) - C&W攻击API路由 (改进版)
提供C&W攻击算法的完整RESTful API接口
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
from .....schemas.attacks.cw import (
    CWAttackRequest,
    CWAttackResponse,
    CWAsyncTaskResponse,
    CWTaskStatusResponse,
    CWHistoryListResponse
)
from .....core.models import model_registry
from .....services.attacks.registry import get_attack_registry
from .....workers.tasks.cw_task import run_cw_attack
from .....utils.image_utils import base64_to_image, image_to_base64
from .....core.exceptions import ModelNotFoundError, AttackError, ValidationError
from .....core.utils.imagenet_classes import search_classes, get_class_by_id, get_popular_classes

router = APIRouter(prefix="/cw", tags=["C&W Attack"])
logger = logging.getLogger(__name__)

@router.post("/run", response_model=CWAttackResponse)
async def run_cw_attack_sync(
    request: CWAttackRequest,
    db: Session = Depends(get_db)
    # current_user: User = Depends(get_current_active_user)  # 暂时注释掉认证
):
    """
    同步运行C&W攻击（适用于快速演示）
    
    Args:
        request: C&W攻击请求
        db: 数据库会话
        
    Returns:
        CWAttackResponse: 攻击结果
        
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
        attack = attack_registry.get_attack("cw", model)
        if not attack:
            raise AttackError("C&W攻击算法未找到")
        
        # 快速模式：强制使用最小参数
        fast_params = {
            'c': max(request.params.c, 5.0),  # 至少5.0
            'kappa': request.params.kappa,
            'lr': max(request.params.lr, 0.05),  # 至少0.05
            'max_iter': 100,  # 强制最小值
            'binary_search_steps': 1,  # 强制最小值
            'targeted': request.params.targeted,
            'abort_early': True,
            'early_stop_iters': 5  # 强制最小值
        }
        
        adv_images, metadata = attack.generate(
            images=input_tensor,
            targets=original_label,
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
        
        response = CWAttackResponse(
            original_image=request.image,
            adversarial_image=image_to_base64(adv_np),
            heatmap=image_to_base64(heatmap_np, is_heatmap=True),
            original_probs=metadata['original_probs'][0].tolist(),
            adversarial_probs=metadata['adv_probs'][0].tolist(),
            success=metadata['success_rate'] > 0.5,
            time_elapsed=execution_time,
            metadata={
                'l2_norm': metadata['avg_l2_norm'],
                'iterations': len(metadata['history']['losses']),
                'final_c_value': metadata.get('final_c_value', 0),
                'targeted': metadata.get('targeted', False),
                'model_name': request.model_name or "resnet100_imagenet"
            }
        )
        
        # 8. 保存历史记录（异步）
        # TODO: 实现历史记录保存
        # save_attack_history(db, current_user.id, request, response, metadata)
        
        return response
        
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"C&W同步攻击失败: {str(e)}", exc_info=True)
        
        if isinstance(e, (ModelNotFoundError, AttackError, ValidationError)):
            raise HTTPException(status_code=400, detail=str(e))
        else:
            raise HTTPException(status_code=500, detail=f"攻击执行失败: {str(e)}")

@router.post("/async", response_model=CWAsyncTaskResponse)
async def run_cw_attack_async(
    request: CWAttackRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_active_user)
):
    """
    异步运行C&W攻击（适用于耗时任务）
    
    Args:
        request: C&W攻击请求
        background_tasks: 后台任务
        current_user: 当前用户
        
    Returns:
        CWAsyncTaskResponse: 任务信息
    """
    try:
        # 提交到Celery
        task = run_cw_attack.delay(
            image=request.image,
            params=request.params.dict(),
            model_name=request.model_name or "resnet100_imagenet",
            user_id=current_user.id
        )
        
        return CWAsyncTaskResponse(
            task_id=task.id,
            status="pending"
        )
        
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"C&W异步任务提交失败: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"任务提交失败: {str(e)}")

@router.get("/task/{task_id}", response_model=CWTaskStatusResponse)
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
        CWTaskStatusResponse: 任务状态
    """
    try:
        from celery.result import AsyncResult
        from .....workers.celery_app import celery_app
        
        task = AsyncResult(task_id, app=celery_app)
        
        if task.ready():
            if task.successful():
                result = task.get()
                return CWTaskStatusResponse(
                    task_id=task_id,
                    status="completed",
                    result=result,
                    completed_at=task.date_done
                )
            else:
                error_msg = str(task.info) if task.info else "任务执行失败"
                return CWTaskStatusResponse(
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
            
            return CWTaskStatusResponse(
                task_id=task_id,
                status="pending",
                progress=progress
            )
            
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
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
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"取消任务失败: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"取消任务失败: {str(e)}")

@router.get("/params/schema")
async def get_cw_params_schema():
    """
    获取C&W攻击参数配置schema
    
    Returns:
        dict: 参数配置schema
    """
    try:
        from .....services.attacks.cw import CWAttack
        return CWAttack.get_params_schema()
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"获取参数schema失败: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"获取参数配置失败: {str(e)}")

@router.get("/history", response_model=CWHistoryListResponse)
async def get_attack_history(
    page: int = Query(1, ge=1, description="页码"),
    size: int = Query(10, ge=1, le=100, description="每页数量"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    获取用户的C&W攻击历史
    
    Args:
        page: 页码
        size: 每页数量
        current_user: 当前用户
        db: 数据库会话
        
    Returns:
        CWHistoryListResponse: 攻击历史列表
    """
    try:
        # TODO: 实现历史记录查询
        # 这里需要实现数据库查询逻辑
        return CWHistoryListResponse(
            histories=[],
            total=0,
            page=page,
            size=size,
            pages=0
        )
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"获取攻击历史失败: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"获取历史记录失败: {str(e)}")

@router.get("/classes/search")
async def search_imagenet_classes(
    q: str = Query(..., description="搜索关键词"),
    limit: int = Query(20, ge=1, le=100, description="返回结果数量限制")
):
    """
    搜索ImageNet类别
    
    Args:
        q: 搜索关键词
        limit: 返回结果数量限制
        
    Returns:
        dict: 搜索结果
    """
    try:
        results = search_classes(q, limit)
        return {"results": results}
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"搜索ImageNet类别失败: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"搜索失败: {str(e)}")

@router.get("/classes/{class_id}")
async def get_imagenet_class(
    class_id: int
):
    """
    获取单个ImageNet类别信息
    
    Args:
        class_id: 类别ID (0-999)
        
    Returns:
        dict: 类别信息
    """
    try:
        if class_id < 0 or class_id > 999:
            raise HTTPException(status_code=400, detail="类别ID必须在0-999之间")
            
        result = get_class_by_id(class_id)
        if not result:
            raise HTTPException(status_code=404, detail="类别不存在")
            
        return result
    except HTTPException:
        raise
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"获取ImageNet类别失败: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"获取类别失败: {str(e)}")

@router.get("/classes/popular")
async def get_popular_imagenet_classes(
    limit: int = Query(50, ge=1, le=100, description="返回结果数量限制")
):
    """
    获取热门ImageNet类别
    
    Args:
        limit: 返回结果数量限制
        
    Returns:
        dict: 热门类别列表
    """
    try:
        results = get_popular_classes(limit)
        return {"results": results}
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"获取热门ImageNet类别失败: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"获取热门类别失败: {str(e)}")

@router.get("/stats")
async def get_attack_statistics(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    获取C&W攻击统计信息
    
    Args:
        current_user: 当前用户
        db: 数据库会话
        
    Returns:
        dict: 统计信息
    """
    try:
        # TODO: 实现统计信息查询
        # 这里需要实现数据库统计逻辑
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
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"获取攻击统计失败: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"获取统计信息失败: {str(e)}")
