from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from typing import Optional
import time
import torch
from app.services.attacks.pgd import PGDAttack
from app.core.models.resnet.model import RegisteredResNet100
from app.schemas.attacks.pgd import PGDAttackParams, PGDAttackResponse
from app.utils.image_utils import load_image, tensor_to_base64, base64_to_tensor
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/run", response_model=PGDAttackResponse)
async def run_pgd_attack(
    file: UploadFile = File(..., description="输入图片"),
    epsilon: float = Form(8/255, description="最大扰动范围"),
    alpha: float = Form(2/255, description="步长"),
    num_iter: int = Form(40, description="迭代次数"),
    random_start: bool = Form(True, description="随机初始化"),
    targeted: bool = Form(False, description="是否为定向攻击"),
    target_label: Optional[int] = Form(None, description="目标标签（定向攻击时使用）"),
    norm: str = Form("Linf", description="范数类型"),
    confidence_threshold: float = Form(0.5, description="置信度阈值")
):
    """
    执行PGD攻击（同步模式）
    
    注意: 基于性能测试，建议num_iter不超过100，否则可能超时
    """
    try:
        start_time = time.time()
        
        # 1. 加载图片
        logger.info("加载图片...")
        image_tensor = await load_image(file)
        
        # 2. 加载模型
        logger.info("加载模型...")
        device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        model = RegisteredResNet100()
        model.to(device)
        model.eval()
        
        # 3. 初始化攻击
        logger.info("初始化PGD攻击...")
        attack = PGDAttack(model, device=device)
        
        # 4. 准备目标标签
        targets = None
        if targeted and target_label is not None:
            targets = torch.tensor([target_label], device=device)
        
        # 5. 执行攻击
        logger.info(f"执行PGD攻击: epsilon={epsilon:.4f}, alpha={alpha:.4f}, num_iter={num_iter}")
        adv_images, metadata = attack.generate(
            image_tensor.to(device),
            targets,
            epsilon=epsilon,
            alpha=alpha,
            num_iter=num_iter,
            random_start=random_start,
            targeted=targeted,
            norm=norm
        )
        
        # 6. 计算执行时间
        execution_time = time.time() - start_time
        metadata['execution_time'] = execution_time
        
        # 7. 转换为返回格式
        original_img_base64 = tensor_to_base64(image_tensor)
        adv_img_base64 = tensor_to_base64(adv_images)
        
        # 8. 获取原始和对抗样本的top5预测
        original_probs = metadata['original_probs'][0]
        adv_probs = metadata['adv_probs'][0]
        
        top5_original = get_top5_predictions(original_probs)
        top5_adv = get_top5_predictions(adv_probs)
        
        logger.info(f"攻击完成，成功率: {metadata['success_rate']:.2%}, 耗时: {execution_time:.2f}s")
        
        return PGDAttackResponse(
            success=True,
            message="攻击成功完成",
            original_image=original_img_base64,
            adversarial_image=adv_img_base64,
            heatmap=tensor_to_base64(metadata['heatmap']),
            original_predictions=top5_original,
            adversarial_predictions=top5_adv,
            success_rate=metadata['success_rate'],
            avg_perturbation_norm=metadata['avg_perturbation_norm'],
            execution_time=execution_time,
            history=metadata['history']
        )
        
    except Exception as e:
        logger.error(f"PGD攻击失败: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"攻击执行失败: {str(e)}")

def get_top5_predictions(probs: torch.Tensor, top_k: int = 5) -> list:
    """获取top-k预测结果"""
    values, indices = torch.topk(probs, min(top_k, len(probs)))
    return [
        {"label": f"Class {idx.item()}", "confidence": val.item()}
        for idx, val in zip(indices, values)
    ]