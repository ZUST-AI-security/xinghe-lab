"""
鲁棒性评估服务 (Robustness Evaluation Service)

对对抗样本施加防御变换，评估攻击算法在防御场景下的鲁棒性。
支持三种防御变换：高斯模糊、JPEG 压缩、位深度压缩。

关联需求：Requirement 7
"""

import io
import logging
import time
from typing import Any, Dict, List

import cv2
import numpy as np
from PIL import Image
from sqlalchemy.orm import Session

from app.utils.image_utils import base64_to_image, image_to_base64

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Defense transform functions (CPU-only)
# ---------------------------------------------------------------------------

def apply_gaussian_blur(image_np: np.ndarray, sigma: float = 1.0) -> np.ndarray:
    """
    Apply Gaussian blur defense to an image.

    Args:
        image_np: Input image as numpy array [H, W, C], dtype uint8, RGB.
        sigma:    Standard deviation for Gaussian kernel. Default 1.0.

    Returns:
        Blurred image as numpy array [H, W, C], dtype uint8.
    """
    if image_np.dtype != np.uint8:
        image_np = np.clip(image_np, 0, 255).astype(np.uint8)

    # Kernel size must be odd; derive from sigma (rule of thumb: 6*sigma + 1)
    ksize = max(3, int(6 * sigma + 1))
    if ksize % 2 == 0:
        ksize += 1

    blurred = cv2.GaussianBlur(image_np, (ksize, ksize), sigmaX=sigma, sigmaY=sigma)
    return blurred


def apply_jpeg_compress(image_np: np.ndarray, quality: int = 75) -> np.ndarray:
    """
    Apply JPEG compression defense to an image.

    Args:
        image_np: Input image as numpy array [H, W, C], dtype uint8, RGB.
        quality:  JPEG quality factor (1–95). Default 75.

    Returns:
        JPEG-compressed and decompressed image as numpy array [H, W, C], dtype uint8.
    """
    if image_np.dtype != np.uint8:
        image_np = np.clip(image_np, 0, 255).astype(np.uint8)

    quality = int(max(1, min(95, quality)))

    pil_img = Image.fromarray(image_np, mode="RGB")
    buffer = io.BytesIO()
    pil_img.save(buffer, format="JPEG", quality=quality)
    buffer.seek(0)
    compressed = Image.open(buffer).convert("RGB")
    return np.array(compressed, dtype=np.uint8)


