"""
星河智安 (XingHe ZhiAn) - 日志配置
支持自动清理：超过600条日志时自动删除旧日志
"""

import os
import logging
from pathlib import Path
from logging.handlers import RotatingFileHandler
from app.core.config import settings


class LineCountRotatingHandler(RotatingFileHandler):
    """
    按日志行数自动轮转的日志处理器
    当日志行数超过 max_lines 时，自动删除旧日志
    """
    
    def __init__(self, filename, max_lines=600, backupCount=0, encoding=None):
        self.max_lines = max_lines
        self.line_count = 0
        super().__init__(filename, mode='a', maxBytes=0, backupCount=backupCount, encoding=encoding)
        # 初始化时检查并清理旧日志
        self._check_and_rotate()
    
    def emit(self, record):
        """
        输出日志记录，并检查是否需要轮转
        """
        super().emit(record)
        self.line_count += 1
        # 每记录100条检查一次是否需要清理
        if self.line_count >= 100:
            self._check_and_rotate()
            self.line_count = 0
    
    def _check_and_rotate(self):
        """
        检查日志行数，超过 max_lines 时保留最近的内容
        """
        try:
            if not os.path.exists(self.baseFilename):
                return
                
            with open(self.baseFilename, 'r', encoding='utf-8', errors='ignore') as f:
                lines = f.readlines()
            
            # 如果行数超过限制，保留最近的 max_lines 行
            if len(lines) > self.max_lines:
                # 保留最近 80% 的日志（即最近 480 条），删除旧的
                keep_lines = int(self.max_lines * 0.8)
                lines_to_keep = lines[-keep_lines:]
                
                # 添加清理标记
                cleanup_marker = f"# --- 日志自动清理：{len(lines) - keep_lines} 条旧日志已删除，保留最近 {keep_lines} 条 ---\n"
                lines_to_keep.insert(0, cleanup_marker)
                
                # 写回文件
                with open(self.baseFilename, 'w', encoding='utf-8') as f:
                    f.writelines(lines_to_keep)
                
                # 通知日志系统
                logging.getLogger(__name__).info(f"日志文件超过 {self.max_lines} 行，已自动清理，保留最近 {keep_lines} 行")
        
        except Exception as e:
            # 清理失败不影响正常日志记录
            pass


def setup_logging():
    """
    设置日志配置
    """
    # 创建日志目录（项目根目录 logs）
    log_file = Path(settings.log_file)
    log_file.parent.mkdir(parents=True, exist_ok=True)
    
    # 设置日志格式
    log_format = '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    
    # 创建自定义的按行数清理处理器（超过600条自动清理）
    line_handler = LineCountRotatingHandler(
        str(log_file),
        max_lines=600,
        backupCount=0,
        encoding='utf-8'
    )
    line_handler.setFormatter(logging.Formatter(log_format))
    
    # 创建控制台处理器
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(logging.Formatter(log_format))
    
    # 配置根日志记录器
    logging.basicConfig(
        level=logging.INFO,
        format=log_format,
        handlers=[line_handler, console_handler]
    )
    
    # 设置第三方库日志级别
    logging.getLogger('uvicorn').setLevel(logging.INFO)
    logging.getLogger('sqlalchemy').setLevel(logging.WARNING)
    
    logging.getLogger(__name__).info(f"日志系统初始化完成，日志文件：{log_file}，自动清理阈值：600条")
