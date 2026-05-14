import torch
import torch.nn as nn
from torchvision import models, transforms
from PIL import Image, ImageChops, ImageEnhance
import numpy as np
import io
import base64
import json

class NeuralProcessor:
    def __init__(self):
        # Load a pre-trained ResNet18
        self.model = models.resnet18(pretrained=True)
        self.model.eval()
        
        # Image transformation
        self.preprocess = transforms.Compose([
            transforms.Resize(256),
            transforms.CenterCrop(224),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
        ])
        
        self.decode_transform = transforms.Compose([
            transforms.Normalize(mean=[-0.485/0.229, -0.456/0.224, -0.406/0.225], std=[1/0.229, 1/0.224, 1/0.225]),
            transforms.ToPILImage()
        ])

    def get_hallucination_v2(self, image_bytes):
        # Enhanced Neural Focus mapping (Saliency + Overlay)
        img_orig = Image.open(io.BytesIO(image_bytes)).convert('RGB')
        input_tensor = self.preprocess(img_orig).unsqueeze(0)
        input_tensor.requires_grad = True
        
        output = self.model(input_tensor)
        probs = torch.nn.functional.softmax(output, dim=1)
        conf, index = torch.max(probs, 1)
        
        # Backward pass for gradients
        output[0, index].backward()
        
        # Saliency map
        slc, _ = torch.max(torch.abs(input_tensor.grad[0]), dim=0)
        slc = (slc - slc.min()) / (slc.max() - slc.min() + 1e-8)
        
        # Create a colormap Focus (Purple-to-Gold)
        slc_np = slc.detach().numpy()
        heatmap = Image.new("RGB", (224, 224))
        pixels = heatmap.load()
        for y in range(224):
            for x in range(224):
                v = slc_np[y, x]
                # Purple (139, 92, 246) to Gold (250, 204, 21)
                r = int(139 + v * (250 - 139))
                g = int(92 + v * (204 - 92))
                b = int(246 + v * (21 - 246))
                pixels[x, y] = (r, g, b)
        
        heatmap = heatmap.resize(img_orig.size, Image.BILINEAR)
        
        # Blend with original
        overlay = Image.blend(img_orig, heatmap, 0.6)
        
        # Generate Profile Data
        profile = {
            "archetype": self._get_archetype(index.item()),
            "confidence": f"{conf.item()*100:.1f}%",
            "signal_stability": "STABLE" if conf.item() > 0.5 else "FLUCTUATING",
            "detected_class_id": index.item(),
            "observation": self._get_obs(index.item(), conf.item())
        }
        
        return self._img_to_base64(overlay), profile

    def _get_archetype(self, idx):
        categories = ["Sentinel", "Voyager", "Oracle", "Phantom", "Architect", "Nomad"]
        return categories[idx % len(categories)]

    def _get_obs(self, idx, conf):
        if conf > 0.8:
            return "The neural pathways are highly aligned. The reality is undeniable."
        elif conf > 0.4:
            return "A familiar pattern emerges from the noise, though shadows still linger."
        else:
            return "The signal is faint. It's as if the machine is dreaming of something that isn't there."

    def get_adversarial_glitch(self, image_bytes, epsilon=0.03):
        img = Image.open(io.BytesIO(image_bytes)).convert('RGB')
        input_tensor = self.preprocess(img).unsqueeze(0)
        input_tensor.requires_grad = True

        output = self.model(input_tensor)
        loss = nn.CrossEntropyLoss()(output, torch.tensor([output.max(1)[1]]))
        self.model.zero_grad()
        loss.backward()

        data_grad = input_tensor.grad.data
        perturbed_image = input_tensor + epsilon * data_grad.sign()
        perturbed_image = torch.clamp(perturbed_image, 0, 1)

        glitch_img = self.decode_transform(perturbed_image[0])
        glitch_img = glitch_img.resize(img.size, Image.LANCZOS)

        return self._img_to_base64(glitch_img)

    def get_pulse_perturbation(self, image_bytes, epsilon=0.12):
        """Extreme perturbation: amplify adversarial noise with color channel separation."""
        img = Image.open(io.BytesIO(image_bytes)).convert('RGB')
        input_tensor = self.preprocess(img).unsqueeze(0)
        input_tensor.requires_grad = True

        output = self.model(input_tensor)
        loss = nn.CrossEntropyLoss()(output, torch.tensor([output.max(1)[1]]))
        self.model.zero_grad()
        loss.backward()

        data_grad = input_tensor.grad.data
        perturbed = input_tensor + epsilon * data_grad.sign()
        perturbed = torch.clamp(perturbed, 0, 1)

        # Color channel shift for glitch aesthetic
        t = perturbed[0].clone()
        shifted = t.clone()
        shifted[0] = t[2].roll(3, dims=1)  # R <- B shifted
        shifted[2] = t[0].roll(-3, dims=1)  # B <- R shifted

        result_img = self.decode_transform(shifted)
        result_img = result_img.resize(img.size, Image.LANCZOS)

        return self._img_to_base64(result_img)

    def _img_to_base64(self, img):
        buffered = io.BytesIO()
        img.save(buffered, format="PNG")
        return base64.b64encode(buffered.getvalue()).decode('utf-8')

processor = NeuralProcessor()
