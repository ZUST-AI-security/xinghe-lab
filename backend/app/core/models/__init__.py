"""
模型模块入口
注册所有可用模型
"""

from .registry import model_registry, register_model, get_model, list_models
from .base import BaseModel, ModelType, ModelDevice

# 导入模型实现
try:
    from .resnet.model import ResNet100Model, create_resnet100
except ImportError as e:
    import logging
    logging.warning(f"ResNet模型导入失败: {e}")

# 注册ResNet100
@register_model(
    'resnet100_imagenet',
    display_name='ResNet100 (ImageNet)',
    description='ImageNet预训练的ResNet100分类模型，支持1000类分类',
    category='classification',
    tags=['resnet', 'imagenet', 'classification', 'cnn'],
    version='2.0.0',
    author='Microsoft Research',
    license='MIT',
    paper='https://arxiv.org/abs/1512.03385',
    weights_url='https://download.pytorch.org/models/resnet100-xxx.pth',
    input_size=[3, 224, 224],
    num_classes=1000,
    framework='pytorch',
    requires_gpu=False,
    min_gpu_memory=2  # 最小需要2GB GPU内存
)
class RegisteredResNet100(ResNet100Model):
    """注册的ResNet100模型"""
    def __init__(self, name: str = 'resnet100_imagenet', **kwargs):
        super().__init__(name=name, **kwargs)

# 导出
__all__ = [
    'model_registry',
    'register_model',
    'get_model',
    'list_models',
    'BaseModel',
    'ModelType',
    'ModelDevice',
    'ResNet100Model',
    'create_resnet100'
]
