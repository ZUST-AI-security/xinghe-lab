"""
星河智安 (XingHe ZhiAn) - 全局异常处理
自定义异常类和异常处理器
"""

from fastapi import HTTPException, Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from typing import Union, Dict, Any
import logging

logger = logging.getLogger(__name__)

class XingHeException(Exception):
    """
    星河智安基础异常类
    """
    
    def __init__(
        self, 
        message: str, 
        status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
        details: Dict[str, Any] = None
    ):
        self.message = message
        self.status_code = status_code
        self.details = details or {}
        super().__init__(self.message)

class AuthenticationError(XingHeException):
    """认证错误"""
    
    def __init__(self, message: str = "认证失败"):
        super().__init__(
            message=message,
            status_code=status.HTTP_401_UNAUTHORIZED
        )

class AuthorizationError(XingHeException):
    """授权错误"""
    
    def __init__(self, message: str = "权限不足"):
        super().__init__(
            message=message,
            status_code=status.HTTP_403_FORBIDDEN
        )

class ValidationError(XingHeException):
    """数据验证错误"""
    
    def __init__(self, message: str = "数据验证失败", details: Dict[str, Any] = None):
        super().__init__(
            message=message,
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            details=details
        )

class ModelNotFoundError(XingHeException):
    """模型未找到错误"""
    
    def __init__(self, model_name: str):
        super().__init__(
            message=f"模型 '{model_name}' 未找到",
            status_code=status.HTTP_404_NOT_FOUND,
            details={"model_name": model_name}
        )

class AttackError(XingHeException):
    """攻击算法错误"""
    
    def __init__(self, message: str = "攻击算法执行失败", details: Dict[str, Any] = None):
        super().__init__(
            message=message,
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            details=details
        )

class FileUploadError(XingHeException):
    """文件上传错误"""
    
    def __init__(self, message: str = "文件上传失败", details: Dict[str, Any] = None):
        super().__init__(
            message=message,
            status_code=status.HTTP_400_BAD_REQUEST,
            details=details
        )

class RateLimitError(XingHeException):
    """请求频率限制错误"""
    
    def __init__(self, message: str = "请求过于频繁，请稍后再试"):
        super().__init__(
            message=message,
            status_code=status.HTTP_429_TOO_MANY_REQUESTS
        )

async def xinghe_exception_handler(request: Request, exc: XingHeException):
    """
    星河智安异常处理器
    
    Args:
        request: HTTP请求对象
        exc: 星河智安异常
        
    Returns:
        JSONResponse: 格式化的错误响应
    """
    logger.error(
        f"星河智安异常: {exc.message}",
        extra={
            "status_code": exc.status_code,
            "details": exc.details,
            "path": request.url.path,
            "method": request.method
        }
    )
    
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": True,
            "message": exc.message,
            "details": exc.details,
            "type": exc.__class__.__name__
        }
    )

async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """
    数据验证异常处理器
    
    Args:
        request: HTTP请求对象
        exc: 验证异常
        
    Returns:
        JSONResponse: 格式化的验证错误响应
    """
    logger.warning(
        f"数据验证失败: {exc.errors()}",
        extra={
            "path": request.url.path,
            "method": request.method
        }
    )
    
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": True,
            "message": "请求数据验证失败",
            "details": {
                "validation_errors": exc.errors()
            },
            "type": "ValidationError"
        }
    )

async def http_exception_handler(request: Request, exc: Union[HTTPException, StarletteHTTPException]):
    """
    HTTP异常处理器
    
    Args:
        request: HTTP请求对象
        exc: HTTP异常
        
    Returns:
        JSONResponse: 格式化的HTTP错误响应
    """
    logger.warning(
        f"HTTP异常: {exc.detail}",
        extra={
            "status_code": exc.status_code,
            "path": request.url.path,
            "method": request.method
        }
    )
    
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": True,
            "message": exc.detail,
            "details": {},
            "type": "HTTPException"
        }
    )

async def general_exception_handler(request: Request, exc: Exception):
    """
    通用异常处理器
    
    Args:
        request: HTTP请求对象
        exc: 通用异常
        
    Returns:
        JSONResponse: 格式化的服务器错误响应
    """
    logger.error(
        f"未处理的异常: {str(exc)}",
        extra={
            "exception_type": exc.__class__.__name__,
            "path": request.url.path,
            "method": request.method
        },
        exc_info=True
    )
    
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": True,
            "message": "服务器内部错误",
            "details": {
                "exception_type": exc.__class__.__name__
            } if not isinstance(exc, Exception) else {},
            "type": "InternalServerError"
        }
    )
