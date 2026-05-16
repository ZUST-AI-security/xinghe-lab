"""
鲁棒性评估服务 (Robustness Evaluation Service)

对对抗样本施加防御变换，评估攻击算法在防御场景下的鲁棒性。
支持三种防御变换：高斯模糊、JPEG 压缩、位深度压缩。

升级（A 任务）：
  - 每个 (algorithm, defense) 单元格保留完整详情：
    对抗图、防御后图、Top-5 预测变化、L2/Linf/PSNR/SSIM 客观指标
  - 大体积图片落盘到 outputs/robustness/<task_id>/，避免 Redis 撑爆
  - 矩阵 + 详情概要在 Celery result 里返回，原始图通过 URL 访问

关联需求：Requirement 7
"""

import io
import logging
import os
import time
from typing import Any, Dict, List, Optional, Tuple

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
    if image_np.dtype != np.uint8:
        image_np = np.clip(image_np, 0, 255).astype(np.uint8)
    ksize = max(3, int(6 * sigma + 1))
    if ksize % 2 == 0:
        ksize += 1
    return cv2.GaussianBlur(image_np, (ksize, ksize), sigmaX=sigma, sigmaY=sigma)


def apply_jpeg_compress(image_np: np.ndarray, quality: int = 75) -> np.ndarray:
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
    if image_np.dtype != np.uint8:
        image_np = np.clip(image_np, 0, 255).astype(np.uint8)
    bits = int(max(1, min(8, bits)))
    levels = 2 ** bits
    step = 256 // levels
    return (image_np.astype(np.int32) // step * step).astype(np.uint8)


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

# 可视化数据存储根目录（与 attack_task 保持一致）
ROBUSTNESS_OUTPUT_ROOT = "outputs/robustness"


# ---------------------------------------------------------------------------
# Objective image quality metrics
# ---------------------------------------------------------------------------

def _compute_psnr(img_a: np.ndarray, img_b: np.ndarray) -> float:
    """峰值信噪比；输入 uint8 RGB。"""
    a = img_a.astype(np.float64)
    b = img_b.astype(np.float64)
    mse = np.mean((a - b) ** 2)
    if mse < 1e-10:
        return float("inf")
    return float(20.0 * np.log10(255.0 / np.sqrt(mse)))


def _compute_ssim(img_a: np.ndarray, img_b: np.ndarray) -> float:
    """简化版 SSIM（灰度），不依赖 scikit-image。"""
    a = cv2.cvtColor(img_a, cv2.COLOR_RGB2GRAY).astype(np.float64)
    b = cv2.cvtColor(img_b, cv2.COLOR_RGB2GRAY).astype(np.float64)
    c1, c2 = (0.01 * 255) ** 2, (0.03 * 255) ** 2
    kernel = cv2.getGaussianKernel(11, 1.5)
    window = np.outer(kernel, kernel.transpose())

    mu1 = cv2.filter2D(a, -1, window)[5:-5, 5:-5]
    mu2 = cv2.filter2D(b, -1, window)[5:-5, 5:-5]
    mu1_sq, mu2_sq, mu12 = mu1 ** 2, mu2 ** 2, mu1 * mu2

    sigma1_sq = cv2.filter2D(a ** 2, -1, window)[5:-5, 5:-5] - mu1_sq
    sigma2_sq = cv2.filter2D(b ** 2, -1, window)[5:-5, 5:-5] - mu2_sq
    sigma12 = cv2.filter2D(a * b, -1, window)[5:-5, 5:-5] - mu12

    ssim_map = (
        ((2 * mu12 + c1) * (2 * sigma12 + c2))
        / ((mu1_sq + mu2_sq + c1) * (sigma1_sq + sigma2_sq + c2))
    )
    return float(ssim_map.mean())


def _compute_norms(orig: np.ndarray, perturbed: np.ndarray) -> Tuple[float, float]:
    """返回归一化到 [0,1] 像素空间下的 (L2, Linf) 范数。"""
    diff = (perturbed.astype(np.float64) - orig.astype(np.float64)) / 255.0
    flat = diff.reshape(-1)
    return float(np.linalg.norm(flat, ord=2)), float(np.abs(flat).max())


# ---------------------------------------------------------------------------
# RobustnessService
# ---------------------------------------------------------------------------

class RobustnessService:
    """
    Evaluates adversarial robustness by applying defense transforms to
    adversarial examples and measuring attack success rates.
    """

    def evaluate(
        self,
        image_b64: str,
        algorithms: List[str],
        model_id: str,
        db: Session,
        task_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Args:
            image_b64:  Base64-encoded input image.
            algorithms: List of algorithm names to evaluate.
            model_id:   Registered model ID.
            db:         SQLAlchemy session.
            task_id:    Celery task id, used to namespace output files.

        Returns:
            dict with:
              matrix:     {algorithm: {defense: success_rate}}
              algorithms, defenses, time_elapsed
              details:    {algorithm: {defense: {label, top5, metrics, image_urls...}}}
              meta:       原图 url、原始预测 top5
              task_id
        """
        start = time.time()

        from app.ml_models.registry import create as create_model
        import app.algorithms  # ensure registration side-effects
        from app.algorithms.registry import get as get_algorithm
        from app.utils.attack_response import build_prediction_summary
        import torch

        model = create_model(model_id)
        if model is None:
            raise ValueError(f"Model '{model_id}' not found in registry")
        model.load()

        # 仅支持分类模型（YOLO 检测模型暂不支持矩阵评估）
        if model.get_model_type() != "classification":
            raise ValueError(
                f"Robustness evaluation 暂不支持 {model.get_model_type()} 类型模型"
            )

        image_np = base64_to_image(image_b64)  # uint8 RGB [H,W,3]
        input_tensor = model.preprocess(image_np).to(model.device)

        # 预处理后的可视化原图（去归一化）
        orig_vis = self._tensor_to_visual_uint8(input_tensor, model)
        orig_vis_b64 = image_to_base64(orig_vis)

        # 原始预测
        with torch.no_grad():
            orig_pred = model.predict(input_tensor)
            original_label = orig_pred["logits"].argmax(dim=1)
            original_probs = torch.softmax(orig_pred["logits"], dim=1)
        original_summary = build_prediction_summary(model, original_probs)

        # 详情存储目录
        run_id = task_id or f"run_{int(time.time() * 1000)}"
        out_dir = os.path.join(ROBUSTNESS_OUTPUT_ROOT, run_id)
        os.makedirs(out_dir, exist_ok=True)

        orig_path = os.path.join(out_dir, "original.png")
        Image.fromarray(orig_vis).save(orig_path)

        defense_names = list(DEFENSES.keys())
        matrix: Dict[str, Dict[str, float]] = {}
        details: Dict[str, Dict[str, Any]] = {}

        for algo_name in algorithms:
            algo_cls = get_algorithm(algo_name)
            if algo_cls is None:
                logger.warning("Algorithm '%s' not registered, skipping.", algo_name)
                matrix[algo_name] = {d: 0.0 for d in defense_names}
                details[algo_name] = {
                    d: {"error": "算法未注册"} for d in defense_names
                }
                continue

            try:
                algo = algo_cls()
                adv_images, _meta = algo.generate(
                    model=model,
                    images=input_tensor,
                    labels=original_label,
                )

                # 对抗图（像素空间，已归一化到 [0,1]）→ uint8 RGB
                adv_np = (
                    adv_images[0].cpu().numpy().transpose(1, 2, 0) * 255
                ).astype(np.uint8)

                # 对抗样本本身的预测（未防御）
                adv_label, adv_probs = self._predict_label(model, adv_np)
                adv_summary = build_prediction_summary(model, adv_probs)

                # 保存对抗图
                adv_path = os.path.join(out_dir, f"{algo_name}__adversarial.png")
                Image.fromarray(adv_np).save(adv_path)

                defense_results: Dict[str, float] = {}
                algo_details: Dict[str, Any] = {}

                for defense_name, defense_fn in DEFENSES.items():
                    try:
                        params = DEFENSE_DEFAULT_PARAMS[defense_name]
                        defended_np = defense_fn(adv_np, **params)

                        defended_label, defended_probs = self._predict_label(
                            model, defended_np
                        )
                        defended_summary = build_prediction_summary(model, defended_probs)

                        success = float(
                            (defended_label != original_label).float().mean().item()
                        )
                        defense_results[defense_name] = success

                        # 保存防御后图
                        def_path = os.path.join(
                            out_dir, f"{algo_name}__{defense_name}.png"
                        )
                        Image.fromarray(defended_np).save(def_path)

                        # 客观指标
                        l2_orig_def, linf_orig_def = _compute_norms(orig_vis, defended_np)
                        l2_adv_def, _ = _compute_norms(adv_np, defended_np)
                        psnr_def = _compute_psnr(orig_vis, defended_np)
                        ssim_def = _compute_ssim(orig_vis, defended_np)

                        algo_details[defense_name] = {
                            "success": bool(success > 0.5),
                            "success_rate": success,
                            "params": params,
                            "defended_label_id": int(defended_label.item()),
                            "defended_top1_confidence": float(defended_probs[0].max().item()),
                            "defended_prediction": defended_summary["prediction"],
                            "defended_top5": defended_summary["top5"],
                            "metrics": {
                                "l2_orig_vs_defended": l2_orig_def,
                                "linf_orig_vs_defended": linf_orig_def,
                                "l2_adv_vs_defended": l2_adv_def,
                                "psnr": psnr_def if psnr_def != float("inf") else 99.0,
                                "ssim": ssim_def,
                            },
                            "defended_image_url": self._url_for(def_path),
                        }
                    except Exception as defense_exc:  # noqa: BLE001
                        logger.error(
                            "Defense '%s' failed for algorithm '%s': %s",
                            defense_name, algo_name, defense_exc, exc_info=True,
                        )
                        defense_results[defense_name] = 0.0
                        algo_details[defense_name] = {"error": str(defense_exc)}

                matrix[algo_name] = defense_results

                # 算法层共享的"对抗 vs 原图"指标
                l2_adv, linf_adv = _compute_norms(orig_vis, adv_np)
                psnr_adv = _compute_psnr(orig_vis, adv_np)
                ssim_adv = _compute_ssim(orig_vis, adv_np)

                details[algo_name] = {
                    "adversarial": {
                        "label_id": int(adv_label.item()),
                        "top1_confidence": float(adv_probs[0].max().item()),
                        "prediction": adv_summary["prediction"],
                        "top5": adv_summary["top5"],
                        "image_url": self._url_for(adv_path),
                        "metrics": {
                            "l2": l2_adv,
                            "linf": linf_adv,
                            "psnr": psnr_adv if psnr_adv != float("inf") else 99.0,
                            "ssim": ssim_adv,
                        },
                    },
                    "defenses": algo_details,
                }

            except Exception as algo_exc:  # noqa: BLE001
                logger.error(
                    "Algorithm '%s' failed during robustness evaluation: %s",
                    algo_name, algo_exc, exc_info=True,
                )
                matrix[algo_name] = {d: 0.0 for d in defense_names}
                details[algo_name] = {"error": str(algo_exc)}

        elapsed = time.time() - start
        logger.info(
            "Robustness evaluation completed in %.2fs (algorithms=%s, model=%s)",
            elapsed, algorithms, model_id,
        )

        return {
            "matrix": matrix,
            "algorithms": algorithms,
            "defenses": defense_names,
            "time_elapsed": elapsed,
            "task_id": run_id,
            "details": details,
            "meta": {
                "original_label_id": int(original_label.item()),
                "original_prediction": original_summary["prediction"],
                "original_top5": original_summary["top5"],
                "original_image_url": self._url_for(orig_path),
                "model_id": model_id,
            },
        }

    # ----------------- 辅助：模型预测、可视化与 URL 转换 ------------------

    def _predict_label(self, model: Any, image_np: np.ndarray):
        """对 uint8 RGB 图执行 model.predict，返回 (label, probs)"""
        import torch

        tensor = model.preprocess(image_np).to(model.device)
        with torch.no_grad():
            pred = model.predict(tensor)
            logits = pred["logits"]
            label = logits.argmax(dim=1)
            probs = torch.softmax(logits, dim=1)
        return label, probs

    def _tensor_to_visual_uint8(self, tensor: Any, model: Any) -> np.ndarray:
        """把模型输入张量（可能已归一化）变回 uint8 RGB 用于展示与保存。"""
        import torch

        x = tensor.detach().clone()
        mean = getattr(model, "IMAGENET_MEAN", None) or getattr(model, "mean", None)
        std = getattr(model, "IMAGENET_STD", None) or getattr(model, "std", None)
        if mean is not None and std is not None:
            mean_t = torch.tensor(mean, device=x.device).view(1, 3, 1, 1)
            std_t = torch.tensor(std, device=x.device).view(1, 3, 1, 1)
            x = x * std_t + mean_t
        x = torch.clamp(x, 0.0, 1.0)
        np_img = (x[0].cpu().numpy().transpose(1, 2, 0) * 255).astype(np.uint8)
        return np_img

    @staticmethod
    def _url_for(path: str) -> str:
        """把绝对/相对磁盘路径转换为前端可访问的 URL。"""
        normalized = path.replace("\\", "/").lstrip(".")
        if not normalized.startswith("/"):
            normalized = "/" + normalized
        return normalized
