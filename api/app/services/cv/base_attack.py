import torch
import torch.nn as nn
import torchvision.transforms as transforms
from PIL import Image
import os
import numpy as np

class BaseAttackService:
    """
    Base class for CV attacks.
    Handles image loading, saving, and basic pre/post-processing.
    """
    def __init__(self, device: str = None):
        if device is None:
            self.device = "cuda" if torch.cuda.is_available() else "cpu"
        else:
            self.device = device

    def load_image(self, path: str, size: tuple = (32, 32)):
        """
        Loads an image and converts it to a normalized torch tensor.
        """
        # Ensure path is absolute from the root (D:\project\xinghe-lab\api\)
        full_path = os.path.join(os.getcwd(), path)
        if not os.path.exists(full_path):
            raise FileNotFoundError(f"Image not found at {full_path}")
            
        img = Image.open(full_path).convert('RGB')
        transform = transforms.Compose([
            transforms.Resize(size),
            transforms.ToTensor(),
        ])
        return transform(img).unsqueeze(0).to(self.device)

    def save_tensor_as_image(self, tensor, output_path: str):
        """
        Saves a torch tensor (B, C, H, W) as an image file.
        """
        # (1, 3, H, W) -> (3, H, W)
        img_tensor = tensor.detach().cpu().squeeze(0)
        img_tensor = torch.clamp(img_tensor, 0, 1)
        
        # Convert to PIL
        img = transforms.ToPILImage()(img_tensor)
        
        # Ensure output directory exists
        full_output_path = os.path.join(os.getcwd(), output_path)
        os.makedirs(os.path.dirname(full_output_path), exist_ok=True)
        
        img.save(full_output_path)
        return output_path
