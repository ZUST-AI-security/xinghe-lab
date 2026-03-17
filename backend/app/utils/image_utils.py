"""
星河智安 (XingHe ZhiAn) - 图像处理工具函数
包含Base64编码/解码、图像预处理、格式转换等功能
"""

import base64
import io
import numpy as np
from PIL import Image
import cv2
from typing import Tuple, Optional, Union
import logging

logger = logging.getLogger(__name__)

def base64_to_image(base64_str: str) -> np.ndarray:
    """
    Base64字符串转换为numpy数组
    
    Args:
        base64_str: Base64编码的图片字符串
        
    Returns:
        np.ndarray: RGB格式的图像数组 [H, W, C]
        
    Raises:
        ValueError: 无效的Base64格式
    """
    try:
        # 移除data:image/xxx;base64,前缀
        if ',' in base64_str:
            base64_str = base64_str.split(',')[1]
        
        # 解码Base64
        image_data = base64.b64decode(base64_str)
        
        # 转换为PIL Image
        image = Image.open(io.BytesIO(image_data))
        
        # 转换为RGB格式
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        # 转换为numpy数组
        image_array = np.array(image)
        
        logger.debug(f"成功解码图片，尺寸: {image_array.shape}")
        return image_array
        
    except Exception as e:
        logger.error(f"Base64解码失败: {str(e)}")
        raise ValueError(f"无效的图片Base64格式: {str(e)}")

def image_to_base64(image: np.ndarray, 
                    format: str = 'JPEG', 
                    quality: int = 95,
                    is_heatmap: bool = False) -> str:
    """
    numpy数组转换为Base64字符串
    
    Args:
        image: 图像数组 [H, W, C] 或 [H, W]
        format: 图片格式 ('JPEG', 'PNG')
        quality: JPEG质量 (1-100)
        is_heatmap: 是否为热力图
        
    Returns:
        str: Base64编码的图片字符串
        
    Raises:
        ValueError: 无效的图像格式
    """
    try:
        # 处理热力图
        if is_heatmap:
            image = _process_heatmap(image)
        
        # 确保图像为uint8格式
        if image.dtype != np.uint8:
            if image.max() <= 1.0:
                image = (image * 255).astype(np.uint8)
            else:
                image = image.astype(np.uint8)
        
        # 转换为PIL Image
        if len(image.shape) == 2:
            # 灰度图
            image = Image.fromarray(image, mode='L')
        elif len(image.shape) == 3:
            # RGB图
            image = Image.fromarray(image, mode='RGB')
        else:
            raise ValueError(f"不支持的图像维度: {image.shape}")
        
        # 保存到字节流
        buffer = io.BytesIO()
        
        # 设置保存参数
        save_kwargs = {}
        if format.upper() == 'JPEG':
            save_kwargs['quality'] = quality
            save_kwargs['optimize'] = True
        
        image.save(buffer, format=format, **save_kwargs)
        
        # 编码为Base64
        image_data = buffer.getvalue()
        base64_str = base64.b64encode(image_data).decode('utf-8')
        
        # 添加data URL前缀
        mime_type = 'image/jpeg' if format.upper() == 'JPEG' else 'image/png'
        return f"data:{mime_type};base64,{base64_str}"
        
    except Exception as e:
        logger.error(f"图像Base64编码失败: {str(e)}")
        raise ValueError(f"图像编码失败: {str(e)}")

def _process_heatmap(heatmap: np.ndarray) -> np.ndarray:
    """
    处理热力图，应用颜色映射
    
    Args:
        heatmap: 热力图数据 [H, W] 或 [H, W, 1]
        
    Returns:
        np.ndarray: RGB格式的热力图
    """
    # 确保为2D
    if len(heatmap.shape) == 3:
        heatmap = heatmap.squeeze()
    
    # 归一化到0-255
    heatmap = ((heatmap - heatmap.min()) / (heatmap.max() - heatmap.min() + 1e-8) * 255).astype(np.uint8)
    
    # 应用颜色映射
    heatmap_colored = cv2.applyColorMap(heatmap, cv2.COLORMAP_JET)
    
    return heatmap_colored

