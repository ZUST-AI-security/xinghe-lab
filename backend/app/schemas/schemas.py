from typing import List, Optional, Union, Any, Dict
from pydantic import BaseModel, Field


class HealthCheck(BaseModel):
    """健康检查响应模型"""
    status: str = Field(..., description="系统状态")
    timestamp: float = Field(..., description="时间戳")
    services: Dict[str, str] = Field(default_factory=dict, description="各服务状态")


# --- Algorithm Registry Schema ---

class InputField(BaseModel):
    name: str
    type: str  # e.g., "image_upload", "slider", "text", "number", "select", "dataset_picker"
    label: str
    default: Optional[Any] = None
    min: Optional[float] = None
    max: Optional[float] = None
    step: Optional[float] = None
    options: Optional[List[Dict[str, Any]]] = None
    condition: Optional[Dict[str, Any]] = None

class OutputField(BaseModel):
    name: str
    type: str  # e.g., "image", "text", "number", "json"
    label: str

class Algorithm(BaseModel):
    id: str
    name: str
    description: str
    inputs: List[InputField]
    outputs: List[OutputField]

# --- Task Schema ---

class TaskSubmit(BaseModel):
    algorithm_id: str
    params: Dict[str, Any]

class TaskResponse(BaseModel):
    task_id: str
    status: str

class TaskResult(BaseModel):
    task_id: str
    status: str
    result: Optional[Union[Dict[str, Any], List[Dict[str, Any]]]] = None
