"""
ResNet100模型实现
ImageNet预训练分类模型
"""

import torch
import torch.nn as nn
import torchvision.models as models
import torchvision.transforms as transforms
from typing import Dict, Any, Optional
import logging
from PIL import Image
import numpy as np

from ..base import BaseModel, ModelType

logger = logging.getLogger(__name__)

class ResNet100Model(BaseModel):
    """
    ResNet100分类模型
    
    特性:
    - ImageNet预训练
    - 1000类分类
    - 支持多种权重版本
    """
    
    # ImageNet标准化参数
    IMAGENET_MEAN = [0.485, 0.456, 0.406]
    IMAGENET_STD = [0.229, 0.224, 0.225]
    
    # 输入尺寸
    INPUT_SIZE = 224
    
    def __init__(
        self,
        name: str,
        weights: str = 'IMAGENET1K_V2',
        **kwargs
    ):
        """
        初始化ResNet100
        
        Args:
            name: 模型名称
            weights: 权重版本
                - 'IMAGENET1K_V1': 原始版本
                - 'IMAGENET1K_V2': 改进版本
                - None: 随机初始化
        """
        super().__init__(name, **kwargs)
        self.weights = weights
        self.num_classes = 1000
        
        # 预处理流水线
        self.preprocess = transforms.Compose([
            transforms.Resize(256),
            transforms.CenterCrop(self.INPUT_SIZE),
            transforms.ToTensor(),
            transforms.Normalize(mean=self.IMAGENET_MEAN, std=self.IMAGENET_STD)
        ])
        
        # 反归一化（用于可视化）
        self.denormalize = transforms.Compose([
            transforms.Normalize(
                mean=[0, 0, 0],
                std=[1/s for s in self.IMAGENET_STD]
            ),
            transforms.Normalize(
                mean=[-m for m in self.IMAGENET_MEAN],
                std=[1, 1, 1]
            )
        ])
        
        logger.info(f"ResNet100模型初始化完成: {name}")
    
    def load(self) -> bool:
        """加载预训练权重"""
        try:
            # 加载预训练模型
            weights_enum = getattr(models, f'ResNet101_{self.weights}_Weights', None)
            
            if weights_enum and hasattr(weights_enum, 'DEFAULT'):
                self.model = models.resnet101(weights=weights_enum.DEFAULT)
            else:
                # 回退到默认加载方式
                self.model = models.resnet101(pretrained=True)
            
            self.model = self.model.to(self.device)
            self.model.eval()
            self._loaded = True
            
            logger.info(f"ResNet100模型加载成功: {self.name}")
            return True
            
        except Exception as e:
            logger.error(f"ResNet100模型加载失败: {str(e)}")
            return False
    
    def predict(self, inputs: torch.Tensor) -> Dict[str, Any]:
        """
        执行分类预测
        
        Args:
            inputs: 输入张量 [batch, 3, 224, 224]
            
        Returns:
            {
                'logits': torch.Tensor,  # 原始输出
                'probs': torch.Tensor,   # 概率
                'preds': torch.Tensor,   # 预测类别
                'confidences': torch.Tensor  # 置信度
            }
        """
        if not self.is_loaded:
            self.load()
        
        with torch.no_grad():
            # 前向传播
            logits = self.model(inputs.to(self.device))
            
            # 计算概率
            probs = torch.softmax(logits, dim=1)
            
            # 获取预测结果
            preds = torch.argmax(probs, dim=1)
            confidences = probs[range(len(preds)), preds]
            
            return {
                'logits': logits.cpu(),
                'probs': probs.cpu(),
                'preds': preds.cpu(),
                'confidences': confidences.cpu()
            }
    
    def predict_image(self, image: Image.Image) -> Dict[str, Any]:
        """
        预测单张图片
        
        Args:
            image: PIL图片
            
        Returns:
            预测结果
        """
        # 预处理
        input_tensor = self.preprocess(image).unsqueeze(0)
        
        # 预测
        result = self.predict(input_tensor)
        
        return {
            'class_id': result['preds'][0].item(),
            'confidence': result['confidences'][0].item(),
            'logits': result['logits'][0].tolist(),
            'probs': result['probs'][0].tolist()
        }
    
    def get_model_info(self) -> Dict[str, Any]:
        """获取模型信息"""
        return {
            'name': self.name,
            'type': self.get_model_type().value,
            'input_shape': [3, self.INPUT_SIZE, self.INPUT_SIZE],
            'num_classes': self.num_classes,
            'weights': self.weights,
            'framework': 'pytorch',
            'backbone': 'resnet100',
            'dataset': 'imagenet',
            'device': str(self.device),
            'loaded': self.is_loaded
        }
    
    def get_model_type(self) -> ModelType:
        return ModelType.CLASSIFICATION
    
    def extract_features(self, inputs: torch.Tensor, layer: str = 'avgpool') -> torch.Tensor:
        """
        提取中间层特征
        
        Args:
            inputs: 输入张量
            layer: 层名称
            
        Returns:
            特征向量
        """
        if not self.is_loaded:
            self.load()
        
        # 注册hook或使用中间层
        # 简化实现：返回avgpool层输出
        with torch.no_grad():
            x = self.model.conv1(inputs.to(self.device))
            x = self.model.bn1(x)
            x = self.model.relu(x)
            x = self.model.maxpool(x)
            
            x = self.model.layer1(x)
            x = self.model.layer2(x)
            x = self.model.layer3(x)
            x = self.model.layer4(x)
            
            x = self.model.avgpool(x)
            features = torch.flatten(x, 1)
        
        return features.cpu()


# 便捷函数
def create_resnet100(
    name: str = 'resnet100_imagenet',
    weights: str = 'IMAGENET1K_V2',
    **kwargs
) -> ResNet100Model:
    """
    创建ResNet100模型实例
    
    Args:
        name: 模型名称
        weights: 权重版本
        **kwargs: 其他参数
        
    Returns:
        ResNet100Model实例
    """
    return ResNet100Model(name, weights, **kwargs)
