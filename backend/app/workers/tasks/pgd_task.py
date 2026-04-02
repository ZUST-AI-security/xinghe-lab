"""
星河智安 (XingHe ZhiAn) - PGD攻击异步任务
Celery任务实现，用于异步执行PGD攻击算法
"""

import time
import torch
import numpy as np
import logging
from celery import current_task
from typing import Dict, Any

from ..celery_app import celery_app
from ...services.model_manager.registry import get_model_registry
from ...services.attacks.registry import get_attack_registry
from ...utils.image_utils import base64_to_image, image_to_base64
from ...core.utils.imagenet_classes import get_class_by_id

logger = logging.getLogger(__name__)

@celery_app.task(bind=True, name="app.workers.tasks.pgd_task.run_pgd_attack")
def run_pgd_attack(self, image: str, params: Dict[str, Any], model_name: str, user_id: int):
    """
    异步执行PGD攻击
    
    Args:
        image: Base64编码的图片
        params: 攻击参数
        model_name: 模型名称
        user_id: 用户ID
        
    Returns:
        Dict: 攻击结果
    """
    start_time = time.time()
    
    try:
        # 更新任务状态
        self.update_state(state='PROGRESS', meta={'progress': 10})
        
        # 1. 解码图片
        image_array = base64_to_image(image)
        self.update_state(state='PROGRESS', meta={'progress': 20})
        
        # 2. 加载模型
        model_registry = get_model_registry()
        model = model_registry.get_model(model_name or "resnet100_imagenet", load_weights=True)
        if not model:
            raise ValueError(f"模型 {model_name} 未找到")
        
        self.update_state(state='PROGRESS', meta={'progress': 30})
        
        # 3. 预处理
        from PIL import Image
        pil_image = Image.fromarray(image_array)
        input_tensor = model.preprocess(pil_image)
        input_tensor = input_tensor.unsqueeze(0)  # 添加batch维度
        input_tensor = input_tensor.to(model.device)
        
        self.update_state(state='PROGRESS', meta={'progress': 40})
        
        # 4. 获取原始预测
        with torch.no_grad():
            original_pred = model.predict(input_tensor)
            original_logits = original_pred["logits"]
            original_label = original_logits.argmax(dim=1)
        
        # 5. 运行攻击
        attack_registry = get_attack_registry()
        attack = attack_registry.get_attack("pgd", model)
        if not attack:
            raise ValueError("PGD攻击算法未找到")
        
        self.update_state(state='PROGRESS', meta={'progress': 50})
        
        # 处理目标标签
        if params.get('targeted'):
            # 定向攻击：使用指定的目标标签（如果有）或默认使用下一个类别
            target_label = (original_label + 1) % model.get_num_classes()
        else:
            # 非定向攻击：目标是原始标签
            target_label = original_label
        
        # 执行攻击并更新进度
        def progress_callback(iteration, total_iterations):
            progress = 50 + (iteration / total_iterations) * 40  # 50-90%
            self.update_state(state='PROGRESS', meta={'progress': progress})
        
        adv_images, metadata = attack.generate(
            images=input_tensor,
            targets=target_label,
            progress_callback=progress_callback,
            **params
        )
        
        self.update_state(state='PROGRESS', meta={'progress': 90})
        
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
        original_class_id = torch.argmax(torch.tensor(original_probs)).item()
        adversarial_class_id = torch.argmax(torch.tensor(adv_probs)).item()
        
        result = {
            'original_image': image,
            'adversarial_image': image_to_base64(adv_np),
            'heatmap': image_to_base64(heatmap_np, is_heatmap=True),
            'original_probs': original_probs,
            'adversarial_probs': adv_probs,
            'success': metadata['success_rate'] > 0.5,
            'time_elapsed': execution_time,
            'metadata': {
                'l2_norm': metadata['avg_l2_norm'],
                'linf_norm': metadata.get('avg_linf_norm', 0),
                'iterations': len(metadata['history']['losses']),
                'success_rate': metadata['success_rate'],
                'targeted': params.get('targeted', False),
                'model_name': model_name or "resnet100_imagenet",
                'original_class_id': original_class_id,
                'adversarial_class_id': adversarial_class_id,
                'original_class_name': get_class_by_id(original_class_id).get('name', 'Unknown') if original_class_id >= 0 else 'Unknown',
                'adversarial_class_name': get_class_by_id(adversarial_class_id).get('name', 'Unknown') if adversarial_class_id >= 0 else 'Unknown'
            }
        }
        
        self.update_state(state='PROGRESS', meta={'progress': 100})
        
        logger.info(f"PGD异步攻击完成，用户ID: {user_id}, 耗时: {execution_time:.2f}s")
        
        return result
        
    except Exception as e:
        logger.error(f"PGD异步攻击失败，用户ID: {user_id}, 错误: {str(e)}", exc_info=True)
        self.update_state(
            state='FAILURE',
            meta={'error': str(e), 'progress': 0}
        )
        raise
