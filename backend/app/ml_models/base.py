"""
Lazy-loading BaseModel for ML models.

Key design: __init__ does NOT load model weights. Call .load() explicitly.
This ensures that listing models (registry.list_all()) never triggers weight
loading, saving ~300 MB+ per model on low-spec servers.
"""

from abc import ABC, abstractmethod
from typing import Any, Dict, Optional, Tuple

import numpy as np
import torch
import torch.nn as nn


class ModelType:
    CLASSIFICATION = "classification"
    DETECTION = "detection"


class BaseModel(ABC):
    """
    Lazy-loading model base class.

    Subclasses must define:
        model_id: str           — unique registry key
        display_name: str       — human-readable label
        description: str
        model_type: str         — ModelType constant

    And implement:
        _load_model() -> nn.Module
        predict(images) -> dict
        get_input_shape() -> (C, H, W)
        preprocess(image_np) -> Tensor [1, C, H, W]
    """

    model_id: str
    display_name: str
    description: str = ""
    model_type: str = ModelType.CLASSIFICATION

    def __init__(self, device: Optional[str] = None):
        self.device = device or ("cuda" if torch.cuda.is_available() else "cpu")
        self._model: Optional[nn.Module] = None  # NOT loaded yet

    # ------------------------------------------------------------------ loading

    def load(self) -> "BaseModel":
        """Load weights into memory. Idempotent — safe to call multiple times."""
        if self._model is None:
            self._model = self._load_model()
            self._model.to(self.device)
            self._model.eval()
        return self

    @property
    def is_loaded(self) -> bool:
        return self._model is not None

    @abstractmethod
    def _load_model(self) -> nn.Module:
        """Instantiate and return the nn.Module with weights loaded."""

    # ------------------------------------------------------------------ inference

    @abstractmethod
    def predict(self, images: torch.Tensor) -> Dict[str, Any]:
        """
        Run inference. Must wrap computation in torch.no_grad().

        Returns a dict with at least:
          - classification: {"logits": Tensor[B, C], "type": "classification"}
          - detection:      {"detections": List[List[dict]], "type": "detection"}
        """

    # ------------------------------------------------------------------ metadata

    @abstractmethod
    def get_input_shape(self) -> Tuple[int, int, int]:
        """Return (C, H, W) expected by this model."""

    def get_num_classes(self) -> Optional[int]:
        return None

    def get_model_type(self) -> str:
        return self.model_type

    def preprocess(self, image: np.ndarray) -> torch.Tensor:
        """
        Default preprocessing: resize to input shape, normalize to [0,1].
        Subclasses should override for model-specific normalization.
        """
        import cv2
        from PIL import Image
        from torchvision import transforms

        c, h, w = self.get_input_shape()
        if len(image.shape) == 2:
            image = cv2.cvtColor(image, cv2.COLOR_GRAY2RGB)
        if image.shape[:2] != (h, w):
            image = cv2.resize(image, (w, h))
        if image.dtype != np.uint8:
            image = (image * 255).astype(np.uint8)
        pil = Image.fromarray(image)
        tensor = transforms.ToTensor()(pil)
        return tensor.unsqueeze(0)

    def get_model_info(self) -> Dict[str, Any]:
        return {
            "id": self.model_id,
            "display_name": self.display_name,
            "description": self.description,
            "model_type": self.model_type,
            "input_shape": self.get_input_shape(),
            "num_classes": self.get_num_classes(),
            "device": self.device,
            "is_loaded": self.is_loaded,
        }

    def __repr__(self):
        return (
            f"<{self.__class__.__name__} id={self.model_id!r} "
            f"loaded={self.is_loaded} device={self.device!r}>"
        )
