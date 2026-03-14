"""
星河智安 (XingHe ZhiAn) - C&W攻击异步任务
Celery任务实现，用于异步执行C&W攻击算法
"""

import time
import torch
import logging
from celery import current_task
from typing import Dict, Any

from ..celery_app import celery_app
from ...services.model_manager.registry import get_model_registry
from ...services.attacks.registry import get_attack_registry
from ...utils.image_utils import base64_to_image, image_to_base64

logger = logging.getLogger(__name__)

@celery_app.task(bind=True, name="app.workers.tasks.cw_task.run_cw_attack")
def run_cw_attack(self, image: str, params: Dict[str, Any], model_name: str, user_id: int):
    """
    异步执行C&W攻击
    
    Args:
        self: Celery任务实例
        image: Base64编码的图片
        params: 攻击参数
        model_name: 模型名称
        user_id: 用户ID
        
    Returns:
        Dict[str, Any]: 攻击结果
    """
    start_time = time.time()
    
    try:
        logger.info(f"开始异步C&W攻击，用户ID: {user_id}, 模型: {model_name}")
        
        # 更新任务状态
        self.update_state(
            state="PROGRESS",
            meta={"progress": 0, "status": "初始化模型..."}
        )
        
        # 1. 解码图片
        image_np = base64_to_image(image)
        
        # 更新进度
        self.update_state(
            state="PROGRESS",
            meta={"progress": 10, "status": "加载模型..."}
        )
        
        # 2. 加载模型
        model_registry = get_model_registry()
        model = model_registry.get_model(model_name)
        if not model:
            raise ValueError(f"模型 '{model_name}' 未找到")
        
        # 3. 预处理
        input_tensor = model.preprocess(image_np)
        input_tensor = input_tensor.to(model.device)
        
        # 更新进度
        self.update_state(
            state="PROGRESS",
            meta={"progress": 20, "status": "获取原始预测..."}
        )
        
        # 4. 获取原始预测
        with torch.no_grad():
            original_pred = model.predict(input_tensor)
            original_logits = original_pred["logits"]
            original_label = original_logits.argmax(dim=1)
        
        # 更新进度
        self.update_state(
            state="PROGRESS",
            meta={"progress": 30, "status": "初始化攻击算法..."}
        )
        
        # 5. 初始化攻击算法
        attack_registry = get_attack_registry()
        attack = attack_registry.get_attack("cw", model)
        if not attack:
            raise ValueError("C&W攻击算法未找到")
        
        # 自定义进度回调
        def progress_callback(iteration, max_iter):
            progress = 30 + int(60 * iteration / max_iter)
            self.update_state(
                state="PROGRESS",
                meta={"progress": progress, "status": f"攻击迭代中... {iteration}/{max_iter}"}
            )
        
        # 更新进度
        self.update_state(
            state="PROGRESS",
            meta={"progress": 40, "status": "开始攻击..."}
        )
        
        # 6. 运行攻击（这里简化了进度回调，实际可以更精细）
        adv_images, metadata = attack.generate(
            images=input_tensor,
            targets=original_label,
            **params
        )
        
        # 更新进度
        self.update_state(
            state="PROGRESS",
            meta={"progress": 90, "status": "处理结果..."}
        )
        
        # 7. 后处理结果
        # 获取对抗样本的numpy数组
        adv_np = adv_images[0].cpu().numpy()
        adv_np = adv_np.transpose(1, 2, 0)  # CHW -> HWC
        adv_np = (adv_np * 255).astype(np.uint8)
        
        # 热力图处理
        heatmap_np = metadata['heatmap'][0].cpu().numpy()
        
        # 8. 构建响应
        execution_time = time.time() - start_time
        
        result = {
            "original_image": image,
            "adversarial_image": image_to_base64(adv_np),
            "heatmap": image_to_base64(heatmap_np, is_heatmap=True),
            "original_probs": metadata['original_probs'][0].tolist(),
            "adversarial_probs": metadata['adv_probs'][0].tolist(),
            "success": metadata['success_rate'] > 0.5,
            "time_elapsed": execution_time,
            "metadata": {
                'l2_norm': metadata['avg_l2_norm'],
                'iterations': len(metadata['history']['losses']),
                'final_c_value': metadata.get('final_c_value', 0),
                'targeted': metadata.get('targeted', False),
                'model_name': model_name,
                'user_id': user_id
            }
        }
        
        # 更新进度
        self.update_state(
            state="PROGRESS",
            meta={"progress": 100, "status": "完成"}
        )
        
        logger.info(f"异步C&W攻击完成，用户ID: {user_id}, 耗时: {execution_time:.2f}s")
        
        return result
        
    except Exception as e:
        logger.error(f"异步C&W攻击失败，用户ID: {user_id}, 错误: {str(e)}", exc_info=True)
        
        # 更新任务状态为失败
        self.update_state(
            state="FAILURE",
            meta={"error": str(e), "progress": 0}
        )
        
        # 重新抛出异常
        raise

