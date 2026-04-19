"""
DeepFool adversarial attack algorithm.

Paper: "DeepFool: a simple and accurate method to fool deep neural networks"
       (Moosavi-Dezfooli et al., 2016)
"""

import logging
from typing import Any, Dict, Tuple

import torch
import torch.nn.functional as F

from app.algorithms.base import BaseAlgorithm

logger = logging.getLogger(__name__)


class DeepFoolAlgorithm(BaseAlgorithm):
    name = "deepfool"
    display_name = "DeepFool Attack"
    description = "DeepFool — 最小 L2 扰动对抗攻击，寻找最近决策边界"
    category = "geometric"
    supported_task_types = ["classification"]

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

    def _deepfool_single(
        self,
        image: torch.Tensor,
        raw_model: torch.nn.Module,
        num_classes: int,
        max_iter: int,
        overshoot: float,
    ) -> Tuple[torch.Tensor, int]:
        """对单张图像执行 DeepFool 攻击。"""
        image = image.unsqueeze(0).clone().detach()
        image.requires_grad_(True)

        logits = raw_model(image)
        orig_label = logits.argmax(dim=1).item()

        # 选择 top-k 类别
        _, top_indices = logits[0].sort(descending=True)
        top_indices = top_indices[:num_classes].tolist()

        pert_image = image.clone().detach()
        total_pert = torch.zeros_like(image)

        for i in range(max_iter):
            pert_image.requires_grad_(True)
            logits = raw_model(pert_image)
            current_label = logits.argmax(dim=1).item()

            if current_label != orig_label:
                break

            # 计算原始类别的梯度
            raw_model.zero_grad()
            logits[0, orig_label].backward(retain_graph=True)
            grad_orig = pert_image.grad.clone()

            min_pert_val = float("inf")
            best_pert = None

            for k in top_indices:
                if k == orig_label:
                    continue

                pert_image.grad = None
                raw_model.zero_grad()
                pert_image.requires_grad_(True)

                logits_k = raw_model(pert_image)
                logits_k[0, k].backward(retain_graph=True)
                grad_k = pert_image.grad.clone()

                w_k = grad_k - grad_orig
                f_k = (logits_k[0, k] - logits_k[0, orig_label]).item()

                w_k_flat = w_k.flatten()
                w_k_norm = torch.norm(w_k_flat, p=2).item()

                if w_k_norm < 1e-10:
                    continue

                pert_k = abs(f_k) / (w_k_norm + 1e-10)

                if pert_k < min_pert_val:
                    min_pert_val = pert_k
                    best_pert = (abs(f_k) + 1e-8) / (w_k_norm ** 2 + 1e-10) * w_k

            if best_pert is None:
                break

            total_pert += best_pert
            pert_image = (image + (1 + overshoot) * total_pert).detach()

        return pert_image.squeeze(0).detach(), i + 1

    def generate(
        self,
        model: Any,
        images: torch.Tensor,
        labels: torch.Tensor,
        max_iter: int = 50,
        overshoot: float = 0.02,
        num_classes: int = 10,
        **kwargs,
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

        adv_list = []
        total_iters = []

        for i in range(batch_size):
            adv_img, iters = self._deepfool_single(
                images[i], raw_model, num_classes, max_iter, overshoot
            )
            adv_list.append(adv_img)
            total_iters.append(iters)

        adv_images = torch.stack(adv_list)

        # 投影到有效像素范围
        mean, std = self._get_normalization(model)
        if mean is not None:
            adv_images = torch.max(
                torch.min(adv_images, (1 - mean) / std),
                (0 - mean) / std,
            )
        else:
            adv_images = torch.clamp(adv_images, 0.0, 1.0)

        with torch.no_grad():
            adv_logits = raw_model(adv_images)
            adv_probs = torch.softmax(adv_logits, dim=1)

        adv_pred = adv_logits.argmax(dim=1)
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
            "max_iter": int(max_iter),
            "overshoot": float(overshoot),
            "num_classes": int(num_classes),
            "avg_iterations": sum(total_iters) / len(total_iters) if total_iters else 0,
        }

    @classmethod
    def get_params_schema(cls) -> Dict[str, Any]:
        return {
            "max_iter": {
                "type": "slider",
                "min": 10,
                "max": 200,
                "step": 1,
                "default": 50,
                "label": "最大迭代次数",
                "description": "DeepFool 最大迭代轮数",
            },
            "overshoot": {
                "type": "slider",
                "min": 0.0,
                "max": 0.5,
                "step": 0.01,
                "default": 0.02,
                "label": "过冲系数",
                "description": "超过决策边界的额外扰动比例，提高攻击鲁棒性",
            },
            "num_classes": {
                "type": "slider",
                "min": 2,
                "max": 20,
                "step": 1,
                "default": 10,
                "label": "候选类别数",
                "description": "每次迭代考虑的候选类别数量（Top-K）",
            },
        }
