"""
Shared base schema for all attack requests — validates image format and size.
"""

import base64
from pydantic import BaseModel, Field, field_validator
from typing import Optional


class BaseAttackRequest(BaseModel):
    """Base request model for all attack algorithms."""

    image: str = Field(..., description="Base64 encoded image (data:image/... prefix required)")
    model_name: Optional[str] = Field("resnet100_imagenet", description="Model identifier")

    @field_validator("image")
    @classmethod
    def validate_image(cls, v: str) -> str:
        if not v.startswith("data:image/"):
            raise ValueError("Invalid image format, must start with data:image/")

        # Check decoded size to prevent DoS via oversized uploads
        # Strip the data URL prefix to get pure base64
        _, _, b64_data = v.partition(",")
        if not b64_data:
            raise ValueError("Invalid base64 image data")

        # Rough check: base64 expands ~4/3, so limit base64 length directly
        from app.core.config import settings
        max_b64 = settings.max_image_base64_bytes  # default 15MB
        if len(b64_data) > max_b64:
            raise ValueError(
                f"Image too large: base64 data exceeds {max_b64 // (1024 * 1024)}MB limit"
            )

        # Validate magic bytes to ensure it's a real image
        try:
            raw = base64.b64decode(b64_data[:32])  # Only decode first 32 bytes
        except Exception:
            raise ValueError("Invalid base64 encoding")

        valid_signatures = [
            b"\x89PNG",       # PNG
            b"\xff\xd8\xff",  # JPEG
            b"BM",            # BMP
            b"GIF8",          # GIF
            b"RIFF",          # WEBP (RIFF container)
        ]
        if not any(raw.startswith(sig) for sig in valid_signatures):
            raise ValueError("Unsupported image format. Allowed: PNG, JPEG, BMP, GIF, WEBP")

        return v
