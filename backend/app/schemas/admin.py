"""
Admin API request/response schemas.
"""

from typing import Literal, Optional

from pydantic import BaseModel, EmailStr, Field


class AdminUpdateUserRequest(BaseModel):
    """Admin user update request body."""

    email: Optional[EmailStr] = Field(None, description="邮箱地址")
    full_name: Optional[str] = Field(None, max_length=100, description="全名")
    role: Optional[Literal["admin", "user", "viewer"]] = Field(None, description="用户角色")
    is_active: Optional[bool] = Field(None, description="是否激活")
    bio: Optional[str] = Field(None, max_length=500, description="个人简介")


class UpdateConfigRequest(BaseModel):
    """System config update request body."""

    value: str = Field(..., description="配置值")
    description: str = Field("", description="配置说明")
