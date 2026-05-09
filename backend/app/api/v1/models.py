"""
ML model management API routes.

Lists models from the ml_models registry without loading weights.
"""

import logging
from fastapi import APIRouter, Depends, HTTPException

from app.core.security import get_current_active_user
from app.models.user import User

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/")
async def list_models(current_user: User = Depends(get_current_active_user)):
    """List all registered models with their metadata (no weight loading)."""
    try:
        from app.ml_models.registry import list_all
        models = list_all()
        return {"models": models, "total": len(models)}
    except Exception as e:
        logger.error(f"list_models failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats")
async def get_model_stats(current_user: User = Depends(get_current_active_user)):
    """Model registry statistics (authenticated)."""
    try:
        from app.ml_models.registry import list_all
        models = list_all()
        by_type: dict = {}
        for m in models:
            t = m.get("model_type", m.get("type", "unknown"))
            by_type[t] = by_type.get(t, 0) + 1
        return {
            "total_models": len(models),
            **{f"{k}_models": v for k, v in by_type.items()},
            "models": models,
        }
    except Exception as e:
        logger.error(f"get_model_stats failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{model_name}")
async def get_model_info(model_name: str, current_user: User = Depends(get_current_active_user)):
    """Get metadata for a specific model by id."""
    try:
        from app.ml_models.registry import list_all
        models = {m["id"]: m for m in list_all()}
        if model_name not in models:
            raise HTTPException(status_code=404, detail=f"Model '{model_name}' not found")
        return models[model_name]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"get_model_info failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
