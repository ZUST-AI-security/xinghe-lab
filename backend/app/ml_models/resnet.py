"""
ResNet152 pretrained on ImageNet-1K (registered as resnet100_imagenet).

Lazy-loading: weights are NOT downloaded/loaded until .load() is called.
"""

import logging
from pathlib import Path
from typing import Any, Dict, Optional, Tuple

import numpy as np
import torch
import torch.nn as nn
import torchvision.models as tv_models

from app.core.config import settings
from app.utils.imagenet_classes import IMAGENET_CLASSES, get_class_name
from app.ml_models.base import BaseModel, ModelType

logger = logging.getLogger(__name__)

# ImageNet normalization constants (used in preprocess and attack clamping)
IMAGENET_MEAN = [0.485, 0.456, 0.406]
IMAGENET_STD = [0.229, 0.224, 0.225]


def _get_imagenet_classes():
    missing = [i for i in range(1000) if i not in IMAGENET_CLASSES]
    if missing:
        logger.warning("ImageNet class table is incomplete; missing %d entries", len(missing))
    return [IMAGENET_CLASSES.get(i, f"Unknown class {i}") for i in range(1000)]


# Module-level cache so class-name list is loaded only once per process
_IMAGENET_NAMES: Optional[list] = None


def get_imagenet_names() -> list:
    global _IMAGENET_NAMES
    if _IMAGENET_NAMES is None:
        _IMAGENET_NAMES = _get_imagenet_classes()
    return _IMAGENET_NAMES


class ResNetImageNetModel(BaseModel):
    model_id = "resnet100_imagenet"
    display_name = "ResNet152 (ImageNet)"
    description = "ResNet152 pretrained on ImageNet-1K — 1000-class classification"
    model_type = ModelType.CLASSIFICATION
    WEIGHTS = tv_models.ResNet152_Weights.IMAGENET1K_V2

    # Expose for FGSM clamping
    IMAGENET_MEAN = IMAGENET_MEAN
    IMAGENET_STD = IMAGENET_STD

    def _load_model(self) -> nn.Module:
        torch.hub.set_dir(str(Path(settings.model_cache_dir).resolve()))
        try:
            model = tv_models.resnet152(weights=self.WEIGHTS)
            logger.info("Loaded ResNet152 with IMAGENET1K_V2 weights")
        except Exception as e:
            cache_dir = Path(settings.model_cache_dir).resolve()
            raise RuntimeError(
                "Failed to load pretrained ResNet152 weights. "
                f"Please ensure the weight download to '{cache_dir}' completes successfully."
            ) from e
        return model

    def predict(self, images: torch.Tensor) -> Dict[str, Any]:
        with torch.no_grad():
            logits = self._model(images)
        return {"logits": logits, "type": "classification"}

    def get_input_shape(self) -> Tuple[int, int, int]:
        return (3, 224, 224)

    def get_num_classes(self) -> int:
        return 1000

    def get_model_type(self) -> str:
        return ModelType.CLASSIFICATION

    def preprocess(self, image: np.ndarray) -> torch.Tensor:
        from PIL import Image

        if image.dtype != np.uint8:
            image = (image * 255).astype(np.uint8)
        pil_image = Image.fromarray(image).convert("RGB")
        transform = self.WEIGHTS.transforms()
        return transform(pil_image).unsqueeze(0)

    def postprocess(self, predictions: Dict[str, Any]) -> Dict[str, Any]:
        logits = predictions["logits"]
        probs = torch.softmax(logits, dim=1)
        top5_probs, top5_idx = torch.topk(probs, 5, dim=1)
        names = get_imagenet_names()
        top5_names = [[names[i] for i in row.cpu().tolist()] for row in top5_idx]
        return {
            "type": "classification",
            "probabilities": probs.cpu().tolist(),
            "top5": {
                "probs": top5_probs.cpu().tolist(),
                "indices": top5_idx.cpu().tolist(),
                "names": top5_names,
            },
            "prediction": {
                "class_idx": probs.argmax(dim=1).cpu().tolist(),
                "class_name": [names[i] for i in probs.argmax(dim=1).cpu().tolist()],
                "confidence": probs.max(dim=1)[0].cpu().tolist(),
            },
        }

    def get_class_name(self, class_id: int) -> str:
        return get_class_name(class_id)

    def get_model_info(self) -> Dict[str, Any]:
        info = super().get_model_info()
        info.update({
            "dataset": "ImageNet-1K",
            "architecture": "ResNet152",
            "pretrained": True,
            "normalization": {"mean": IMAGENET_MEAN, "std": IMAGENET_STD},
        })
        return info