def apply_bit_depth_reduction(image_np: np.ndarray, bits: int = 4) -> np.ndarray:
    """
    Apply bit-depth reduction defense to an image.

    Reduces each channel to the specified number of bits by quantizing pixel
    values, then scales back to the 0–255 range.

    Args:
        image_np: Input image as numpy array [H, W, C], dtype uint8, RGB.
        bits:     Target bit depth (1–8). Default 4.

    Returns:
        Bit-depth-reduced image as numpy array [H, W, C], dtype uint8.
    """
    if image_np.dtype != np.uint8:
        image_np = np.clip(image_np, 0, 255).astype(np.uint8)

    bits = int(max(1, min(8, bits)))
    levels = 2 ** bits
    # Quantize: floor(pixel / (256 / levels)) * (256 / levels)
    step = 256 // levels
    reduced = (image_np.astype(np.int32) // step * step).astype(np.uint8)
    return reduced


# ---------------------------------------------------------------------------
# Defense registry
# ---------------------------------------------------------------------------

DEFENSES: Dict[str, Any] = {
    "gaussian_blur": apply_gaussian_blur,
    "jpeg_compression": apply_jpeg_compress,
    "bit_depth_reduction": apply_bit_depth_reduction,
}

DEFENSE_DEFAULT_PARAMS: Dict[str, Dict[str, Any]] = {
    "gaussian_blur": {"sigma": 1.0},
    "jpeg_compression": {"quality": 75},
    "bit_depth_reduction": {"bits": 4},
}


# ---------------------------------------------------------------------------
# RobustnessService
# ---------------------------------------------------------------------------

class RobustnessService:
    """
    Evaluates adversarial robustness by applying defense transforms to
    adversarial examples and measuring attack success rates.

    The evaluate() method is designed to be called from a Celery task with
    task_soft_time_limit=120 to enforce the 120-second timeout requirement.
    """

    def evaluate(
        self,
        image_b64: str,
        algorithms: List[str],
        model_id: str,
        db: Session,
    ) -> Dict[str, Any]:
        """
        Evaluate robustness of adversarial examples against defense transforms.

        For each algorithm:
          1. Generate an adversarial example from the original image.
          2. For each defense transform, apply the defense to the adversarial
             example and check whether the model still misclassifies it.

        Args:
            image_b64:  Base64-encoded input image.
            algorithms: List of algorithm names to evaluate (e.g. ["fgsm", "pgd"]).
            model_id:   Registered model ID (e.g. "resnet100_imagenet").
            db:         SQLAlchemy database session.

        Returns:
            dict with keys:
              - "matrix": {algorithm: {defense: success_rate (0.0–1.0)}}
              - "algorithms": list of algorithm names
              - "defenses": list of defense names
              - "time_elapsed": total evaluation time in seconds
        """
        start = time.time()

        # Load model
        from app.ml_models.registry import create as create_model
        import app.algorithms  # ensure registration side-effects
        from app.algorithms.registry import get as get_algorithm

        model = create_model(model_id)
        if model is None:
            raise ValueError(f"Model '{model_id}' not found in registry")
        model.load()

        # Decode and preprocess image
        import torch
        image_np = base64_to_image(image_b64)
        input_tensor = model.preprocess(image_np).to(model.device)

        # Get original label
        with torch.no_grad():
            orig_pred = model.predict(input_tensor)
            original_label = orig_pred["logits"].argmax(dim=1)

        defense_names = list(DEFENSES.keys())
        matrix: Dict[str, Dict[str, float]] = {}

        for algo_name in algorithms:
            algo_cls = get_algorithm(algo_name)
            if algo_cls is None:
                logger.warning("Algorithm '%s' not registered, skipping.", algo_name)
                matrix[algo_name] = {d: 0.0 for d in defense_names}
                continue

            try:
                # Generate adversarial example
                algo = algo_cls()
                adv_images, metadata = algo.generate(
                    model=model,
                    images=input_tensor,
                    labels=original_label,
                )

                # Convert adversarial image to uint8 numpy array
                adv_np = (
                    adv_images[0].cpu().numpy().transpose(1, 2, 0) * 255
                ).astype(np.uint8)

                # Evaluate each defense
                defense_results: Dict[str, float] = {}
                for defense_name, defense_fn in DEFENSES.items():
                    default_params = DEFENSE_DEFAULT_PARAMS[defense_name]
                    try:
                        defended_np = defense_fn(adv_np, **default_params)
                        success_rate = self._evaluate_attack_after_defense(
                            model=model,
                            defended_np=defended_np,
                            original_label=original_label,
                        )
                        defense_results[defense_name] = success_rate
                    except Exception as defense_exc:
                        logger.error(
                            "Defense '%s' failed for algorithm '%s': %s",
                            defense_name,
                            algo_name,
                            defense_exc,
                            exc_info=True,
                        )
                        defense_results[defense_name] = 0.0

                matrix[algo_name] = defense_results

            except Exception as algo_exc:
                logger.error(
                    "Algorithm '%s' failed during robustness evaluation: %s",
                    algo_name,
                    algo_exc,
                    exc_info=True,
                )
                matrix[algo_name] = {d: 0.0 for d in defense_names}

        elapsed = time.time() - start
        logger.info(
            "Robustness evaluation completed in %.2fs (algorithms=%s, model=%s)",
            elapsed,
            algorithms,
            model_id,
        )

        return {
            "matrix": matrix,
            "algorithms": algorithms,
            "defenses": defense_names,
            "time_elapsed": elapsed,
        }

    def _evaluate_attack_after_defense(
        self,
        model: Any,
        defended_np: np.ndarray,
        original_label: Any,
    ) -> float:
        """
        Check whether the attack is still successful after applying a defense.

        The attack is considered successful if the model's prediction on the
        defended image differs from the original label.

        Returns:
            1.0 if the attack succeeded (model still misclassifies), 0.0 otherwise.
        """
        import torch

        defended_tensor = model.preprocess(defended_np).to(model.device)
        with torch.no_grad():
            pred = model.predict(defended_tensor)
            defended_label = pred["logits"].argmax(dim=1)

        # Attack succeeds if the defended image is still misclassified
        success = (defended_label != original_label).float().mean().item()
        return float(success)
