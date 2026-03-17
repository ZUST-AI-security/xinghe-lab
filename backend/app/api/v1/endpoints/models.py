"""
星河智安 (XingHe ZhiAn) - 模型管理API路由
获取可用模型、模型信息等
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ....core.database import get_db
from ....services.model_manager import model_registry
from ....core.security import get_current_user
from ....models.user import User

router = APIRouter()

@router.get("/")
async def get_available_models():
    """
    获取所有可用模型列表
    """
    try:
        models = model_registry.get_all_models()
        return {
            "models": models,
            "total": len(models)
        }
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
        
        return {
            "name": model.name,
            "display_name": model.display_name,
            "type": model.type.value,
            "description": model.description,
            "input_shape": model.input_shape,
            "num_classes": model.num_classes,
            "parameters": getattr(model, 'parameters', None)
        }
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
        models = model_registry.get_all_models()
        stats = {
            "total_models": len(models),
            "classification_models": len([m for m in models if m.type.value == "classification"]),
            "detection_models": len([m for m in models if m.type.value == "detection"]),
            "models": [
                {
                    "name": m.name,
                    "display_name": m.display_name,
                    "type": m.type.value,
                    "parameters": getattr(m, 'parameters', None)
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
