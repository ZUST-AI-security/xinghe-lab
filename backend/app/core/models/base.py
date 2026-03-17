"""
模型基类 - 所有模型的抽象接口
"""

from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, List, Tuple
import torch
import torch.nn as nn
from enum import Enum
import logging

logger = logging.getLogger(__name__)

class ModelType(str, Enum):
    """模型类型枚举"""
    CLASSIFICATION = "classification"  # 分类模型
    DETECTION = "detection"           # 检测模型
    SEGMENTATION = "segmentation"     # 分割模型
    GENERATION = "generation"          # 生成模型
    UNKNOWN = "unknown"                # 未知类型

class ModelDevice(str, Enum):
    """设备类型枚举"""
    CPU = "cpu"
    CUDA = "cuda"
    AUTO = "auto"  # 自动选择

class BaseModel(ABC):
    """
    模型抽象基类
    
    所有具体模型必须继承此类并实现抽象方法
    
    设计原则:
    1. 统一接口：所有模型提供相同的方法签名
    2. 延迟加载：模型实例化时不立即加载权重
    3. 设备管理：支持CPU/GPU切换
    4. 元信息：提供模型描述信息
    """
    
    def __init__(
        self,
        name: str,
        device: ModelDevice = ModelDevice.AUTO,
        **kwargs
    ):
        """
        初始化基类
        
        Args:
            name: 模型名称
            device: 运行设备
            **kwargs: 其他参数
        """
        self.name = name
        self.device = self._get_device(device)
        self.model = None  # 延迟加载
        self.preprocess = None  # 预处理流水线
        self.postprocess = None  # 后处理流水线
        self._loaded = False
        
        logger.info(f"初始化模型 {name}，设备: {self.device}")
    
    def _get_device(self, device: ModelDevice) -> torch.device:
        """获取实际设备"""
        if device == ModelDevice.AUTO:
            return torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        elif device == ModelDevice.CUDA:
            if not torch.cuda.is_available():
                logger.warning("CUDA不可用，回退到CPU")
                return torch.device('cpu')
            return torch.device('cuda')
        else:
            return torch.device('cpu')
    
    @abstractmethod
    def load(self) -> bool:
        """
        加载模型权重
        
        Returns:
            bool: 是否加载成功
        """
        pass
    
    @abstractmethod
    def predict(self, inputs: torch.Tensor) -> Dict[str, Any]:
        """
        执行预测
        
        Args:
            inputs: 输入张量 [batch, channels, height, width]
            
        Returns:
            预测结果字典
        """
        pass
    
    @abstractmethod
    def get_model_info(self) -> Dict[str, Any]:
        """
        获取模型信息
        
        Returns:
            包含模型元信息的字典
        """
        pass
    
    def get_model_type(self) -> ModelType:
        """获取模型类型（可重写）"""
        return ModelType.UNKNOWN
    
    def to(self, device: ModelDevice) -> 'BaseModel':
        """
        切换设备
        
        Args:
            device: 目标设备
            
        Returns:
            self
        """
        if self.model is not None:
            self.device = self._get_device(device)
            self.model = self.model.to(self.device)
            logger.info(f"模型切换到设备: {self.device}")
        return self
    
    def eval(self):
        """切换到评估模式"""
        if self.model is not None:
            self.model.eval()
    
    def train(self):
        """切换到训练模式"""
        if self.model is not None:
            self.model.train()
    
    @property
    def is_loaded(self) -> bool:
        """模型是否已加载"""
        return self._loaded
    
    def unload(self):
        """卸载模型，释放内存"""
        if self.model is not None:
            del self.model
            self.model = None
            self._loaded = False
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
            logger.info(f"模型 {self.name} 已卸载")
    
    def __enter__(self):
        """上下文管理器入口"""
        if not self.is_loaded:
            self.load()
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        """上下文管理器出口"""
        self.unload()
