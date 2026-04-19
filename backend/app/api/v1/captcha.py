import uuid
import base64
from io import BytesIO
from fastapi import APIRouter
from captcha.image import ImageCaptcha
from app.core.rate_limit import redis_client

router = APIRouter()
image_captcha = ImageCaptcha(width=160, height=60)

@router.get("/")
async def get_captcha():
    """获取图形验证码"""
    # 生成随机4位字符
    import random
    import string
    captcha_text = ''.join(random.choices(string.ascii_uppercase + string.digits, k=4))
    
    # 将图片写入内存流
    data = image_captcha.generate(captcha_text)
    base64_image = base64.b64encode(data.getvalue()).decode('utf-8')
    data_uri = f"data:image/png;base64,{base64_image}"
    
    # 存储到Redis，设置过期时间5分钟 (300秒)
    captcha_id = str(uuid.uuid4())
    redis_client.setex(f"captcha:{captcha_id}", 300, captcha_text)
    
    return {
        "captcha_id": captcha_id,
        "image": data_uri
    }
