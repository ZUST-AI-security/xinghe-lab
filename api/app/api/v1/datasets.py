from fastapi import APIRouter, HTTPException
import os
import torch
import torchvision
import torchvision.transforms as transforms
from PIL import Image
import uuid
from typing import List, Dict

router = APIRouter()

# Path to store sample images for the picker - Moved to data/
SAMPLES_DIR = "data/samples/cifar10"
os.makedirs(SAMPLES_DIR, exist_ok=True)

# CIFAR-10 Classes
CIFAR10_CLASSES = ('plane', 'car', 'bird', 'cat', 'deer', 'dog', 'frog', 'horse', 'ship', 'truck')

@router.get("/datasets/cifar10/samples")
async def get_cifar10_samples(count: int = 20):
    """
    Returns a list of random samples from CIFAR-10.
    """
    try:
        # Load a few samples from CIFAR-10 test set
        dataset = torchvision.datasets.CIFAR10(root='./data', train=False, download=True, transform=None)
        
        samples = []
        # Get random indices
        indices = torch.randperm(len(dataset))[:count]
        
        for idx in indices:
            idx = int(idx)
            img, label = dataset[idx]
            
            # Save PIL image to data/samples/cifar10
            filename = f"sample_{idx}.png"
            file_path = os.path.join(SAMPLES_DIR, filename)
            
            if not os.path.exists(file_path):
                img.save(file_path)
            
            samples.append({
                "id": str(idx),
                "url": f"/data/samples/cifar10/{filename}",
                "label": CIFAR10_CLASSES[label],
                "label_idx": label
            })
            
        return samples
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load CIFAR-10 samples: {str(e)}")
