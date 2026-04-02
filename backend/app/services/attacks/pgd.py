"""
星河智安 (XingHe ZhiAn) - PGD攻击算法实现
Projected Gradient Descent攻击，适配分类模型
"""

import torch
import torch.nn as nn
from typing import Dict, Any, Tuple, Optional
import time
import logging

from .base import BaseAttack
from ...core.models.base import ModelType
from .registry import AttackRegistry

logger = logging.getLogger(__name__)


@AttackRegistry.register(
    'pgd',
    display_name='PGD Attack',
    description='Projected Gradient Descent攻击算法，基于梯度的迭代对抗攻击方法',
    category='gradient',
    supported_models=['classification'],
    tags=['pgd', 'gradient', 'iterative', 'linf', 'l2', 'fast']
)
class PGDAttack(BaseAttack):
    """
    PGD (Projected Gradient Descent) 攻击实现（分类模型版）
    
    算法原理:
    - 论文: "Towards Deep Learning Models Resistant to Adversarial Attacks"
    - 核心思想: 多次迭代应用快速梯度符号方法，并投影到epsilon球内
    - 公式: x_{t+1} = Π_{B(x,ε)} (x_t + α * sign(∇_x L(x_t, y)))
    
    特点:
    - 强攻击能力，被认为是最强的一阶攻击
    - 支持L∞和L2范数约束
    - 支持随机启动提高迁移性
    - 可配置损失函数
    
    参数说明:
    - epsilon: 最大扰动幅度
    - alpha: 每次迭代步长
    - num_iter: 迭代次数
    - random_start: 是否在epsilon球内随机初始化
    - loss_type: 损失函数类型(ce/dlr)
    - norm: 扰动范数类型(linf/l2)
    """
    
    def __init__(self, model):
        """
        初始化PGD攻击
        
        Args:
            model: 分类模型实例
        """
        super().__init__(model)
        
        # 验证模型类型
        self.validate_model_type([ModelType.CLASSIFICATION])
        
        # 损失函数
        self.ce_loss = nn.CrossEntropyLoss()
        
        logger.info(f"初始化PGD攻击，模型: {model.name if hasattr(model, 'name') else 'Unknown'}")
    
    def _compute_loss(self, 
                      logits: torch.Tensor,
                      targets: torch.Tensor,
                      loss_type: str = 'ce') -> torch.Tensor:
        """
        计算攻击损失
        
        Args:
            logits: 模型输出 [batch, num_classes]
            targets: 目标标签 [batch]
            loss_type: 损失类型 (ce:交叉熵, dlr:差分逻辑回归)
            
        Returns:
            torch.Tensor: 损失值 [batch]
        """
        if loss_type == 'ce':
            # 交叉熵损失
            return self.ce_loss(logits, targets)
        elif loss_type == 'dlr':
            # 差分逻辑回归损失 (增强攻击效果)
            num_classes = logits.size(1)
            one_hot_targets = torch.eye(num_classes, device=logits.device)[targets]
            
            # 获取目标类的logits
            target_logits = (logits * one_hot_targets).sum(dim=1)
            
            # 获取最大非目标类的logits
            masked_logits = logits * (1 - one_hot_targets)
            max_other_logits = masked_logits.max(dim=1)[0]
            
            # DLR损失: -(target_logits - max_other_logits)
            loss = -(target_logits - max_other_logits)
            return loss
        else:
            raise ValueError(f"不支持的损失类型: {loss_type}")
    
    def _project_to_ball(self, 
                         perturbations: torch.Tensor, 
                         epsilon: float, 
                         norm: str = 'linf') -> torch.Tensor:
        """
        将扰动投影到epsilon球内
        
        Args:
            perturbations: 扰动张量 [batch, C, H, W]
            epsilon: 最大扰动半径
            norm: 范数类型 (linf/l2)
            
        Returns:
            torch.Tensor: 投影后的扰动
        """
        if norm == 'linf':
            # L∞投影: 裁剪到[-epsilon, epsilon]
            return torch.clamp(perturbations, -epsilon, epsilon)
        elif norm == 'l2':
            # L2投影: 缩放扰动使其L2范数不超过epsilon
            batch_size = perturbations.size(0)
            l2_norms = torch.norm(perturbations.view(batch_size, -1), dim=1, keepdim=True)
            l2_norms = l2_norms.view(batch_size, 1, 1, 1)
            scale = torch.clamp(epsilon / l2_norms, max=1.0)
            return perturbations * scale
        else:
            raise ValueError(f"不支持的范数类型: {norm}")
    
    def generate(self,
                 images: torch.Tensor,
                 targets: torch.Tensor,
                 targeted: bool = False,
                 epsilon: float = 0.03,
                 alpha: float = 0.01,
                 num_iter: int = 40,
                 random_start: bool = True,
                 loss_type: str = 'ce',
                 norm: str = 'linf',
                 **kwargs) -> Tuple[torch.Tensor, Dict[str, Any]]:
        """
        生成PGD对抗样本
        
        Args:
            images: 原始图像 [batch, C, H, W]，范围[0,1]
            targets: 标签 [batch]
            targeted: 是否为定向攻击
            epsilon: 最大扰动幅度
            alpha: 迭代步长
            num_iter: 迭代次数
            random_start: 是否随机初始化
            loss_type: 损失函数类型
            norm: 扰动范数类型
            
        Returns:
            Tuple[torch.Tensor, Dict[str, Any]]: (对抗样本, 元数据)
        """
        start_time = time.time()
        
        # 移动到设备
        images = images.to(self.device)
        targets = targets.to(self.device)
        batch_size = images.size(0)
        
        logger.info(f"开始PGD攻击，批量大小: {batch_size}, 目标攻击: {targeted}, "
                   f"范数: {norm}, 损失: {loss_type}")
        
        # 设置目标标签（用于定向攻击）
        if targeted:
            # 对于定向攻击，目标是targets指定的类别
            attack_targets = targets
            # 注意：定向攻击的损失函数方向相反
        else:
            # 对于非定向攻击，目标是原始标签
            attack_targets = targets
        
        # 初始化对抗样本
        if random_start:
            # 在epsilon球内随机初始化
            if norm == 'linf':
                delta = torch.empty_like(images).uniform_(-epsilon, epsilon)
            else:  # l2
                delta = torch.randn_like(images)
                # 归一化到epsilon半径
                l2_norms = torch.norm(delta.view(batch_size, -1), dim=1, keepdim=True)
                l2_norms = l2_norms.view(batch_size, 1, 1, 1)
                delta = delta / (l2_norms + 1e-8) * epsilon
            
            adv_images = images + delta
            adv_images = torch.clamp(adv_images, 0.0, 1.0)
        else:
            adv_images = images.clone()
        
        # 确保对抗样本需要梯度
        adv_images = adv_images.detach().requires_grad_(True)
        
        # 记录最佳对抗样本
        best_adv_images = adv_images.clone()
        best_loss = torch.full((batch_size,), float('inf'), device=self.device)
        
        # 获取原始预测（用于检查攻击成功）
        with torch.no_grad():
            original_pred = self.model.predict(images)
            original_labels = original_pred["logits"].argmax(dim=1)
        
        # 记录训练过程
        history = {
            'losses': [],
            'l2_norms': [],
            'linf_norms': [],
            'iterations': [],
            'success_rates': []
        }
        
        # PGD迭代
        for iteration in range(num_iter):
            # 确保梯度计算启用
            if adv_images.grad is not None:
                adv_images.grad.zero_()
            
            # 前向传播
            if hasattr(self.model, 'predict_with_grad'):
                predictions = self.model.predict_with_grad(adv_images)
            else:
                # 如果没有predict_with_grad方法，直接使用模型
                logits = self.model.model(adv_images)
                predictions = {"logits": logits, "type": "classification"}
            
            logits = predictions["logits"]
            
            # 计算损失
            if targeted:
                # 定向攻击：最小化目标类损失（即让模型预测为目标类）
                loss = -self._compute_loss(logits, attack_targets, loss_type)
            else:
                # 非定向攻击：最大化真实标签的损失
                loss = self._compute_loss(logits, attack_targets, loss_type)
            
            # 反向传播
            loss.mean().backward()
            
            # 获取梯度
            grad = adv_images.grad.data
            
            # 更新对抗样本
            if norm == 'linf':
                # L∞: 符号梯度更新
                adv_images = adv_images + alpha * torch.sign(grad)
            else:  # l2
                # L2: 归一化梯度更新
                batch_size_grad = grad.size(0)
                grad_norms = torch.norm(grad.view(batch_size_grad, -1), dim=1, keepdim=True)
                grad_norms = grad_norms.view(batch_size_grad, 1, 1, 1)
                normalized_grad = grad / (grad_norms + 1e-8)
                adv_images = adv_images + alpha * normalized_grad
            
            # 投影到epsilon球内
            perturbations = adv_images - images
            perturbations = self._project_to_ball(perturbations, epsilon, norm)
            adv_images = images + perturbations
            
            # 裁剪到有效范围[0,1]
            adv_images = torch.clamp(adv_images, 0.0, 1.0)
            
            # 重新设置梯度要求（因为裁剪操作会断开梯度）
            adv_images = adv_images.detach().requires_grad_(True)
            
            # 记录过程（每5次迭代记录一次，减少性能开销）
            if iteration % 5 == 0 or iteration == num_iter - 1:
                with torch.no_grad():
                    # 计算扰动范数
                    perturbations_norm = adv_images - images
                    l2_norm = torch.norm(perturbations_norm.view(batch_size, -1), dim=1)
                    linf_norm = torch.norm(perturbations_norm.view(batch_size, -1), dim=1, p=float('inf'))
                    
                    # 检查攻击成功率（只在最后几次迭代检查）
                    if iteration >= num_iter - 5 or iteration % 20 == 0:
                        adv_pred = self.model.predict(adv_images)
                        success = self._check_attack_success(
                            original_pred, adv_pred, targets, targeted
                        )
                        success_rate = success.float().mean().item()
                    else:
                        success_rate = 0.0
                    
                    history['losses'].append(loss.mean().item())
                    history['l2_norms'].append(l2_norm.mean().item())
                    history['linf_norms'].append(linf_norm.mean().item())
                    history['iterations'].append(iteration)
                    history['success_rates'].append(success_rate)
                    
                    # 更新最佳对抗样本（选择损失最大的）
                    current_loss = loss.detach()
                    if targeted:
                        # 定向攻击：损失越小（负损失绝对值越大）越好
                        is_better = current_loss < best_loss
                    else:
                        # 非定向攻击：损失越大越好
                        is_better = current_loss > best_loss
                    
                    for i in range(batch_size):
                        if is_better[i]:
                            best_loss[i] = current_loss[i]
                            best_adv_images[i] = adv_images[i]
        
        # 使用最佳对抗样本
        final_adv_images = best_adv_images
        
        # 生成热力图（扰动强度图）
        perturbations_final = final_adv_images - images
        heatmap = torch.abs(perturbations_final.detach()).mean(dim=1, keepdim=True)
        heatmap = (heatmap - heatmap.min()) / (heatmap.max() - heatmap.min() + 1e-8)
        
        # 获取最终预测和置信度
        with torch.no_grad():
            final_pred = self.model.predict(final_adv_images)
            original_probs = torch.softmax(original_pred["logits"], dim=1)
            adv_probs = torch.softmax(final_pred["logits"], dim=1)
        
        # 计算最终攻击成功率
        final_success = self._check_attack_success(
            original_pred, final_pred, targets, targeted
        )
        
        # 计算扰动统计
        final_perturbations = final_adv_images - images
        l2_norms_final = torch.norm(final_perturbations.view(batch_size, -1), dim=1)
        linf_norms_final = torch.norm(final_perturbations.view(batch_size, -1), dim=1, p=float('inf'))
        
        execution_time = time.time() - start_time
        
        metadata = {
            'heatmap': heatmap.cpu(),
            'original_probs': original_probs.cpu(),
            'adv_probs': adv_probs.cpu(),
            'history': history,
            'success_rate': final_success.float().mean().item(),
            'avg_l2_norm': l2_norms_final.mean().item(),
            'avg_linf_norm': linf_norms_final.mean().item(),
            'execution_time': execution_time,
            'targeted': targeted,
            'parameters': {
                'epsilon': epsilon,
                'alpha': alpha,
                'num_iter': num_iter,
                'random_start': random_start,
                'loss_type': loss_type,
                'norm': norm
            }
        }
        
        logger.info(f"PGD攻击完成，成功率: {metadata['success_rate']:.2%}, "
                   f"平均L2范数: {metadata['avg_l2_norm']:.4f}, "
                   f"平均L∞范数: {metadata['avg_linf_norm']:.4f}, "
                   f"耗时: {execution_time:.2f}s")
        
        return final_adv_images.detach(), metadata
    
    @classmethod
    def get_params_schema(cls) -> Dict[str, Any]:
        """
        参数配置schema
        
        Returns:
            Dict[str, Any]: 参数配置
        """
        return {
            "epsilon": {
                "type": "slider",
                "min": 0.001,
                "max": 0.5,
                "step": 0.001,
                "default": 0.03,
                "label": "扰动幅度 ε",
                "description": "最大扰动幅度，控制对抗样本与原始图像的最大差异"
            },
            "alpha": {
                "type": "slider",
                "min": 0.0001,
                "max": 0.1,
                "step": 0.0005,
                "default": 0.01,
                "label": "步长 α",
                "description": "每次迭代的步长，影响攻击收敛速度"
            },
            "num_iter": {
                "type": "slider",
                "min": 5,
                "max": 200,
                "step": 5,
                "default": 40,
                "label": "迭代次数",
                "description": "PGD迭代次数，次数越多攻击越强但耗时增加"
            },
            "random_start": {
                "type": "switch",
                "default": True,
                "label": "随机初始化",
                "description": "是否在epsilon球内随机初始化，提高攻击迁移性"
            },
            "targeted": {
                "type": "switch",
                "default": False,
                "label": "定向攻击",
                "description": "开启后攻击到指定类别"
            },
            "loss_type": {
                "type": "select",
                "options": [
                    {"value": "ce", "label": "交叉熵损失 (CE)"},
                    {"value": "dlr", "label": "差分逻辑回归 (DLR)"}
                ],
                "default": "ce",
                "label": "损失函数",
                "description": "CE适合快速攻击，DLR攻击效果更强"
            },
            "norm": {
                "type": "select",
                "options": [
                    {"value": "linf", "label": "L∞范数（最大扰动）"},
                    {"value": "l2", "label": "L2范数（欧氏距离）"}
                ],
                "default": "linf",
                "label": "扰动范数",
                "description": "约束对抗扰动的度量方式"
            }
        }