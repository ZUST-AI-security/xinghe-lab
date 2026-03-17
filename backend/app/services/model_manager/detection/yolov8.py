"""
星河智安 (XingHe ZhiAn) - YOLOv8目标检测模型实现
使用Ultralytics YOLOv8，支持COCO数据集的80类目标检测
"""

import torch
import numpy as np
import cv2
from typing import Dict, Any, List, Tuple, Optional
import os
from pathlib import Path

from ..base import BaseModel, ModelType
from ..registry import ModelRegistry
from ...core.config import settings

# 尝试导入ultralytics
try:
    from ultralytics import YOLO
    ULTRALYTICS_AVAILABLE = True
except ImportError:
    ULTRALYTICS_AVAILABLE = False
    print("警告: ultralytics未安装，请运行: pip install ultralytics")

# COCO数据集类别名称
COCO_CLASSES = [
    'person', 'bicycle', 'car', 'motorcycle', 'airplane', 'bus', 'train', 'truck', 'boat', 'traffic light',
    'fire hydrant', 'stop sign', 'parking meter', 'bench', 'bird', 'cat', 'dog', 'horse', 'sheep', 'cow',
    'elephant', 'bear', 'zebra', 'giraffe', 'backpack', 'umbrella', 'handbag', 'tie', 'suitcase', 'frisbee',
    'skis', 'snowboard', 'sports ball', 'kite', 'baseball bat', 'baseball glove', 'skateboard', 'surfboard',
    'tennis racket', 'bottle', 'wine glass', 'cup', 'fork', 'knife', 'spoon', 'bowl', 'banana', 'apple',
    'sandwich', 'orange', 'broccoli', 'carrot', 'hot dog', 'pizza', 'donut', 'cake', 'chair', 'couch',
    'potted plant', 'bed', 'dining table', 'toilet', 'tv', 'laptop', 'mouse', 'remote', 'keyboard', 'cell phone',
    'microwave', 'oven', 'toaster', 'sink', 'refrigerator', 'book', 'clock', 'vase', 'scissors', 'teddy bear',
    'hair drier', 'toothbrush'
]

