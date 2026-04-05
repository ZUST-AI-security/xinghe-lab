"""
星河智安 (XingHe ZhiAn) - I-FGSM攻击算法实现
Iterative FGSM (I-FGSM)，改进的快速梯度符号方法

论文: "Adversarial examples in the physical world"
      补充中的迭代版本
特点: 快速、可控、多参数可调
"""

import torch
import torch.nn.functional as F
from typing import Dict, Any, Tuple, Optional
import numpy as np
import time
import logging

from app.services.attacks.base import BaseAttack
from app.services.model_manager.base import BaseModel, ModelType
from app.services.attacks.registry import AttackRegistry

logger = logging.getLogger(__name__)


@AttackRegistry.register(
    'i-fgsm',
    display_name='I-FGSM Attack',
    description='Iterative FGSM攻击算法，快速高效，参数灵活',
    category='gradient',
    supported_models=['classification'],
    tags=['fgsm', 'iterative', 'fast', 'gradient', 'simple']
)
class IFGSMAttack(BaseAttack):
    """
    I-FGSM攻击算法实现
    
    原理:
    - FGSM的迭代版本，多次小步长更新
    - 每步沿梯度符号方向移动alpha距离
    - 总扰动限制在[-epsilon, epsilon]范围内
    - 支持定向和非定向攻击
    
    优点:
    - 计算速度快（相比C&W）
    - 扰动可控（epsilon）
    - 参数少，易于调整
    - 攻击成功率较高
    
    缺点:
    - 攻击失败时扰动可能不是最优的
    - 不提供解析解保证
    """
    
    def __init__(self, model: BaseModel):
        super().__init__(model)
        self.validate_model_type([ModelType.CLASSIFICATION])
        logger.info(f"初始化I-FGSM攻击，模型: {getattr(model, 'model_name', 'unknown')}")
    
    def generate(
        self,
        images: torch.Tensor,
        targets: torch.Tensor,
        targeted: bool = False,
        epsilon: float = 0.03,
        alpha: float = 0.01,
        num_iterations: int = 40,
        **kwargs
    ) -> Tuple[torch.Tensor, Dict[str, Any]]:
        """
        生成I-FGSM对抗样本
        
        Args:
            images: 原始图像 [batch, C, H, W]，值域[0,1]
            targets: 标签 [batch]（定向攻击时为目标，非定向时为原始标签）
            targeted: 是否定向攻击
            epsilon: 扰动限制（L∞距离），推荐0.03-0.3
            alpha: 每步扰动大小（应该 <= epsilon / num_iterations），推荐0.01
            num_iterations: 迭代次数，推荐20-40
            
        Returns:
            Tuple[torch.Tensor, Dict]: (对抗样本, 元数据)
        """
        start_time = time.time()
        
        # ========== 防御性检查 ==========
        if images is None or images.numel() == 0:
            logger.error("接收到的图像数据为空！")
            empty_tensor = torch.empty(0)
            error_metadata = {
                "error": "Input images are empty",
                "success": False,
                "success_rate": 0.0,
                "execution_time": 0.0
            }
            return empty_tensor, error_metadata
        
        # 维度验证和自动修复
        logger.debug(f"输入图像原始shape: {images.shape}, dtype: {images.dtype}")
        
        if len(images.shape) == 3:
            logger.info(f"检测到缺少batch维度，自动添加。原shape: {images.shape}")
            images = images.unsqueeze(0)
            if targets is not None and len(targets.shape) == 0:
                targets = targets.unsqueeze(0)
        elif len(images.shape) != 4:
            logger.error(f"输入图像维度不正确: {images.shape}，期望4维 [batch, C, H, W]")
            empty_tensor = torch.empty(0)
            error_metadata = {
                "error": f"Invalid image dimensions: {images.shape}, expected [batch, C, H, W]",
                "success": False,
                "success_rate": 0.0,
                "execution_time": 0.0
            }
            return empty_tensor, error_metadata
        
        # 目标验证
        if targets is None or targets.numel() == 0:
            logger.error("目标标签targets为空！")
            empty_tensor = torch.empty(0)
            error_metadata = {
                "error": "Target labels are empty",
                "success": False,
                "success_rate": 0.0,
                "execution_time": 0.0
            }
            return empty_tensor, error_metadata
        
        batch_size = images.size(0)
        device = images.device
        
        # ========== 自适应图片尺寸处理 ==========
        expected_size = getattr(self.model, 'input_size', (224, 224))
        if isinstance(expected_size, int):
            expected_size = (expected_size, expected_size)
        
        current_h, current_w = images.shape[2], images.shape[3]
        if (current_h, current_w) != expected_size:
            logger.info(f"图片尺寸自适应调整: ({current_h}, {current_w}) -> {expected_size}")
            images = F.interpolate(images, size=expected_size, mode='bilinear', align_corners=False)
            logger.info(f"调整后的shape: {images.shape}")

        # 确保设备一致
        model_device = next(self.model.parameters()).device
        if device != model_device:
            images = images.to(model_device)
            targets = targets.to(model_device)
            device = model_device
        
        logger.info(f"开始I-FGSM攻击，batch={batch_size}, shape={images.shape}, "
                   f"targeted={targeted}, epsilon={epsilon}, alpha={alpha}, iterations={num_iterations}")
        
        # 获取原始预测
        with torch.no_grad():
            if hasattr(self.model, 'predict'):
                orig_pred = self.model.predict(images)
                orig_logits = orig_pred["logits"]
            else:
                orig_logits = self.model(images)
            orig_probs = torch.softmax(orig_logits, dim=1)
            orig_labels = orig_logits.argmax(dim=1)
        
        logger.debug(f"原始预测完成: labels={orig_labels.tolist()}, probs_max={orig_probs.max(dim=1)[0].tolist()}")
        
        # 设置目标标签
        if targeted:
            target_labels = targets.clone()
        else:
            target_labels = orig_labels.clone()
        
        # 初始化对抗样本
        adv_images = images.clone()
        
        # 记录攻击过程
        iteration_logs = []
        
        # ========== I-FGSM迭代优化 ==========
        for iteration in range(num_iterations):
            # 启用梯度
            adv_images.requires_grad = True
            
            # 前向传播
            if hasattr(self.model, 'predict'):
                # 注意：predict方法可能不支持梯度，需要使用底层模型
                if hasattr(self.model, 'model'):
                    logits = self.model.model(adv_images)
                else:
                    logits = self.model(adv_images)
            else:
                logits = self.model(adv_images)
            
            # 计算损失
            if targeted:
                # 定向攻击：使预测结果趋向目标类别
                # 最大化目标类别的logit或最小化其他类别的logit
                loss = F.cross_entropy(logits, target_labels)
            else:
                # 非定向攻击：最大化原始类别的损失（误分类）
                loss = F.cross_entropy(logits, orig_labels)
            
            # 反向传播
            self.model.zero_grad()
            loss.backward()
            
            # 获取梯度并计算扰动
            with torch.no_grad():
                # 梯度符号
                grad_sign = adv_images.grad.sign()
                
                # 定向：沿梯度正方向；非定向：沿梯度负方向
                if targeted:
                    adv_images = adv_images - alpha * grad_sign
                else:
                    adv_images = adv_images + alpha * grad_sign
                
                # 限制总扰动在[-epsilon, epsilon]范围内
                adv_images = torch.clamp(
                    adv_images,
                    images - epsilon,
                    images + epsilon
                )
                
                # 限制像素值在[0, 1]范围内
                adv_images = torch.clamp(adv_images, 0.0, 1.0)
                
                # 分离梯度图
                adv_images = adv_images.detach()
            
            # 定期检查进度
            if (iteration + 1) % max(1, num_iterations // 5) == 0 or iteration == num_iterations - 1:
                with torch.no_grad():
                    if hasattr(self.model, 'predict'):
                        pred = self.model.predict(adv_images)
                        pred_logits = pred["logits"]
                    else:
                        pred_logits = self.model(adv_images)
                    
                    pred_labels = pred_logits.argmax(dim=1)
                    
                    if targeted:
                        success = (pred_labels == target_labels)
                    else:
                        success = (pred_labels != orig_labels)
                    
                    success_count = success.sum().item()
                    success_rate = success_count / batch_size
                    
                    # 计算扰动
                    perturbation = adv_images - images
                    l2_norm = torch.norm(perturbation.view(batch_size, -1), p=2, dim=1).mean().item()#平均L2扰动
                    linf_norm = torch.abs(perturbation).max().item()#看最大扰动有无超过epsilon
                    
                    log_entry = {
                        'iteration': iteration + 1,
                        'success_rate': success_rate,
                        'l2_norm': l2_norm,
                        'linf_norm': linf_norm,
                        'loss': loss.item()
                    }
                    iteration_logs.append(log_entry)
                    
                    logger.debug(f"  迭代 {iteration + 1}/{num_iterations}: "
                               f"成功率={success_rate:.2%}, L2={l2_norm:.6f}, L∞={linf_norm:.6f}, "
                               f"loss={loss.item():.4f}")
        
        # ========== 最终验证 ==========
        execution_time = time.time() - start_time
        
        with torch.no_grad():
            # 使用包装类的predict方法进行最终验证
            if hasattr(self.model, 'predict'):
                final_pred = self.model.predict(adv_images)
                final_logits = final_pred["logits"]
            else:
                final_logits = self.model(adv_images)
            
            final_probs = torch.softmax(final_logits, dim=1)
            final_labels = final_logits.argmax(dim=1)
            
            # 检查成功
            if targeted:
                success_mask = (final_labels == target_labels)
            else:
                success_mask = (final_labels != orig_labels)
            
            success_rate = success_mask.float().mean().item()
            
            # 计算扰动统计
            perturbation = adv_images - images
            l2_norms = torch.norm(perturbation.view(batch_size, -1), p=2, dim=1)
            linf_norms = torch.abs(perturbation).view(batch_size, -1).max(dim=1)[0]
            
            # 生成热力图
            heatmap = torch.abs(perturbation).mean(dim=1, keepdim=True)
            heatmap = (heatmap - heatmap.min()) / (heatmap.max() - heatmap.min() + 1e-8)
            heatmap = torch.pow(heatmap, 0.5)
        
        # 获取类别名称
        orig_class_names = []
        adv_class_names = []
        if hasattr(self.model, 'get_class_name'):
            for i in range(batch_size):
                try:
                    orig_name = self.model.get_class_name(int(orig_labels[i].item()))
                    adv_name = self.model.get_class_name(int(final_labels[i].item()))
                except Exception as e:
                    orig_name = ""
                    adv_name = ""
                orig_class_names.append(orig_name)
                adv_class_names.append(adv_name)
        else:
            orig_class_names = [""] * batch_size
            adv_class_names = [""] * batch_size

        # Base64图像序列化（支持Celery异步流）
        def tensor_to_base64(tensor: torch.Tensor) -> str:
            """
            将 Tensor 转换为 Base64 编码的 PNG，支持 [1, 1, H, W] 或 [1, 3, H, W]
            """
            import numpy as np
            from PIL import Image
            import base64
            from io import BytesIO

            # 1. 确保 tensor 是 [C, H, W] 格式，只压缩 Batch 维度
            if tensor.dim() == 4:
                # 只压缩第 0 维 (Batch)，保留通道维即使通道数为 1
                img_np = tensor.detach().cpu().numpy()[0] 
            else:
                img_np = tensor.detach().cpu().numpy()

            # 2. 根据通道数处理转换逻辑
            # img_np shape 现在是 (C, H, W)
            if img_np.shape[0] == 1:
                # 热力图处理: (1, H, W) -> (H, W)
                img_np = img_np[0]
                # 确保值域在 0-255
                img_np = (img_np * 255).clip(0, 255).astype(np.uint8)
                img = Image.fromarray(img_np, mode='L')  # 'L' 表示灰度图
            else:
                # 彩色图处理: (3, H, W) -> (H, W, 3)
                img_np = img_np.transpose(1, 2, 0)
                img_np = (img_np * 255).clip(0, 255).astype(np.uint8)
                img = Image.fromarray(img_np, mode='RGB')

            # 3. 转换为 Base64
            buffered = BytesIO()
            img.save(buffered, format="PNG")
            return base64.b64encode(buffered.getvalue()).decode()
        
        # 序列化图像（每样本）- 带异常处理
        adv_images_base64 = []
        heatmaps_base64 = []
        for i in range(batch_size):
            try:
                adv_img_b64 = tensor_to_base64(adv_images[i:i+1])
            except Exception as e:
                logger.exception(f"对抗样本图像[{i}]序列化失败: {e}")
                adv_img_b64 = ""  # 失败返回空字符串
            
            try:
                heatmap_b64 = tensor_to_base64(heatmap[i:i+1])
            except Exception as e:
                logger.exception(f"热力图[{i}]序列化失败: {e}")
                heatmap_b64 = ""  # 失败返回空字符串
            
            adv_images_base64.append(adv_img_b64)
            heatmaps_base64.append(heatmap_b64)

        logger.info(f"I-FGSM攻击完成: 成功率={success_rate:.2%}, 平均L2={l2_norms.mean().item():.6f}, 耗时={execution_time:.2f}s")
        for i in range(min(3, batch_size)):  # 日志显示前3个样本
            logger.info(f"样本[{i}]: {orig_class_names[i]}(conf={orig_probs[i].max().item():.2%}) -> "
                       f"{adv_class_names[i]}(conf={final_probs[i].max().item():.2%}), "
                       f"L2={l2_norms[i].item():.4f}, 成功={success_mask[i].item()}")
        
        # ========== 组装元数据 ==========
        metadata = {
            # 图像数据（Base64编码，支持前端直接显示）
            'adv_images_base64': adv_images_base64,  # 每样本的对抗样本图像
            'heatmaps_base64': heatmaps_base64,       # 每样本的热力图（Base64）
            
            # 原始tensor数据（用于后端进一步处理，如Celery task中的后处理）
            'heatmap': heatmap,  # 原始热力图tensor [B, 1, H, W]
            
            # 概率分布（用于前端可视化）
            'original_probs': orig_probs.cpu(),
            'adv_probs': final_probs.cpu(),
            
            # 历史记录 
            'history': iteration_logs,
            
            # 整体统计
            'success_rate': success_rate,
            'avg_l2_norm': l2_norms.mean().item(),
            'execution_time': execution_time,
            'targeted': targeted,
            
            # I-FGSM 的参数
            'parameters': {
                'epsilon': epsilon,             # 总扰动限制
                'alpha': alpha,                 # 每次迭代的步长
                'num_iterations': num_iterations # 迭代次数
            },
            
            # 每样本详细结果（支持Batch，每样本独立，无需修改）
            'per_sample_results': [
                {
                    'sample_idx': i,
                    'success': bool(success_mask[i].item()),
                    'original_label': int(orig_labels[i].item()),
                    'original_class_name': orig_class_names[i],
                    'original_confidence': float(orig_probs[i].max().item()),
                    'adversarial_label': int(final_labels[i].item()),
                    'adversarial_class_name': adv_class_names[i],
                    'adversarial_confidence': float(final_probs[i].max().item()),
                    'perturbation_norm': float(l2_norms[i].item()),
                    'adv_image_base64': adv_images_base64[i],  
                    'heatmap_base64': heatmaps_base64[i],        
                }
                for i in range(batch_size)
            ],
            
            # 向后兼容的字段（单样本时使用第一个样本的数据，无需修改）
            'original_label': int(orig_labels[0].item()),
            'original_class_name': orig_class_names[0],
            'original_confidence': float(orig_probs[0].max().item()),
            'adversarial_label': int(final_labels[0].item()),
            'adversarial_class_name': adv_class_names[0],
            'adversarial_confidence': float(final_probs[0].max().item()),
            'perturbation_norm': float(l2_norms[0].item()),
            'success': success_rate > 0.5
        }
        
        # ========== 关键修改区：显存优化 ==========
        # 释放 I-FGSM 过程中的临时变量，防止显存泄漏
        try:
            del perturbation, orig_logits 
        except NameError:
            pass # 防止有些变量没定义导致报错
            
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
        
        # 返回3个值：原图、对抗图(换成了 adv_images)、元数据
        return images.detach(), adv_images.detach(), metadata
    
    @classmethod
    def get_params_schema(cls) -> Dict[str, Any]:
        """
        参数配置schema - 前端动态渲染
        
        推荐参数组合:
        - 非定向快速攻击: epsilon=0.03, alpha=0.01, num_iterations=10
        - 非定向标准攻击: epsilon=0.03, alpha=0.01, num_iterations=40
        - 定向精准攻击: epsilon=0.1, alpha=0.01, num_iterations=40
        """
        return {
            "epsilon": {
                "type": "slider",
                "min": 0.01,
                "max": 1.0,
                "step": 0.01,
                "default": 0.03,
                "label": "扰动限制 ε",
                "description": "允许修改的最大像素值（L∞范数限制）。推荐数值为8（以像素0-255为例）或0.03（在0-1归一化下）"
            },
            "alpha": {
                "type": "slider",
                "min": 0.001,
                "max": 0.1,
                "step": 0.001,
                "default": 0.01,
                "label": "步长 α",
                "description": "每次迭代的扰动大小。推荐为 epsilon/iterations，例如0.01"
            },
            "num_iterations": {
                "type": "slider",
                "min": 1,
                "max": 100,
                "step": 1,
                "default": 40,
                "label": "迭代次数",
                "description": "I-FGSM迭代次数。越多越稳定，但耗时增加"
            },
            "targeted": {
                "type": "switch",
                "default": False,
                "label": "定向攻击",
                "description": "开启后攻击到指定类别，否则只需误分类"
            }
        }