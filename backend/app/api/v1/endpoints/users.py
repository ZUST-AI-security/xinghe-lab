"""
星河智安 (XingHe ZhiAn) - 用户管理API端点
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional

from ....core.database import get_db
from ....core.security import get_current_user
from ....models.user import User
from ....schemas.user import UserResponse

router = APIRouter()

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    获取当前用户信息
    """
    return current_user

@router.get("/", response_model=list[UserResponse])
async def get_users(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    获取用户列表（仅管理员）
    """
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="权限不足")
    
    users = db.query(User).offset(skip).limit(limit).all()
    return users

@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    获取指定用户信息
    """
    if not current_user.is_superuser and current_user.id != user_id:
        raise HTTPException(status_code=403, detail="权限不足")
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    
    return user