@ModelRegistry.register(
    'yolov8',
    display_name='YOLOv8 (COCO)',
    description='Ultralytics YOLOv8目标检测模型，支持COCO数据集80类检测',
    category='detection',
    tags=['yolo', 'detection', 'coco', 'ultralytics', '80-classes']
)
class YOLOv8Model(BaseModel):
    """
    YOLOv8目标检测模型
    
    特点:
    - 输入尺寸: 640x640 (可调整)
    - 输出: 检测框、类别、置信度
    - 使用COCO预训练权重（80类）
    - 支持多种模型规模: n/s/m/l/x
    - 高精度、实时检测
    
    模型规模说明:
    - n: nano (最小，最快)
    - s: small 
    - m: medium
    - l: large
    - x: xlarge (最大，最准)
    
    注意事项:
    - 需要安装ultralytics包
    - 首次使用会自动下载预训练权重
    """
    
    def __init__(self, model_name: str = 'yolov8', model_size: str = None, **kwargs):
        """
        初始化YOLOv8模型
        
        Args:
            model_name: 模型名称
            model_size: 模型规模 ('n', 's', 'm', 'l', 'x')
            **kwargs: 其他参数
        """
        # 从kwargs或配置中获取模型规模
        if model_size is None:
            model_size = kwargs.get('model_size', settings.yolo_model_size)
        
        self.model_size = model_size
        self.conf_threshold = kwargs.get('conf_threshold', settings.yolo_conf_threshold)
        self.iou_threshold = kwargs.get('iou_threshold', settings.yolo_iou_threshold)
        
        super().__init__(model_name, **kwargs)
    
    def _load_model(self) -> Any:
        """
        加载YOLOv8预训练模型
        
        Returns:
            YOLO: YOLOv8模型实例
        """
        if not ULTRALYTICS_AVAILABLE:
            raise ImportError(
                "请安装ultralytics包: pip install ultralytics"
            )
        
        try:
            # 构建模型文件名
            model_file = f'yolov8{self.model_size}.pt'
            
            # 加载预训练模型
            model = YOLO(model_file)
            
            print(f"成功加载YOLOv8{self.model_size}模型")
            return model
            
        except Exception as e:
            print(f"加载YOLOv8模型失败: {e}")
            raise
    
    def predict(self, images: torch.Tensor) -> Dict[str, Any]:
        """
        YOLOv8推理
        
        Args:
            images: [batch, 3, 640, 640]
            
        Returns:
            {
                "detections": List[List[Dict]],  # 每张图的检测结果
                "type": "detection"
            }
        """
        batch_detections = []
        
        for i in range(images.shape[0]):
            # 转回numpy [C,H,W] -> [H,W,C]
            img_np = images[i].cpu().numpy().transpose(1, 2, 0)
            
            # 反标准化到[0,255]
            img_np = (img_np * 255).astype(np.uint8)
            
            # YOLO推理
            results = self.model(
                img_np, 
                conf=self.conf_threshold,
                iou=self.iou_threshold,
                verbose=False
            )
            
            # 解析结果
            detections = []
            if len(results) > 0 and results[0].boxes is not None:
                boxes = results[0].boxes.xyxy.cpu().numpy()  # [x1,y1,x2,y2]
                confs = results[0].boxes.conf.cpu().numpy()
                cls_ids = results[0].boxes.cls.cpu().numpy().astype(int)
                
                for box, conf, cls_id in zip(boxes, confs, cls_ids):
                    # 获取类别名称
                    class_name = self.get_class_name(cls_id)
                    
                    detections.append({
                        "bbox": box.tolist(),  # [x1, y1, x2, y2]
                        "confidence": float(conf),
                        "class_id": int(cls_id),
                        "class_name": class_name
                    })
            
            batch_detections.append(detections)
        
        return {
            "detections": batch_detections,
            "type": "detection"
        }
    
    def get_input_shape(self) -> Tuple[int, int, int]:
        """
        YOLOv8默认输入尺寸
        
        Returns:
            Tuple[int, int, int]: (3, 640, 640)
        """
        return (3, 640, 640)
    
    def get_model_type(self) -> ModelType:
        """
        返回模型类型
        
        Returns:
            ModelType: 检测模型
        """
        return ModelType.DETECTION
    
    def get_num_classes(self) -> int:
        """
        返回类别数量
        
        Returns:
            int: 80 (COCO数据集)
        """
        return 80
    
    def preprocess(self, image: np.ndarray) -> torch.Tensor:
        """
        YOLOv8预处理：
        1. letterbox resize保持宽高比
        2. 归一化到[0,1]
        3. 转为CHW格式
        
        Args:
            image: 输入图像 [H, W, C]
            
        Returns:
            torch.Tensor: 预处理后的张量 [1, 3, 640, 640]
        """
        # 处理灰度图
        if len(image.shape) == 2:
            image = cv2.cvtColor(image, cv2.COLOR_GRAY2RGB)
        
        # 获取目标尺寸
        _, h, w = self.get_input_shape()
        target_size = w  # 假设是正方形
        
        # letterbox resize (保持宽高比)
        h_orig, w_orig = image.shape[:2]
        scale = min(target_size / h_orig, target_size / w_orig)
        new_h, new_w = int(h_orig * scale), int(w_orig * scale)
        
        # 缩放
        resized = cv2.resize(image, (new_w, new_h))
        
        # 创建画布（灰色填充，YOLO标准做法）
        canvas = np.full((target_size, target_size, 3), 114, dtype=np.uint8)
        
        # 居中放置
        y_offset = (target_size - new_h) // 2
        x_offset = (target_size - new_w) // 2
        canvas[y_offset:y_offset+new_h, x_offset:x_offset+new_w] = resized
        
        # 归一化并转tensor
        canvas = canvas / 255.0
        tensor = torch.from_numpy(canvas).float()
        tensor = tensor.permute(2, 0, 1)  # HWC -> CHW
        
        return tensor.unsqueeze(0)
    
    def postprocess(self, predictions: Dict[str, Any]) -> Dict[str, Any]:
        """
        后处理：格式化检测结果
        
        Args:
            predictions: 原始预测结果
            
        Returns:
            Dict[str, Any]: 处理后的检测结果
        """
        detections = predictions["detections"]
        
        # 统计信息
        total_detections = sum(len(dets) for dets in detections)
        class_counts = {}
        
        for batch_dets in detections:
            for det in batch_dets:
                class_name = det["class_name"]
                class_counts[class_name] = class_counts.get(class_name, 0) + 1
        
        return {
            "type": "detection",
            "detections": detections,
            "statistics": {
                "total_detections": total_detections,
                "class_counts": class_counts,
                "num_classes": len(class_counts)
            },
            "num_classes": self.get_num_classes()
        }
    
    def get_class_name(self, class_id: int) -> str:
        """
        根据类别ID获取COCO类别名称
        
        Args:
            class_id: 类别ID
            
        Returns:
            str: 类别名称
        """
        if 0 <= class_id < len(COCO_CLASSES):
            return COCO_CLASSES[class_id]
        return f"class_{class_id}"
    
    def get_model_info(self) -> Dict[str, Any]:
        """
        获取模型详细信息
        
        Returns:
            Dict[str, Any]: 模型信息
        """
        info = super().get_model_info()
        info.update({
            "dataset": "COCO",
            "architecture": f"YOLOv8{self.model_size}",
            "pretrained": True,
            "model_size": self.model_size,
            "conf_threshold": self.conf_threshold,
            "iou_threshold": self.iou_threshold,
            "class_names": COCO_CLASSES,
            "ultralytics_available": ULTRALYTICS_AVAILABLE
        })
        return info
    
    def set_confidence_threshold(self, threshold: float):
        """
        设置置信度阈值
        
        Args:
            threshold: 置信度阈值 (0.0-1.0)
        """
        self.conf_threshold = max(0.0, min(1.0, threshold))
    
    def set_iou_threshold(self, threshold: float):
        """
        设置IoU阈值
        
        Args:
            threshold: IoU阈值 (0.0-1.0)
        """
        self.iou_threshold = max(0.0, min(1.0, threshold))
    
    def visualize_detections(self, image: np.ndarray, detections: List[Dict]) -> np.ndarray:
        """
        可视化检测结果
        
        Args:
            image: 原始图像
            detections: 检测结果列表
            
        Returns:
            np.ndarray: 带检测框的图像
        """
        vis_image = image.copy()
        
        for det in detections:
            bbox = det["bbox"]
            conf = det["confidence"]
            class_name = det["class_name"]
            
            x1, y1, x2, y2 = map(int, bbox)
            
            # 根据置信度选择颜色
            if conf > 0.8:
                color = (0, 255, 0)  # 绿色
            elif conf > 0.5:
                color = (0, 255, 255)  # 黄色
            else:
                color = (0, 0, 255)  # 红色
            
            # 绘制边界框
            cv2.rectangle(vis_image, (x1, y1), (x2, y2), color, 2)
            
            # 绘制标签
            label = f"{class_name}: {conf:.2f}"
            label_size = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 2)[0]
            
            # 标签背景
            cv2.rectangle(
                vis_image,
                (x1, y1 - label_size[1] - 10),
                (x1 + label_size[0], y1),
                color,
                -1
            )
            
            # 标签文字
            cv2.putText(
                vis_image,
                label,
                (x1, y1 - 5),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.5,
                (255, 255, 255),
                2
            )
        
        return vis_image
