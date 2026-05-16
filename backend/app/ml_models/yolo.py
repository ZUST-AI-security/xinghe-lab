"""
YOLOv8 object detection model (Ultralytics).

Lazy-loading: the YOLO weights are NOT downloaded until .load() is called.

为支持检测攻击（B 任务），本模块新增：
  - _load_model 返回 ultralytics 内部 DetectionModel（真正的 nn.Module），
    使其 _model 可参与 PyTorch 计算图，支持对原图做 backprop
  - compute_attack_loss：vanish 攻击的损失（最大化"无目标"程度）
  - predict_via_torch：用 raw tensor 走 detection forward，得到中间张量
"""

import logging
from typing import Any, Dict, List, Optional, Tuple

import cv2
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F

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


class YOLOv8Model(BaseModel):
    model_id = "yolov8"
    display_name = "YOLOv8 (COCO)"
    description = "Ultralytics YOLOv8 — 80-class COCO object detection"
    model_type = ModelType.DETECTION

    # YOLOv8 训练时使用的输入归一化（实际就是 /255，无 mean/std 减法）
    # 这里显式设为 None，攻击算法用此判断是否需要去归一化
    mean = None
    std = None

    def __init__(self, model_size: Optional[str] = None, **kwargs):
        super().__init__(**kwargs)
        self.model_size = model_size or getattr(settings, "yolo_model_size", "n")
        self.conf_threshold = getattr(settings, "yolo_conf_threshold", 0.25)
        self.iou_threshold = getattr(settings, "yolo_iou_threshold", 0.45)
        self._yolo = None  # the wrapping ultralytics.YOLO instance

    # ------------------------------------------------------------------ loading

    def _load_model(self) -> nn.Module:
        if not _ULTRALYTICS_OK:
            raise ImportError("Install ultralytics: pip install ultralytics")
        self._yolo = _YOLO(f"yolov8{self.model_size}.pt")
        # ultralytics.YOLO.model 是 DetectionModel(nn.Module)，weights 已就绪
        detection_model: nn.Module = self._yolo.model  # type: ignore[attr-defined]
        detection_model.float()  # 确保走 fp32，便于梯度传递
        logger.info(f"Loaded YOLOv8{self.model_size} as DetectionModel")
        return detection_model

    # ------------------------------------------------------------------ inference

    def predict(self, images: torch.Tensor) -> Dict[str, Any]:
        """高层 detect 接口：走 ultralytics 的 predict，返回 bbox 列表。"""
        if self._yolo is None:
            raise RuntimeError("YOLOv8 not loaded; call model.load() first")

        batch_detections: List[List[Dict[str, Any]]] = []
        with torch.no_grad():
            for i in range(images.shape[0]):
                img_np = (images[i].detach().cpu().numpy().transpose(1, 2, 0) * 255).astype(np.uint8)
                results = self._yolo(
                    img_np,
                    conf=self.conf_threshold,
                    iou=self.iou_threshold,
                    verbose=False,
                )
                dets: List[Dict[str, Any]] = []
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

    # ------------------------------------------------------------------ attack helpers

    def forward_raw(self, images: torch.Tensor) -> torch.Tensor:
        """
        直接走 DetectionModel forward，**不做 no_grad**。
        返回 ultralytics v8 detect head 的原始输出张量：
            inference 模式下：shape [B, 4 + nc, N]，前 4 维为 (cx, cy, w, h)，后 nc 维为类别 logits
        外面调用必须 require_grad 输入张量本身。
        """
        if self._model is None:
            raise RuntimeError("YOLOv8 not loaded; call model.load() first")
        # eval() 模式下输出 inference tensor；输入要在 [0,1]
        return self._model(images)

    def compute_attack_loss(
        self,
        images: torch.Tensor,
        targets: Optional[torch.Tensor] = None,
        mode: str = "vanish",
    ) -> torch.Tensor:
        """
        生成检测攻击的 loss。攻击算法要"最大化"这个 loss（让检测崩坏）。

        Args:
            images:  [B, 3, H, W] 像素空间 [0, 1]
            targets: 占位，本最小版本未使用
            mode:
              - "vanish": 让模型对所有候选框都给出极低的 objectness/类别置信度
                简化做法：取每个 anchor 上最大类别概率的均值作为损失。
                损失越高表示模型越自信地检测到东西，攻击算法最大化它的"-loss"等价于最小化它。

        Returns:
            标量 Tensor
        """
        # YOLOv8 detect head 的 inference output: tuple/Tensor
        out = self.forward_raw(images)
        # ultralytics v8 detect 在 train()=False 时返回 (preds, ... )
        # 在 inference 模式下 out 可能是 tuple；取主预测张量
        if isinstance(out, (tuple, list)):
            preds = out[0]
        else:
            preds = out

        # preds: [B, 4 + nc, N] → 类别置信度 sigmoid
        if preds.dim() != 3:
            # 兼容 train 模式输出多 head 列表的情况，回退到纯 logits
            return preds.float().abs().mean()

        # 前 4 维是 bbox，后 nc 维是类别
        nc = preds.shape[1] - 4
        cls_logits = preds[:, 4:, :]  # [B, nc, N]
        # 训练时已是 logits，apply sigmoid
        cls_probs = torch.sigmoid(cls_logits)
        # 每个 anchor 的最大类别置信度
        max_cls_per_anchor, _ = cls_probs.max(dim=1)  # [B, N]
        # 损失 = top-K anchor 的平均最大置信度（用 top-K 是为了避免大量背景 anchor 把信号稀释掉）
        k = max(1, min(50, max_cls_per_anchor.shape[1] // 100 or 1))
        topk_vals, _ = torch.topk(max_cls_per_anchor, k=k, dim=1)
        return topk_vals.mean()

    # ------------------------------------------------------------------ metadata

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
