"""
Unified adversarial attack Celery task.

Models are loaded ONCE per worker process and cached in _model_cache.
This avoids re-loading large model weights on every task execution,
which is critical for low-spec servers.

Configuration notes (for low-spec servers):
    worker_concurrency=1        — one task at a time per worker process
    worker_max_tasks_per_child=50 — restart worker after 50 tasks to reclaim memory
    worker_prefetch_multiplier=1  — don't prefetch, dispatch one task at a time
"""

import time
import logging
from typing import Any, Dict

import torch

from app.workers.celery_app import celery_app
from app.utils.image_utils import base64_to_image, image_to_base64
from app.utils.attack_response import build_prediction_summary

logger = logging.getLogger(__name__)

# Worker-level model cache: persists for the lifetime of this worker process.
# Key: model_id string. Value: loaded BaseModel instance.
_model_cache: Dict[str, Any] = {}


def _get_or_load_model(model_id: str):
    """Return a loaded model from cache, loading it if not already cached."""
    if model_id not in _model_cache:
        # Lazy import to avoid circular imports at module load time
        from app.ml_models.registry import create as create_model
        model = create_model(model_id)
        if model is None:
            raise ValueError(f"Model '{model_id}' not found in registry")
        logger.info(f"[Worker] Loading model '{model_id}' for the first time...")
        model.load()
        _model_cache[model_id] = model
        logger.info(f"[Worker] Model '{model_id}' loaded and cached")
    return _model_cache[model_id]


@celery_app.task(bind=True, name="app.workers.attack_task.run_attack")
def run_attack(
    self,
    algorithm: str,
    model_name: str,
    image: str,
    params: Dict[str, Any],
    user_id: int,
):
    """
    Generic adversarial attack Celery task.

    Any algorithm registered in app.algorithms can be dispatched here.
    Models are loaded once per worker process and reused across tasks.

    Args:
        algorithm:  registered algorithm name, e.g. "fgsm", "cw"
        model_name: registered model id, e.g. "resnet100_imagenet"
        image:      base64-encoded input image string
        params:     algorithm hyper-parameters dict
        user_id:    requesting user id (for logging / history)
    """
    start = time.time()
    try:
        self.update_state(state="PROGRESS", meta={"progress": 0, "status": "Initializing..."})

        # Resolve algorithm class
        import app.algorithms  # ensure registration side-effects have run
        from app.algorithms.registry import get as get_algorithm
        algo_cls = get_algorithm(algorithm)
        if algo_cls is None:
            raise ValueError(f"Algorithm '{algorithm}' is not registered")

        self.update_state(state="PROGRESS", meta={"progress": 10, "status": "Loading model..."})
        model = _get_or_load_model(model_name)

        self.update_state(state="PROGRESS", meta={"progress": 20, "status": "Preprocessing..."})
        image_np = base64_to_image(image)
        input_tensor = model.preprocess(image_np).to(model.device)

        self.update_state(state="PROGRESS", meta={"progress": 30, "status": "Getting prediction..."})
        with torch.no_grad():
            orig_pred = model.predict(input_tensor)
            original_label = orig_pred["logits"].argmax(dim=1)

        self.update_state(state="PROGRESS", meta={"progress": 40, "status": "Running attack..."})
        algo = algo_cls()
        adv_images, metadata = algo.generate(
            model=model,
            images=input_tensor,
            labels=original_label,
            **params,
        )

        self.update_state(state="PROGRESS", meta={"progress": 90, "status": "Processing results..."})
        adv_np = (adv_images[0].cpu().numpy().transpose(1, 2, 0) * 255).astype("uint8")
        heatmap_np = metadata["heatmap"][0].cpu().numpy()
        original_summary = build_prediction_summary(model, metadata["original_probs"])
        adversarial_summary = build_prediction_summary(model, metadata["adv_probs"])

        result = {
            "task_id": self.request.id,
            "original_image": image,
            "adversarial_image": image_to_base64(adv_np),
            "heatmap": image_to_base64(heatmap_np, is_heatmap=True),
            "original_probs": metadata["original_probs"][0].tolist(),
            "adversarial_probs": metadata["adv_probs"][0].tolist(),
            "success": metadata["success_rate"] > 0.5,
            "time_elapsed": time.time() - start,
            "metadata": {
                "l2_norm": metadata.get("avg_l2_norm", 0.0),
                "linf_norm": metadata.get("avg_linf_norm", 0.0),
                "algorithm": algorithm,
                "model_name": model_name,
                "user_id": user_id,
                "original_prediction": original_summary["prediction"],
                "adversarial_prediction": adversarial_summary["prediction"],
                "original_top5": original_summary["top5"],
                "adversarial_top5": adversarial_summary["top5"],
                **{k: metadata[k] for k in (
                    "epsilon",
                    "targeted",
                    "iterations",
                    "final_c_value",
                    "success_rate",
                    "original_class_id",
                    "adversarial_class_id",
                    "original_top1_confidence",
                    "adversarial_top1_confidence",
                )
                   if k in metadata},
            },
        }

        self.update_state(state="PROGRESS", meta={"progress": 100, "status": "Completed"})
        logger.info(
            f"Attack '{algorithm}' completed in {result['time_elapsed']:.2f}s "
            f"(user={user_id}, model={model_name})"
        )
        return result

    except Exception as e:
        logger.error(
            f"Attack '{algorithm}' failed (user={user_id}, model={model_name}): {e}",
            exc_info=True,
        )
        raise
