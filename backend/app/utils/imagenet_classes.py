"""
Canonical ImageNet-1K labels derived from torchvision pretrained weights.
"""

from typing import Any, Dict, List, Optional

from torchvision.models import ResNet152_Weights


_CATEGORIES = list(ResNet152_Weights.IMAGENET1K_V2.meta["categories"])

IMAGENET_CLASSES = {idx: name for idx, name in enumerate(_CATEGORIES)}


def get_class_name(class_id: int) -> str:
    return IMAGENET_CLASSES.get(class_id, f"Unknown class {class_id}")


def search_classes(query: str, limit: int = 20) -> List[Dict[str, Any]]:
    query = query.lower().strip()
    if not query:
        return []

    results: List[Dict[str, Any]] = []
    for class_id, class_name in IMAGENET_CLASSES.items():
        if query in class_name.lower():
            results.append({"id": class_id, "name": class_name})
            if len(results) >= limit:
                break
    return results


def get_class_by_id(class_id: int) -> Optional[Dict[str, Any]]:
    name = IMAGENET_CLASSES.get(class_id)
    if name is None:
        return None
    return {"id": class_id, "name": name}


def get_popular_classes(limit: int = 50) -> List[Dict[str, Any]]:
    return [{"id": class_id, "name": class_name} for class_id, class_name in list(IMAGENET_CLASSES.items())[:limit]]
