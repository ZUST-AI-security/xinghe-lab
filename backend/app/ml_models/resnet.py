"""
ResNet101 pretrained on ImageNet-1K (registered as resnet100_imagenet).

Lazy-loading: weights are NOT downloaded/loaded until .load() is called.
"""

import logging
from typing import Any, Dict, Optional, Tuple

import numpy as np
import torch
import torch.nn as nn
import torchvision.models as tv_models

from app.ml_models.base import BaseModel, ModelType

logger = logging.getLogger(__name__)

# ImageNet normalization constants (used in preprocess and attack clamping)
IMAGENET_MEAN = [0.485, 0.456, 0.406]
IMAGENET_STD = [0.229, 0.224, 0.225]


def _get_imagenet_classes():
    try:
        from app.utils.imagenet_classes import IMAGENET_CLASSES
        return [IMAGENET_CLASSES[i] for i in range(1000)]
    except Exception:
        return [f"class_{i}" for i in range(1000)]


# Module-level cache so class-name list is loaded only once per process
_IMAGENET_NAMES: Optional[list] = None


def get_imagenet_names() -> list:
    global _IMAGENET_NAMES
    if _IMAGENET_NAMES is None:
        _IMAGENET_NAMES = _get_imagenet_classes()
    return _IMAGENET_NAMES


class ResNetImageNetModel(BaseModel):
    model_id = "resnet100_imagenet"
    display_name = "ResNet100 (ImageNet)"
    description = "ResNet101 pretrained on ImageNet-1K — 1000-class classification"
    model_type = ModelType.CLASSIFICATION

    # Expose for FGSM clamping
    IMAGENET_MEAN = IMAGENET_MEAN
    IMAGENET_STD = IMAGENET_STD

    def _load_model(self) -> nn.Module:
        try:
            model = tv_models.resnet101(weights=tv_models.ResNet101_Weights.IMAGENET1K_V1)
            logger.info("Loaded ResNet101 with IMAGENET1K_V1 weights")
        except Exception as e:
            logger.warning(f"Failed to load pretrained weights: {e}; using random weights")
            model = tv_models.resnet101(weights=None)
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
        import cv2
        from PIL import Image
        from torchvision import transforms

        if len(image.shape) == 2:
            image = cv2.cvtColor(image, cv2.COLOR_GRAY2RGB)

        # Resize shortest side to 256, then center-crop 224×224
        h, w = image.shape[:2]
        scale = 256 / min(h, w)
        image = cv2.resize(image, (int(w * scale), int(h * scale)))
        h2, w2 = image.shape[:2]
        sh, sw = (h2 - 224) // 2, (w2 - 224) // 2
        image = image[sh:sh + 224, sw:sw + 224]

        if image.dtype != np.uint8:
            image = (image * 255).astype(np.uint8)

        transform = transforms.Compose([
            transforms.ToTensor(),
            transforms.Normalize(mean=IMAGENET_MEAN, std=IMAGENET_STD),
        ])
        return transform(Image.fromarray(image)).unsqueeze(0)

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
        names = get_imagenet_names()
        return names[class_id] if 0 <= class_id < len(names) else f"class_{class_id}"

    def get_model_info(self) -> Dict[str, Any]:
        info = super().get_model_info()
        info.update({
            "dataset": "ImageNet-1K",
            "architecture": "ResNet101",
            "pretrained": True,
            "normalization": {"mean": IMAGENET_MEAN, "std": IMAGENET_STD},
        })
        return info
