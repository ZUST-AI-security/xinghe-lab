"""
Unified adversarial attack Celery task.

Models are loaded ONCE per worker process and cached in _model_cache.
This avoids re-loading large model weights on every task execution,
which is critical for low-spec servers.

Configuration notes (4H8G-class servers):
    worker_concurrency=2          — two concurrent tasks share the same model cache
    worker_max_tasks_per_child=200 — long-lived workers maximize cache hit rate
    worker_prefetch_multiplier=1   — don't prefetch, dispatch one task at a time

Memory hygiene:
    The task's `finally` block runs gc.collect() + torch.cuda.empty_cache()
    after every task to clear intermediate tensors while keeping the model
    weights themselves in `_model_cache`.
"""

import time
import logging
from typing import Any, Dict

import hashlib
import numpy as np
import cv2
import torch
from pathlib import Path
from PIL import Image

from app.workers.celery_app import celery_app
from app.utils.image_utils import base64_to_image, image_to_base64
from app.utils.attack_response import build_prediction_summary
from app.core.database import SessionLocal
from app.models.attack_history import AttackHistory
from app.models.task_record import TaskRecord
from app.models.uploaded_file import UploadedFile
import os
import base64

logger = logging.getLogger(__name__)

# Worker-level model cache: persists for the lifetime of this worker process.
# Key: model_id string. Value: loaded BaseModel instance.
_model_cache: Dict[str, Any] = {}

# Upload storage root
UPLOAD_ROOT = Path("uploads")


