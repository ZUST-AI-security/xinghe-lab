"""
星河智安 (XingHe ZhiAn) - ResNet100 ImageNet模型实现
使用ImageNet预训练权重，支持1000类分类任务
"""

import torch
import torchvision.models as models
import numpy as np
import os
from typing import Dict, Any, Tuple
from pathlib import Path

from ..base import BaseModel, ModelType
from ..registry import ModelRegistry
from ...core.config import settings

# ImageNet类别名称文件路径
IMAGENET_CLASSES_FILE = settings.imagenet_classes_path

# 加载ImageNet类别名称
def load_imagenet_classes():
    """
    加载ImageNet 1000类别名称
    
    Returns:
        List[str]: 类别名称列表
    """
    # 直接从utils模块获取类别，避免文件依赖
    try:
        from ....core.utils.imagenet_classes import IMAGENET_CLASSES
        return [IMAGENET_CLASSES[i] for i in range(1000)]
    except ImportError:
        # 如果导入失败，返回默认的前1000个类别名
        return [f"class_{i}" for i in range(1000)]

# 全局类别名称缓存
IMAGENET_CLASSES = load_imagenet_classes()

@ModelRegistry.register(
    'resnet100_imagenet',
    display_name='ResNet100 (ImageNet)',
    description='ImageNet预训练的1000分类模型，基于ResNet101架构',
    category='classification',
    tags=['imagenet', 'resnet', 'classification', '1000-classes']
)
class ResNet100ImageNetModel(BaseModel):
    """
    ResNet100 for ImageNet (1000分类)
    
    特点:
    - 输入尺寸: 224x224
    - 输出: 1000类logits
    - 使用ImageNet预训练权重
    - 支持top-k预测和类别名称映射
    
    注意事项:
    - 实际使用ResNet101替代（标准ResNet100较少见）
    - 首次使用会自动下载预训练权重
    - ImageNet类别需要单独的类别文件
    """
    
    def _load_model(self) -> torch.nn.Module:
        """
        加载预训练ResNet模型
        
        Returns:
            torch.nn.Module: ResNet模型
        """
        try:
            # 使用ResNet101作为ResNet100的替代（标准架构）
            # ResNet101在ImageNet上表现优异，参数量接近ResNet100
            model = models.resnet101(weights=models.ResNet101_Weights.IMAGENET1K_V1)
            
            print(f"成功加载ResNet101 ImageNet预训练模型")
            return model
            
        except Exception as e:
            print(f"加载预训练模型失败，尝试使用无权重模型: {e}")
            # 如果预训练权重加载失败，使用无权重模型
            model = models.resnet101(weights=None)
            print("警告: 使用未训练的模型，预测结果将不准确")
            return model
    
    def predict(self, images: torch.Tensor) -> Dict[str, Any]:
        """
        模型推理
        
        Args:
            images: [batch, 3, 224, 224]
            
        Returns:
            {
                "logits": tensor [batch, 1000],
                "type": "classification"
            }
        """
        with torch.no_grad():
            logits = self.model(images)
        
        return {
            "logits": logits,
            "type": "classification"
        }
    
    def get_input_shape(self) -> Tuple[int, int, int]:
        """
        ImageNet标准输入尺寸
        
        Returns:
            Tuple[int, int, int]: (3, 224, 224)
        """
        return (3, 224, 224)
    
    def get_model_type(self) -> ModelType:
        """
        返回模型类型
        
        Returns:
            ModelType: 分类模型
        """
        return ModelType.CLASSIFICATION
    
    def get_num_classes(self) -> int:
        """
        返回类别数量
        
        Returns:
            int: 1000
        """
        return 1000
    
    def preprocess(self, image: np.ndarray) -> torch.Tensor:
        """
        ImageNet特定预处理：
        1. resize到256x256
        2. 中心裁剪224x224
        3. 使用ImageNet的mean/std进行标准化
        
        Args:
            image: 输入图像 [H, W, C]
            
        Returns:
            torch.Tensor: 预处理后的张量 [1, 3, 224, 224]
        """
        import cv2
        from torchvision import transforms
        
        # 处理灰度图
        if len(image.shape) == 2:
            image = cv2.cvtColor(image, cv2.COLOR_GRAY2RGB)
        
        # 先缩放到256x256（保持宽高比）
        h, w = image.shape[:2]
        scale = 256 / min(h, w)
        new_h, new_w = int(h * scale), int(w * scale)
        image = cv2.resize(image, (new_w, new_h))
        
        # 中心裁剪224x224
        start_h = (new_h - 224) // 2
        start_w = (new_w - 224) // 2
        image = image[start_h:start_h+224, start_w:start_w+224]
        
        # ImageNet标准化参数
        transform = transforms.Compose([
            transforms.ToTensor(),
            transforms.Normalize(
                mean=[0.485, 0.456, 0.406],  # ImageNet mean
                std=[0.229, 0.224, 0.225]    # ImageNet std
            )
        ])
        
        # 转换为PIL Image并应用变换
        from PIL import Image
        if image.dtype == np.uint8:
            image = Image.fromarray(image)
        else:
            image = Image.fromarray((image * 255).astype(np.uint8))
        
        return transform(image).unsqueeze(0)
    
    def postprocess(self, predictions: Dict[str, Any]) -> Dict[str, Any]:
        """
        后处理：计算softmax概率和top-k类别
        
        Args:
            predictions: 原始预测结果
            
        Returns:
            Dict[str, Any]: 处理后的预测结果
        """
        logits = predictions["logits"]
        probs = torch.softmax(logits, dim=1)
        
        # 获取top-5预测
        top5_probs, top5_indices = torch.topk(probs, 5, dim=1)
        
        # 获取类别名称
        batch_size = logits.size(0)
        top5_classes = []
        
        for i in range(batch_size):
            classes = []
            for idx in top5_indices[i].cpu().numpy():
                if idx < len(IMAGENET_CLASSES):
                    classes.append(IMAGENET_CLASSES[idx])
                else:
                    classes.append(f"class_{idx}")
            top5_classes.append(classes)
        
        # 获取最终预测类别
        final_indices = torch.argmax(probs, dim=1)
        final_classes = []
        final_confidences = []
        
        for idx in final_indices.cpu().numpy():
            if idx < len(IMAGENET_CLASSES):
                final_classes.append(IMAGENET_CLASSES[idx])
            else:
                final_classes.append(f"class_{idx}")
        
        final_confidences = probs.max(dim=1)[0].cpu().numpy().tolist()
        
        return {
            "type": "classification",
            "logits": logits.cpu().numpy().tolist(),
            "probabilities": probs.cpu().numpy().tolist(),
            "final_prediction": {
                "classes": final_classes,
                "confidences": final_confidences,
                "indices": final_indices.cpu().numpy().tolist()
            },
            "top5": {
                "probabilities": top5_probs.cpu().numpy().tolist(),
                "indices": top5_indices.cpu().numpy().tolist(),
                "classes": top5_classes
            },
            "num_classes": self.get_num_classes()
        }
    
    def get_class_name(self, class_id: int) -> str:
        """
        根据类别ID获取类别名称
        
        Args:
            class_id: 类别ID
            
        Returns:
            str: 类别名称
        """
        if 0 <= class_id < len(IMAGENET_CLASSES):
            return IMAGENET_CLASSES[class_id]
        return f"class_{class_id}"
    
    def get_model_info(self) -> Dict[str, Any]:
        """
        获取模型详细信息
        
        Returns:
            Dict[str, Any]: 模型信息
        """
        info = super().get_model_info()
        info.update({
            "dataset": "ImageNet",
            "architecture": "ResNet101 (as ResNet100)",
            "pretrained": True,
            "input_normalization": {
                "mean": [0.485, 0.456, 0.406],
                "std": [0.229, 0.224, 0.225]
            },
            "class_names_file": IMAGENET_CLASSES_FILE,
            "has_class_names": len(IMAGENET_CLASSES) > 0
        })
        return info
