"""I-FGSM attack Pydantic models."""

from pydantic import BaseModel, Field, field_validator
from typing import Optional, Dict, Any, List
from datetime import datetime


class IFGSMAttackParams(BaseModel):
    """I-FGSM 攻击参数"""
    epsilon: float = Field(0.03, ge=0.01, le=1.0, description="扰动限制 ε (L∞)")
    alpha: float = Field(0.01, ge=0.001, le=0.1, description="每步扰动大小 α")
    num_iterations: int = Field(40, ge=1, le=100, description="迭代次数")
    targeted: bool = Field(False, description="是否定向攻击")


class IFGSMAttackRequest(BaseModel):
    """I-FGSM 攻击请求"""
    image: str = Field(..., description="Base64 编码图像")
    model_name: Optional[str] = Field("resnet100_imagenet", description="模型名称")
    params: IFGSMAttackParams = Field(default_factory=IFGSMAttackParams, description="攻击参数")

    @field_validator('image')
    @classmethod
    def validate_image(cls, v):
        if not v.startswith('data:image/'):
            raise ValueError('图像格式无效，必须以 data:image/ 开头')
        return v


class IFGSMAttackResponse(BaseModel):
    """I-FGSM 攻击响应"""
    original_image: str = Field(..., description="原始图像 (Base64)")
    adversarial_image: str = Field(..., description="对抗样本 (Base64)")
    heatmap: str = Field(..., description="扰动热力图 (Base64)")
    original_probs: List[float] = Field(..., description="原始预测概率")
    adversarial_probs: List[float] = Field(..., description="对抗预测概率")
    success: bool = Field(..., description="攻击是否成功")
    time_elapsed: float = Field(..., description="耗时 (秒)")
    metadata: Dict[str, Any] = Field(..., description="附加元数据")


class IFGSMAsyncTaskResponse(BaseModel):
    """I-FGSM 异步任务响应"""
    task_id: str = Field(..., description="任务 ID")
    status: str = Field(..., description="任务状态")


class IFGSMHistoryListResponse(BaseModel):
    """I-FGSM 攻击历史列表"""
    histories: List[dict] = []
    total: int = 0
    page: int = 1
    size: int = 10
    pages: int = 0
