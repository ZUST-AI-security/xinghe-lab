"""
XingHe ZhiAn - FGSM attack implementation.
"""

import logging
from typing import Dict, Any, Tuple

import torch
import torch.nn.functional as F

from .base import BaseAttack
from ..model_manager.base import BaseModel
from ...core.models.base import ModelType
from .registry import AttackRegistry

logger = logging.getLogger(__name__)


@AttackRegistry.register(
    'fgsm',
    display_name='FGSM Attack',
    description='Fast Gradient Sign Method (FGSM) attack',
    category='gradient',
    supported_models=['classification'],
    tags=['fgsm', 'gradient', 'fast']
)
class FGSMAttack(BaseAttack):
    """
    Fast Gradient Sign Method (FGSM) for classification models.

    For untargeted attacks, it maximizes the loss of the true label.
    For targeted attacks, it minimizes the loss of a chosen target label.
    """

    def __init__(self, model: BaseModel):
        super().__init__(model)
        self.validate_model_type([ModelType.CLASSIFICATION])
        model_name = getattr(model, "model_name", None) or getattr(model, "name", "unknown")
        logger.info(f"Initialized FGSM attack for model: {model_name}")

    def _get_normalization(self):
        mean = getattr(self.model, "IMAGENET_MEAN", None)
        std = getattr(self.model, "IMAGENET_STD", None)
        if mean is None or std is None:
            mean = getattr(self.model, "mean", None)
            std = getattr(self.model, "std", None)
        if mean is None or std is None:
            return None, None
        mean_t = torch.tensor(mean, device=self.device).view(1, 3, 1, 1)
        std_t = torch.tensor(std, device=self.device).view(1, 3, 1, 1)
        return mean_t, std_t

    def _denormalize_if_needed(self, images: torch.Tensor) -> torch.Tensor:
        mean, std = self._get_normalization()
        if mean is None or std is None:
            return images
        if images.min() < 0 or images.max() > 1:
            return images * std + mean
        return images

    def _select_target_labels(self, targets: torch.Tensor) -> torch.Tensor:
        num_classes = self.model.get_num_classes()
        if not num_classes:
            raise ValueError("Targeted FGSM requires model.get_num_classes() to be defined")

        target_labels = torch.randint(0, num_classes, targets.shape, device=self.device)
        mismatch = target_labels == targets
        while mismatch.any():
            target_labels[mismatch] = torch.randint(0, num_classes, target_labels[mismatch].shape, device=self.device)
            mismatch = target_labels == targets
        return target_labels

    def generate(
        self,
        images: torch.Tensor,
        targets: torch.Tensor,
        targeted: bool = False,
        epsilon: float = 0.03,
        **kwargs
    ) -> Tuple[torch.Tensor, Dict[str, Any]]:
        """
        Generate FGSM adversarial examples.

        Args:
            images: input images [batch, C, H, W], assumed normalized to [0, 1]
            targets: ground-truth labels [batch]
            targeted: whether to run targeted attack
            epsilon: perturbation magnitude (L-infinity bound)

        Returns:
            (adv_images, metadata)
        """
        images = images.to(self.device).detach()
        targets = targets.to(self.device)

        if targeted:
            target_labels = self._select_target_labels(targets)
        else:
            target_labels = targets

        images.requires_grad_(True)
        if self.model.model is None:
            raise ValueError("Model is not loaded; cannot run FGSM")

        logits = self.model.model(images)
        loss = F.cross_entropy(logits, target_labels)

        grad = torch.autograd.grad(loss, images, retain_graph=False, create_graph=False)[0]
        if targeted:
            adv_images = images - epsilon * grad.sign()
        else:
            adv_images = images + epsilon * grad.sign()

        adv_images = adv_images.detach()
        mean, std = self._get_normalization()
        if mean is not None and std is not None:
            clamp_min = (0 - mean) / std
            clamp_max = (1 - mean) / std
            adv_images = torch.max(torch.min(adv_images, clamp_max), clamp_min)
        else:
            adv_images = torch.clamp(adv_images, 0, 1)

        with torch.no_grad():
            original_logits = self.model.model(images)
            adv_logits = self.model.model(adv_images)

            original_probs = torch.softmax(original_logits, dim=1)
            adv_probs = torch.softmax(adv_logits, dim=1)

        original_pred = {"logits": original_logits}
        adv_pred = {"logits": adv_logits}

        success = self._check_attack_success(
            original_pred,
            adv_pred,
            target_labels if targeted else targets,
            targeted
        )

        # Denormalize for visualization/output if needed
        vis_images = self._denormalize_if_needed(images).detach()
        vis_adv_images = self._denormalize_if_needed(adv_images).detach()

        vis_images = torch.clamp(vis_images, 0, 1)
        vis_adv_images = torch.clamp(vis_adv_images, 0, 1)

        heatmap = torch.abs(vis_adv_images - vis_images).mean(dim=1, keepdim=True)
        heatmap = (heatmap - heatmap.min()) / (heatmap.max() - heatmap.min() + 1e-8)

        l2_norm = self.compute_perturbation_norm(vis_images, vis_adv_images, norm_type='L2')
        linf_norm = self.compute_perturbation_norm(vis_images, vis_adv_images, norm_type='Linf')

        metadata = {
            'heatmap': heatmap.cpu(),
            'original_probs': original_probs.cpu(),
            'adv_probs': adv_probs.cpu(),
            'success_rate': success.float().mean().item(),
            'avg_l2_norm': l2_norm.mean().item(),
            'avg_linf_norm': linf_norm.mean().item(),
            'epsilon': float(epsilon),
            'targeted': bool(targeted)
        }

        return vis_adv_images.detach(), metadata

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
                "description": "L-infinity bound for FGSM perturbation"
            },
            "targeted": {
                "type": "switch",
                "default": False,
                "label": "Targeted Attack",
                "description": "If enabled, choose a random target class different from the original"
            }
        }


# Backward-compatible alias
CWAttack = FGSMAttack
