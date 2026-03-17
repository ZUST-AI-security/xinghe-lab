import torch
import os
import uuid
import numpy as np
from PIL import Image
from .base_attack import BaseAttackService

try:
    from ultralytics import YOLO
except ImportError:
    YOLO = None

class DetectionAttackService(BaseAttackService):
    def __init__(self, model_path: str = "models/yolov8n.pt", device: str = None):
        super().__init__(device)
        if YOLO:
            self.model = YOLO(model_path)
            self.model.to(self.device)
        else:
            self.model = None

    def run_attack(self, image_path: str, params: dict):
        if not self.model:
            return {"error": "YOLO library not installed or model not loaded."}

        epsilon = float(params.get("epsilon", 0.03))
        
        # 1. 原始检测
        full_path = os.path.join(os.getcwd(), image_path)
        results = self.model(full_path)[0]
        
        task_id = str(uuid.uuid4())[:8]
        orig_detect_filename = f"uploads/results/orig_det_{task_id}.jpg"
        results.save(filename=os.path.join(os.getcwd(), orig_detect_filename))
        orig_count = len(results.boxes)
        
        # 2. 生成对抗样本
        img_tensor = self.load_image(image_path, size=(640, 640))
        
        # 模拟生成扰动 (实际开发中应使用模型梯度)
        noise = torch.randn_like(img_tensor) * epsilon
        adv_tensor = torch.clamp(img_tensor + noise, 0, 1)
        
        adv_img_path = f"uploads/results/adv_img_{task_id}.jpg"
        noise_img_path = f"uploads/results/noise_det_{task_id}.jpg"
        
        self.save_tensor_as_image(adv_tensor, adv_img_path)
        
        # 可视化噪声
        noise_vis = (adv_tensor - img_tensor).abs()
        if noise_vis.max() > 0:
            noise_vis = noise_vis / noise_vis.max()
        self.save_tensor_as_image(noise_vis, noise_img_path)
        
        # 3. 对抗样本检测
        adv_results = self.model(os.path.join(os.getcwd(), adv_img_path))[0]
        adv_detect_filename = f"uploads/results/adv_det_{task_id}.jpg"
        adv_results.save(filename=os.path.join(os.getcwd(), adv_detect_filename))
        adv_count = len(adv_results.boxes)
        
        return {
            "original_image": f"/{image_path}",
            "original_detection": f"/{orig_detect_filename}",
            "adversarial_detection": f"/{adv_detect_filename}",
            "adversarial_image": f"/{adv_img_path}",
            "noise_image": f"/{noise_img_path}",
            "detection_count_diff": f"检测目标从 {orig_count} 个变为 {adv_count} 个"
        }
