"""
简单测试模型
"""

from ..base import BaseModel, ModelType
from ..registry import ModelRegistry

@ModelRegistry.register(
    'test_model',
    display_name='Test Model',
    description='Simple test model',
    category='classification',
    tags=['test']
)
class TestModel(BaseModel):
    def __init__(self, name, device='cpu'):
        super().__init__(name, device)
        self.display_name = 'Test Model'
        self.type = ModelType.CLASSIFICATION
        self.description = 'Simple test model'
        self.input_shape = (224, 224, 3)
        self.num_classes = 1000
    
    def load(self):
        return True
    
    def predict(self, x):
        return {"logits": [[0] * 1000]}
    
    def preprocess(self, image):
        import torch
        return torch.randn(1, 3, 224, 224)
    
    def unload(self):
        pass
