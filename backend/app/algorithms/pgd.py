"""
PGD (Projected Gradient Descent) adversarial attack algorithm.

Ported from services/attacks/pgd.py (pgd-zxy branch) with the following
key changes to match the refactored architecture:
- Model is passed to generate() rather than bound in __init__
- Uses model._model (raw nn.Module) for gradient computation so that
  torch.no_grad() inside model.predict() cannot block gradient flow
- Handles ImageNet normalization: works in normalized space, returns
  de-normalized pixel-space images [0, 1] (same as fgsm.py)
- No decorator-based registry — registered explicitly in __init__.py
"""

import logging
import time
from typing import Any, Dict, Tuple

import torch
import torch.nn.functional as F

from app.algorithms.base import BaseAlgorithm

logger = logging.getLogger(__name__)


class PGDAlgorithm(BaseAlgorithm):
    name = "pgd"
    display_name = "PGD Attack"
    description = "Projected Gradient Descent — iterative L∞/L2 adversarial attack"
    category = "gradient"
    supported_task_types = ["classification"]

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

    def _compute_loss(
        self,
        raw_model: torch.nn.Module,
        adv_images: torch.Tensor,
        targets: torch.Tensor,
        loss_type: str,
        targeted: bool,
    ) -> torch.Tensor:
        logits = raw_model(adv_images)
        if loss_type == "ce":
            loss = F.cross_entropy(logits, targets, reduction="none")
        elif loss_type == "dlr":
            num_classes = logits.size(1)
            one_hot = torch.zeros_like(logits).scatter_(1, targets.unsqueeze(1), 1.0)
            target_logits = (logits * one_hot).sum(dim=1)
            masked = logits * (1 - one_hot)
            max_other = masked.max(dim=1)[0]
            loss = -(target_logits - max_other)
        else:
            raise ValueError(f"Unsupported loss_type: {loss_type}")

        if targeted:
            # Minimise loss → push toward the target class
            return -loss
        return loss

    @staticmethod
    def _project_linf(perturbations: torch.Tensor, epsilon: float) -> torch.Tensor:
        return perturbations.clamp(-epsilon, epsilon)

    @staticmethod
    def _project_l2(perturbations: torch.Tensor, epsilon: float) -> torch.Tensor:
        batch = perturbations.size(0)
        norms = torch.norm(perturbations.view(batch, -1), dim=1, keepdim=True)
        norms = norms.view(batch, 1, 1, 1)
        scale = torch.clamp(epsilon / (norms + 1e-8), max=1.0)
        return perturbations * scale

    # ------------------------------------------------------------------ generate

    def generate(
        self,
        model: Any,
        images: torch.Tensor,
        labels: torch.Tensor,
        epsilon: float = 0.03,
        alpha: float = 0.01,
        num_iter: int = 40,
        targeted: bool = False,
        random_start: bool = True,
        loss_type: str = "ce",
        norm: str = "linf",
        **kwargs,
    ) -> Tuple[torch.Tensor, Dict[str, Any]]:
        """
        Generate PGD adversarial examples.

        Args:
            model:       loaded BaseModel instance
            images:      preprocessed input tensor [B, C, H, W] (normalised)
            labels:      ground-truth class indices [B]
            epsilon:     maximum perturbation magnitude
            alpha:       per-step size
            num_iter:    number of PGD steps
            targeted:    if True, attacks toward `labels`; else away from them
            random_start: initialise with random perturbation inside epsilon-ball
            loss_type:   'ce' (cross-entropy) or 'dlr' (difference of logits ratio)
            norm:        'linf' or 'l2'

        Returns:
            (adv_images_pixel, metadata)
            adv_images_pixel: de-normalised pixel-space tensor [B, C, H, W] in [0,1]
        """
        start = time.time()
        raw_model = model._model
        if raw_model is None:
            raise RuntimeError("Model is not loaded; call model.load() first")

        device = model.device
        images = images.to(device).detach()
        labels = labels.to(device)
        batch = images.size(0)

        mean, std = self._get_normalization(model)
        has_norm = mean is not None

        # Valid pixel range in normalised space
        if has_norm:
            lower_bound = (0.0 - mean) / std   # [1, 3, 1, 1]
            upper_bound = (1.0 - mean) / std
        else:
            lower_bound = torch.zeros_like(images)
            upper_bound = torch.ones_like(images)

        # ---- initialise adversarial images --------------------------------
        if random_start:
            if norm == "linf":
                delta = torch.empty_like(images).uniform_(-epsilon, epsilon)
            else:
                delta = torch.randn_like(images)
                norms = torch.norm(delta.view(batch, -1), dim=1, keepdim=True).view(batch, 1, 1, 1)
                delta = delta / (norms + 1e-8) * epsilon
            adv = torch.clamp(images + delta, lower_bound, upper_bound).detach()
        else:
            adv = images.clone().detach()

        # Track best result by loss magnitude
        best_adv = adv.clone()
        best_loss = torch.full((batch,), -1e9, device=device)

        # Get original predictions (for success-rate tracking)
        with torch.no_grad():
            orig_logits = raw_model(images)
            orig_labels_pred = orig_logits.argmax(dim=1)

        history = {"losses": [], "l2_norms": [], "linf_norms": []}

        # ---- PGD iteration loop -------------------------------------------
        for step in range(num_iter):
            adv.requires_grad_(True)
            loss_vec = self._compute_loss(raw_model, adv, labels, loss_type, targeted)
            loss_mean = loss_vec.mean()
            loss_mean.backward()

            with torch.no_grad():
                grad = adv.grad.data

                if norm == "linf":
                    adv_new = adv + alpha * grad.sign()
                else:
                    g_norms = torch.norm(grad.view(batch, -1), dim=1, keepdim=True).view(batch, 1, 1, 1)
                    adv_new = adv + alpha * grad / (g_norms + 1e-8)

                # Project back to epsilon-ball around original images
                delta = adv_new - images
                if norm == "linf":
                    delta = self._project_linf(delta, epsilon)
                else:
                    delta = self._project_l2(delta, epsilon)

                adv = torch.clamp(images + delta, lower_bound, upper_bound).detach()

                # Keep best adversarial (highest mean loss magnitude)
                improved = loss_vec.detach() > best_loss
                best_loss = torch.where(improved, loss_vec.detach(), best_loss)
                for i in range(batch):
                    if improved[i]:
                        best_adv[i] = adv[i]

            if step % 10 == 0 or step == num_iter - 1:
                pert = (adv - images).view(batch, -1)
                history["losses"].append(loss_mean.item())
                history["l2_norms"].append(torch.norm(pert, p=2, dim=1).mean().item())
                history["linf_norms"].append(torch.norm(pert, p=float("inf"), dim=1).mean().item())

        # ---- post-processing ----------------------------------------------
        with torch.no_grad():
            adv_logits = raw_model(best_adv)
            adv_pred = adv_logits.argmax(dim=1)

            if targeted:
                success = adv_pred == labels
            else:
                success = adv_pred != orig_labels_pred

            orig_probs = torch.softmax(orig_logits, dim=1)
            adv_probs = torch.softmax(adv_logits, dim=1)

        # De-normalise for output and heatmap
        vis_orig = torch.clamp(self._denormalize(images, model), 0.0, 1.0) if has_norm else images
        vis_adv = torch.clamp(self._denormalize(best_adv, model), 0.0, 1.0) if has_norm else best_adv

        heatmap = torch.abs(vis_adv - vis_orig).mean(dim=1, keepdim=True)
        heatmap = (heatmap - heatmap.min()) / (heatmap.max() - heatmap.min() + 1e-8)

        pert_pixel = (vis_adv - vis_orig).view(batch, -1)
        l2_norm = torch.norm(pert_pixel, p=2, dim=1)
        linf_norm = torch.norm(pert_pixel, p=float("inf"), dim=1)

        logger.info(
            "PGD done — success=%.2f%% l2=%.4f linf=%.4f t=%.2fs",
            success.float().mean().item() * 100,
            l2_norm.mean().item(),
            linf_norm.mean().item(),
            time.time() - start,
        )

        return vis_adv.detach(), {
            "heatmap": heatmap.cpu(),
            "original_probs": orig_probs.cpu(),
            "adv_probs": adv_probs.cpu(),
            "success_rate": success.float().mean().item(),
            "avg_l2_norm": l2_norm.mean().item(),
            "avg_linf_norm": linf_norm.mean().item(),
            "epsilon": float(epsilon),
            "alpha": float(alpha),
            "num_iter": num_iter,
            "targeted": bool(targeted),
            "norm": norm,
            "loss_type": loss_type,
            "history": history,
            "time_elapsed": time.time() - start,
        }

    # ------------------------------------------------------------------ schema

    @classmethod
    def get_params_schema(cls) -> Dict[str, Any]:
        return {
            "epsilon": {
                "type": "slider",
                "min": 0.001,
                "max": 0.5,
                "step": 0.001,
                "default": 0.03,
                "label": "扰动幅度 ε",
                "description": "最大扰动幅度，控制对抗样本与原始图像的最大差异",
            },
            "alpha": {
                "type": "slider",
                "min": 0.0001,
                "max": 0.1,
                "step": 0.0005,
                "default": 0.01,
                "label": "步长 α",
                "description": "每次迭代的步长，影响攻击收敛速度",
            },
            "num_iter": {
                "type": "slider",
                "min": 5,
                "max": 200,
                "step": 5,
                "default": 40,
                "label": "迭代次数",
                "description": "PGD迭代次数，次数越多攻击越强但耗时增加",
            },
            "random_start": {
                "type": "switch",
                "default": True,
                "label": "随机初始化",
                "description": "是否在epsilon球内随机初始化，提高攻击迁移性",
            },
            "targeted": {
                "type": "switch",
                "default": False,
                "label": "定向攻击",
                "description": "开启后攻击到指定类别",
            },
            "loss_type": {
                "type": "select",
                "options": [
                    {"value": "ce", "label": "交叉熵损失 (CE)"},
                    {"value": "dlr", "label": "差分逻辑回归 (DLR)"},
                ],
                "default": "ce",
                "label": "损失函数",
                "description": "CE适合快速攻击，DLR攻击效果更强",
            },
            "norm": {
                "type": "select",
                "options": [
                    {"value": "linf", "label": "L∞范数（最大扰动）"},
                    {"value": "l2", "label": "L2范数（欧氏距离）"},
                ],
                "default": "linf",
                "label": "扰动范数",
                "description": "约束对抗扰动的度量方式",
            },
        }
