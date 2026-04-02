"""
星河智安 (XingHe ZhiAn) - 模型管理API路由
获取可用模型、模型信息等
"""

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
import base64
import logging
import torch

from ....db.session import get_db
from ....services.model_manager import model_registry
from ....core.security import get_current_user
from ....db.entities import User
from ....utils.image_utils import base64_to_image

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/")
async def get_available_models():
    """
    获取所有可用模型列表
    直接返回模型数组，兼容前端期望格式
    """
    try:
        models = model_registry.list_models()
        # 前端期望直接返回数组，不是 {models: [], total: n} 格式
        return models
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取模型列表失败: {str(e)}"
        )

@router.get("/{model_name}")
async def get_model_info(model_name: str):
    """
    获取特定模型信息
    """
    try:
        model = model_registry.get_model(model_name)
        if not model:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"模型 '{model_name}' 不存在"
            )

        info = model.get_model_info()
        metadata = model_registry.get_model_metadata(model_name) or {}
        info.update(metadata)

        return info
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取模型信息失败: {str(e)}"
        )

@router.get("/stats")
async def get_model_stats(current_user: User = Depends(get_current_user)):
    """
    获取模型统计信息（需要认证）
    """
    try:
        models = model_registry.list_models()
        stats = {
            "total_models": len(models),
            "classification_models": len([m for m in models if m.get("type") == "classification"]),
            "detection_models": len([m for m in models if m.get("type") == "detection"]),
            "models": [
                {
                    "name": m.get("name"),
                    "display_name": m.get("display_name"),
                    "type": m.get("type"),
                    "parameters": m.get("parameters")
                }
                for m in models
            ]
        }
        return stats
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取模型统计失败: {str(e)}"
        )

@router.post("/predict")
async def predict_image(
    image: str = Form(...),
    model_name: str = Form(default="resnet100_imagenet"),
    db: Session = Depends(get_db)
):
    """
    图片分类预测接口
    接收base64编码的图片，返回Top-1分类结果
    """
    try:
        # 解码图片
        decoded_image = base64_to_image(image)
        
        # 加载模型
        model = model_registry.get_model(model_name)
        if not model:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"模型 '{model_name}' 不存在"
            )
        
        # 预处理
        input_tensor = model.preprocess(decoded_image)
        if input_tensor.dim() == 3:
            input_tensor = input_tensor.unsqueeze(0)
        input_tensor = input_tensor.to(model.device)
        
        # 预测
        with torch.no_grad():
            prediction = model.predict(input_tensor)
            logits = prediction["logits"]
            probs = torch.softmax(logits, dim=1)
            
            # 获取Top-1结果
            top1_prob, top1_idx = torch.max(probs, dim=1)
            
            # 获取类别名称
            class_name = model.get_class_name(top1_idx[0].item())
            
            return {
                "class_id": int(top1_idx[0].item()),
                "class_name": class_name,
                "confidence": float(top1_prob[0].item()),
                "model_name": model_name
            }
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"图片预测失败: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"图片预测失败: {str(e)}"
        )
