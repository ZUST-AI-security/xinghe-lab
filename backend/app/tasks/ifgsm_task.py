"""
星河智安 (XingHe ZhiAn) - I-FGSM攻击异步任务
Celery任务实现，用于异步执行I-FGSM攻击算法
"""

import time
import gc
import torch
import logging
import sys
import numpy as np
from typing import Dict, Any, Optional

# 调试：打印当前Python路径
print(f"[DEBUG] Python路径: {sys.path}")
print(f"[DEBUG] 当前工作目录: {sys.path[0]}")

from app.workers.celery_app import celery_app
from app.services.model_manager.registry import get_model_registry
from app.services.attacks.registry import get_attack_registry
from app.utils.image_utils import base64_to_image, image_to_base64

logger = logging.getLogger(__name__)


def _release_torch_memory() -> None:
    """任务结束后释放PyTorch相关内存（含GPU缓存）"""
    gc.collect()
    if torch.cuda.is_available():
        torch.cuda.empty_cache()
        if hasattr(torch.cuda, "ipc_collect"):
            torch.cuda.ipc_collect()


@celery_app.task(bind=True, name="app.tasks.ifgsm_task.run_ifgsm_attack", soft_time_limit=300, time_limit=400)
def run_ifgsm_attack(self, image: str, params: Dict[str, Any], model_name: str, user_id: int):
    """
    异步执行I-FGSM攻击

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
    model = None
    attack = None
    image_np = None
    input_tensor = None
    original_pred = None
    original_logits = None
    original_probs = None
    original_label = None
    adv_images = None
    metadata = None
    adv_pred = None
    adv_logits = None
    adv_probs = None
    adv_label = None
    adv_np = None
    noise_visual = None
    noise_np = None

    try:
        logger.info(f"开始异步I-FGSM攻击，用户ID: {user_id}, 模型: {model_name}")

        self.update_state(state="PROGRESS", meta={"progress": 0, "status": "初始化模型..."})

        image_np = base64_to_image(image)

        self.update_state(state="PROGRESS", meta={"progress": 10, "status": "加载模型..."})

        model_registry = get_model_registry()
        model = model_registry.get_model(model_name)
        if not model:
            raise ValueError(f"模型 '{model_name}' 未找到")

        input_tensor = model.preprocess(image_np)
        if input_tensor.dim() == 3:
            input_tensor = input_tensor.unsqueeze(0)
        input_tensor = input_tensor.to(model.device)

        self.update_state(state="PROGRESS", meta={"progress": 20, "status": "获取原始预测..."})

        with torch.no_grad():
            original_pred = model.predict(input_tensor)
            original_logits = original_pred["logits"]
            original_probs = torch.softmax(original_logits, dim=1)
            original_label = original_logits.argmax(dim=1)

        def build_classification_summary(probs: torch.Tensor, label: torch.Tensor) -> Dict[str, Any]:
            class_id = int(label.item())
            confidence = float(probs[0, class_id].item())
            class_name = None
            if hasattr(model, "get_class_name"):
                try:
                    class_name = model.get_class_name(class_id)
                except Exception:
                    class_name = None

            top5_probs, top5_indices = torch.topk(probs, 5, dim=1)
            top5 = []
            for idx, prob in zip(top5_indices[0].tolist(), top5_probs[0].tolist()):
                name = None
                if hasattr(model, "get_class_name"):
                    try:
                        name = model.get_class_name(int(idx))
                    except Exception:
                        name = None
                top5.append({
                    "class_id": int(idx),
                    "class_name": name,
                    "confidence": float(prob)
                })

            return {
                "class_id": class_id,
                "class_name": class_name,
                "confidence": confidence,
                "top5": top5
            }

        self.update_state(
            state="PROGRESS", 
            meta={"progress": 30, "status": "初始化攻击算法..."})

        attack_registry = get_attack_registry()
        attack = attack_registry.get_attack("i-fgsm", model)
        if not attack:
            raise ValueError("I-FGSM攻击算法未找到")

        self.update_state(
            state="PROGRESS", 
            meta={"progress": 40, "status": "开始攻击..."})

        #运行攻击
        run_params = {
            'epsilon': params.get('epsilon', 0.03),
            'alpha': params.get('alpha', 0.01),
            'num_iterations': min(params.get('num_iterations', 40), 150), # 强制限制最大不超过150次
            'targeted': params.get('targeted', False)
        }

        logger.info(f"使用I-FGSM安全攻击参数: {run_params}")

        orig_images, adv_images, metadata = attack.generate(
            images=input_tensor,
            targets=original_label,
            **run_params
        )

        self.update_state(state="PROGRESS", meta={"progress": 80, "status": "处理结果..."})

        adv_np = adv_images[0].cpu().numpy()
        adv_np = adv_np.transpose(1, 2, 0)
        adv_np = (adv_np * 255).astype(np.uint8)

        # 使用orig_images而不是input_tensor，防止预处理导致的维度或数值偏移
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

        # 热力图处理 - 兼容修复版cw.py
        heatmap_data = metadata.get('heatmap')
        if heatmap_data is not None:
            heatmap_np = heatmap_data[0].cpu().numpy() if hasattr(heatmap_data, 'cpu') else np.zeros((1, 224, 224))
        else:
            # 如果没有热力图，使用噪声图作为替代
            heatmap_np = noise_visual
        
        # 构建响应
        execution_time = time.time() - start_time

        with torch.no_grad():
            adv_pred = model.predict(adv_images)
            adv_logits = adv_pred["logits"]
            adv_probs = torch.softmax(adv_logits, dim=1)
            adv_label = adv_logits.argmax(dim=1)

        # 检查原始概率数据
        orig_probs_data = metadata.get('original_probs')
        adv_probs_data = metadata.get('adv_probs')
        
        if orig_probs_data is None:
            orig_probs_list = original_probs[0].cpu().tolist()
        else:
            orig_probs_list = orig_probs_data[0].tolist() if hasattr(orig_probs_data[0], 'tolist') else list(orig_probs_data[0])
            
        if adv_probs_data is None:
            adv_probs_list = adv_probs[0].cpu().tolist()
        else:
            adv_probs_list = adv_probs_data[0].tolist() if hasattr(adv_probs_data[0], 'tolist') else list(adv_probs_data[0])

        result = {
            "original_image": image,
            "adversarial_image": image_to_base64(adv_np),
            "heatmap": image_to_base64(heatmap_np, is_heatmap=True),
            "original_probs": orig_probs_list,
            "adversarial_probs": adv_probs_list,
            "original_prediction": build_classification_summary(original_probs, original_label),
            "adversarial_prediction": build_classification_summary(adv_probs, adv_label),
            "success": metadata.get('success_rate', 0) > 0.5,
            "time_elapsed": execution_time,
            "per_sample_results": metadata.get('per_sample_results', []),
            "metadata": {
                'l2_norm': metadata.get('avg_l2_norm', 0),
                'linf_norm': metadata.get('avg_linf_norm', 0),
                'iterations': len(metadata.get('history', [])),
                'targeted': metadata.get('targeted', False),
                'model_name': model_name,
                'user_id': user_id,
                'noise_max_amplitude': float(max_val),
                'original_label': metadata.get('original_label', int(original_label[0].item())),
                'original_class_name': metadata.get('original_class_name', ''),
                'adversarial_label': metadata.get('adversarial_label', int(adv_label[0].item())),
                'adversarial_class_name': metadata.get('adversarial_class_name', ''),
                'original_confidence': metadata.get('original_confidence', float(original_probs[0].max().item())),
                'adversarial_confidence': metadata.get('adversarial_confidence', float(adv_probs[0].max().item()))
            }
        }

        # 更新进度
        self.update_state(
            state="PROGRESS",
            meta={"progress": 100, "status": "完成"}
        )
        
        logger.info(f"异步I-FGSM攻击完成，用户ID: {user_id}, 耗时: {execution_time:.2f}s")
        return result

    except Exception as e:
        logger.error(f"异步I-FGSM攻击失败，用户ID: {user_id}, 错误: {str(e)}", exc_info=True)
        
        self.update_state(
            state="FAILURE",
            meta={
                "exc_type": type(e).__name__,
                "exc_message": [str(e)],
                "error": str(e),
                "progress": 0,
                "custom_error": "I-FGSM攻击执行期间发生崩溃",
                "traceback": None 
            }
        )
        
        raise RuntimeError(f"I-FGSM Task Failed: {str(e)}")

    finally:
        del model, attack, image_np, input_tensor
        del original_pred, original_logits, original_probs, original_label
        del adv_images, metadata, adv_pred, adv_logits, adv_probs, adv_label
        del adv_np, heatmap_np, noise_visual, noise_np
        _release_torch_memory()

@celery_app.task(name="app.tasks.ifgsm_task.cleanup_ifgsm_results")
def cleanup_ifgsm_results():
    """
    清理过期的I-FGSM攻击结果
    定期任务，清理Redis中的过期结果
    """
    try:
        from celery.result import AsyncResult
        from app.workers.celery_app import celery_app
        from datetime import datetime, timedelta
        import redis
        
        # 连接Redis
        r = redis.from_url(celery_app.conf.broker_url)
        
        # 获取所有任务键
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
                    
                    # 检查是否为任务且已过期 (由于全栈框架统一了格式，这里通用检查即可)
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
        
        logger.info(f"清理了 {cleaned_count} 个过期的I-FGSM任务结果")
        return {"cleaned_count": cleaned_count}
        
    except Exception as e:
        logger.error(f"清理I-FGSM结果失败: {str(e)}", exc_info=True)
        raise


@celery_app.task(name="app.tasks.ifgsm_task.get_task_statistics")
def get_task_statistics():
    """
    获取I-FGSM任务统计信息
    """
    try:
        import redis
        from app.workers.celery_app import celery_app
        
        # 连接Redis
        r = redis.from_url(celery_app.conf.broker_url)
        
        # 获取所有任务键
        task_keys = r.keys("celery-task-meta-*")
        
        # [修改1]：把 cw_tasks 改成 ifgsm_tasks
        stats = {
            "total_tasks": len(task_keys),
            "completed_tasks": 0,
            "failed_tasks": 0,
            "pending_tasks": 0,
            "ifgsm_tasks": 0
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
                    
                    # [修改2]：统计I-FGSM任务，通过检查返回值里是否带有 i-fgsm 关键词
                    if (meta.get('result', {}).get('metadata', {}).get('user_id') or
                        'i-fgsm' in str(meta.get('result', {})).lower()):
                        stats["ifgsm_tasks"] += 1
                        
            except Exception:
                continue
        
        return stats
        
    except Exception as e:
        logger.error(f"获取任务统计失败: {str(e)}", exc_info=True)
        raise