"""
User management API routes.
"""

import math
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.core.database import get_db
from app.core.security import get_current_user, get_current_admin_user, get_password_hash
from app.models.user import User
from app.schemas.user import UserResponse, UserUpdate, AdminUserUpdate, UserListResponse

router = APIRouter()


@router.get("/me", response_model=UserResponse, summary="获取当前用户信息")
async def get_current_user_info(
    current_user: User = Depends(get_current_user),
):
    """返回当前已认证用户的信息。"""
    return current_user


@router.put("/me", response_model=UserResponse, summary="更新当前用户信息")
async def update_current_user(
    data: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """更新当前用户的个人信息。"""
    update_fields = data.model_dump(exclude_unset=True)
    for field, value in update_fields.items():
        setattr(current_user, field, value)
    db.commit()
    db.refresh(current_user)
    return current_user


@router.get("/", response_model=UserListResponse, summary="获取用户列表（管理员）")
async def list_users(
    page: int = Query(1, ge=1, description="页码"),
    size: int = Query(20, ge=1, le=100, description="每页数量"),
    search: str = Query("", description="搜索关键词（用户名/邮箱/全名）"),
    role: str = Query("", description="角色筛选"),
    is_active: str = Query("", description="状态筛选: true/false"),
    admin_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    """管理员获取用户列表，支持分页、搜索和筛选。"""
    query = db.query(User)

    if search:
        pattern = f"%{search}%"
        query = query.filter(
            or_(
                User.username.ilike(pattern),
                User.email.ilike(pattern),
                User.full_name.ilike(pattern),
            )
        )
    if role:
        query = query.filter(User.role == role)
    if is_active in ("true", "false"):
        query = query.filter(User.is_active == (is_active == "true"))

    total = query.count()
    pages = math.ceil(total / size) if total > 0 else 0
    items = query.order_by(User.id.desc()).offset((page - 1) * size).limit(size).all()

    return UserListResponse(items=items, total=total, page=page, size=size, pages=pages)


@router.get("/{user_id}", response_model=UserResponse, summary="获取指定用户信息")
async def get_user(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """获取指定用户信息（仅限本人或管理员）。"""
    if current_user.role != "admin" and current_user.id != user_id:
        raise HTTPException(status_code=403, detail="权限不足")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    return user


@router.put("/{user_id}", response_model=UserResponse, summary="管理员编辑用户")
async def admin_update_user(
    user_id: int,
    data: AdminUserUpdate,
    admin_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    """管理员更新用户角色、状态等信息。"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")

    update_fields = data.model_dump(exclude_unset=True)
    for field, value in update_fields.items():
        setattr(user, field, value)
    # 同步 is_superuser 与 role
    if "role" in update_fields:
        user.is_superuser = (user.role == "admin")

    db.commit()
    db.refresh(user)
    return user


@router.put("/{user_id}/toggle-active", response_model=UserResponse, summary="启用/禁用用户")
async def toggle_user_active(
    user_id: int,
    admin_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    """切换用户的启用/禁用状态。管理员不可禁用自己。"""
    if admin_user.id == user_id:
        raise HTTPException(status_code=400, detail="不能禁用自己的账户")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    user.is_active = not user.is_active
    db.commit()
    db.refresh(user)
    return user


@router.put("/{user_id}/reset-password", summary="管理员重置用户密码")
async def admin_reset_password(
    user_id: int,
    admin_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    """管理员将用户密码重置为默认密码（Abc12345）。"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    user.hashed_password = get_password_hash("Abc12345")
    db.commit()
    return {"message": f"用户 {user.username} 的密码已重置为默认密码"}


@router.delete("/{user_id}", summary="删除用户")
async def delete_user(
    user_id: int,
    admin_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    """管理员删除指定用户。不可删除自己。"""
    if admin_user.id == user_id:
        raise HTTPException(status_code=400, detail="不能删除自己的账户")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    db.delete(user)
    db.commit()
    return {"message": f"用户 {user.username} 已删除"}
