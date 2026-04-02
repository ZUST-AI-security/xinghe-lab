"""Simple dict-based model registry. Never loads model weights."""

from typing import Dict, List, Optional, Type

from app.ml_models.base import BaseModel

_registry: Dict[str, Type[BaseModel]] = {}


def register(cls: Type[BaseModel]) -> None:
    """Register a model class by its ``model_id`` attribute."""
    _registry[cls.model_id] = cls


def get(model_id: str) -> Optional[Type[BaseModel]]:
    """Return the model class for *model_id*, or None if not found."""
    return _registry.get(model_id)


def create(model_id: str, **kwargs) -> Optional[BaseModel]:
    """Instantiate (but NOT load) a model. Returns None if not registered."""
    cls = _registry.get(model_id)
    if cls is None:
        return None
    return cls(**kwargs)


def list_all() -> List[dict]:
    """Return metadata for every registered model — no weight loading."""
    return [
        {
            "id": cls.model_id,
            "display_name": cls.display_name,
            "description": cls.description,
            "model_type": cls.model_type,
        }
        for cls in _registry.values()
    ]
