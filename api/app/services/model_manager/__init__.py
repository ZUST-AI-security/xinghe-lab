"""
星河智安 (XingHe ZhiAn) - 模型管理器模块
统一管理所有AI模型，支持分类和检测任务
"""

from .base import BaseModel, ModelType
from .registry import ModelRegistry, get_model_registry, model_registry

# 导入所有模型实现以触发注册
try:
    from .classification.resnet100_imagenet import *
except ImportError:
    pass  # 模型文件不存在时忽略

try:
    from .detection.yolov8 import *
except ImportError:
    pass  # 模型文件不存在时忽略

__all__ = [
    'BaseModel',
    'ModelType', 
    'ModelRegistry',
    'get_model_registry',
    'model_registry'
]
