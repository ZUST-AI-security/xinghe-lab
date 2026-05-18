"""
星河智安 - 邮件发送工具
使用腾讯云 SES 发送邮件（直接调用 API 绕过 SDK bug）
"""

import json
import time
import hashlib
import hmac
import logging
from typing import Optional
from datetime import datetime, timezone

from app.core.config import settings

logger = logging.getLogger(__name__)


def _sign(key: bytes, msg: str) -> bytes:
    """HMAC-SHA256 签名"""
    if isinstance(key, str):
        key = key.encode("utf-8")
    return hmac.new(key, msg.encode("utf-8"), hashlib.sha256).digest()


def _build_authorization(action: str, payload: str) -> dict:
    """
    构造腾讯云 API v3 鉴权 header
    参考: https://cloud.tencent.com/document/product/1013/39018
    """
    service = "ses"
    host = f"{service}.tencentcloudapi.com"
    timestamp = int(time.time())
    date = datetime.fromtimestamp(timestamp, tz=timezone.utc).strftime("%Y-%m-%d")

    # 步骤 1: 拼接规范请求串
    http_request_method = "POST"
    canonical_uri = "/"
    canonical_querystring = ""
    content_type = "application/json; charset=utf-8"
    canonical_headers = f"content-type:{content_type}\nhost:{host}\nx-tc-action:{action.lower()}\n"
    signed_headers = "content-type;host;x-tc-action"
    hashed_payload = hashlib.sha256(payload.encode("utf-8")).hexdigest()
    canonical_request = (
        f"{http_request_method}\n{canonical_uri}\n{canonical_querystring}\n"
        f"{canonical_headers}\n{signed_headers}\n{hashed_payload}"
    )

    # 步骤 2: 拼接待签名字符串
    algorithm = "TC3-HMAC-SHA256"
    credential_scope = f"{date}/{service}/tc3_request"
    hashed_canonical_request = hashlib.sha256(canonical_request.encode("utf-8")).hexdigest()
    string_to_sign = f"{algorithm}\n{timestamp}\n{credential_scope}\n{hashed_canonical_request}"

    # 步骤 3: 计算签名
    secret_date = _sign(f"TC3{settings.tencent_secret_key}", date)
    secret_service = _sign(secret_date, service)
    secret_signing = _sign(secret_service, "tc3_request")
    signature = hmac.new(secret_signing, string_to_sign.encode("utf-8"), hashlib.sha256).hexdigest()

    # 步骤 4: 拼接 Authorization
    authorization = (
        f"{algorithm} "
        f"Credential={settings.tencent_secret_id}/{credential_scope}, "
        f"SignedHeaders={signed_headers}, "
        f"Signature={signature}"
    )

    return {
        "Host": host,
        "Content-Type": content_type,
        "X-TC-Action": action,
        "X-TC-Version": "2020-10-02",
        "X-TC-Timestamp": str(timestamp),
        "X-TC-Region": settings.tencent_ses_region,
        "Authorization": authorization,
    }


def _send_ses_api(action: str, payload: dict) -> dict:
    """直接调用腾讯云 SES API"""
    import urllib.request

    payload_str = json.dumps(payload, ensure_ascii=False)
    headers = _build_authorization(action, payload_str)
    url = f"https://ses.tencentcloudapi.com"

    req = urllib.request.Request(url, data=payload_str.encode("utf-8"), headers=headers, method="POST")
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode("utf-8"))


def send_template_email(to: str, subject: str, template_data: dict) -> Optional[str]:
    """
    通过腾讯云 SES 模板发送邮件

    Args:
        to: 收件人邮箱
        subject: 邮件主题
        template_data: 模板变量字典

    Returns:
        MessageId 成功时，失败返回 None
    """
    try:
        if not settings.tencent_secret_id or not settings.tencent_secret_key:
            logger.error("腾讯云SES未配置：缺少 TENCENT_SECRET_ID / TENCENT_SECRET_KEY")
            return None

        payload = {
            "FromEmailAddress": settings.tencent_ses_from,
            "Destination": [to],
            "Subject": subject,
            "Template": {
                "TemplateID": settings.tencent_ses_template_id,
                "TemplateData": json.dumps(template_data, ensure_ascii=False),
            },
            "TriggerType": 1,  # 触发类，验证码等即时发送
        }

        result = _send_ses_api("SendEmail", payload)
        resp = result.get("Response", {})

        if "Error" in resp:
            logger.error("腾讯云SES发送失败: %s - %s", resp["Error"].get("Code"), resp["Error"].get("Message"))
            return None

        message_id = resp.get("MessageId")
        logger.info("邮件发送成功: to=%s, MessageId=%s", to, message_id)
        return message_id

    except Exception as e:
        logger.error("邮件发送异常: %s", e, exc_info=True)
        return None


def send_reset_code_email(to: str, code: str) -> Optional[str]:
    """发送密码重置验证码邮件"""
    subject = "【星河智安】密码重置验证码"
    template_data = {
        "action": "重置密码",
        "code": code,
        "expire": "10",
    }
    return send_template_email(to, subject, template_data)


def send_register_code_email(to: str, code: str) -> Optional[str]:
    """发送注册邮箱验证码"""
    subject = "【星河智安】注册邮箱验证码"
    template_data = {
        "action": "注册账号",
        "code": code,
        "expire": "10",
    }
    return send_template_email(to, subject, template_data)
