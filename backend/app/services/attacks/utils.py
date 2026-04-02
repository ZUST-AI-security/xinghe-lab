"""
星河智安 (XingHe ZhiAn) - 攻击服务工具函数
图像处理、路径解析等通用功能
"""

import torch
import torchvision.transforms as transforms
from PIL import Image
import os
from pathlib import Path
from ...core.config import settings


class ImageUtils:
    """图像处理工具类"""
    
    @staticmethod
    def resolve_input_path(path: str) -> str:
        """
        解析输入文件路径
        优先级: 绝对路径 -> 项目根目录 -> uploads目录 -> 当前目录
        """
        if not path:
            raise FileNotFoundError("Empty path provided")

        clean_path = path.lstrip("/")
        candidates = []

        p = Path(path)
        if p.is_absolute():
            candidates.append(p)

        candidates.append(Path(settings.project_root) / clean_path)

        # 如果路径不包含 uploads/，尝试 uploads 根目录
        if not clean_path.startswith("uploads/"):
            candidates.append(Path(settings.uploads_dir) / clean_path)

        candidates.append(Path(os.getcwd()) / clean_path)

        for candidate in candidates:
            if candidate.exists() and candidate.is_file():
                return str(candidate)

        error_msg = f"Image not found. Searched in: {[str(c) for c in candidates]}"
        raise FileNotFoundError(error_msg)

    @staticmethod
    def resolve_output_path(output_path: str) -> Path:
        """解析输出路径"""
        if not output_path:
            raise FileNotFoundError("Empty output path provided")

        p = Path(output_path)
        if p.is_absolute():
            return p

        clean_output = output_path.lstrip("/")
        return Path(settings.project_root) / clean_output

    @staticmethod
    def load_image(path: str, size: tuple = (32, 32), device: str = None):
        """加载图像并转换为归一化的张量"""
        full_path = ImageUtils.resolve_input_path(path)
        img = Image.open(full_path).convert("RGB")
        transform = transforms.Compose([
            transforms.Resize(size),
            transforms.ToTensor(),
        ])
        tensor = transform(img).unsqueeze(0)
        if device:
            tensor = tensor.to(device)
        return tensor

    @staticmethod
    def save_tensor_as_image(tensor, output_path: str):
        """将张量保存为图像"""
        full_output_path = ImageUtils.resolve_output_path(output_path)
        
        # (1, 3, H, W) -> (3, H, W)
        img_tensor = tensor.detach().cpu().squeeze(0)
        img_tensor = torch.clamp(img_tensor, 0, 1)
        
        # 转换为PIL
        img = transforms.ToPILImage()(img_tensor)
        
        # 确保输出目录存在
        full_output_path.parent.mkdir(parents=True, exist_ok=True)
        
        img.save(str(full_output_path))
        return output_path
