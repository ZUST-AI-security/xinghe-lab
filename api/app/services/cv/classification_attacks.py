import torch
import torch.nn as nn
import torch.nn.functional as F
import os
import uuid
from .base_attack import BaseAttackService

# CIFAR-10 Classes
CIFAR10_CLASSES = ('plane', 'car', 'bird', 'cat', 'deer', 'dog', 'frog', 'horse', 'ship', 'truck')

class ClassificationAttackService(BaseAttackService):
    def __init__(self, model_path: str = None, device: str = None):
        super().__init__(device)
        self.model = self._load_resnet18(model_path)
        self.model.eval()

    def _load_resnet18(self, model_path: str):
        import torchvision.models as models
        model = models.resnet18(num_classes=10)
        if model_path and os.path.exists(model_path):
            try:
                model.load_state_dict(torch.load(model_path, map_location=self.device))
            except Exception as e:
                print(f"Failed to load weights: {e}")
        return model.to(self.device)

    def fgsm_attack(self, image, epsilon, data_grad):
        sign_data_grad = data_grad.sign()
        perturbed_image = image + epsilon * sign_data_grad
        return torch.clamp(perturbed_image, 0, 1)

    def pgd_attack(self, image, target, epsilon, alpha, iters):
        original_image = image.clone().detach()
        perturbed_image = image.clone().detach()
        for i in range(iters):
            perturbed_image.requires_grad = True
            output = self.model(perturbed_image)
            loss = F.cross_entropy(output, target)
            self.model.zero_grad()
            loss.backward()
            adv_images = perturbed_image + alpha * perturbed_image.grad.sign()
            eta = torch.clamp(adv_images - original_image, min=-epsilon, max=epsilon)
            perturbed_image = torch.clamp(original_image + eta, min=0, max=1).detach()
        return perturbed_image

    def run_attack(self, image_path: str, params: dict):
        epsilon = float(params.get("epsilon", 0.03))
        attack_type = params.get("attack_type", "fgsm")
        
        data = self.load_image(image_path, size=(32, 32))
        data.requires_grad = True
        
        output = self.model(data)
        init_pred = output.max(1, keepdim=True)[1]
        probs = F.softmax(output, dim=1).squeeze(0)
        
        if attack_type == "fgsm":
            loss = F.cross_entropy(output, init_pred.squeeze(0))
            self.model.zero_grad()
            loss.backward()
            perturbed_data = self.fgsm_attack(data, epsilon, data.grad)
        elif attack_type == "pgd":
            alpha = float(params.get("alpha", 0.01))
            steps = int(params.get("steps", 10))
            perturbed_data = self.pgd_attack(data, init_pred.squeeze(0), epsilon, alpha, steps)
        else:
            perturbed_data = data
            
        adv_output = self.model(perturbed_data)
        adv_pred = adv_output.max(1, keepdim=True)[1]
        adv_probs = F.softmax(adv_output, dim=1).squeeze(0)
        
        # 保存结果
        task_id = str(uuid.uuid4())[:8]
        adv_img_filename = f"uploads/results/adv_{task_id}.png"
        noise_img_filename = f"uploads/results/noise_{task_id}.png"
        
        self.save_tensor_as_image(perturbed_data, adv_img_filename)
        
        # 计算并保存噪声图 (差异放大)
        noise = (perturbed_data - data).abs()
        if noise.max() > 0:
            noise = noise / noise.max() # 归一化到 [0, 1] 方便观察
        self.save_tensor_as_image(noise, noise_img_filename)
        
        # 提取 Top 5 类别用于图表
        top5 = torch.topk(probs, 5)
        adv_top5 = torch.topk(adv_probs, 5)
        
        # 为了对比清晰，我们统一使用原始预测的前5个类作为图表 X 轴
        top5_idx = top5.indices.tolist()
        chart_labels = [CIFAR10_CLASSES[i] for i in top5_idx]
        
        return {
            "original_image": f"/{image_path}",
            "adversarial_image": f"/{adv_img_filename}",
            "noise_image": f"/{noise_img_filename}",
            "original_class": f"{CIFAR10_CLASSES[init_pred.item()]} ({probs[init_pred].item()*100:.2f}%)",
            "adversarial_class": f"{CIFAR10_CLASSES[adv_pred.item()]} ({adv_probs[adv_pred].item()*100:.2f}%)",
            "confidence_chart": {
                "labels": chart_labels,
                "original": [float(probs[i]) for i in top5_idx],
                "adversarial": [float(adv_probs[i]) for i in top5_idx]
            }
        }
