"""
星河智安 (XingHe ZhiAn) - I-FGSM攻击相关Pydantic模型
定义I-FGSM攻击数据的验证和序列化模式
"""

from pydantic import BaseModel, Field, validator
from typing import Optional, Dict, Any, List
from datetime import datetime


class IFGSMAttackParams(BaseModel):
    """I-FGSM攻击参数模型"""
    epsilon: float = Field(0.03, ge=0.0, le=1.0, description="L∞扰动上限")
    alpha: float = Field(0.01, ge=1e-5, le=0.1, description="每次迭代步长")
    num_iterations: int = Field(40, ge=1, le=100, description="迭代次数")
    targeted: bool = Field(False, description="是否为定向攻击")

class IFGSMAttackRequest(BaseModel):
    """I-FGSM攻击请求模型"""
    image: str = Field(..., description="Base64编码的图片")
    model_name: Optional[str] = Field("resnet100_imagenet", description="模型名称")
    params: IFGSMAttackParams = Field(default_factory=IFGSMAttackParams, description="攻击参数")

    @validator('image')
    def validate_image(cls, v):
        if not v.startswith('data:image/'):
            raise ValueError('图片格式无效，必须是 data:image/ 开头')
        return v


class IFGSMAttackResponse(BaseModel):
    """I-FGSM攻击响应模型"""
    original_image: str = Field(..., description="原始图片Base64编码")
    adversarial_image: str = Field(..., description="对抗样本图片Base64编码")
    heatmap: str = Field(..., description="噪声图/扰动热力图Base64编码")
    original_probs: List[float] = Field(..., description="原图分类概率分布")
    adversarial_probs: List[float] = Field(..., description="对抗样本分类概率分布")
    original_prediction: Optional[Dict[str, Any]] = Field(None, description="原图分类结果")
    adversarial_prediction: Optional[Dict[str, Any]] = Field(None, description="对抗样本分类结果")
    success: bool = Field(..., description="攻击是否成功")
    time_elapsed: float = Field(..., description="攻击执行耗时（秒）")
    metadata: Dict[str, Any] = Field(..., description="攻击元数据")

class IFGSMAsyncTaskResponse(BaseModel):
    """I-FGSM异步任务响应模型"""
    task_id: str = Field(..., description="任务ID")
    status: str = Field(..., description="任务状态")


class IFGSMTaskStatusResponse(BaseModel):
    """I-FGSM任务状态响应模型"""
    task_id: str = Field(..., description="任务ID")
    status: str = Field(..., description="任务状态")
    result: Optional[IFGSMAttackResponse] = Field(None, description="攻击结果")
    error: Optional[str] = Field(None, description="错误信息")
    progress: Optional[float] = Field(None, description="进度百分比")
    created_at: Optional[datetime] = Field(None, description="创建时间")
    completed_at: Optional[datetime] = Field(None, description="完成时间")

class IFGSMHistoryResponse(BaseModel):
    """I-FGSM攻击历史响应模型"""
    id: int
    attack_algorithm: str
    model_name: str
    model_type: str
    attack_params: Dict[str, Any]
    success: bool
    execution_time: float
    l2_norm: Optional[float] = None
    success_rate: Optional[float] = None
    metadata: Optional[Dict[str, Any]] = None
    notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class IFGSMHistoryListResponse(BaseModel):
    """I-FGSM攻击历史列表响应模型"""
    histories: List[IFGSMHistoryResponse]
    total: int
    page: int
    size: int
    pages: int
