from fastapi import APIRouter
from typing import List
from app.schemas.schemas import Algorithm

router = APIRouter()

# --- Dynamic Algorithm Registry ---

ALGORITHM_REGISTRY: List[Algorithm] = [
    Algorithm(
        id="resnet18_cifar10",
        name="ResNet18 对抗攻击 (CIFAR-10)",
        description="针对 CIFAR-10 数据集的 ResNet18 分类模型进行对抗攻击，支持 FGSM 和 PGD 算法。",
        inputs=[
            {"name": "source", "type": "select", "label": "输入来源", "options": [
                {"label": "数据集样本", "value": "dataset"},
                {"label": "自定义上传", "value": "upload"}
            ], "default": "dataset"},
            {"name": "dataset_sample", "type": "dataset_picker", "label": "选择样本", "dataset": "cifar10", "condition": {"source": "dataset"}},
            {"name": "image", "type": "image_upload", "label": "上传图片", "condition": {"source": "upload"}},
            {"name": "attack_type", "type": "select", "label": "攻击算法", "options": [
                {"label": "FGSM", "value": "fgsm"},
                {"label": "PGD", "value": "pgd"}
            ], "default": "fgsm"},
            {"name": "epsilon", "type": "slider", "min": 0, "max": 0.3, "step": 0.01, "default": 0.03, "label": "扰动大小 (Epsilon)"},
            {"name": "alpha", "type": "slider", "min": 0, "max": 0.1, "step": 0.005, "default": 0.01, "label": "步长 (Alpha)", "condition": {"attack_type": "pgd"}},
            {"name": "steps", "type": "number", "min": 1, "max": 100, "default": 10, "label": "迭代步数", "condition": {"attack_type": "pgd"}}
        ],
        outputs=[
            {"name": "original_image", "type": "image", "label": "原始图片"},
            {"name": "adversarial_image", "type": "image", "label": "对抗样本"},
            {"name": "noise_image", "type": "image", "label": "扰动噪声 (放大)"},
            {"name": "original_class", "type": "text", "label": "原始分类"},
            {"name": "adversarial_class", "type": "text", "label": "攻击后分类"},
            {"name": "confidence_chart", "type": "chart", "label": "置信度对比"}
        ]
    ),
    Algorithm(
        id="yolov8_attack",
        name="YOLOv8 目标检测攻击",
        description="针对 YOLOv8 目标检测模型进行对抗攻击，使其产生漏检或误检。",
        inputs=[
            {"name": "image", "type": "image_upload", "label": "上传原始图片"},
            {"name": "attack_type", "type": "select", "label": "攻击目标", "options": [
                {"label": "隐身攻击 (Untargeted)", "value": "untargeted"},
                {"label": "误导攻击 (Targeted)", "value": "targeted"}
            ], "default": "untargeted"},
            {"name": "epsilon", "type": "slider", "min": 0, "max": 0.1, "step": 0.01, "default": 0.03, "label": "扰动大小"}
        ],
        outputs=[
            {"name": "original_detection", "type": "image", "label": "原始检测结果"},
            {"name": "adversarial_detection", "type": "image", "label": "攻击后检测结果"},
            {"name": "adversarial_image", "type": "image", "label": "对抗样本 (无框)"},
            {"name": "noise_image", "type": "image", "label": "扰动噪声 (放大)"},
            {"name": "detection_count_diff", "type": "text", "label": "检测数量变化"}
        ]
    )
]

@router.get("/algorithms", response_model=List[Algorithm])
async def get_algorithms():
    """
    Returns the list of all available algorithms and their configurations.
    Used by the frontend to dynamically render the UI.
    """
    return ALGORITHM_REGISTRY
