"""Simple dict-based algorithm registry."""

from typing import Dict, List, Optional, Type

from app.algorithms.base import BaseAlgorithm

_registry: Dict[str, Type[BaseAlgorithm]] = {}


def register(cls: Type[BaseAlgorithm]) -> None:
    """Register an algorithm class by its ``name`` attribute."""
    _registry[cls.name] = cls


def get(name: str) -> Optional[Type[BaseAlgorithm]]:
    """Return the algorithm class for *name*, or None if not found."""
    return _registry.get(name)


def list_all() -> List[dict]:
    """Return metadata for every registered algorithm (no instantiation)."""
    return [
        {
            "name": cls.name,
            "display_name": cls.display_name,
            "description": cls.description,
            "category": cls.category,
            "supported_task_types": cls.supported_task_types,
        }
        for cls in _registry.values()
    ]
