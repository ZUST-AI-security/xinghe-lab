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
        # 1. 确定 API 根目录 (D:\project\xinghe-lab\api)
        # 无论从哪里启动，此文件都在 api/app/services/cv/ 下
        this_file_dir = os.path.dirname(os.path.abspath(__file__))
        api_root = os.path.abspath(os.path.join(this_file_dir, "../../../"))
        
        # 2. 清洗输入路径
        # 去掉开头的斜杠
        clean_path = path.lstrip('/')
        # 如果路径以 'api/' 开头，去掉它，因为 api_root 已经是 api 目录了
        if clean_path.startswith('api/'):
            clean_path = clean_path[4:]
            
        # 3. 尝试多种拼接方式
        possible_paths = [
            os.path.join(api_root, clean_path),                    # 预期：api/uploads/...
            os.path.join(os.getcwd(), clean_path),                 # 兜底：当前目录下
            os.path.join(os.getcwd(), "api", clean_path),          # 兜底：项目根目录下
            os.path.abspath(clean_path)                            # 绝对路径
        ]
        
        full_path = None
        for p in possible_paths:
            if os.path.exists(p) and os.path.isfile(p):
                full_path = p
                break
                
        if not full_path:
            error_msg = f"Image not found. Searched in: {possible_paths}"
            print(error_msg)
            raise FileNotFoundError(error_msg)
            
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
        # 确定 api 根目录以确保保存路径正确
        this_file_dir = os.path.dirname(os.path.abspath(__file__))
        api_root = os.path.abspath(os.path.join(this_file_dir, "../../../"))
        
        # 清洗保存路径
        clean_output = output_path.lstrip('/')
        if clean_output.startswith('api/'):
            clean_output = clean_output[4:]
            
        full_output_path = os.path.join(api_root, clean_output)
        
        # (1, 3, H, W) -> (3, H, W)
        img_tensor = tensor.detach().cpu().squeeze(0)
        img_tensor = torch.clamp(img_tensor, 0, 1)
        
        # Convert to PIL
        img = transforms.ToPILImage()(img_tensor)
        
        # Ensure output directory exists
        os.makedirs(os.path.dirname(full_output_path), exist_ok=True)
        
        img.save(full_output_path)
        return output_path
