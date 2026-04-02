"""
星河智安 (XingHe ZhiAn) - C&W攻击算法实现（优化版）
Carlini & Wagner L2攻击，基于论文正确实现

论文: "Towards Evaluating the Robustness of Neural Networks" (Carlini & Wagner, 2017)
公式: minimize ||x' - x||_2^2 + c * f(x')
where f(x') = max(max_{i≠t} Z(x')_i - Z(x')_t, -κ)
"""

import torch
import torch.optim as optim
from typing import Dict, Any, Tuple, Optional
import numpy as np
import time
import logging

from app.services.attacks.base import BaseAttack
from app.services.model_manager.base import BaseModel, ModelType
from app.services.attacks.registry import AttackRegistry

logger = logging.getLogger(__name__)


@AttackRegistry.register(
    'cw',
    display_name='C&W Attack',
    description='Carlini & Wagner L2攻击算法(优化版),高成功率,稳定可靠',
    category='optimization',
    supported_models=['classification'],
    tags=['l2', 'optimization', 'carlini', 'wagner', 'high-success', 'stable']
)
class CWAttack(BaseAttack):
    """
    C&W L2攻击优化实现
    
    关键优化:
    1. 每个样本独立c值优化（非batch mean）
    2. 梯度裁剪防止梯度爆炸
    3. 合理的c值边界（1e5）
    4. 智能提前终止机制
    5. 模型预测频率优化（每50步检查）
    6. 增强数值稳定性
    """
    
    def __init__(self, model: BaseModel):
        super().__init__(model)
        self.validate_model_type([ModelType.CLASSIFICATION])
        logger.info(f"初始化C&W攻击（优化版），模型: {getattr(model, 'model_name', 'unknown')}")
    
    def _arctanh(self, x: torch.Tensor, epsilon: float = 1e-8) -> torch.Tensor:
        """
        数值稳定的arctanh
        
        Args:
            x: 输入张量，值域(-1, 1)
            epsilon: 边界保护值，默认1e-8
            
        Returns:
            arctanh(x)
        """
        x = torch.clamp(x, -1 + epsilon, 1 - epsilon)
        return 0.5 * torch.log((1 + x) / (1 - x))
    
    def _to_attack_space(self, x: torch.Tensor) -> torch.Tensor:
        """
        将图像从[0,1]映射到攻击空间
        
        变换: x -> arctanh(2x - 1)
        确保结果始终在(-inf, inf)内，且映射回[0,1]时不会越界
        
        Args:
            x: 输入图像 [batch, C, H, W]，值域[0,1]
            
        Returns:
            w: 攻击空间表示 [batch, C, H, W]
        """
        # 映射到(-1, 1)
        x = x * 2 - 1
        # arctanh变换
        return self._arctanh(x)
    
    def _from_attack_space(self, w: torch.Tensor) -> torch.Tensor:
        """
        从攻击空间映射回[0,1]
        
        变换: w -> (tanh(w) + 1) / 2
        使用tanh确保结果始终在(0,1)内，不会出现边界值
        
        Args:
            w: 攻击空间表示 [batch, C, H, W]
            
        Returns:
            x: 图像空间 [batch, C, H, W]，值域[0,1]
        """
        return (torch.tanh(w) + 1) / 2
    
    def _cw_loss(
        self,
        logits: torch.Tensor,
        target_labels: torch.Tensor,
        kappa: float,
        targeted: bool
    ) -> torch.Tensor:
        """
        C&W攻击损失函数 - 论文公式正确实现
        
        定向攻击: f(x') = max(max_{i≠t} Z_i - Z_t, -κ)
        非定向攻击: f(x') = max(Z_t - max_{i≠t} Z_i, -κ)
        
        修复: 使用torch.finfo动态获取最小值，防止FP16溢出
        
        Args:
            logits: 模型输出logits [batch, num_classes]
            target_labels: 目标标签 [batch]
            kappa: 置信度阈值
            targeted: 是否定向攻击
            
        Returns:
            f_loss: 攻击损失 [batch]，值>=-kappa
        """
        batch_size = logits.size(0)
        
        # 动态获取当前精度的最小值，防止FP16溢出（修复审计问题#1）
        min_val = torch.finfo(logits.dtype).min
        
        # 获取目标类别的logits
        target_logits = logits.gather(1, target_labels.unsqueeze(1)).squeeze(1)
        
        # 创建mask排除目标类别
        mask = torch.ones_like(logits)
        mask.scatter_(1, target_labels.unsqueeze(1), 0)
        
        # 使用数值更安全的掩码方式（修复-1e9溢出问题）
        other_logits = logits + (1 - mask) * min_val
        max_other = other_logits.max(dim=1)[0]
        
        if targeted:
            # 定向攻击: 希望目标类别成为最高logit
            # f = max(max_{i≠t} Z_i - Z_t, -κ)
            f_loss = torch.clamp(max_other - target_logits, min=-kappa)
        else:
            # 非定向攻击: 希望目标类别不再是最高logit
            # f = max(Z_t - max_{i≠t} Z_i, -κ)
            f_loss = torch.clamp(target_logits - max_other, min=-kappa)
        
        return f_loss
    
    def generate(
        self,
        images: torch.Tensor,
        targets: torch.Tensor,
        targeted: bool = False,
        c: float = 0.1,
        kappa: float = 0.0,
        max_iter: int = 100,
        lr: float = 0.01,
        binary_search_steps: int = 9,
        abort_early: bool = True,
        **kwargs
    ) -> Tuple[torch.Tensor, Dict[str, Any]]:
        """
        生成C&W对抗样本 - 优化版实现
        
        主要优化点:
        1. 每个样本独立c值优化（element-wise乘法）
        2. 梯度裁剪防止梯度爆炸
        3. 智能提前终止（基于loss变化率）
        4. 模型预测频率优化（每50步检查一次）
        5. 合理的c值边界（1e5）
        
        Args:
            images: 原始图像 [batch, C, H, W]，值域[0,1]
            targets: 标签 [batch]（定向攻击时为目标，非定向时为原始标签）
            targeted: 是否定向攻击
            c: 初始权衡系数（推荐0.1-10）
            kappa: 置信度阈值（推荐0）
            max_iter: 每轮二分搜索的迭代次数（推荐100）
            lr: Adam学习率（推荐0.01）
            binary_search_steps: 二分搜索步数（推荐9）
            abort_early: 是否启用提前终止（推荐True）
            
        Returns:
            Tuple[torch.Tensor, Dict]: (对抗样本, 元数据)
        """
        start_time = time.time()
        
        # ========== 防御性检查：防止解包错误 ==========
        # 检查1: 输入图像是否为空
        if images is None or images.numel() == 0:
            logger.error("接收到的图像数据为空！返回空结果")
            empty_tensor = torch.empty(0)
            error_metadata = {
                "error": "Input images are empty",
                "success": False,
                "success_rate": 0.0,
                "execution_time": 0.0
            }
            return empty_tensor, empty_tensor, error_metadata
        
        # 检查2: 维度验证和自动修复
        logger.debug(f"输入图像原始shape: {images.shape}, dtype: {images.dtype}")
        
        if len(images.shape) == 3:
            # 缺少batch维度，自动补充
            logger.info(f"检测到缺少batch维度，自动添加。原shape: {images.shape}")
            images = images.unsqueeze(0)
            if targets is not None and len(targets.shape) == 0:
                targets = targets.unsqueeze(0)
        elif len(images.shape) != 4:
            # 维度不正确，返回错误
            logger.error(f"输入图像维度不正确: {images.shape}，期望4维 [batch, C, H, W]")
            empty_tensor = torch.empty(0)
            error_metadata = {
                "error": f"Invalid image dimensions: {images.shape}, expected [batch, C, H, W]",
                "success": False,
                "success_rate": 0.0,
                "execution_time": 0.0
            }
            return empty_tensor, empty_tensor, error_metadata
        
        # 检查3: 确保targets不为空且维度正确
        if targets is None or targets.numel() == 0:
            logger.error("目标标签targets为空！")
            empty_tensor = torch.empty(0)
            error_metadata = {
                "error": "Target labels are empty",
                "success": False,
                "success_rate": 0.0,
                "execution_time": 0.0
            }
            return empty_tensor, empty_tensor, error_metadata
        
        batch_size = images.size(0)
        device = images.device
        
        # ========== 自适应图片尺寸处理 ==========
        # 获取模型期望的输入尺寸 (通常是 224x224)
        expected_size = getattr(self.model, 'input_size', (224, 224))
        if isinstance(expected_size, int):
            expected_size = (expected_size, expected_size)
        
        current_h, current_w = images.shape[2], images.shape[3]
        
        # 如果尺寸不匹配，使用F.interpolate进行自适应Resize
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
        
        logger.info(f"开始C&W攻击（优化版），batch={batch_size}, shape={images.shape}, targeted={targeted}, c_init={c}")
        
        # 获取原始预测 - 使用包装类的predict方法（无需梯度）
        with torch.no_grad():
            if hasattr(self.model, 'predict'):
                # 包装类：使用predict方法
                orig_pred = self.model.predict(images)
                orig_logits = orig_pred["logits"]
            else:
                # 原生nn.Module：直接调用
                orig_logits = self.model(images)
            orig_probs = torch.softmax(orig_logits, dim=1)
            orig_labels = orig_logits.argmax(dim=1)
        
        logger.debug(f"原始预测完成: labels={orig_labels.tolist()}, probs_max={orig_probs.max(dim=1)[0].tolist()}")
        
        # 设置目标标签
        if targeted:
            target_labels = targets.clone()
        else:
            target_labels = orig_labels.clone()
        
        logger.info(f"开始C&W攻击（优化版），batch={batch_size}, targeted={targeted}, c_init={c}")
        
        # 初始化c的边界 - 优化边界为1e5（避免数值不稳定）
        c_lower = torch.zeros(batch_size, device=device)
        c_upper = torch.ones(batch_size, device=device) * 1e5  # 从1e10改为1e5
        c_current = torch.ones(batch_size, device=device) * c
        
        # 记录最佳结果
        best_adv = images.clone()
        best_l2 = torch.ones(batch_size, device=device) * 1e10
        best_success = torch.zeros(batch_size, dtype=torch.bool, device=device)
        
        # 历史记录
        history = {
            'losses': [],
            'l2_norms': [],
            'success_rates': [],
            'c_values': []
        }
        
        # 二分搜索
        for search_step in range(binary_search_steps):
            logger.debug(f"二分搜索步骤 {search_step + 1}/{binary_search_steps}, c_mean={c_current.mean().item():.4f}")
            
            # 将图像转换到攻击空间
            w = self._to_attack_space(images)
            w = w.detach().clone().requires_grad_(True)
            
            # Adam优化器
            optimizer = optim.Adam([w], lr=lr)
            
            # 当前步骤的最佳
            step_best_l2 = torch.ones(batch_size, device=device) * 1e10
            step_best_adv = images.clone()
            step_success = torch.zeros(batch_size, dtype=torch.bool, device=device)
            
            # 提前终止相关变量
            prev_loss = float('inf')
            no_improvement_count = 0
            early_stop_patience = 30  # 30轮无改善则提前终止
            
            # 优化循环
            for iteration in range(max_iter):
                optimizer.zero_grad()
                
                # 从w空间转换到图像空间
                adv_images = self._from_attack_space(w)
                
                # 计算L2距离（逐样本）
                l2_dist = torch.sum((adv_images - images) ** 2, dim=[1, 2, 3])
                
                # 获取模型预测 - 关键修复：使用底层PyTorch模型进行梯度计算
                # 包装类只用于推理，梯度计算需要直接访问nn.Module
                if hasattr(self.model, 'model'):
                    # 如果是包装类，使用底层模型
                    logits = self.model.model(adv_images)
                else:
                    # 如果已经是nn.Module，直接使用
                    logits = self.model(adv_images)
                
                # 计算C&W损失（逐样本）
                f_loss = self._cw_loss(logits, target_labels, kappa, targeted)
                
                # 关键修复：每个样本使用自己的c值（element-wise乘法）
                # 不是 c_mean * f_loss，而是 c_current * f_loss
                total_loss_per_sample = l2_dist + c_current * f_loss
                loss = total_loss_per_sample.mean()
                
                # 反向传播
                loss.backward()
                
                # 添加梯度裁剪防止梯度爆炸
                torch.nn.utils.clip_grad_norm_([w], max_norm=1.0)
                
                optimizer.step()
                
                # 更新当前步骤最佳（每50步检查一次，减少模型调用）
                check_every = 50
                if iteration % check_every == 0 or iteration == max_iter - 1:
                    with torch.no_grad():
                        # 检查是否攻击成功
                        pred_labels = logits.argmax(dim=1)
                        
                        if targeted:
                            success = (pred_labels == target_labels)
                        else:
                            success = (pred_labels != orig_labels)
                        
                        # 更新最佳结果
                        for i in range(batch_size):
                            if l2_dist[i] < step_best_l2[i]:
                                step_best_l2[i] = l2_dist[i]
                                step_best_adv[i] = adv_images[i].detach()
                                step_success[i] = success[i]
                
                # 提前终止检查（基于loss变化率）
                if abort_early and iteration > 0:
                    current_loss = loss.item()
                    if abs(prev_loss - current_loss) < 1e-5:
                        no_improvement_count += 1
                        if no_improvement_count >= early_stop_patience:
                            logger.debug(f"  提前终止于迭代 {iteration}（loss无改善）")
                            break
                    else:
                        no_improvement_count = 0
                    prev_loss = current_loss
                
                # 记录日志（每20轮）
                if iteration % 20 == 0:
                    logger.debug(f"  迭代 {iteration}: loss={loss.item():.4f}, l2_mean={l2_dist.mean().item():.6f}")
            
            # 记录历史
            with torch.no_grad():
                history['losses'].append(loss.item())
                history['l2_norms'].append(step_best_l2.mean().item())
                history['success_rates'].append(step_success.float().mean().item())
                history['c_values'].append(c_current.mean().item())
            
            # 更新全局最佳
            for i in range(batch_size):
                if step_success[i] and step_best_l2[i] < best_l2[i]:
                    best_l2[i] = step_best_l2[i]
                    best_adv[i] = step_best_adv[i]
                    best_success[i] = True
            
            logger.info(f"步骤 {search_step + 1}: 成功率={step_success.float().mean().item():.2%}, "
                       f"最佳L2={step_best_l2[step_success].mean().item() if step_success.any() else 999:.6f}")
            
            # 二分搜索更新c
            for i in range(batch_size):
                if step_success[i]:
                    # 成功，减小c
                    c_upper[i] = min(c_upper[i], c_current[i])
                    c_current[i] = (c_lower[i] + c_upper[i]) / 2
                else:
                    # 失败，增大c
                    c_lower[i] = max(c_lower[i], c_current[i])
                    c_current[i] = (c_lower[i] + c_upper[i]) / 2 if c_upper[i] < 1e5 else c_current[i] * 10
        
        # 最终验证
        execution_time = time.time() - start_time
        
        with torch.no_grad():
            # 使用包装类的predict方法进行最终验证
            if hasattr(self.model, 'predict'):
                final_pred = self.model.predict(best_adv)
                final_logits = final_pred["logits"]
            else:
                final_logits = self.model(best_adv)
            final_probs = torch.softmax(final_logits, dim=1)
            final_labels = final_logits.argmax(dim=1)
            
            # 检查成功
            if targeted:
                final_success = (final_labels == target_labels)
            else:
                final_success = (final_labels != orig_labels)
            
            success_rate = final_success.float().mean().item()
            
            # 计算扰动
            perturbation = best_adv - images
            l2_norms = torch.norm(perturbation.view(batch_size, -1), p=2, dim=1)
            
            # 生成热力图 - 增强可见性（Gamma矫正）
            heatmap = torch.abs(perturbation).mean(dim=1, keepdim=True)
            heatmap = (heatmap - heatmap.min()) / (heatmap.max() - heatmap.min() + 1e-8)
            # Gamma 矫正，拉高暗部细节，使热力图更易观察
            heatmap = torch.pow(heatmap, 0.5)
        
        # 获取类别名称（支持Batch处理）
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
                adv_img_b64 = tensor_to_base64(best_adv[i:i+1])
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
        
        logger.info(f"C&W攻击完成: 成功率={success_rate:.2%}, 平均L2={l2_norms.mean().item():.6f}, 耗时={execution_time:.2f}s")
        for i in range(min(3, batch_size)):  # 日志显示前3个样本
            logger.info(f"样本[{i}]: {orig_class_names[i]}(conf={orig_probs[i].max().item():.2%}) -> "
                       f"{adv_class_names[i]}(conf={final_probs[i].max().item():.2%}), "
                       f"L2={l2_norms[i].item():.4f}, 成功={final_success[i].item()}")
        
        # 组装元数据 - 支持Batch的完整信息（修复审计问题#2）
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
            'history': history,
            
            # 整体统计
            'success_rate': success_rate,
            'avg_l2_norm': l2_norms.mean().item(),
            'execution_time': execution_time,
            'targeted': targeted,
            'final_c_value': c_current.mean().item(),
            
            # 参数配置
            'parameters': {
                'c': c,
                'kappa': kappa,
                'lr': lr,
                'max_iter': max_iter,
                'binary_search_steps': binary_search_steps
            },
            
            # 每样本详细结果（支持Batch，每样本独立）
            'per_sample_results': [
                {
                    'sample_idx': i,
                    'success': bool(final_success[i].item()),
                    'original_label': int(orig_labels[i].item()),
                    'original_class_name': orig_class_names[i],
                    'original_confidence': float(orig_probs[i].max().item()),
                    'adversarial_label': int(final_labels[i].item()),
                    'adversarial_class_name': adv_class_names[i],
                    'adversarial_confidence': float(final_probs[i].max().item()),
                    'perturbation_norm': float(l2_norms[i].item()),
                    'adv_image_base64': adv_images_base64[i],  # 该样本的base64图像
                    'heatmap_base64': heatmaps_base64[i],        # 该样本的热力图
                }
                for i in range(batch_size)
            ],
            
            # 向后兼容的字段（单样本时使用第一个样本的数据）
            'original_label': int(orig_labels[0].item()),
            'original_class_name': orig_class_names[0],
            'original_confidence': float(orig_probs[0].max().item()),
            'adversarial_label': int(final_labels[0].item()),
            'adversarial_class_name': adv_class_names[0],
            'adversarial_confidence': float(final_probs[0].max().item()),
            'perturbation_norm': float(l2_norms[0].item()),
            'success': success_rate > 0.5
        }
        
        # 显存优化：释放临时变量（修复审计问题#4）
        del w, optimizer, step_best_adv, perturbation
        del orig_pred, orig_logits
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
        
        # 返回3个值：原始图像、对抗样本、元数据（支持扰动计算）
        return images.detach(), best_adv.detach(), metadata
    
    @classmethod
    def get_params_schema(cls) -> Dict[str, Any]:
        """
        参数配置schema - 使用论文推荐值和优化参数
        
        推荐参数组合:
        - c=0.1, kappa=0, lr=0.01, max_iter=100, binary_search_steps=9
        """
        return {
            "c": {
                "type": "slider",
                "min": 0.01,
                "max": 100.0,
                "step": 0.01,
                "default": 0.1,
                "label": "权衡系数 c",
                "description": "平衡扰动大小和攻击成功率，推荐0.1-10（每个样本独立优化）"
            },
            "kappa": {
                "type": "slider",
                "min": 0.0,
                "max": 50.0,
                "step": 1.0,
                "default": 0.0,
                "label": "置信度阈值 κ",
                "description": "控制攻击的置信度，推荐0"
            },
            "lr": {
                "type": "slider",
                "min": 0.001,
                "max": 0.1,
                "step": 0.001,
                "default": 0.01,
                "label": "学习率",
                "description": "Adam优化器学习率，推荐0.01"
            },
            "max_iter": {
                "type": "slider",
                "min": 10,
                "max": 500,
                "step": 10,
                "default": 100,
                "label": "每轮迭代次数",
                "description": "每轮二分搜索的迭代次数，推荐100"
            },
            "binary_search_steps": {
                "type": "slider",
                "min": 1,
                "max": 20,
                "step": 1,
                "default": 9,
                "label": "二分搜索步数",
                "description": "搜索最优c值的步数，推荐9"
            },
            "targeted": {
                "type": "switch",
                "default": False,
                "label": "定向攻击",
                "description": "开启后攻击到指定类别"
            }
        }
