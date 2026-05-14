"""
文件上传与管理 API

支持图片上传（SHA-256 去重）、用户图片库查询、软删除。
对应 Requirement 19：上传图片复用机制。
"""

from __future__ import annotations

import base64
import hashlib
import logging
import math
import os
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.security import get_current_active_user
from app.models.uploaded_file import UploadedFile
from app.models.user import User

router = APIRouter(prefix="/files", tags=["文件管理"])
logger = logging.getLogger(__name__)

# 上传文件根目录
UPLOAD_ROOT = Path("uploads")


# ---------------------------------------------------------------------------
# Pydantic schemas
# ---------------------------------------------------------------------------

class UploadRequest(BaseModel):
    """图片上传请求（base64 编码）"""
    image: str          # data:image/xxx;base64,... 或纯 base64
    filename: str = "image.png"
    mime_type: str = "image/png"


class FileItem(BaseModel):
    file_id: int
    filename: str
    file_size: int
    mime_type: Optional[str]
    created_at: Optional[str]
    url: str            # 访问 URL（base64 data URL 或静态文件路径）
    thumbnail_url: str  # 缩略图（与 url 相同，前端自行缩放）


class UploadResponse(BaseModel):
    file_id: int
    filename: str
    url: str
    is_reused: bool     # True 表示复用了已有文件，未重复存储


class FileListResponse(BaseModel):
    items: list[FileItem]
    total: int
    page: int
    size: int
    pages: int


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _decode_base64_image(data: str) -> bytes:
    """从 data URL 或纯 base64 字符串解码图片字节。"""
    if "," in data:
        data = data.split(",", 1)[1]
    # 修复 padding
    padding = 4 - len(data) % 4
    if padding != 4:
        data += "=" * padding
    return base64.b64decode(data)


def _sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def _save_file(user_id: int, file_hash: str, filename: str, data: bytes) -> str:
    """将文件保存到磁盘，返回相对路径。"""
    user_dir = UPLOAD_ROOT / str(user_id)
    user_dir.mkdir(parents=True, exist_ok=True)
    # 净化文件名：只保留文件名部分，去除路径分隔符
    safe_basename = Path(filename).name.replace("..", "").strip() or "image.png"
    safe_name = f"{file_hash[:8]}_{safe_basename}"
    file_path = user_dir / safe_name
    # 确保最终路径在 user_dir 内（防止路径穿越）
    try:
        file_path.resolve().relative_to(user_dir.resolve())
    except ValueError:
        raise ValueError("非法文件路径")
    file_path.write_bytes(data)
    return str(file_path)


def _file_to_url(file_path: str) -> str:
    """将文件路径转换为可访问的 URL（静态文件服务）。
    
    注意：在开发环境中，前端和后端运行在不同端口，需要使用完整 URL。
    生产环境中，静态文件由 Nginx 代理，相对路径即可。
    """
    # 将反斜杠统一为正斜杠
    normalized = file_path.replace("\\", "/")
    # 确保以 / 开头
    if not normalized.startswith("/"):
        normalized = f"/{normalized}"
    return normalized


