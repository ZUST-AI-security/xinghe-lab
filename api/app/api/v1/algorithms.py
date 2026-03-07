from fastapi import APIRouter
from typing import List
from app.schemas.schemas import Algorithm

router = APIRouter()

# --- Dynamic Algorithm Registry ---

ALGORITHM_REGISTRY: List[Algorithm] = [
    Algorithm(
        id="resnet18_cifar10",
        name="ResNet50 深度学习攻击实验 (ImageNet)",
        description="针对 224x224 高分辨率图像的 ResNet50 模型进行攻击。该模型在 ImageNet 数据集上预训练，识别精度极高，能识别 1000 种物体。",
        inputs=[
            {
                "name": "image",
                "type": "image_upload",
                "label": "上传待测试图片 (建议 224x224 以上)"
            },
            {
                "name": "attack_type",
                "type": "select",
                "label": "攻击算法",
                "default": "fgsm",
                "options": [
                    {"label": "FGSM (快速梯度符号法)", "value": "fgsm"},
                    {"label": "PGD (投影梯度下降)", "value": "pgd"}
                ]
            },
            {
                "name": "epsilon",
                "type": "slider",
                "label": "扰动大小 (Epsilon)",
                "default": 0.02,
                "min": 0.0,
                "max": 0.1,
                "step": 0.005
            },
            {
                "name": "alpha",
                "type": "slider",
                "label": "步长 (Alpha)",
                "default": 0.005,
                "min": 0.0,
                "max": 0.05,
                "step": 0.001,
                "condition": {"attack_type": "pgd"}
            },
            {
                "name": "steps",
                "type": "number",
                "label": "迭代步数",
                "default": 10,
                "min": 1,
                "max": 50,
                "condition": {"attack_type": "pgd"}
            }
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
            {
                "name": "image",
                "type": "image_upload",
                "label": "上传原始图片"
            },
            {
                "name": "attack_type",
                "type": "select",
                "label": "攻击目标",
                "default": "untargeted",
                "options": [
                    {"label": "非定向攻击 (目标消失)", "value": "untargeted"},
                    {"label": "定向攻击 (误认为他物)", "value": "targeted"}
                ]
            },
            {
                "name": "epsilon",
                "type": "slider",
                "label": "扰动大小",
                "default": 0.03,
                "min": 0.0,
                "max": 0.1,
                "step": 0.01
            }
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
