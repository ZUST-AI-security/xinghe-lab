"""
upload_recorder — 在攻击提交时自动记录用户上传的图片

每次攻击提交时调用 record_attack_image()，将 base64 图片保存到磁盘并写入
uploaded_files 表。使用 SHA-256 去重，相同图片不会重复存储。
"""

import base64
import hashlib
import logging
from pathlib import Path

from sqlalchemy.orm import Session

from app.models.uploaded_file import UploadedFile

logger = logging.getLogger(__name__)

UPLOAD_ROOT = Path("uploads")


def record_attack_image(db: Session, user_id: int, image_b64: str) -> None:
    """
    将攻击请求中的 base64 图片记录到 uploaded_files 表。

    - 自动去重（SHA-256）
    - 静默执行，任何异常不会向上抛出
    - 使用调用方传入的 db session（不自行 commit，由调用方控制事务）

    Args:
        db: SQLAlchemy session
        user_id: 当前用户 ID
        image_b64: data URL 或纯 base64 字符串
    """
    try:
        # 解码 base64
        raw = image_b64
        if "," in raw:
            raw = raw.split(",", 1)[1]
        # 修复 padding
        padding = 4 - len(raw) % 4
        if padding != 4:
            raw += "=" * padding
        image_bytes = base64.b64decode(raw)

        file_hash = hashlib.sha256(image_bytes).hexdigest()

        # 检查是否已存在
        existing = (
            db.query(UploadedFile.id)
            .filter(
                UploadedFile.user_id == user_id,
                UploadedFile.file_hash == file_hash,
                UploadedFile.is_deleted.is_(False),
            )
            .first()
        )
        if existing:
            return  # 已存在，跳过

        # 保存文件到磁盘
        user_dir = UPLOAD_ROOT / str(user_id)
        user_dir.mkdir(parents=True, exist_ok=True)

        # 根据文件头判断格式
        if image_bytes[:2] == b'\xff\xd8':
            ext = "jpg"
            mime_type = "image/jpeg"
        elif image_bytes[:8] == b'\x89PNG\r\n\x1a\n':
            ext = "png"
            mime_type = "image/png"
        elif image_bytes[:4] == b'RIFF':
            ext = "webp"
            mime_type = "image/webp"
        else:
            ext = "png"
            mime_type = "image/png"

        safe_name = f"{file_hash[:12]}.{ext}"
        file_path = user_dir / safe_name
        file_path.write_bytes(image_bytes)

        record = UploadedFile(
            user_id=user_id,
            filename=safe_name,
            file_path=str(file_path),
            file_hash=file_hash,
            file_size=len(image_bytes),
            mime_type=mime_type,
        )
        db.add(record)
        db.commit()
        logger.info("Recorded upload: user=%d hash=%s size=%d", user_id, file_hash[:8], len(image_bytes))
    except Exception as exc:
        logger.warning("record_attack_image failed (non-fatal): %s", exc)
        try:
            db.rollback()
        except Exception:
            pass