def _file_to_data_url(file_path: str, mime_type: str = "image/png") -> str:
    """将磁盘文件读取为 base64 data URL（用于前端直接展示）。"""
    try:
        data = Path(file_path).read_bytes()
        b64 = base64.b64encode(data).decode()
        return f"data:{mime_type};base64,{b64}"
    except Exception:
        return ""


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/upload", response_model=UploadResponse)
async def upload_image(
    body: UploadRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    上传图片（base64 编码）。

    - 计算 SHA-256 哈希，若同一用户已有相同内容则直接返回已有记录（is_reused=True）。
    - 否则保存文件并创建数据库记录。
    """
    try:
        image_bytes = _decode_base64_image(body.image)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"图片解码失败: {exc}")

    # 文件大小校验
    max_bytes = settings.max_file_size_mb * 1024 * 1024
    if len(image_bytes) > max_bytes:
        raise HTTPException(
            status_code=400,
            detail=f"文件大小超过限制（最大 {settings.max_file_size_mb} MB）",
        )

    # MIME 类型校验
    allowed = settings.allowed_image_types
    if isinstance(allowed, list) and allowed:
        ext = body.filename.rsplit(".", 1)[-1].lower() if "." in body.filename else ""
        mime_ext = body.mime_type.split("/")[-1].lower().replace("jpeg", "jpg")
        if ext not in allowed and mime_ext not in allowed:
            raise HTTPException(
                status_code=400,
                detail=f"不支持的文件类型，允许的类型：{allowed}",
            )

    file_hash = _sha256(image_bytes)

    # 检查同用户是否已有相同文件
    existing = (
        db.query(UploadedFile)
        .filter(
            UploadedFile.user_id == current_user.id,
            UploadedFile.file_hash == file_hash,
            UploadedFile.is_deleted.is_(False),
        )
        .first()
    )

    if existing:
        return UploadResponse(
            file_id=existing.id,
            filename=existing.filename,
            url=_file_to_url(existing.file_path),
            is_reused=True,
        )

    # 保存新文件
    try:
        file_path = _save_file(current_user.id, file_hash, body.filename, image_bytes)
    except Exception as exc:
        logger.error("File save failed: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail="文件保存失败")

    record = UploadedFile(
        user_id=current_user.id,
        filename=body.filename,
        file_path=file_path,
        file_hash=file_hash,
        file_size=len(image_bytes),
        mime_type=body.mime_type,
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    return UploadResponse(
        file_id=record.id,
        filename=record.filename,
        url=_file_to_url(record.file_path),
        is_reused=False,
    )


@router.get("/my-uploads", response_model=FileListResponse)
async def get_my_uploads(
    page: int = Query(1, ge=1),
    size: int = Query(12, ge=1, le=100),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    获取当前用户的历史上传文件列表（分页，按上传时间倒序）。
    """
    query = (
        db.query(UploadedFile)
        .filter(
            UploadedFile.user_id == current_user.id,
            UploadedFile.is_deleted.is_(False),
        )
        .order_by(UploadedFile.created_at.desc())
    )

    total = query.count()
    pages = math.ceil(total / size) if total > 0 else 0
    records = query.offset((page - 1) * size).limit(size).all()

    items = []
    for r in records:
        url = _file_to_url(r.file_path)
        items.append(
            FileItem(
                file_id=r.id,
                filename=r.filename,
                file_size=r.file_size,
                mime_type=r.mime_type,
                created_at=r.created_at.isoformat() if r.created_at else None,
                url=url,
                thumbnail_url=url,
            )
        )

    return FileListResponse(items=items, total=total, page=page, size=size, pages=pages)


@router.get("/image/{file_id}")
async def get_image_as_base64(
    file_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    获取指定文件的 base64 data URL（供前端图片库选择后填充到上传区域）。
    """
    record = (
        db.query(UploadedFile)
        .filter(
            UploadedFile.id == file_id,
            UploadedFile.user_id == current_user.id,
            UploadedFile.is_deleted.is_(False),
        )
        .first()
    )
    if not record:
        raise HTTPException(status_code=404, detail="文件不存在")

    data_url = _file_to_data_url(record.file_path, record.mime_type or "image/png")
    if not data_url:
        raise HTTPException(status_code=500, detail="文件读取失败")

    return {"file_id": record.id, "filename": record.filename, "data_url": data_url}


@router.delete("/{file_id}")
async def delete_my_file(
    file_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    软删除用户自己的文件（设置 is_deleted=True，不物理删除）。
    """
    record = (
        db.query(UploadedFile)
        .filter(
            UploadedFile.id == file_id,
            UploadedFile.user_id == current_user.id,
        )
        .first()
    )
    if not record:
        raise HTTPException(status_code=404, detail="文件不存在")

    record.is_deleted = True
    db.commit()
    return {"message": "文件已删除", "file_id": file_id}
