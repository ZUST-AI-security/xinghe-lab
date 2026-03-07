import torch
import torch.nn as nn
import torch.nn.functional as F
import torchvision.models as models
from torchvision.models import ResNet50_Weights
import os
import uuid
from typing import Dict, Any, Type, Optional
from abc import ABC, abstractmethod
from .base_attack import BaseAttackService

class AttackStrategy(ABC):
    """Base class for adversarial attack strategies."""
    def __init__(self, model: nn.Module, device: str):
        self.model = model
        self.device = device

    @abstractmethod
    def execute(self, image: torch.Tensor, target: torch.Tensor, **kwargs) -> torch.Tensor:
        """Executes the attack and returns the perturbed image."""
        pass

class FGSMStrategy(AttackStrategy):
    """Fast Gradient Sign Method (FGSM) strategy."""
    def execute(self, image: torch.Tensor, target: torch.Tensor, **kwargs) -> torch.Tensor:
        epsilon = float(kwargs.get("epsilon", 0.03))
        
        image.requires_grad = True
        output = self.model(image)
        loss = F.cross_entropy(output, target)
        
        self.model.zero_grad()
        loss.backward()
        
        sign_data_grad = image.grad.sign()
        perturbed_image = image + epsilon * sign_data_grad
        return torch.clamp(perturbed_image, 0, 1).detach()

class PGDStrategy(AttackStrategy):
    """Projected Gradient Descent (PGD) strategy."""
    def execute(self, image: torch.Tensor, target: torch.Tensor, **kwargs) -> torch.Tensor:
        epsilon = float(kwargs.get("epsilon", 0.03))
        alpha = float(kwargs.get("alpha", 0.01))
        steps = int(kwargs.get("steps", 10))
        
        original_image = image.clone().detach()
        perturbed_image = image.clone().detach()
        
        for _ in range(steps):
            perturbed_image.requires_grad = True
            output = self.model(perturbed_image)
            loss = F.cross_entropy(output, target)
            
            self.model.zero_grad()
            loss.backward()
            
            adv_images = perturbed_image + alpha * perturbed_image.grad.sign()
            eta = torch.clamp(adv_images - original_image, min=-epsilon, max=epsilon)
            perturbed_image = torch.clamp(original_image + eta, min=0, max=1).detach()
            
        return perturbed_image

class AttackRegistry:
    """Registry for managing and dispatching attack strategies."""
    _strategies: Dict[str, Type[AttackStrategy]] = {
        "fgsm": FGSMStrategy,
        "pgd": PGDStrategy
    }

    @classmethod
    def get_strategy(cls, attack_type: str, model: nn.Module, device: str) -> Optional[AttackStrategy]:
        strategy_class = cls._strategies.get(attack_type.lower())
        if strategy_class:
            return strategy_class(model, device)
        return None

class NormalizedModel(nn.Module):
    """Wrapper to include normalization in the model forward pass."""
    def __init__(self, model: nn.Module, mean: tuple, std: tuple):
        super().__init__()
        self.model = model
        self.register_buffer('mean', torch.tensor(mean).view(1, 3, 1, 1))
        self.register_buffer('std', torch.tensor(std).view(1, 3, 1, 1))

    def forward(self, x):
        # x is assumed to be in [0, 1]
        x_norm = (x - self.mean) / self.std
        return self.model(x_norm)

class ClassificationAttackService(BaseAttackService):
    def __init__(self, model_path: str = None, device: str = None):
        super().__init__(device)
        # Load ResNet50 with ImageNet weights (224x224 input)
        weights = ResNet50_Weights.IMAGENET1K_V1
        self.raw_model = models.resnet50(weights=weights)
        self.raw_model.eval()
        
        # ImageNet normalization and labels
        self.categories = weights.meta["categories"]
        mean = (0.485, 0.456, 0.406)
        std = (0.229, 0.224, 0.225)
        
        self.model = NormalizedModel(self.raw_model, mean, std).to(self.device)
        self.model.eval()

    def run_attack(self, image_path: str, params: dict):
        attack_type = params.get("attack_type", "fgsm")
        
        # Load image for ResNet50 (224x224)
        data = self.load_image(image_path, size=(224, 224))
        
        # Get initial prediction
        with torch.no_grad():
            output = self.model(data)
            init_pred = output.max(1, keepdim=True)[1]
            probs = F.softmax(output, dim=1).squeeze(0)
        
        # Dispatch attack to strategy
        strategy = AttackRegistry.get_strategy(attack_type, self.model, self.device)
        if strategy:
            execution_params = params.copy()
            execution_params.pop("image", None)
            perturbed_data = strategy.execute(data, init_pred.squeeze(0), **execution_params)
        else:
            perturbed_data = data.clone().detach()
            
        # Get adversarial prediction
        with torch.no_grad():
            adv_output = self.model(perturbed_data)
            adv_pred = adv_output.max(1, keepdim=True)[1]
            adv_probs = F.softmax(adv_output, dim=1).squeeze(0)
        
        # Save results
        task_id = str(uuid.uuid4())[:8]
        adv_img_filename = f"uploads/results/adv_{task_id}.png"
        noise_img_filename = f"uploads/results/noise_{task_id}.png"
        
        self.save_tensor_as_image(perturbed_data, adv_img_filename)
        
        # Noise map (normalized for display)
        noise = (perturbed_data - data).abs()
        if noise.max() > 0:
            noise = noise / noise.max()
        self.save_tensor_as_image(noise, noise_img_filename)
        
        # Top 5 classes
        top5 = torch.topk(probs, 5)
        top5_idx = top5.indices.tolist()
        chart_labels = [self.categories[i] for i in top5_idx]
        
        return {
            "original_image": f"/{image_path}",
            "adversarial_image": f"/{adv_img_filename}",
            "noise_image": f"/{noise_img_filename}",
            "original_class": f"{self.categories[init_pred.item()]} ({probs[init_pred].item()*100:.2f}%)",
            "adversarial_class": f"{self.categories[adv_pred.item()]} ({adv_probs[adv_pred].item()*100:.2f}%)",
            "confidence_chart": {
                "labels": chart_labels,
                "original": [float(probs[i]) for i in top5_idx],
                "adversarial": [float(adv_probs[i]) for i in top5_idx]
            }
        }
