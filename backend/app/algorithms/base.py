"""BaseAlgorithm abstract class for adversarial attack algorithms."""

from abc import ABC, abstractmethod
from typing import Any, Dict, List, Tuple

import torch


class BaseAlgorithm(ABC):
    """
    Base class for all adversarial attack algorithms.

    Design: algorithms are stateless w.r.t. models — the model is passed to
    generate() rather than bound in __init__. This means a single algorithm
    instance can be reused across multiple tasks/requests without holding a
    reference to heavy model weights.
    """

    name: str               # unique registry key, e.g. "fgsm"
    display_name: str       # human-readable label
    description: str = ""
    category: str = "gradient"
    supported_task_types: List[str] = ["classification"]

    @abstractmethod
    def generate(
        self,
        model: Any,
        images: torch.Tensor,
        labels: torch.Tensor,
        **params,
    ) -> Tuple[torch.Tensor, Dict[str, Any]]:
        """
        Generate adversarial examples.

        Args:
            model:  loaded BaseModel instance (weights already in memory)
            images: preprocessed input tensor [B, C, H, W]
            labels: ground-truth class indices [B]
            **params: algorithm hyper-parameters (epsilon, c, etc.)

        Returns:
            (adv_images, metadata)
            - adv_images: adversarial tensor [B, C, H, W]  (pixel space [0,1])
            - metadata: dict with at least 'heatmap', 'original_probs',
              'adv_probs', 'success_rate', 'avg_l2_norm', 'avg_linf_norm'
        """

    @classmethod
    @abstractmethod
    def get_params_schema(cls) -> Dict[str, Any]:
        """Return a UI-renderable schema dict describing hyper-parameters."""
