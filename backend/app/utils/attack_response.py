from typing import Any, Dict, List

import torch


def _get_class_name(model: Any, class_id: int) -> str:
    if hasattr(model, "get_class_name"):
        return model.get_class_name(class_id)
    return str(class_id)


def build_prediction_summary(model: Any, probs: torch.Tensor, top_k: int = 5) -> Dict[str, Any]:
    probabilities = probs.detach().cpu()
    top_k = min(top_k, probabilities.size(1))
    top_probs, top_indices = torch.topk(probabilities, k=top_k, dim=1)

    top_items: List[Dict[str, Any]] = []
    for class_id, confidence in zip(top_indices[0].tolist(), top_probs[0].tolist()):
        top_items.append(
            {
                "class_id": class_id,
                "class_name": _get_class_name(model, class_id),
                "confidence": confidence,
            }
        )

    top_prediction = top_items[0] if top_items else None
    return {
        "prediction": top_prediction,
        "top5": top_items,
    }
