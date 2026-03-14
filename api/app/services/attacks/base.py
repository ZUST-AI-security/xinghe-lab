"""
星河智安 (XingHe ZhiAn) - 攻击算法基类
适配分类和检测模型，提供统一的攻击算法接口
"""

from abc import ABC, abstractmethod
import torch
from typing import Dict, Any, Tuple, Optional, Union
import logging

from ..model_manager.base import BaseModel, ModelType

logger = logging.getLogger(__name__)

class BaseAttack(ABC):
    """
    攻击算法基类
    
    特点:
    - 接收BaseModel实例，自动适配分类/检测
    - 统一接口，便于扩展
    - 支持定向和非定向攻击
    - 提供参数配置schema
    
    设计理念:
    1. 模型无关：通过BaseModel抽象层，支持不同模型架构
    2. 算法统一：所有攻击算法使用相同的接口
    3. 类型安全：明确区分分类和检测任务的攻击
    4. 可扩展性：易于添加新的攻击算法
    
    使用示例:
    class MyAttack(BaseAttack):
        def generate(self, images, targets, **params):
            # 实现攻击逻辑
            return adv_images, metadata
    """
    
    def __init__(self, model: BaseModel):
        """
        初始化攻击算法
        
        Args:
            model: BaseModel实例（封装了具体模型）
        """
        self.model = model
        self.device = model.device
        self.model_type = model.get_model_type()
        
        logger.info(f"初始化攻击算法 {self.__class__.__name__}，模型类型: {self.model_type.value}")
    
    @abstractmethod
    def generate(self, 
                 images: torch.Tensor, 
                 targets: Any, 
                 **params) -> Tuple[torch.Tensor, Dict[str, Any]]:
        """
        生成对抗样本
        
        Args:
            images: 原始图像张量（已预处理）[batch, C, H, W]
            targets: 
                - 分类模型: 标签张量 [batch]
                - 检测模型: 目标检测结果 List[Dict]
            **params: 算法参数
            
        Returns:
            adv_images: 对抗样本张量 [batch, C, H, W]
            metadata: 附加信息（用于可视化）
        """
        pass
    
    @classmethod
    @abstractmethod
    def get_params_schema(cls) -> Dict[str, Any]:
        """
        参数配置schema（前端动态渲染）
        
        Returns:
            Dict[str, Any]: 参数配置schema
        """
        pass
    
    def validate_model_type(self, supported_types: list) -> bool:
        """
        验证模型类型是否支持
        
        Args:
            supported_types: 支持的模型类型列表
            
        Returns:
            bool: 是否支持
            
        Raises:
            ValueError: 不支持时抛出异常
        """
        if self.model_type not in supported_types:
            raise ValueError(
                f"{self.__class__.__name__} 不支持 {self.model_type.value} 模型，"
                f"仅支持: {[t.value for t in supported_types]}"
            )
        return True
    
    def _get_loss_for_classification(self, adv_images, original_images, labels, **params):
        """
        分类任务的损失函数 - 子类实现
        
        Args:
            adv_images: 对抗样本
            original_images: 原始图像
            labels: 真实标签
            **params: 其他参数
            
        Returns:
            torch.Tensor: 损失值
        """
        raise NotImplementedError("子类必须实现分类任务的损失函数")
    
    def _get_loss_for_detection(self, adv_images, original_images, detections, **params):
        """
        检测任务的损失函数 - 子类实现
        
        Args:
            adv_images: 对抗样本
            original_images: 原始图像
            detections: 检测结果
            **params: 其他参数
            
        Returns:
            torch.Tensor: 损失值
        """
        raise NotImplementedError("子类必须实现检测任务的损失函数")
    
    def _check_attack_success(self, 
                             original_predictions: Dict[str, Any],
                             adversarial_predictions: Dict[str, Any],
                             targets: Any,
                             targeted: bool = False) -> torch.Tensor:
        """
        检查攻击是否成功
        
        Args:
            original_predictions: 原始预测结果
            adversarial_predictions: 对抗样本预测结果
            targets: 攻击目标
            targeted: 是否为定向攻击
            
        Returns:
            torch.Tensor: 攻击成功标记 [batch]
        """
        if self.model_type == ModelType.CLASSIFICATION:
            return self._check_classification_success(
                original_predictions, adversarial_predictions, targets, targeted
            )
        elif self.model_type == ModelType.DETECTION:
            return self._check_detection_success(
                original_predictions, adversarial_predictions, targets, targeted
            )
        else:
            raise ValueError(f"不支持的模型类型: {self.model_type}")
    
    def _check_classification_success(self,
                                     original_predictions: Dict[str, Any],
                                     adversarial_predictions: Dict[str, Any],
                                     targets: torch.Tensor,
                                     targeted: bool = False) -> torch.Tensor:
        """
        检查分类攻击是否成功
        
        Args:
            original_predictions: 原始预测结果
            adversarial_predictions: 对抗样本预测结果
            targets: 目标标签
            targeted: 是否为定向攻击
            
        Returns:
            torch.Tensor: 攻击成功标记 [batch]
        """
        original_logits = original_predictions["logits"]
        adv_logits = adversarial_predictions["logits"]
        
        original_pred = original_logits.argmax(dim=1)
        adv_pred = adv_logits.argmax(dim=1)
        
        if targeted:
            # 定向攻击：对抗样本预测应为目标类别
            success = (adv_pred == targets)
        else:
            # 非定向攻击：对抗样本预测不应为原始类别
            success = (adv_pred != original_pred)
        
        return success
    
    def _check_detection_success(self,
                                original_predictions: Dict[str, Any],
                                adversarial_predictions: Dict[str, Any],
                                targets: Any,
                                targeted: bool = False) -> torch.Tensor:
        """
        检查检测攻击是否成功
        
        Args:
            original_predictions: 原始检测结果
            adversarial_predictions: 对抗样本检测结果
            targets: 攻击目标
            targeted: 是否为定向攻击
            
        Returns:
            torch.Tensor: 攻击成功标记 [batch]
        """
        # 检测任务的攻击成功判断较复杂，这里提供基础实现
        # 实际应用中可能需要更复杂的逻辑
        
        original_detections = original_predictions["detections"]
        adversarial_detections = adversarial_predictions["detections"]
        
        batch_size = len(original_detections)
        success = torch.zeros(batch_size, dtype=torch.bool)
        
        for i in range(batch_size):
            orig_dets = original_detections[i]
            adv_dets = adversarial_detections[i]
            
            if targeted:
                # 定向攻击：需要实现特定逻辑
                # 例如：使特定目标不被检测到，或误检为特定类别
                success[i] = len(adv_dets) < len(orig_dets)
            else:
                # 非定向攻击：减少检测数量或降低置信度
                success[i] = len(adv_dets) < len(orig_dets)
        
        return success
    
    def compute_perturbation_norm(self, 
                                 original_images: torch.Tensor,
                                 adversarial_images: torch.Tensor,
                                 norm_type: str = 'L2') -> torch.Tensor:
        """
        计算扰动范数
        
        Args:
            original_images: 原始图像 [batch, C, H, W]
            adversarial_images: 对抗样本 [batch, C, H, W]
            norm_type: 范数类型 ('L0', 'L2', 'Linf')
            
        Returns:
            torch.Tensor: 扰动范数 [batch]
        """
        perturbation = adversarial_images - original_images
        
        if norm_type.upper() == 'L0':
            # L0范数：非零元素数量
            return (perturbation.abs() > 1e-6).view(perturbation.size(0), -1).sum(dim=1).float()
        
        elif norm_type.upper() == 'L2':
            # L2范数
            return torch.norm(perturbation.view(perturbation.size(0), -1), p=2, dim=1)
        
        elif norm_type.upper() == 'LINF':
            # Linf范数
            return torch.norm(perturbation.view(perturbation.size(0), -1), p=float('inf'), dim=1)
        
        else:
            raise ValueError(f"不支持的范数类型: {norm_type}")
    
    def get_attack_info(self) -> Dict[str, Any]:
        """
        获取攻击算法信息
        
        Returns:
            Dict[str, Any]: 攻击算法信息
        """
        return {
            "name": self.__class__.__name__,
            "model_type": self.model_type.value,
            "device": self.device,
            "params_schema": self.get_params_schema()
        }
    
    def __repr__(self):
        return f"<{self.__class__.__name__}(model_type='{self.model_type.value}', device='{self.device}')>"
