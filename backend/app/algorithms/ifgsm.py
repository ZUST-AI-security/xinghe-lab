"""
I-FGSM (Iterative FGSM / BIM) adversarial attack algorithm.

Adapted from origin/i-fgsm branch to fit the current stateless registry
architecture where model is passed to generate() rather than bound in __init__.

现在同时支持 classification 与 detection 任务：
  · classification 走标准 BIM/CE
  · detection (YOLO) 走多步 vanish 攻击
"""

import logging
import time
from typing import Any, Dict, Tuple

import torch
import torch.nn.functional as F

from app.algorithms.base import BaseAlgorithm

logger = logging.getLogger(__name__)


class IFGSMAlgorithm(BaseAlgorithm):
    name = "ifgsm"
    display_name = "I-FGSM Attack"
    description = "Iterative FGSM (BIM) — 多步迭代 L∞ 对抗攻击"
    category = "gradient"
    supported_task_types = ["classification", "detection"]

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

    def generate(
        self,
        model: Any,
        images: torch.Tensor,
        labels: torch.Tensor,
        epsilon: float = 0.03,
        alpha: float = 0.01,
        num_iterations: int = 40,
        targeted: bool = False,
        **kwargs,
    ) -> Tuple[torch.Tensor, Dict[str, Any]]:
        if self._is_detection_model(model):
            return self._generate_detection(
                model=model, images=images,
                epsilon=epsilon, alpha=alpha, num_iterations=num_iterations,
            )
        return self._generate_classification(
            model=model, images=images, labels=labels,
            epsilon=epsilon, alpha=alpha, num_iterations=num_iterations,
            targeted=targeted,
        )

    # ------------------------------------------------------------------ classification

    def _generate_classification(
        self,
        model: Any,
        images: torch.Tensor,
        labels: torch.Tensor,
        epsilon: float,
        alpha: float,
        num_iterations: int,
        targeted: bool,
    ) -> Tuple[torch.Tensor, Dict[str, Any]]:
        device = model.device
        images = images.to(device).detach()
        labels = labels.to(device)

        raw_model = model._model
        if raw_model is None:
            raise RuntimeError("Model is not loaded; call model.load() first")

        batch_size = images.size(0)

        with torch.no_grad():
            orig_logits = raw_model(images)
            orig_probs = torch.softmax(orig_logits, dim=1)
            orig_labels = orig_logits.argmax(dim=1)

        if targeted:
            num_classes = model.get_num_classes() or 1000
            target_labels = torch.randint(0, num_classes, labels.shape, device=device)
            mask = target_labels == labels
            while mask.any():
                target_labels[mask] = torch.randint(0, num_classes, (mask.sum(),), device=device)
                mask = target_labels == labels
        else:
            target_labels = orig_labels.clone()

        adv_images = images.clone()

        for _ in range(num_iterations):
            adv_images.requires_grad_(True)
            logits = raw_model(adv_images)

            loss = F.cross_entropy(logits, target_labels)
            grad = torch.autograd.grad(loss, adv_images, create_graph=False)[0]
            if targeted:
                adv_images = adv_images.detach() - alpha * grad.sign()
            else:
                adv_images = adv_images.detach() + alpha * grad.sign()

            adv_images = torch.clamp(adv_images, images - epsilon, images + epsilon)

            mean, std = self._get_normalization(model)
            if mean is not None:
                adv_images = torch.max(
                    torch.min(adv_images, (1 - mean) / std),
                    (0 - mean) / std,
                )
            else:
                adv_images = torch.clamp(adv_images, 0.0, 1.0)

            adv_images = adv_images.detach()

        with torch.no_grad():
            adv_logits = raw_model(adv_images)
            adv_probs = torch.softmax(adv_logits, dim=1)

        adv_pred = adv_logits.argmax(dim=1)
        if targeted:
            success = adv_pred == target_labels
        else:
            success = adv_pred != orig_labels

        vis_orig = torch.clamp(self._denormalize(images, model), 0, 1)
        vis_adv = torch.clamp(self._denormalize(adv_images, model), 0, 1)

        heatmap = torch.abs(vis_adv - vis_orig).mean(dim=1, keepdim=True)
        heatmap = (heatmap - heatmap.min()) / (heatmap.max() - heatmap.min() + 1e-8)

        perturbation = (vis_adv - vis_orig).reshape(batch_size, -1)
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
            "alpha": float(alpha),
            "num_iterations": int(num_iterations),
            "targeted": bool(targeted),
        }

    # ------------------------------------------------------------------ detection

    def _generate_detection(
        self,
        model: Any,
        images: torch.Tensor,
        epsilon: float,
        alpha: float,
        num_iterations: int,
    ) -> Tuple[torch.Tensor, Dict[str, Any]]:
        start = time.time()
        device = model.device
        images = images.to(device).detach()
        batch = images.size(0)

        orig_dets = model.predict(images)["detections"][0]

        adv = images.clone().detach()
        for _ in range(num_iterations):
            adv.requires_grad_(True)
            loss = model.compute_attack_loss(adv, mode="vanish")
            grad = torch.autograd.grad(loss, adv, create_graph=False)[0]
            with torch.no_grad():
                adv_new = adv - alpha * grad.sign()
                # 投影到 epsilon 球内（基于原图）
                delta = torch.clamp(adv_new - images, -epsilon, epsilon)
                adv = torch.clamp(images + delta, 0.0, 1.0).detach()

        adv_dets = model.predict(adv)["detections"][0]
        orig_count = len(orig_dets)
        adv_count = len(adv_dets)
        vanish_rate = max(0.0, (orig_count - adv_count) / max(orig_count, 1))

        pert = (adv - images).reshape(batch, -1)
        l2_norm = torch.norm(pert, p=2, dim=1)
        linf_norm = torch.norm(pert, p=float("inf"), dim=1)

        heatmap = torch.abs(adv - images).mean(dim=1, keepdim=True)
        heatmap = (heatmap - heatmap.min()) / (heatmap.max() - heatmap.min() + 1e-8)

        dummy_probs = torch.zeros((batch, 1))

        logger.info(
            "I-FGSM-detection done — orig=%d boxes, adv=%d boxes, vanish=%.2f%% t=%.2fs",
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
            "alpha": float(alpha),
            "num_iterations": int(num_iterations),
            "targeted": False,
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
                "min": 0.01,
                "max": 1.0,
                "step": 0.01,
                "default": 0.03,
                "label": "扰动限制 ε",
                "description": "允许修改的最大像素值（L∞范数限制）",
            },
            "alpha": {
                "type": "slider",
                "min": 0.001,
                "max": 0.1,
                "step": 0.001,
                "default": 0.01,
                "label": "步长 α",
                "description": "每次迭代的扰动大小，推荐为 ε/iterations",
            },
            "num_iterations": {
                "type": "slider",
                "min": 1,
                "max": 100,
                "step": 1,
                "default": 40,
                "label": "迭代次数",
                "description": "I-FGSM 迭代次数，越多越稳定但耗时增加",
            },
            "targeted": {
                "type": "switch",
                "default": False,
                "label": "定向攻击",
                "description": "开启后攻击到指定类别，否则只需误分类",
            },
        }