def resize_image(image: np.ndarray, 
                target_size: Tuple[int, int], 
                keep_aspect_ratio: bool = True) -> np.ndarray:
    """
    调整图像尺寸
    
    Args:
        image: 输入图像 [H, W, C]
        target_size: 目标尺寸 (width, height)
        keep_aspect_ratio: 是否保持宽高比
        
    Returns:
        np.ndarray: 调整后的图像
    """
    if keep_aspect_ratio:
        # 保持宽高比的letterbox resize
        h, w = image.shape[:2]
        target_w, target_h = target_size
        
        scale = min(target_w / w, target_h / h)
        new_w, new_h = int(w * scale), int(h * scale)
        
        resized = cv2.resize(image, (new_w, new_h))
        
        # 创建画布
        canvas = np.full((target_h, target_w, 3), 114, dtype=np.uint8)
        
        # 居中放置
        y_offset = (target_h - new_h) // 2
        x_offset = (target_w - new_w) // 2
        canvas[y_offset:y_offset+new_h, x_offset:x_offset+new_w] = resized
        
        return canvas
    else:
        # 直接resize
        return cv2.resize(image, target_size)

def normalize_image(image: np.ndarray, 
                   mean: Optional[Tuple[float, float, float]] = None,
                   std: Optional[Tuple[float, float, float]] = None) -> np.ndarray:
    """
    图像标准化
    
    Args:
        image: 输入图像 [H, W, C], 值域0-255
        mean: 均值 (R, G, B)
        std: 标准差 (R, G, B)
        
    Returns:
        np.ndarray: 标准化后的图像
    """
    # 转换为float并归一化到0-1
    image = image.astype(np.float32) / 255.0
    
    # 应用标准化
    if mean is not None and std is not None:
        mean = np.array(mean, dtype=np.float32)
        std = np.array(std, dtype=np.float32)
        image = (image - mean) / std
    
    return image

def denormalize_image(image: np.ndarray,
                     mean: Optional[Tuple[float, float, float]] = None,
                     std: Optional[Tuple[float, float, float]] = None) -> np.ndarray:
    """
    反标准化图像
    
    Args:
        image: 标准化的图像 [H, W, C]
        mean: 均值 (R, G, B)
        std: 标准差 (R, G, B)
        
    Returns:
        np.ndarray: 反标准化的图像，值域0-255
    """
    # 反标准化
    if mean is not None and std is not None:
        mean = np.array(mean, dtype=np.float32)
        std = np.array(std, dtype=np.float32)
        image = image * std + mean
    
    # 转换回0-255
    image = np.clip(image * 255.0, 0, 255).astype(np.uint8)
    
    return image

def validate_image_format(image: np.ndarray) -> bool:
    """
    验证图像格式
    
    Args:
        image: 图像数组
        
    Returns:
        bool: 格式是否有效
    """
    # 检查维度
    if len(image.shape) not in [2, 3]:
        return False
    
    # 检查通道数
    if len(image.shape) == 3 and image.shape[2] not in [1, 3, 4]:
        return False
    
    # 检查数据类型
    if image.dtype not in [np.uint8, np.float32, np.float64]:
        return False
    
    # 检查值域
    if image.dtype == np.uint8:
        if image.min() < 0 or image.max() > 255:
            return False
    else:
        if image.min() < 0.0 or image.max() > 1.0:
            return False
    
    return True

def get_image_info(image: np.ndarray) -> dict:
    """
    获取图像信息
    
    Args:
        image: 图像数组
        
    Returns:
        dict: 图像信息
    """
    info = {
        'shape': image.shape,
        'dtype': str(image.dtype),
        'min_value': float(image.min()),
        'max_value': float(image.max()),
        'mean_value': float(image.mean()),
        'channels': 1 if len(image.shape) == 2 else image.shape[2]
    }
    
    # 判断图像类型
    if len(image.shape) == 2:
        info['type'] = 'grayscale'
    elif image.shape[2] == 1:
        info['type'] = 'grayscale'
    elif image.shape[2] == 3:
        info['type'] = 'rgb'
    elif image.shape[2] == 4:
        info['type'] = 'rgba'
    else:
        info['type'] = 'unknown'
    
    return info
