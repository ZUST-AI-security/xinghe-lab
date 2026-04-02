"""
ML models package — importing this module registers all built-in models.

To add a new model:
1. Create app/ml_models/my_model.py  (subclass BaseModel)
2. Add one line here:  register(MyModel)
"""

from app.ml_models.registry import register
from app.ml_models.resnet import ResNetImageNetModel
from app.ml_models.yolo import YOLOv8Model

register(ResNetImageNetModel)
register(YOLOv8Model)

__all__ = ["ResNetImageNetModel", "YOLOv8Model", "register"]
