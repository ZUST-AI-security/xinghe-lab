"""
YOLOv8 object detection model (Ultralytics).

Lazy-loading: the YOLO weights are NOT downloaded until .load() is called.
"""

import logging
from typing import Any, Dict, List, Optional, Tuple

import cv2
import numpy as np
import torch
import torch.nn as nn

from app.ml_models.base import BaseModel, ModelType
from app.core.config import settings

logger = logging.getLogger(__name__)

try:
    from ultralytics import YOLO as _YOLO
    _ULTRALYTICS_OK = True
except ImportError:
    _ULTRALYTICS_OK = False
    logger.warning("ultralytics not installed — YOLOv8 model will be unavailable")

COCO_CLASSES = [
    'person', 'bicycle', 'car', 'motorcycle', 'airplane', 'bus', 'train', 'truck', 'boat',
    'traffic light', 'fire hydrant', 'stop sign', 'parking meter', 'bench', 'bird', 'cat',
    'dog', 'horse', 'sheep', 'cow', 'elephant', 'bear', 'zebra', 'giraffe', 'backpack',
    'umbrella', 'handbag', 'tie', 'suitcase', 'frisbee', 'skis', 'snowboard', 'sports ball',
    'kite', 'baseball bat', 'baseball glove', 'skateboard', 'surfboard', 'tennis racket',
    'bottle', 'wine glass', 'cup', 'fork', 'knife', 'spoon', 'bowl', 'banana', 'apple',
    'sandwich', 'orange', 'broccoli', 'carrot', 'hot dog', 'pizza', 'donut', 'cake',
    'chair', 'couch', 'potted plant', 'bed', 'dining table', 'toilet', 'tv', 'laptop',
    'mouse', 'remote', 'keyboard', 'cell phone', 'microwave', 'oven', 'toaster', 'sink',
    'refrigerator', 'book', 'clock', 'vase', 'scissors', 'teddy bear', 'hair drier', 'toothbrush',
]


class _DummyModule(nn.Module):
    """Placeholder so BaseModel._model is not None after load()."""
    def forward(self, x):
        return x


class YOLOv8Model(BaseModel):
    model_id = "yolov8"
    display_name = "YOLOv8 (COCO)"
    description = "Ultralytics YOLOv8 — 80-class COCO object detection"
    model_type = ModelType.DETECTION

    def __init__(self, model_size: Optional[str] = None, **kwargs):
        super().__init__(**kwargs)
        self.model_size = model_size or getattr(settings, "yolo_model_size", "n")
        self.conf_threshold = getattr(settings, "yolo_conf_threshold", 0.25)
        self.iou_threshold = getattr(settings, "yolo_iou_threshold", 0.45)
        self._yolo = None  # the actual YOLO object (not nn.Module)

    def _load_model(self) -> nn.Module:
        if not _ULTRALYTICS_OK:
            raise ImportError("Install ultralytics: pip install ultralytics")
        self._yolo = _YOLO(f"yolov8{self.model_size}.pt")
        logger.info(f"Loaded YOLOv8{self.model_size}")
        return _DummyModule()  # keep BaseModel._model non-None

    def predict(self, images: torch.Tensor) -> Dict[str, Any]:
        if self._yolo is None:
            raise RuntimeError("YOLOv8 not loaded; call model.load() first")
        batch_detections = []
        for i in range(images.shape[0]):
            img_np = (images[i].cpu().numpy().transpose(1, 2, 0) * 255).astype(np.uint8)
            results = self._yolo(
                img_np,
                conf=self.conf_threshold,
                iou=self.iou_threshold,
                verbose=False,
            )
            dets = []
            if results and results[0].boxes is not None:
                for box, conf, cls_id in zip(
                    results[0].boxes.xyxy.cpu().numpy(),
                    results[0].boxes.conf.cpu().numpy(),
                    results[0].boxes.cls.cpu().numpy().astype(int),
                ):
                    dets.append({
                        "bbox": box.tolist(),
                        "confidence": float(conf),
                        "class_id": int(cls_id),
                        "class_name": self.get_class_name(int(cls_id)),
                    })
            batch_detections.append(dets)
        return {"detections": batch_detections, "type": "detection"}

    def get_input_shape(self) -> Tuple[int, int, int]:
        return (3, 640, 640)

    def get_num_classes(self) -> int:
        return 80

    def get_model_type(self) -> str:
        return ModelType.DETECTION

    def get_class_name(self, class_id: int) -> str:
        return COCO_CLASSES[class_id] if 0 <= class_id < len(COCO_CLASSES) else f"class_{class_id}"

    def preprocess(self, image: np.ndarray) -> torch.Tensor:
        if len(image.shape) == 2:
            image = cv2.cvtColor(image, cv2.COLOR_GRAY2RGB)
        target = 640
        h, w = image.shape[:2]
        scale = min(target / h, target / w)
        resized = cv2.resize(image, (int(w * scale), int(h * scale)))
        canvas = np.full((target, target, 3), 114, dtype=np.uint8)
        oy, ox = (target - resized.shape[0]) // 2, (target - resized.shape[1]) // 2
        canvas[oy:oy + resized.shape[0], ox:ox + resized.shape[1]] = resized
        tensor = torch.from_numpy(canvas / 255.0).float().permute(2, 0, 1)
        return tensor.unsqueeze(0)
