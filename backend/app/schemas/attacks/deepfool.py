"""DeepFool attack Pydantic models."""

from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime

from .base import BaseAttackRequest


class DeepFoolAttackParams(BaseModel):
    """DeepFool 攻击参数"""
    max_iter: int = Field(50, ge=10, le=200, description="最大迭代次数")
    overshoot: float = Field(0.02, ge=0.0, le=0.5, description="过冲系数")
    num_classes: int = Field(10, ge=2, le=20, description="候选类别数 (Top-K)")


class DeepFoolAttackRequest(BaseAttackRequest):
    """DeepFool 攻击请求"""
    params: DeepFoolAttackParams = Field(default_factory=DeepFoolAttackParams, description="攻击参数")


class DeepFoolAttackResponse(BaseModel):
    """DeepFool 攻击响应"""
    original_image: str = Field(..., description="原始图像 (Base64)")
    adversarial_image: str = Field(..., description="对抗样本 (Base64)")
    heatmap: str = Field(..., description="扰动热力图 (Base64)")
    original_probs: List[float] = Field(..., description="原始预测概率")
    adversarial_probs: List[float] = Field(..., description="对抗预测概率")
    success: bool = Field(..., description="攻击是否成功")
    time_elapsed: float = Field(..., description="耗时 (秒)")
    metadata: Dict[str, Any] = Field(..., description="附加元数据")


class DeepFoolAsyncTaskResponse(BaseModel):
    """DeepFool 异步任务响应"""
    task_id: str = Field(..., description="任务 ID")
    status: str = Field(..., description="任务状态")


class DeepFoolHistoryListResponse(BaseModel):
    """DeepFool 攻击历史列表"""
    histories: List[dict] = []
    total: int = 0
    page: int = 1
    size: int = 10
    pages: int = 0
