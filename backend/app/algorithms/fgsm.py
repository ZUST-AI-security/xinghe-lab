"""
FGSM (Fast Gradient Sign Method) adversarial attack algorithm.

Migrated from services/attacks/fgsm.py with the following key changes:
- Model is passed to generate() rather than bound in __init__
- Uses model._model (the raw nn.Module) directly for gradient computation
  so that no_grad() in predict() doesn't block gradient flow
- 现在同时支持 classification 与 detection 任务：
  · classification 走标准 CE-based FGSM
  · detection (YOLO) 走单步 vanish 攻击（让目标置信度下降）
"""

import logging
import time
from typing import Any, Dict, Tuple

import torch
import torch.nn.functional as F

from app.algorithms.base import BaseAlgorithm

logger = logging.getLogger(__name__)


class FGSMAlgorithm(BaseAlgorithm):
    name = "fgsm"
    display_name = "FGSM Attack"
    description = "Fast Gradient Sign Method — single-step L∞ adversarial attack"
    category = "gradient"
    supported_task_types = ["classification", "detection"]

    # ------------------------------------------------------------------ helpers

    def _get_normalization(self, model):
        mean = getattr(model, "IMAGENET_MEAN", None) or getattr(model, "mean", None)
        std = getattr(model, "IMAGENET_STD", None) or getattr(model, "std", None)
        if mean is None or std is None:
            return None, None
        device = model.device
        return (
            torch.tensor(mean, device=device).view(1, 3, 1, 1),
            torch.tensor(std, device=device).view(1, 3, 1, 1),
        )

    def _denormalize(self, images: torch.Tensor, model) -> torch.Tensor:
        mean, std = self._get_normalization(model)
        if mean is None:
            return images
        return images * std + mean

    @staticmethod
    def _is_detection_model(model: Any) -> bool:
        try:
            return (model.get_model_type() or "classification") == "detection"
        except Exception:  # noqa: BLE001
            return getattr(model, "model_type", "classification") == "detection"

    # ------------------------------------------------------------------ generate

    def generate(
        self,
        model: Any,
        images: torch.Tensor,
        labels: torch.Tensor,
        epsilon: float = 0.03,
        targeted: bool = False,
        **kwargs,
    ) -> Tuple[torch.Tensor, Dict[str, Any]]:
        if self._is_detection_model(model):
            return self._generate_detection(model=model, images=images, epsilon=epsilon)
        return self._generate_classification(
            model=model, images=images, labels=labels, epsilon=epsilon, targeted=targeted
        )

    # ------------------------------------------------------------------ classification

    def _generate_classification(
        self,
        model: Any,
        images: torch.Tensor,
        labels: torch.Tensor,
        epsilon: float,
        targeted: bool,
    ) -> Tuple[torch.Tensor, Dict[str, Any]]:
        device = model.device
        images = images.to(device).detach()
        labels = labels.to(device)

        if targeted:
            num_classes = model.get_num_classes() or 1000
            target_labels = torch.randint(0, num_classes, labels.shape, device=device)
            mask = target_labels == labels
            while mask.any():
                target_labels[mask] = torch.randint(0, num_classes, (mask.sum(),), device=device)
                mask = target_labels == labels
        else:
            target_labels = labels

        raw_model = model._model
        if raw_model is None:
            raise RuntimeError("Model is not loaded; call model.load() first")

        images.requires_grad_(True)
        logits = raw_model(images)
        loss = F.cross_entropy(logits, target_labels)
        grad = torch.autograd.grad(loss, images, create_graph=False)[0]

        if targeted:
            adv_images = images - epsilon * grad.sign()
        else:
            adv_images = images + epsilon * grad.sign()

        adv_images = adv_images.detach()

        mean, std = self._get_normalization(model)
        if mean is not None:
            adv_images = torch.max(
                torch.min(adv_images, (1 - mean) / std),
                (0 - mean) / std,
            )
        else:
            adv_images = torch.clamp(adv_images, 0.0, 1.0)

        with torch.no_grad():
            orig_logits = raw_model(images.detach())
            adv_logits = raw_model(adv_images)
            orig_probs = torch.softmax(orig_logits, dim=1)
            adv_probs = torch.softmax(adv_logits, dim=1)

        orig_pred = orig_logits.argmax(dim=1)
        adv_pred = adv_logits.argmax(dim=1)
        if targeted:
            success = adv_pred == target_labels
        else:
            success = adv_pred != orig_pred

        vis_orig = torch.clamp(self._denormalize(images.detach(), model), 0, 1)
        vis_adv = torch.clamp(self._denormalize(adv_images, model), 0, 1)

        heatmap = torch.abs(vis_adv - vis_orig).mean(dim=1, keepdim=True)
        heatmap = (heatmap - heatmap.min()) / (heatmap.max() - heatmap.min() + 1e-8)

        perturbation = (vis_adv - vis_orig).reshape(images.size(0), -1)
        l2_norm = torch.norm(perturbation, p=2, dim=1)
        linf_norm = torch.norm(perturbation, p=float("inf"), dim=1)

        return vis_adv.detach(), {
            "heatmap": heatmap.cpu(),
            "original_probs": orig_probs.cpu(),
            "adv_probs": adv_probs.cpu(),
            "success_rate": success.float().mean().item(),
            "avg_l2_norm": l2_norm.mean().item(),
            "avg_linf_norm": linf_norm.mean().item(),
            "epsilon": float(epsilon),
            "targeted": bool(targeted),
            "iterations": 1,
        }

    # ------------------------------------------------------------------ detection (vanish)

    def _generate_detection(
        self,
        model: Any,
        images: torch.Tensor,
        epsilon: float,
    ) -> Tuple[torch.Tensor, Dict[str, Any]]:
        """单步 vanish 攻击：FGSM 对 model.compute_attack_loss 求一次梯度。"""
        start = time.time()
        device = model.device
        images = images.to(device).detach()
        batch = images.size(0)

        # 原始检测
        orig_dets = model.predict(images)["detections"][0]

        images.requires_grad_(True)
        loss = model.compute_attack_loss(images, mode="vanish")
        grad = torch.autograd.grad(loss, images, create_graph=False)[0]

        # 朝 loss 减小方向走（让置信度下降）
        adv = images.detach() - epsilon * grad.sign()
        adv = torch.clamp(adv, 0.0, 1.0)

        adv_dets = model.predict(adv)["detections"][0]
        orig_count = len(orig_dets)
        adv_count = len(adv_dets)
        vanish_rate = max(0.0, (orig_count - adv_count) / max(orig_count, 1))

        pert = (adv - images.detach()).reshape(batch, -1)
        l2_norm = torch.norm(pert, p=2, dim=1)
        linf_norm = torch.norm(pert, p=float("inf"), dim=1)

        heatmap = torch.abs(adv - images.detach()).mean(dim=1, keepdim=True)
        heatmap = (heatmap - heatmap.min()) / (heatmap.max() - heatmap.min() + 1e-8)

        dummy_probs = torch.zeros((batch, 1))

        logger.info(
            "FGSM-detection done — orig=%d boxes, adv=%d boxes, vanish=%.2f%% t=%.2fs",
            orig_count, adv_count, vanish_rate * 100, time.time() - start,
        )

        return adv.detach(), {
            "heatmap": heatmap.cpu(),
            "original_probs": dummy_probs,
            "adv_probs": dummy_probs,
            "success_rate": float(vanish_rate),
            "avg_l2_norm": l2_norm.mean().item(),
            "avg_linf_norm": linf_norm.mean().item(),
            "epsilon": float(epsilon),
            "targeted": False,
            "iterations": 1,
            "task_type": "detection",
            "original_detections": orig_dets,
            "adversarial_detections": adv_dets,
            "vanish_rate": vanish_rate,
            "orig_box_count": orig_count,
            "adv_box_count": adv_count,
            "time_elapsed": time.time() - start,
        }

    @classmethod
    def get_params_schema(cls) -> Dict[str, Any]:
        return {
            "epsilon": {
                "type": "slider",
                "min": 0.0,
                "max": 0.2,
                "step": 0.005,
                "default": 0.03,
                "label": "Perturbation (epsilon)",
                "description": "L-infinity bound for FGSM perturbation",
            },
            "targeted": {
                "type": "switch",
                "default": False,
                "label": "Targeted Attack",
                "description": "If enabled, attacks toward a random non-original class",
            },
        }
