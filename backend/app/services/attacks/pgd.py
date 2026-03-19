import torch
import torch.nn as nn
import torch.optim as optim
from typing import Dict, Any, Tuple, Optional
import numpy as np
from .base import BaseAttack
from ..registry import AttackRegistry
from app.core.models.base import ModelType

@AttackRegistry.register('pgd')
class PGDAttack(BaseAttack):
    """PGD攻击算法实现"""
    
    def __init__(self, model, device: str = 'auto'):
        super().__init__(model, device)
        self.validate_model_type(ModelType.CLASSIFICATION)
    
    def generate(self, images: torch.Tensor, targets: Any, **kwargs) -> Tuple[torch.Tensor, Dict[str, Any]]:
        """
        生成PGD对抗样本
        
        关键点:
        1. PGD是迭代式攻击，需要控制每步扰动大小
        2. 使用投影保证扰动在epsilon范围内
        3. 支持随机初始化提高攻击成功率
        """
        # 参数提取 - 基于实际经验设置合理默认值
        epsilon = kwargs.get('epsilon', 8/255)  # 最大扰动范围
        alpha = kwargs.get('alpha', 2/255)      # 每步步长
        num_iter = kwargs.get('num_iter', 40)   # 迭代次数
        random_start = kwargs.get('random_start', True)  # 是否随机初始化
        targeted = kwargs.get('targeted', False)
        norm = kwargs.get('norm', 'Linf')        # 范数类型: Linf, L2
        
        # 将图像缩放到[0,1]范围（假设模型输入要求）
        images = images.clamp(0, 1)
        
        # 随机初始化
        adv_images = images.clone().detach()
        if random_start:
            # 在epsilon范围内随机初始化
            if norm == 'Linf':
                adv_images = adv_images + torch.empty_like(adv_images).uniform_(-epsilon, epsilon)
            elif norm == 'L2':
                batch_size = adv_images.size(0)
                delta = torch.randn_like(adv_images)
                delta_norm = torch.norm(delta.view(batch_size, -1), dim=1, keepdim=True)
                delta = delta / (delta_norm.view(batch_size, 1, 1, 1) + 1e-10)
                delta = delta * epsilon
                adv_images = adv_images + delta
            adv_images = torch.clamp(adv_images, 0, 1).detach()
        
        # 获取原始预测用于非定向攻击
        original_pred = self.model.predict(images)
        original_labels = original_pred["logits"].argmax(dim=1)
        
        # 如果是定向攻击但未提供目标标签，使用原始标签（无效）
        if targeted and targets is None:
            targets = original_labels
            print("警告：定向攻击未提供目标标签，使用原始标签")
        
        # 初始化记录
        history = {
            'losses': [],
            'success_rates': [],
            'perturbation_norms': []
        }
        
        # PGD迭代
        for i in range(num_iter):
            adv_images.requires_grad_(True)
            
            # 前向传播
            outputs = self.model.predict(adv_images)
            logits = outputs["logits"]
            
            # 计算损失
            if targeted:
                # 定向攻击：最小化目标类别的损失
                loss = -nn.CrossEntropyLoss()(logits, targets)
            else:
                # 非定向攻击：最大化真实类别的损失
                loss = nn.CrossEntropyLoss()(logits, original_labels)
            
            # 反向传播获取梯度
            grad = torch.autograd.grad(loss, adv_images, retain_graph=False)[0]
            
            # 根据梯度更新图像
            with torch.no_grad():
                # 计算扰动方向
                if norm == 'Linf':
                    # Linf范数：使用梯度的符号
                    grad_sign = grad.sign()
                    adv_images = adv_images + alpha * grad_sign
                elif norm == 'L2':
                    # L2范数：使用归一化的梯度
                    batch_size = grad.size(0)
                    grad_norm = torch.norm(grad.view(batch_size, -1), dim=1, keepdim=True)
                    grad_normalized = grad / (grad_norm.view(batch_size, 1, 1, 1) + 1e-10)
                    adv_images = adv_images + alpha * grad_normalized
                
                # 投影到epsilon球内
                if norm == 'Linf':
                    # Linf投影：裁剪到[images-epsilon, images+epsilon]
                    adv_images = torch.max(torch.min(adv_images, images + epsilon), images - epsilon)
                elif norm == 'L2':
                    # L2投影：如果超出epsilon，缩放到球内
                    delta = adv_images - images
                    batch_size = delta.size(0)
                    delta_norm = torch.norm(delta.view(batch_size, -1), dim=1, keepdim=True)
                    mask = delta_norm > epsilon
                    delta_norm_clipped = delta_norm.clone()
                    delta_norm_clipped[mask] = epsilon
                    delta = delta / (delta_norm.view(batch_size, 1, 1, 1) + 1e-10) * delta_norm_clipped.view(batch_size, 1, 1, 1)
                    adv_images = images + delta
                
                # 裁剪到有效范围[0,1]
                adv_images = torch.clamp(adv_images, 0, 1)
            
            # 记录历史（每5次迭代记录一次，避免性能开销）
            if i % 5 == 0 or i == num_iter - 1:
                with torch.no_grad():
                    # 计算扰动范数
                    perturbation = adv_images - images
                    if norm == 'Linf':
                        norm_value = torch.max(torch.abs(perturbation.view(images.size(0), -1)), dim=1)[0].mean().item()
                    else:  # L2
                        norm_value = torch.norm(perturbation.view(images.size(0), -1), dim=1).mean().item()
                    
                    history['perturbation_norms'].append(norm_value)
                    history['losses'].append(loss.item())
        
        # 最终评估
        with torch.no_grad():
            original_pred = self.model.predict(images)
            adv_pred = self.model.predict(adv_images)
            success = self._check_attack_success(
                original_pred, adv_pred, 
                targets if targeted else original_labels, 
                targeted
            )
            success_rate = success.float().mean().item()
            
            history['success_rates'] = [success_rate] * len(history['losses'])  # 简化历史记录
            
            # 计算原始和对抗样本的概率分布
            original_probs = torch.softmax(original_pred["logits"], dim=1)
            adv_probs = torch.softmax(adv_pred["logits"], dim=1)
        
        return adv_images, {
            'heatmap': self._generate_heatmap(adv_images - images),
            'original_probs': original_probs.cpu(),
            'adv_probs': adv_probs.cpu(),
            'history': history,
            'success_rate': success_rate,
            'avg_perturbation_norm': history['perturbation_norms'][-1] if history['perturbation_norms'] else 0,
            'epsilon': epsilon,
            'num_iter': num_iter,
            'execution_time': 0.0  # 在API层计算
        }
    
    def _generate_heatmap(self, perturbation: torch.Tensor) -> torch.Tensor:
        """生成扰动热力图"""
        return torch.mean(torch.abs(perturbation), dim=1, keepdim=True)
    
    @staticmethod
    def get_params_schema() -> Dict[str, Any]:
        """获取参数配置schema"""
        return {
            'epsilon': {
                'type': 'float',
                'default': 8/255,
                'min': 1/255,
                'max': 32/255,
                'description': '最大扰动范围 (例如: 8/255)'
            },
            'alpha': {
                'type': 'float',
                'default': 2/255,
                'min': 0.5/255,
                'max': 8/255,
                'description': '每步步长 (通常为epsilon/4到epsilon/10)'
            },
            'num_iter': {
                'type': 'int',
                'default': 40,
                'min': 10,
                'max': 100,
                'description': '迭代次数 (min=10, max=100, 推荐40)'
            },
            'random_start': {
                'type': 'bool',
                'default': True,
                'description': '是否随机初始化对抗样本'
            },
            'targeted': {
                'type': 'bool',
                'default': False,
                'description': '是否为定向攻击'
            },
            'norm': {
                'type': 'str',
                'default': 'Linf',
                'enum': ['Linf', 'L2'],
                'description': '扰动范数类型'
            }
        }