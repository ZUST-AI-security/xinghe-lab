"""
Shared base schema for all attack requests — validates image format and size.
Supports PNG, JPEG, BMP, GIF, WEBP, and HEIC/HEIF (auto-converted to JPEG).
"""

import base64
import io
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

        # HEIC/HEIF detection: starts with 4-byte size field then "ftyp" + heic/heif/mif1/msf1
        def _is_heic(data: bytes) -> bool:
            if len(data) < 12:
                return False
            ftyp_box = data[4:8]
            brand = data[8:12]
            return ftyp_box == b"ftyp" and brand in (
                b"heic", b"heix", b"hevc", b"hevx",
                b"heim", b"heis", b"hevm", b"hevs",
                b"mif1", b"msf1",
            )

        valid_signatures = [
            b"\x89PNG",       # PNG
            b"\xff\xd8\xff",  # JPEG
            b"BM",            # BMP
            b"GIF8",          # GIF
            b"RIFF",          # WEBP (RIFF container)
        ]

        if any(raw.startswith(sig) for sig in valid_signatures):
            # Standard format — pass through as-is
            return v

        if _is_heic(raw):
            # HEIC/HEIF detected — convert to JPEG transparently
            try:
                import pillow_heif
                pillow_heif.register_heif_opener()
                from PIL import Image

                full_raw = base64.b64decode(b64_data)
                img = Image.open(io.BytesIO(full_raw))
                img = img.convert("RGB")

                buf = io.BytesIO()
                img.save(buf, format="JPEG", quality=92)
                jpeg_b64 = base64.b64encode(buf.getvalue()).decode()
                return f"data:image/jpeg;base64,{jpeg_b64}"
            except ImportError:
                raise ValueError(
                    "HEIC/HEIF images are not supported on this server. "
                    "Please convert to JPEG before uploading."
                )
            except Exception as e:
                raise ValueError(f"Failed to convert HEIC image: {e}")

        raise ValueError("Unsupported image format. Allowed: PNG, JPEG, BMP, GIF, WEBP, HEIC/HEIF")
