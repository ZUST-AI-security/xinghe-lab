"""
C&W (Carlini & Wagner) L2 adversarial attack algorithm.

Key design:
- Model is passed to generate() rather than bound in __init__
- images arrive as normalized tensors (ImageNet mean/std); we denormalize to
  [0,1] pixel space first, perform the tanh box-constrained optimization there,
  then renormalize before feeding raw_model so the model always receives
  correctly-scaled inputs.
- No decorator-based registry — registered explicitly in __init__.py
"""

import logging
import time
from typing import Any, Dict, Tuple

import torch
import torch.optim as optim

from app.algorithms.base import BaseAlgorithm

logger = logging.getLogger(__name__)


class CWAlgorithm(BaseAlgorithm):
    name = "cw"
    display_name = "C&W Attack"
    description = "Carlini & Wagner L2 attack — optimization-based, minimal perturbation"
    category = "optimization"
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

    def _denormalize(self, images: torch.Tensor, mean, std) -> torch.Tensor:
        if mean is None:
            return images
        return torch.clamp(images * std + mean, 0.0, 1.0)

    def _normalize(self, pixels: torch.Tensor, mean, std) -> torch.Tensor:
        if mean is None:
            return pixels
        return (pixels - mean) / std

    @staticmethod
    def _arctanh_encode(x: torch.Tensor) -> torch.Tensor:
        """Map [0,1] → tanh space (for box-constrained optimization)."""
        return torch.arctanh((x * 2 - 1) * 0.999999)

    @staticmethod
    def _tanh_decode(w: torch.Tensor) -> torch.Tensor:
        """Map tanh space → [0,1]."""
        return (torch.tanh(w) + 1) / 2

    def _f_loss(
        self,
        raw_model: torch.nn.Module,
        adv_pixels: torch.Tensor,
        mean,
        std,
        target_labels: torch.Tensor,
        kappa: float,
        targeted: bool,
    ) -> torch.Tensor:
        """C&W objective. Renormalizes pixel-space adv before model forward."""
        adv_norm = self._normalize(adv_pixels, mean, std)
        logits = raw_model(adv_norm)
        target_logit = logits.gather(1, target_labels.unsqueeze(1)).squeeze(1)
        mask = torch.ones_like(logits).scatter_(1, target_labels.unsqueeze(1), 0)
        other_logit = (logits * mask).max(dim=1)[0]
        if targeted:
            return torch.clamp(other_logit - target_logit, min=-kappa)
        return torch.clamp(target_logit - other_logit, min=-kappa)

    # ------------------------------------------------------------------ generate

    def generate(
        self,
        model: Any,
        images: torch.Tensor,
        labels: torch.Tensor,
        c: float = 1.0,
        kappa: float = 0.0,
        lr: float = 0.01,
        max_iter: int = 500,
        binary_search_steps: int = 9,
        init_const: float = 1e-2,
        targeted: bool = False,
        abort_early: bool = True,
        early_stop_iters: int = 50,
        progress_callback = None,
        **kwargs,
    ) -> Tuple[torch.Tensor, Dict[str, Any]]:
        start = time.time()
        raw_model = model._model
        if raw_model is None:
            raise RuntimeError("Model is not loaded; call model.load() first")

        device = model.device
        images = images.to(device)
        labels = labels.to(device)
        batch = images.size(0)

        mean, std = self._get_normalization(model)

        # Work in [0,1] pixel space; renormalize before each model forward
        pixels = self._denormalize(images, mean, std)

        if targeted:
            num_classes = model.get_num_classes() or 1000
            target_labels = torch.randint(0, num_classes, labels.shape, device=device)
            mask = target_labels == labels
            while mask.any():
                target_labels[mask] = torch.randint(0, num_classes, (mask.sum(),), device=device)
                mask = target_labels == labels
        else:
            target_labels = labels

        # Binary search state
        lower = torch.zeros(batch, device=device)
        upper = torch.full((batch,), 1e10, device=device)
        c_cur = torch.full((batch,), init_const, device=device)

        best_adv_pixels = pixels.clone()
        best_l2 = torch.full((batch,), 1e10, device=device)

        history_losses: list = []
        total_steps = max(binary_search_steps * max_iter, 1)

        def emit_progress(search_idx: int, iter_idx: int, message: str) -> None:
            if progress_callback is None:
                return
            logical_steps = min(search_idx * max_iter + iter_idx + 1, total_steps)
            percent = 40 + int(logical_steps * 50 / total_steps)
            progress_callback(percent, message)

        for search_step in range(binary_search_steps):
            emit_progress(
                search_step,
                0,
                f"Running attack... search {search_step + 1}/{binary_search_steps}",
            )
            w = self._arctanh_encode(pixels).detach().requires_grad_(True)
            optimizer = optim.Adam([w], lr=lr)
            best_loss_iter = torch.full((batch,), float("inf"), device=device)
            no_improve = torch.zeros(batch, device=device)

            for iteration in range(max_iter):
                optimizer.zero_grad()
                adv_pixels = self._tanh_decode(w)
                l2 = torch.sum((adv_pixels - pixels) ** 2, dim=[1, 2, 3])
                f = self._f_loss(raw_model, adv_pixels, mean, std, target_labels, kappa, targeted)
                loss = (l2 + c_cur * f).mean()
                loss.backward()
                optimizer.step()

                if iteration % 20 == 0:
                    history_losses.append(loss.item())

                if iteration % 10 == 0 or iteration == max_iter - 1:
                    emit_progress(
                        search_step,
                        iteration,
                        (
                            f"Running attack... search {search_step + 1}/{binary_search_steps}, "
                            f"iter {iteration + 1}/{max_iter}"
                        ),
                    )

                if abort_early and iteration % early_stop_iters == 0:
                    cur = (l2 + c_cur * f).detach()
                    improved = cur < best_loss_iter
                    best_loss_iter = torch.where(improved, cur, best_loss_iter)
                    no_improve = torch.where(improved, torch.zeros_like(no_improve), no_improve + 1)
                    if (no_improve >= 2).all():
                        logger.debug(f"C&W early-stop at iter {iteration} (search {search_step})")
                        emit_progress(
                            search_step,
                            iteration,
                            (
                                f"Running attack... search {search_step + 1}/{binary_search_steps}, "
                                f"early stop at iter {iteration + 1}"
                            ),
                        )
                        break

            # Update best adversarial examples
            with torch.no_grad():
                adv_final_pixels = self._tanh_decode(w)
                l2_final = torch.norm(
                    (adv_final_pixels - pixels).reshape(batch, -1), p=2, dim=1
                )
                adv_logits = raw_model(self._normalize(adv_final_pixels, mean, std))
                adv_pred = adv_logits.argmax(dim=1)
                orig_logits = raw_model(images)
                if targeted:
                    success_mask = adv_pred == target_labels
                else:
                    success_mask = adv_pred != orig_logits.argmax(dim=1)

                for i in range(batch):
                    if success_mask[i] and l2_final[i] < best_l2[i]:
                        best_l2[i] = l2_final[i]
                        best_adv_pixels[i] = adv_final_pixels[i]

            # Binary search update for c
            for i in range(batch):
                if success_mask[i]:
                    upper[i] = min(upper[i].item(), c_cur[i].item())
                    if upper[i] < 1e9:
                        c_cur[i] = (lower[i] + upper[i]) / 2
                else:
                    lower[i] = max(lower[i].item(), c_cur[i].item())
                    if upper[i] < 1e9:
                        c_cur[i] = (lower[i] + upper[i]) / 2
                    else:
                        c_cur[i] = c_cur[i] * 10

        final_c = c_cur.mean().item()

        # Build output metadata — use pixel-space adv for heatmap/output image
        with torch.no_grad():
            orig_logits = raw_model(images)
            adv_logits = raw_model(self._normalize(best_adv_pixels, mean, std))
            orig_probs = torch.softmax(orig_logits, dim=1)
            adv_probs = torch.softmax(adv_logits, dim=1)
            orig_pred = orig_logits.argmax(dim=1)
            adv_pred = adv_logits.argmax(dim=1)

        if targeted:
            final_success = (adv_pred == target_labels).float().mean().item()
        else:
            final_success = (adv_pred != orig_pred).float().mean().item()

        original_top1_confidence = orig_probs.max(dim=1)[0].mean().item()
        adversarial_top1_confidence = adv_probs.max(dim=1)[0].mean().item()
        original_class = int(orig_pred[0].item())
        adversarial_class = int(adv_pred[0].item())

        heatmap = torch.abs(best_adv_pixels - pixels).mean(dim=1, keepdim=True)
        heatmap = (heatmap - heatmap.min()) / (heatmap.max() - heatmap.min() + 1e-8)

        perturbation = (best_adv_pixels - pixels).reshape(batch, -1)
        linf_norm = torch.norm(perturbation, p=float("inf"), dim=1)

        return best_adv_pixels.detach(), {
            "heatmap": heatmap.cpu(),
            "original_probs": orig_probs.cpu(),
            "adv_probs": adv_probs.cpu(),
            "success_rate": final_success,
            "avg_l2_norm": best_l2.mean().item(),
            "avg_linf_norm": linf_norm.mean().item(),
            "targeted": bool(targeted),
            "final_c_value": final_c,
            "iterations": max_iter,
            "original_class_id": original_class,
            "adversarial_class_id": adversarial_class,
            "original_top1_confidence": original_top1_confidence,
            "adversarial_top1_confidence": adversarial_top1_confidence,
            "history": {"losses": history_losses},
            "time_elapsed": time.time() - start,
        }

    @classmethod
    def get_params_schema(cls) -> Dict[str, Any]:
        return {
            "c": {
                "type": "slider", "min": 0.001, "max": 10.0, "step": 0.1,
                "default": 1.0, "label": "Trade-off c",
                "description": "Balances perturbation size vs. attack success",
            },
            "kappa": {
                "type": "slider", "min": 0.0, "max": 10.0, "step": 0.5,
                "default": 0.0, "label": "Confidence κ",
                "description": "Minimum confidence gap required for success",
            },
            "lr": {
                "type": "slider", "min": 1e-4, "max": 0.1, "step": 0.001,
                "default": 0.01, "label": "Learning rate",
                "description": "Adam optimizer learning rate",
            },
            "max_iter": {
                "type": "slider", "min": 50, "max": 1000, "step": 50,
                "default": 500, "label": "Max iterations",
                "description": "Maximum optimization steps per binary search step",
            },
            "binary_search_steps": {
                "type": "slider", "min": 1, "max": 20, "step": 1,
                "default": 9, "label": "Binary search steps",
                "description": "Steps for searching optimal c value",
            },
            "init_const": {
                "type": "slider", "min": 1e-4, "max": 1.0, "step": 1e-3,
                "default": 0.01, "label": "Initial c",
                "description": "Starting value for binary search",
            },
            "targeted": {
                "type": "switch", "default": False,
                "label": "Targeted Attack",
                "description": "Attack toward a random non-original class",
            },
            "abort_early": {
                "type": "switch", "default": True,
                "label": "Early stopping",
                "description": "Stop if no improvement for early_stop_iters steps",
            },
            "early_stop_iters": {
                "type": "slider", "min": 10, "max": 200, "step": 10,
                "default": 50, "label": "Early-stop patience",
                "description": "Steps without improvement before stopping",
            },
        }
