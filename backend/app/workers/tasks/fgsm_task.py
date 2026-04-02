"""
XingHe ZhiAn - FGSM async task module.
"""

import time
import torch
import logging
from typing import Dict, Any

from ..celery_app import celery_app
from ...services.model_manager.registry import get_model_registry
from ...services.attacks.registry import get_attack_registry
from ...utils.image_utils import base64_to_image, image_to_base64

logger = logging.getLogger(__name__)


@celery_app.task(bind=True, name="app.workers.tasks.fgsm_task.run_fgsm_attack")
def run_fgsm_attack(self, image: str, params: Dict[str, Any], model_name: str, user_id: int):
    """
    Run FGSM attack asynchronously.
    """
    start_time = time.time()

    try:
        logger.info(f"Start FGSM async attack, user_id: {user_id}, model: {model_name}")

        self.update_state(state="PROGRESS", meta={"progress": 0, "status": "Initializing model..."})

        image_np = base64_to_image(image)

        self.update_state(state="PROGRESS", meta={"progress": 10, "status": "Loading model..."})

        model_registry = get_model_registry()
        model = model_registry.get_model(model_name)
        if not model:
            raise ValueError(f"Model '{model_name}' not found")

        input_tensor = model.preprocess(image_np)
        input_tensor = input_tensor.to(model.device)

        self.update_state(state="PROGRESS", meta={"progress": 20, "status": "Running prediction..."})

        with torch.no_grad():
            original_pred = model.predict(input_tensor)
            original_logits = original_pred["logits"]
            original_label = original_logits.argmax(dim=1)

        self.update_state(state="PROGRESS", meta={"progress": 30, "status": "Initializing attack..."})

        attack_registry = get_attack_registry()
        attack = attack_registry.get_attack("fgsm", model)
        if not attack:
            raise ValueError("FGSM attack not found")

        self.update_state(state="PROGRESS", meta={"progress": 40, "status": "Attacking..."})

        adv_images, metadata = attack.generate(
            images=input_tensor,
            targets=original_label,
            **params
        )

        self.update_state(state="PROGRESS", meta={"progress": 90, "status": "Processing results..."})

        adv_np = adv_images[0].cpu().numpy()
        adv_np = adv_np.transpose(1, 2, 0)
        adv_np = (adv_np * 255).astype('uint8')

        heatmap_np = metadata['heatmap'][0].cpu().numpy()

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
                'l2_norm': metadata.get('avg_l2_norm', 0.0),
                'linf_norm': metadata.get('avg_linf_norm', 0.0),
                'epsilon': metadata.get('epsilon'),
                'targeted': metadata.get('targeted', False),
                'model_name': model_name,
                'user_id': user_id
            }
        }

        self.update_state(state="PROGRESS", meta={"progress": 100, "status": "Completed"})

        logger.info(f"FGSM async attack completed, user_id: {user_id}, time: {execution_time:.2f}s")
        return result

    except Exception as e:
        logger.error(f"FGSM async attack failed, user_id: {user_id}, error: {str(e)}", exc_info=True)

        self.update_state(state="FAILURE", meta={"error": str(e), "progress": 0})
        raise


@celery_app.task(name="app.workers.tasks.fgsm_task.cleanup_fgsm_results")
def cleanup_fgsm_results():
    """
    Cleanup expired results.
    """
    try:
        from celery.result import AsyncResult
        from ..celery_app import celery_app
        from datetime import datetime, timedelta
        import redis

        r = redis.from_url(celery_app.conf.broker_url)
        task_keys = r.keys("celery-task-meta-*")

        cleaned_count = 0
        cutoff_time = datetime.utcnow() - timedelta(hours=24)

        for key in task_keys:
            try:
                task_data = r.get(key)
                if task_data:
                    import json
                    meta = json.loads(task_data.decode())

                    if (meta.get('result', {}).get('metadata', {}).get('user_id') and
                        'completed_at' in meta):
                        completed_at = datetime.fromisoformat(meta['completed_at'].replace('Z', '+00:00'))
                        if completed_at < cutoff_time:
                            r.delete(key)
                            cleaned_count += 1
            except Exception as e:
                logger.warning(f"Cleanup task result failed: {str(e)}")
                continue

        logger.info(f"Cleaned {cleaned_count} expired task results")
        return {"cleaned_count": cleaned_count}

    except Exception as e:
        logger.error(f"Cleanup results failed: {str(e)}", exc_info=True)
        raise


@celery_app.task(name="app.workers.tasks.fgsm_task.get_task_statistics")
def get_task_statistics():
    """Get task statistics."""
    try:
        import redis
        from ..celery_app import celery_app

        r = redis.from_url(celery_app.conf.broker_url)
        task_keys = r.keys("celery-task-meta-*")

        stats = {
            "total_tasks": len(task_keys),
            "completed_tasks": 0,
            "failed_tasks": 0,
            "pending_tasks": 0,
            "fgsm_tasks": 0
        }

        for key in task_keys:
            try:
                task_data = r.get(key)
                if task_data:
                    import json
                    meta = json.loads(task_data.decode())

                    status = meta.get('status', '').upper()
                    if status == 'SUCCESS':
                        stats["completed_tasks"] += 1
                    elif status == 'FAILURE':
                        stats["failed_tasks"] += 1
                    elif status == 'PENDING':
                        stats["pending_tasks"] += 1

                    if (meta.get('result', {}).get('metadata', {}).get('user_id') or
                        'fgsm' in str(meta.get('result', {})).lower()):
                        stats["fgsm_tasks"] += 1
            except Exception:
                continue

        return stats

    except Exception as e:
        logger.error(f"Get task statistics failed: {str(e)}", exc_info=True)
        raise
