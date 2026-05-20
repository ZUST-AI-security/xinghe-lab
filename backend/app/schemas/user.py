"""
XingHe ZhiAn - user-related Pydantic schemas.
"""

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, EmailStr, Field, field_validator


def _validate_password_strength(value: str) -> str:
    if len(value) < 8:
        raise ValueError("密码长度至少 8 位")
    if len(value.encode("utf-8")) > 72:
        raise ValueError("密码长度不能超过 72 个 UTF-8 字节")
    if not any(char.isupper() for char in value):
        raise ValueError("密码必须包含至少一个大写字母")
    if not any(char.islower() for char in value):
        raise ValueError("密码必须包含至少一个小写字母")
    if not any(char.isdigit() for char in value):
        raise ValueError("密码必须包含至少一个数字")
    return value


class UserBase(BaseModel):
    """Base user schema."""

    username: str = Field(..., min_length=3, max_length=50, description="用户名")
    email: EmailStr = Field(..., description="邮箱地址")
    full_name: Optional[str] = Field(None, max_length=100, description="全名")


class UserCreate(UserBase):
    """User registration payload."""

    password: str = Field(..., min_length=8, max_length=100, description="密码")

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        return _validate_password_strength(value)


class UserUpdate(BaseModel):
    """Self-service user update payload."""

    email: Optional[EmailStr] = Field(None, description="邮箱地址")
    full_name: Optional[str] = Field(None, max_length=100, description="全名")
    bio: Optional[str] = Field(None, max_length=500, description="个人简介")
    avatar_url: Optional[str] = Field(None, max_length=255, description="头像 URL")


class AdminUserUpdate(BaseModel):
    """Admin user update payload."""

    email: Optional[EmailStr] = Field(None, description="邮箱地址")
    full_name: Optional[str] = Field(None, max_length=100, description="全名")
    role: Optional[Literal["admin", "user", "viewer"]] = Field(
        None,
        description="用户角色",
    )
    is_active: Optional[bool] = Field(None, description="是否激活")


class UserLogin(BaseModel):
    """User login payload."""

    username: str = Field(..., description="用户名或邮箱")
    password: str = Field(..., description="密码")


class UserResponse(UserBase):
    """User response payload."""

    id: int
    is_active: bool
    is_superuser: bool
    role: str = Field("user", description="用户角色: admin/user/viewer")
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    created_at: datetime
    last_login_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class UserListResponse(BaseModel):
    """Paginated user list response."""

    items: list[UserResponse]
    total: int
    page: int
    size: int
    pages: int


class Token(BaseModel):
    """Token response payload."""

    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class TokenRefresh(BaseModel):
    """Refresh token request payload."""

    refresh_token: str


class PasswordChange(BaseModel):
    """Password change payload."""

    current_password: str = Field(..., description="当前密码")
    new_password: str = Field(..., min_length=8, max_length=100, description="新密码")

    @field_validator("new_password")
    @classmethod
    def validate_new_password(cls, value: str) -> str:
        return _validate_password_strength(value)
