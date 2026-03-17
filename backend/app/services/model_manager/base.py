"""
星河智安 (XingHe ZhiAn) - 模型基类
统一分类和检测模型的接口，便于攻击算法无缝切换
"""

from abc import ABC, abstractmethod
import torch
import numpy as np
from typing import List, Dict, Any, Union, Optional, Tuple
from enum import Enum

class ModelType(Enum):
    """模型类型枚举"""
    CLASSIFICATION = "classification"
    DETECTION = "detection"

class BaseModel(ABC):
    """
    模型基类（统一分类和检测接口）
    
    所有子类必须实现:
    - predict(): 模型推理（返回统一格式的预测结果）
    - get_input_shape(): 返回输入尺寸
    - _load_model(): 加载预训练模型
    - preprocess(): 图像预处理（可重写）
    - postprocess(): 后处理（统一格式，可重写）
    
    设计理念:
    1. 统一接口：分类和检测模型使用相同的调用方式
    2. 灵活扩展：子类可重写预处理和后处理逻辑
    3. 类型安全：通过ModelType明确模型类型
    4. 设备无关：自动处理CUDA/CPU切换
    
    使用示例:
    class ResNet100Model(BaseModel):
        def predict(self, images):
            logits = self.model(images)
            return {"logits": logits, "type": "classification"}
    
    class YOLOv8Model(BaseModel):
        def predict(self, images):
            detections = self.model(images)
            return {"detections": detections, "type": "detection"}
    """
    
    def __init__(self, model_name: str, device: str = None, **kwargs):
        """
        初始化模型
        
        Args:
            model_name: 模型名称（如 'resnet100_imagenet', 'yolov8'）
            device: 运行设备，默认自动选择
            **kwargs: 其他模型特定参数
        """
        self.model_name = model_name
        self.kwargs = kwargs
        
        # 自动选择设备
        if device is None:
            self.device = 'cuda' if torch.cuda.is_available() else 'cpu'
        else:
            self.device = device
        
        # 加载模型
        self.model = self._load_model()
        self.model.to(self.device)
        self.model.eval()
        
        # 模型信息缓存
        self._input_shape = None
        self._num_classes = None
    
    @abstractmethod
    def _load_model(self) -> torch.nn.Module:
        """
        加载预训练模型 - 子类必须实现
        
        Returns:
            torch.nn.Module: 加载的模型
        """
        pass
    
    @abstractmethod
    def predict(self, images: torch.Tensor) -> Dict[str, Any]:
        """
        模型推理 - 统一返回字典格式
        
        Args:
            images: 预处理后的图像张量 [batch, C, H, W]
            
        Returns:
            统一格式的预测结果:
            - 分类模型: {"logits": tensor, "type": "classification"}
            - 检测模型: {"detections": list, "type": "detection"}
        """
        pass
    
    @abstractmethod
    def get_input_shape(self) -> Tuple[int, int, int]:
        """
        返回输入尺寸 (C, H, W)
        
        Returns:
            Tuple[int, int, int]: 通道数、高度、宽度
        """
        pass
    
    def get_model_type(self) -> ModelType:
        """
        返回模型类型 - 子类可重写
        
        Returns:
            ModelType: 模型类型枚举
        """
        return ModelType.CLASSIFICATION  # 默认分类
    
    def get_num_classes(self) -> int:
        """
        返回类别数 - 子类可重写
        
        Returns:
            int: 类别数量
        """
        return None  # 默认未知
    
    def preprocess(self, image: np.ndarray) -> torch.Tensor:
        """
        图像预处理（可被子类重写）
        默认实现：归一化到[0,1]，resize到输入尺寸，转为[C,H,W]
        
        Args:
            image: 输入图像 [H, W, C] 或 [H, W]
            
        Returns:
            torch.Tensor: 预处理后的张量 [1, C, H, W]
        """
        import cv2
        from torchvision import transforms
        
        # 获取目标尺寸
        c, h, w = self.get_input_shape()
        
        # 处理灰度图
        if len(image.shape) == 2:
            image = cv2.cvtColor(image, cv2.COLOR_GRAY2RGB)
        
        # 缩放
        if image.shape[:2] != (h, w):
            image = cv2.resize(image, (w, h))
        
        # 归一化
        if image.max() > 1.0:
            image = image / 255.0
        
        # 转为张量
        transform = transforms.Compose([
            transforms.ToTensor(),
        ])
        
        from PIL import Image
        if image.dtype == np.uint8:
            image = Image.fromarray(image)
        else:
            image = Image.fromarray((image * 255).astype(np.uint8))
        
        return transform(image).unsqueeze(0)  # 添加batch维度
    
    def postprocess(self, predictions: Dict[str, Any]) -> Dict[str, Any]:
        """
        后处理 - 统一格式化为前端可用的结果
        子类可重写以添加特定处理
        
        Args:
            predictions: 原始预测结果
            
        Returns:
            Dict[str, Any]: 处理后的预测结果
        """
        return predictions
    
    def to(self, device: str):
        """
        切换设备
        
        Args:
            device: 目标设备 ('cuda' 或 'cpu')
            
        Returns:
            self: 支持链式调用
        """
        self.device = device
        self.model.to(device)
        return self
    
    def eval(self):
        """
        设置为评估模式
        
        Returns:
            self: 支持链式调用
        """
        self.model.eval()
        return self
    
    def train(self):
        """
        设置为训练模式
        
        Returns:
            self: 支持链式调用
        """
        self.model.train()
        return self
    
    def get_model_info(self) -> Dict[str, Any]:
        """
        获取模型信息
        
        Returns:
            Dict[str, Any]: 模型详细信息
        """
        return {
            "name": self.model_name,
            "type": self.get_model_type().value,
            "input_shape": self.get_input_shape(),
            "num_classes": self.get_num_classes(),
            "device": self.device,
            "parameters": sum(p.numel() for p in self.model.parameters()),
            "kwargs": self.kwargs
        }
    
    def __repr__(self):
        return f"<{self.__class__.__name__}(name='{self.model_name}', type='{self.get_model_type().value}', device='{self.device}')>"
    
    def __str__(self):
        return self.get_model_info().__str__()
