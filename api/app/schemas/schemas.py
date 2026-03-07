from typing import List, Optional, Union, Any, Dict
from pydantic import BaseModel, Field

# --- Algorithm Registry Schema ---

class InputField(BaseModel):
    name: str
    type: str  # e.g., "image_upload", "slider", "text", "number"
    label: str
    default: Optional[Any] = None
    min: Optional[float] = None
    max: Optional[float] = None
    step: Optional[float] = None

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