def _record_upload(user_id: int, image_b64: str):
    """
    Record the uploaded image in uploaded_files table (SHA-256 dedup).
    This ensures images used in attacks appear in the user's image library.
    Uses its own DB session to avoid interfering with the main task session.
    Silently skips on any error to avoid blocking the attack task.
    """
    upload_db = SessionLocal()
    try:
        # Decode base64
        raw = image_b64
        if "," in raw:
            raw = raw.split(",", 1)[1]
        padding = 4 - len(raw) % 4
        if padding != 4:
            raw += "=" * padding
        image_bytes = base64.b64decode(raw)

        file_hash = hashlib.sha256(image_bytes).hexdigest()

        # Check if already exists for this user
        existing = (
            upload_db.query(UploadedFile)
            .filter(
                UploadedFile.user_id == user_id,
                UploadedFile.file_hash == file_hash,
                UploadedFile.is_deleted.is_(False),
            )
            .first()
        )
        if existing:
            return  # Already recorded, skip

        # Save file to disk
        user_dir = UPLOAD_ROOT / str(user_id)
        user_dir.mkdir(parents=True, exist_ok=True)
        safe_name = f"{file_hash[:8]}_attack_input.png"
        file_path = user_dir / safe_name
        file_path.write_bytes(image_bytes)

        # Detect mime type from header bytes
        mime_type = "image/png"
        if image_bytes[:2] == b'\xff\xd8':
            mime_type = "image/jpeg"
        elif image_bytes[:4] == b'RIFF':
            mime_type = "image/webp"

        record = UploadedFile(
            user_id=user_id,
            filename=safe_name,
            file_path=str(file_path),
            file_hash=file_hash,
            file_size=len(image_bytes),
            mime_type=mime_type,
        )
        upload_db.add(record)
        upload_db.commit()
        logger.info(f"[Worker] Recorded upload for user {user_id}, hash={file_hash[:8]}")
    except Exception as exc:
        logger.warning("_record_upload failed: %s", exc)
        try:
            upload_db.rollback()
        except Exception:
            pass
    finally:
        upload_db.close()


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
    
    # Initialize DB session for TaskRecord
    db = SessionLocal()
    task_record = TaskRecord(
        user_id=user_id,
        algorithm_name=algorithm,
        status="running",
        result={}
    )
    db.add(task_record)
    db.commit()
    db.refresh(task_record)
    
    try:
        self.update_state(state="PROGRESS", meta={"progress": 0, "status": "Initializing..."})

        # Record the uploaded image in the user's file library (dedup by hash)
        _record_upload(user_id, image)

        # Resolve algorithm class
        import app.algorithms  # ensure registration side-effects have run
        from app.algorithms.registry import get as get_algorithm
        algo_cls = get_algorithm(algorithm)
        if algo_cls is None:
            raise ValueError(f"Algorithm '{algorithm}' is not registered")

        self.update_state(state="PROGRESS", meta={"progress": 10, "status": "Loading model..."})
        model = _get_or_load_model(model_name)

        # 任务类型：classification / detection
        task_type = getattr(model, "model_type", "classification")
        if hasattr(model, "get_model_type"):
            try:
                task_type = model.get_model_type() or task_type
            except Exception:  # noqa: BLE001
                pass
        is_detection = task_type == "detection"

        # 校验算法是否支持当前任务类型
        supported = getattr(algo_cls, "supported_task_types", ["classification"]) or ["classification"]
        if task_type not in supported:
            raise ValueError(
                f"算法 '{algorithm}' 不支持 {task_type} 任务（仅支持 {supported}）"
            )

        self.update_state(state="PROGRESS", meta={"progress": 20, "status": "Preprocessing..."})
        image_np = base64_to_image(image)
        input_tensor = model.preprocess(image_np).to(model.device)

        self.update_state(state="PROGRESS", meta={"progress": 30, "status": "Getting prediction..."})
        if is_detection:
            # 检测模型：原始预测就是 bbox 列表
            with torch.no_grad():
                orig_pred = model.predict(input_tensor)
            original_label = None
        else:
            with torch.no_grad():
                orig_pred = model.predict(input_tensor)
                original_label = orig_pred["logits"].argmax(dim=1)

        self.update_state(state="PROGRESS", meta={"progress": 40, "status": "Running attack..."})
        algo = algo_cls()

        def report_progress(progress: int, status_text: str):
            self.update_state(
                state="PROGRESS",
                meta={"progress": int(progress), "status": status_text},
            )

        adv_images, metadata = algo.generate(
            model=model,
            images=input_tensor,
            labels=original_label if original_label is not None else torch.zeros(input_tensor.size(0), dtype=torch.long, device=input_tensor.device),
            progress_callback=report_progress,
            **params,
        )

        self.update_state(state="PROGRESS", meta={"progress": 90, "status": "Saving outputs..."})
        
        adv_np = (adv_images[0].cpu().numpy().transpose(1, 2, 0) * 255).astype("uint8")
        heatmap_np = metadata["heatmap"][0].cpu().numpy()

        # 检测任务：跳过 prediction_summary（没有 logits/probs 的 Top-5）
        if is_detection:
            original_summary = {"prediction": None, "top5": []}
            adversarial_summary = {"prediction": None, "top5": []}
        else:
            original_summary = build_prediction_summary(model, metadata["original_probs"])
            adversarial_summary = build_prediction_summary(model, metadata["adv_probs"])

        # Reconstruct orig_np early so it can be used for perturbation visualization
        _orig_tensor = input_tensor.detach().clone()
        _mean = getattr(model, "IMAGENET_MEAN", None) or getattr(model, "mean", None)
        _std = getattr(model, "IMAGENET_STD", None) or getattr(model, "std", None)
        if _mean is not None and _std is not None:
            _mean_t = torch.tensor(_mean, device=_orig_tensor.device).view(1, 3, 1, 1)
            _std_t = torch.tensor(_std, device=_orig_tensor.device).view(1, 3, 1, 1)
            _orig_tensor = _orig_tensor * _std_t + _mean_t
        _orig_tensor = torch.clamp(_orig_tensor, 0, 1)
        _orig_np_vis = (_orig_tensor[0].cpu().numpy().transpose(1, 2, 0) * 255).astype("uint8")

        # --- Perturbation Visualization ---

        # 1. Amplified difference image (10× amplification, same size as original)
        diff = np.abs(_orig_np_vis.astype(float) - adv_np.astype(float))
        amplified = np.clip(diff * 10, 0, 255).astype(np.uint8)
        amplified_diff_b64 = image_to_base64(amplified)

        # 2. Frequency-domain analysis image (2D FFT magnitude spectrum difference)
        def _compute_fft_diff(orig_rgb: "np.ndarray", adv_rgb: "np.ndarray") -> str:
            """
            Compute the log-normalized difference of FFT magnitude spectra between
            the original and adversarial images.  Returns a base64-encoded PNG.
            The output is a single-channel (grayscale) image resized to match the
            input spatial dimensions.
            """
            orig_gray = cv2.cvtColor(orig_rgb, cv2.COLOR_RGB2GRAY).astype(float)
            adv_gray = cv2.cvtColor(adv_rgb, cv2.COLOR_RGB2GRAY).astype(float)

            fft_orig = np.abs(np.fft.fftshift(np.fft.fft2(orig_gray)))
            fft_adv = np.abs(np.fft.fftshift(np.fft.fft2(adv_gray)))

            diff_spectrum = np.log1p(np.abs(fft_adv - fft_orig))
            max_val = diff_spectrum.max()
            if max_val > 0:
                normalized = (diff_spectrum / max_val * 255).astype(np.uint8)
            else:
                normalized = np.zeros_like(diff_spectrum, dtype=np.uint8)

            # Resize to match original image spatial dimensions (H, W)
            h, w = orig_rgb.shape[:2]
            if normalized.shape != (h, w):
                normalized = cv2.resize(normalized, (w, h), interpolation=cv2.INTER_LINEAR)

            # Convert grayscale to RGB so image_to_base64 handles it uniformly
            normalized_rgb = cv2.cvtColor(normalized, cv2.COLOR_GRAY2RGB)
            return image_to_base64(normalized_rgb)

        fft_diff_b64 = _compute_fft_diff(_orig_np_vis, adv_np)

        # --- File Storage Logic ---
        output_dir = os.path.join("outputs", "tasks", self.request.id)
        os.makedirs(output_dir, exist_ok=True)
        
        adv_img_copy = Image.fromarray(adv_np)
        
        adv_img_path = os.path.join(output_dir, "adversarial_image.png")
        adv_img_copy.save(adv_img_path)
        
        heatmap_img_bytes = image_to_base64(heatmap_np, is_heatmap=True)
        heatmap_arr = base64_to_image(heatmap_img_bytes)
        heatmap_pil = Image.fromarray(heatmap_arr)
        heatmap_path = os.path.join(output_dir, "heatmap.png")
        heatmap_pil.save(heatmap_path)
        
        # We don't need to return big base64 to frontend anymore if we serve files, 
        # but for backward compatibility in polling, we will still return base64 for now, 
        # or just return paths. Returning base64 can make polling slow but it's what exists.
        
        # Reuse the already-denormalized original image array
        orig_np = _orig_np_vis
        
        orig_img_pil = Image.fromarray(orig_np)
        orig_img_path = os.path.join(output_dir, "original_image.png")
        orig_img_pil.save(orig_img_path)
        
        orig_img_base64 = image_to_base64(orig_np)
        
        result = {
            "task_id": self.request.id,
            "original_image": orig_img_base64, # Use preprocessed base64
            "adversarial_image": image_to_base64(adv_np),
            "heatmap": heatmap_img_bytes,
            "amplified_diff": amplified_diff_b64,
            "fft_diff": fft_diff_b64,
            "original_probs": [] if is_detection else metadata["original_probs"][0].tolist(),
            "adversarial_probs": [] if is_detection else metadata["adv_probs"][0].tolist(),
            "success": metadata["success_rate"] > 0.5,
            "time_elapsed": time.time() - start,
            "metadata": {
                "task_type": task_type,
                "l2_norm": metadata.get("avg_l2_norm", 0.0),
                "linf_norm": metadata.get("avg_linf_norm", 0.0),
                "algorithm": algorithm,
                "model_name": model_name,
                "user_id": user_id,
                "original_prediction": original_summary["prediction"],
                "adversarial_prediction": adversarial_summary["prediction"],
                "original_top5": original_summary["top5"],
                "adversarial_top5": adversarial_summary["top5"],
                # 兼容字段：分类任务从 probs 取，检测任务为 None
                "original_top1_confidence": (
                    None if is_detection else
                    metadata.get(
                        "original_top1_confidence",
                        float(metadata["original_probs"][0].max().item())
                        if hasattr(metadata.get("original_probs"), "__getitem__")
                        else None,
                    )
                ),
                "adversarial_top1_confidence": (
                    None if is_detection else
                    metadata.get(
                        "adversarial_top1_confidence",
                        float(metadata["adv_probs"][0].max().item())
                        if hasattr(metadata.get("adv_probs"), "__getitem__")
                        else None,
                    )
                ),
                "success_rate": metadata.get("success_rate"),
                # 检测任务专属字段
                **({
                    "original_detections": metadata.get("original_detections", []),
                    "adversarial_detections": metadata.get("adversarial_detections", []),
                    "vanish_rate": metadata.get("vanish_rate"),
                    "orig_box_count": metadata.get("orig_box_count"),
                    "adv_box_count": metadata.get("adv_box_count"),
                } if is_detection else {}),
                **{k: metadata[k] for k in (
                    "epsilon", "targeted", "iterations", "final_c_value",
                    "original_class_id", "adversarial_class_id",
                ) if k in metadata},
            },
            "output_dir": output_dir,
            "adversarial_image_path": adv_img_path,
            "heatmap_path": heatmap_path
        }

        self.update_state(state="PROGRESS", meta={"progress": 100, "status": "Completed"})
        
        # --- Update Task Record ---
        import copy
        from datetime import datetime, timezone
        task_record.status = "completed"
        record_result = copy.deepcopy(result)
        # Avoid saving gigantic base64 in database
        record_result.pop("original_image", None)
        record_result.pop("adversarial_image", None)
        record_result.pop("heatmap", None)
        record_result.pop("amplified_diff", None)
        record_result.pop("fft_diff", None)
        task_record.result = record_result
        task_record.completed_at = datetime.now(timezone.utc)
        db.add(
            AttackHistory(
                user_id=user_id,
                algorithm=algorithm,
                model_name=model_name,
                params=params,
                success=bool(result.get("success")),
                success_rate=metadata.get("success_rate"),
                l2_norm=metadata.get("avg_l2_norm") or metadata.get("l2_norm"),
                linf_norm=metadata.get("avg_linf_norm") or metadata.get("linf_norm"),
                execution_time=result.get("time_elapsed"),
                status="completed",
                error_message=None,
            )
        )
        db.commit()

        logger.info(
            f"Attack '{algorithm}' completed in {result['time_elapsed']:.2f}s "
            f"(user={user_id}, model={model_name})"
        )
        return result

    except Exception as e:
        task_record.status = "failed"
        task_record.result = {"error": str(e)}
        db.add(
            AttackHistory(
                user_id=user_id,
                algorithm=algorithm,
                model_name=model_name,
                params=params,
                success=False,
                success_rate=0.0,
                execution_time=time.time() - start,
                status="failed",
                error_message=str(e),
            )
        )
        db.commit()
        logger.error(
            f"Attack '{algorithm}' failed (user={user_id}, model={model_name}): {e}",
            exc_info=True,
        )
        raise
    finally:
        db.close()
        # 任务结束后释放本次推理的中间张量与显存碎片，但 _model_cache 中的已加载模型保留。
        # 这就是"keep alive 但避免泄漏"的折中：模型权重只加载一次，每次任务后主动 gc。
        try:
            import gc
            gc.collect()
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
        except Exception:  # noqa: BLE001
            # gc/cuda 清理失败不应该影响任务结果
            pass
