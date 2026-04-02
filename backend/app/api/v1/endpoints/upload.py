"""
星河智安 (XingHe ZhiAn) - 文件上传API路由
处理图片文件上传和存储
"""

import os
import uuid
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
import logging

from ....db.session import get_db
from ....core.security import get_current_user
from ....db.entities import User
from ....core.config import settings
from ....core.exceptions import FileUploadError

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/upload")
async def upload_image(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    上传图片文件
    返回文件访问URL
    """
    try:
        # 检查文件类型
        if not file.content_type or not file.content_type.startswith('image/'):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="只能上传图片文件"
            )
        
        # 检查文件大小 (10MB)
        if file.size and file.size > 10 * 1024 * 1024:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="文件大小不能超过10MB"
            )
        
        # 生成唯一文件名
        file_extension = Path(file.filename).suffix.lower()
        if file_extension not in ['.jpg', '.jpeg', '.png', '.gif', '.bmp']:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="不支持的文件格式，请使用 JPG、PNG、GIF 或 BMP 格式"
            )
        
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        upload_dir = Path(settings.uploads_dir)
        upload_dir.mkdir(parents=True, exist_ok=True)
        
        file_path = upload_dir / unique_filename
        
        # 保存文件
        try:
            with open(file_path, "wb") as buffer:
                content = await file.read()
                buffer.write(content)
        except Exception as e:
            logger.error(f"保存文件失败: {str(e)}")
            raise FileUploadError(f"保存文件失败: {str(e)}")
        
        # 返回文件URL
        file_url = f"/uploads/{unique_filename}"
        
        logger.info(f"用户 {current_user.username} 上传文件: {file.filename} -> {file_url}")
        
        return {
            "url": file_url,
            "filename": file.filename,
            "size": file.size,
            "content_type": file.content_type
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"文件上传失败: {str(e)}")
        raise FileUploadError(f"文件上传失败: {str(e)}")


@router.post("/upload/batch")
async def upload_images_batch(
    files: list[UploadFile] = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    批量上传图片文件
    返回文件访问URL列表
    """
    try:
        if len(files) > 10:  # 限制最多10个文件
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="最多只能上传10个文件"
            )
        
        results = []
        upload_dir = Path(settings.uploads_dir)
        upload_dir.mkdir(parents=True, exist_ok=True)
        
        for file in files:
            try:
                # 检查文件类型
                if not file.content_type or not file.content_type.startswith('image/'):
                    results.append({
                        "filename": file.filename,
                        "error": "只能上传图片文件"
                    })
                    continue
                
                # 检查文件大小
                if file.size and file.size > 10 * 1024 * 1024:
                    results.append({
                        "filename": file.filename,
                        "error": "文件大小不能超过10MB"
                    })
                    continue
                
                # 生成唯一文件名
                file_extension = Path(file.filename).suffix.lower()
                if file_extension not in ['.jpg', '.jpeg', '.png', '.gif', '.bmp']:
                    results.append({
                        "filename": file.filename,
                        "error": "不支持的文件格式"
                    })
                    continue
                
                unique_filename = f"{uuid.uuid4()}{file_extension}"
                file_path = upload_dir / unique_filename
                
                # 保存文件
                with open(file_path, "wb") as buffer:
                    content = await file.read()
                    buffer.write(content)
                
                file_url = f"/uploads/{unique_filename}"
                results.append({
                    "url": file_url,
                    "filename": file.filename,
                    "size": file.size,
                    "content_type": file.content_type
                })
                
            except Exception as e:
                logger.error(f"文件 {file.filename} 上传失败: {str(e)}")
                results.append({
                    "filename": file.filename,
                    "error": str(e)
                })
        
        logger.info(f"用户 {current_user.username} 批量上传 {len(files)} 个文件")
        
        return {
            "results": results,
            "total": len(files),
            "successful": len([r for r in results if "url" in r])
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"批量文件上传失败: {str(e)}")
        raise FileUploadError(f"批量文件上传失败: {str(e)}")