@celery_app.task(name="app.workers.tasks.cw_task.cleanup_cw_results")
def cleanup_cw_results():
    """
    清理过期的C&W攻击结果
    定期任务，清理Redis中的过期结果
    """
    try:
        from celery.result import AsyncResult
        from ..celery_app import celery_app
        from datetime import datetime, timedelta
        import redis
        
        # 连接Redis
        r = redis.from_url(celery_app.conf.broker_url)
        
        # 获取所有C&W任务键
        task_keys = r.keys("celery-task-meta-*")
        
        cleaned_count = 0
        cutoff_time = datetime.utcnow() - timedelta(hours=24)  # 24小时前
        
        for key in task_keys:
            try:
                # 获取任务元数据
                task_data = r.get(key)
                if task_data:
                    import json
                    meta = json.loads(task_data.decode())
                    
                    # 检查是否为C&W任务且已过期
                    if (meta.get('result', {}).get('metadata', {}).get('user_id') and
                        'completed_at' in meta):
                        
                        completed_at = datetime.fromisoformat(meta['completed_at'].replace('Z', '+00:00'))
                        if completed_at < cutoff_time:
                            # 删除过期结果
                            r.delete(key)
                            cleaned_count += 1
                            
            except Exception as e:
                logger.warning(f"清理任务结果时出错: {str(e)}")
                continue
        
        logger.info(f"清理了 {cleaned_count} 个过期的C&W任务结果")
        return {"cleaned_count": cleaned_count}
        
    except Exception as e:
        logger.error(f"清理C&W结果失败: {str(e)}", exc_info=True)
        raise

@celery_app.task(name="app.workers.tasks.cw_task.get_task_statistics")
def get_task_statistics():
    """
    获取C&W任务统计信息
    """
    try:
        import redis
        from ..celery_app import celery_app
        
        # 连接Redis
        r = redis.from_url(celery_app.conf.broker_url)
        
        # 获取所有任务键
        task_keys = r.keys("celery-task-meta-*")
        
        stats = {
            "total_tasks": len(task_keys),
            "completed_tasks": 0,
            "failed_tasks": 0,
            "pending_tasks": 0,
            "cw_tasks": 0
        }
        
        for key in task_keys:
            try:
                task_data = r.get(key)
                if task_data:
                    import json
                    meta = json.loads(task_data.decode())
                    
                    # 统计任务状态
                    status = meta.get('status', '').upper()
                    if status == 'SUCCESS':
                        stats["completed_tasks"] += 1
                    elif status == 'FAILURE':
                        stats["failed_tasks"] += 1
                    elif status == 'PENDING':
                        stats["pending_tasks"] += 1
                    
                    # 统计C&W任务
                    if (meta.get('result', {}).get('metadata', {}).get('user_id') or
                        'cw' in str(meta.get('result', {})).lower()):
                        stats["cw_tasks"] += 1
                        
            except Exception:
                continue
        
        return stats
        
    except Exception as e:
        logger.error(f"获取任务统计失败: {str(e)}", exc_info=True)
        raise
