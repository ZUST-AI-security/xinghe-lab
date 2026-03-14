"""
星河智安 (XingHe ZhiAn) - C&W攻击算法实现
Carlini & Wagner L2攻击，适配分类模型
"""

import torch
import torch.optim as optim
from typing import Dict, Any, Tuple, Optional
import numpy as np
import time
import logging

from .base import BaseAttack
from ..model_manager.base import BaseModel, ModelType
from .registry import AttackRegistry

logger = logging.getLogger(__name__)

@AttackRegistry.register(
    'cw',
    display_name='C&W Attack',
    description='Carlini & Wagner L2攻击算法，强大的基于优化的对抗攻击方法',
    category='optimization',
    supported_models=['classification'],
    tags=['l2', 'optimization', 'carlini', 'wagner', 'powerful']
)
class CWAttack(BaseAttack):
    """
    C&W L2攻击实现（分类模型版）
    
    算法原理:
    - 论文: "Towards Evaluating the Robustness of Neural Networks"
    - 核心思想: 通过优化最小化扰动范数和攻击损失
    - 公式: minimize ||x' - x||_2^2 + c * f(x')
    - 其中 f(x') = max(max_{i≠t} Z(x')_i - Z(x')_t, -κ)
    
    特点:
    - 高攻击成功率
    - 较小的扰动范数
    - 支持定向和非定向攻击
    - 二分搜索最优c值
    
    参数说明:
    - c: 权衡系数，平衡扰动大小和攻击成功率
    - kappa: 置信度阈值，控制攻击的置信度
    - lr: 学习率，Adam优化器学习率
    - max_iter: 最大迭代次数
    - binary_search_steps: 二分搜索步数
    - init_const: 初始c值
    - targeted: 是否为定向攻击
    """
    
    def __init__(self, model: BaseModel):
        """
        初始化C&W攻击
        
        Args:
            model: 分类模型实例
        """
        super().__init__(model)
        
        # 验证模型类型
        self.validate_model_type([ModelType.CLASSIFICATION])
        
        # C&W特定参数
        self.boxmin = 0.0
        self.boxmax = 1.0
        
        logger.info(f"初始化C&W攻击，模型: {model.model_name}")
    
    def _loss_function(self, 
                       adv_images: torch.Tensor,
                       original_images: torch.Tensor,
                       target_labels: torch.Tensor,
                       c: float,
                       kappa: float) -> Tuple[torch.Tensor, torch.Tensor]:
        """
        C&W损失函数
        
        Args:
            adv_images: 对抗样本 [batch, C, H, W]
            original_images: 原始图像 [batch, C, H, W]
            target_labels: 目标标签 [batch]
            c: 权衡系数
            kappa: 置信度阈值
            
        Returns:
            Tuple[torch.Tensor, torch.Tensor]: (总损失, 攻击损失)
        """
        batch_size = adv_images.size(0)
        
        # 1. 扰动损失 (L2范数)
        l2_loss = torch.sum((adv_images - original_images) ** 2, dim=[1, 2, 3])
        
        # 2. 攻击损失 f(x')
        predictions = self.model.predict(adv_images)
        logits = predictions["logits"]
        
        # 获取目标类和其他类的logits
        target_logits = logits.gather(1, target_labels.unsqueeze(1)).squeeze()
        
        # 创建mask排除目标类
        mask = torch.ones_like(logits).scatter_(1, target_labels.unsqueeze(1), 0)
        other_logits = (logits * mask).max(dim=1)[0]
        
        # f(x') = max(other_logits - target_logits, -kappa)
        f_loss = torch.max(other_logits - target_logits, 
                          torch.full_like(target_logits, -kappa))
        f_loss = torch.clamp(f_loss, min=0)  # ReLU
        
        # 3. 总损失
        total_loss = l2_loss + c * f_loss
        
        return total_loss, f_loss
    
    def generate(self,
                 images: torch.Tensor,
                 targets: torch.Tensor,
                 targeted: bool = False,
                 c: float = 1.0,
                 kappa: float = 0.0,
                 lr: float = 0.01,
                 max_iter: int = 500,
                 binary_search_steps: int = 9,
                 init_const: float = 1e-2,
                 abort_early: bool = True,
                 early_stop_iters: int = 50,
                 **kwargs) -> Tuple[torch.Tensor, Dict[str, Any]]:
        """
        生成C&W对抗样本
        
        Args:
            images: 原始图像 [batch, C, H, W]
            targets: 标签 [batch]
            targeted: 是否为定向攻击
            c: 权衡系数
            kappa: 置信度阈值
            lr: 学习率
            max_iter: 最大迭代次数
            binary_search_steps: 二分搜索步数
            init_const: 初始c值
            abort_early: 是否提前终止
            early_stop_iters: 提前终止检查步数
            
        Returns:
            Tuple[torch.Tensor, Dict[str, Any]]: (对抗样本, 元数据)
        """
        start_time = time.time()
        
        # 移动到设备
        images = images.to(self.device)
        targets = targets.to(self.device)
        batch_size = images.size(0)
        
        logger.info(f"开始C&W攻击，批量大小: {batch_size}, 目标攻击: {targeted}")
        
        # 设置目标标签
        if targeted:
            # 定向攻击：随机选择非真实标签作为目标
            num_classes = self.model.get_num_classes()
            target_labels = torch.randint(0, num_classes, targets.shape, device=self.device)
            
            # 确保不等于原始标签
            for i in range(len(target_labels)):
                while target_labels[i] == targets[i]:
                    target_labels[i] = torch.randint(0, num_classes, (1,))
        else:
            target_labels = targets
        
        # 二分搜索c值
        lower_bound = torch.zeros(batch_size, device=self.device)
        upper_bound = torch.full_like(lower_bound, 1e10)
        c_current = torch.full_like(lower_bound, init_const)
        
        # 最佳结果记录
        best_adv_images = images.clone()
        best_l2 = torch.full_like(lower_bound, 1e10)
        best_adv_labels = targets.clone()
        
        # 记录训练过程
        history = {
            'c_values': [],
            'losses': [],
            'l2_norms': [],
            'iterations': [],
            'success_rates': []
        }
        
        # 二分搜索最优c值
        for search_step in range(binary_search_steps):
            logger.debug(f"二分搜索步骤 {search_step + 1}/{binary_search_steps}")
            
            # 初始化对抗样本（在tanh空间优化）
            adv_images = self._initialize_adv_images(images)
            adv_images.requires_grad_(True)
            
            # Adam优化器
            optimizer = optim.Adam([adv_images], lr=lr)
            
            # 记录当前搜索步骤的最佳损失
            best_loss_current = torch.full_like(lower_bound, float('inf'))
            no_improvement_count = torch.zeros_like(lower_bound)
            
            # 迭代优化
            for iteration in range(max_iter):
                optimizer.zero_grad()
                
                # 计算损失
                current_adv = self._tanh_to_img(adv_images)
                loss, f_loss = self._loss_function(
                    current_adv,
                    images,
                    target_labels if targeted else targets,
                    c_current.mean().item(),  # 简化：使用平均c值
                    kappa
                )
                
                # 反向传播
                loss.mean().backward()
                optimizer.step()
                
                # 记录训练过程
                if iteration % 50 == 0:
                    with torch.no_grad():
                        l2_norm = torch.norm(
                            (current_adv - images).view(images.size(0), -1), 
                            dim=1
                        )
                        
                        # 检查攻击成功率
                        original_pred = self.model.predict(images)
                        adv_pred = self.model.predict(current_adv)
                        
                        success = self._check_attack_success(
                            original_pred, adv_pred, targets, targeted
                        )
                        
                        history['losses'].append(loss.mean().item())
                        history['l2_norms'].append(l2_norm.mean().item())
                        history['iterations'].append(iteration)
                        history['success_rates'].append(success.float().mean().item())
                        
                        # 更新最佳对抗样本
                        for i in range(batch_size):
                            if success[i] and l2_norm[i] < best_l2[i]:
                                best_l2[i] = l2_norm[i]
                                best_adv_images[i] = current_adv[i]
                                best_adv_labels[i] = adv_pred["logits"].argmax(dim=1)[i]
                
                # 提前终止检查
                if abort_early and iteration % early_stop_iters == 0:
                    current_loss = loss.detach()
                    improved = current_loss < best_loss_current
                    
                    for i in range(batch_size):
                        if improved[i]:
                            best_loss_current[i] = current_loss[i]
                            no_improvement_count[i] = 0
                        else:
                            no_improvement_count[i] += 1
                    
                    # 如果所有样本都没有改善，提前终止
                    if torch.all(no_improvement_count >= early_stop_iters):
                        logger.debug(f"提前终止于迭代 {iteration}")
                        break
            
            # 二分搜索更新c值
            for i in range(batch_size):
                success = self._check_attack_success(
                    self.model.predict(images[i:i+1]),
                    self.model.predict(best_adv_images[i:i+1]),
                    targets[i:i+1],
                    targeted
                )[0]
                
                if success == targeted:
                    # 攻击成功，减小c
                    upper_bound[i] = min(upper_bound[i], c_current[i])
                    if upper_bound[i] < 1e9:
                        c_current[i] = (lower_bound[i] + upper_bound[i]) / 2
                else:
                    # 攻击失败，增大c
                    lower_bound[i] = max(lower_bound[i], c_current[i])
                    if upper_bound[i] < 1e9:
                        c_current[i] = (lower_bound[i] + upper_bound[i]) / 2
                    else:
                        c_current[i] = c_current[i] * 10
            
            history['c_values'].append(c_current.mean().item())
        
        # 生成热力图（差异图）
        heatmap = torch.abs(best_adv_images - images).mean(dim=1, keepdim=True)
        heatmap = (heatmap - heatmap.min()) / (heatmap.max() - heatmap.min() + 1e-8)
        
        # 获取置信度变化
        with torch.no_grad():
            original_pred = self.model.predict(images)
            adv_pred = self.model.predict(best_adv_images)
            
            original_probs = torch.softmax(original_pred["logits"], dim=1)
            adv_probs = torch.softmax(adv_pred["logits"], dim=1)
        
        # 计算最终攻击成功率
        final_success = self._check_attack_success(
            original_pred, adv_pred, targets, targeted
        )
        
        execution_time = time.time() - start_time
        
        metadata = {
            'heatmap': heatmap.cpu(),
            'original_probs': original_probs.cpu(),
            'adv_probs': adv_probs.cpu(),
            'history': history,
            'success_rate': final_success.float().mean().item(),
            'avg_l2_norm': best_l2.mean().item(),
            'execution_time': execution_time,
            'targeted': targeted,
            'final_c_value': c_current.mean().item(),
            'parameters': {
                'c': c,
                'kappa': kappa,
                'lr': lr,
                'max_iter': max_iter,
                'binary_search_steps': binary_search_steps
            }
        }
        
        logger.info(f"C&W攻击完成，成功率: {metadata['success_rate']:.2%}, "
                   f"平均L2范数: {metadata['avg_l2_norm']:.4f}, "
                   f"耗时: {execution_time:.2f}s")
        
        return best_adv_images.detach(), metadata
    
    def _initialize_adv_images(self, images: torch.Tensor) -> torch.Tensor:
        """
        初始化对抗样本（使用tanh空间）
        
        Args:
            images: 原始图像 [batch, C, H, W]
            
        Returns:
            torch.Tensor: tanh空间的对抗样本
        """
        # 将[0,1]映射到tanh空间
        adv_images = torch.arctanh((images * 2 - 1) * 0.999999)
        return adv_images
    
    def _tanh_to_img(self, adv_images: torch.Tensor) -> torch.Tensor:
        """
        将tanh空间映射回[0,1]
        
        Args:
            adv_images: tanh空间的对抗样本
            
        Returns:
            torch.Tensor: [0,1]范围的对抗样本
        """
        return (torch.tanh(adv_images) + 1) / 2
    
    @classmethod
    def get_params_schema(cls) -> Dict[str, Any]:
        """
        参数配置schema
        
        Returns:
            Dict[str, Any]: 参数配置
        """
        return {
            "c": {
                "type": "slider",
                "min": 0.001,
                "max": 10.0,
                "step": 0.1,
                "default": 1.0,
                "label": "权衡系数 c",
                "description": "平衡扰动大小和攻击成功率，越大越注重攻击成功"
            },
            "kappa": {
                "type": "slider",
                "min": 0.0,
                "max": 10.0,
                "step": 0.5,
                "default": 0.0,
                "label": "置信度阈值 κ",
                "description": "控制攻击的置信度，越大要求攻击越确信"
            },
            "lr": {
                "type": "slider",
                "min": 1e-5,
                "max": 0.1,
                "step": 0.001,
                "default": 0.01,
                "label": "学习率",
                "description": "Adam优化器的学习率"
            },
            "max_iter": {
                "type": "slider",
                "min": 100,
                "max": 1000,
                "step": 50,
                "default": 500,
                "label": "最大迭代次数",
                "description": "优化过程的最大步数"
            },
            "binary_search_steps": {
                "type": "slider",
                "min": 1,
                "max": 20,
                "step": 1,
                "default": 9,
                "label": "二分搜索步数",
                "description": "搜索最优c值的二分搜索步数"
            },
            "init_const": {
                "type": "slider",
                "min": 1e-5,
                "max": 1.0,
                "step": 1e-3,
                "default": 1e-2,
                "label": "初始c值",
                "description": "二分搜索的初始c值"
            },
            "targeted": {
                "type": "switch",
                "default": False,
                "label": "定向攻击",
                "description": "开启后攻击到指定类别"
            },
            "abort_early": {
                "type": "switch",
                "default": True,
                "label": "提前终止",
                "description": "当损失不再改善时提前终止优化"
            },
            "early_stop_iters": {
                "type": "slider",
                "min": 10,
                "max": 200,
                "step": 10,
                "default": 50,
                "label": "提前终止检查步数",
                "description": "多少步没有改善后提前终止"
            }
        }
