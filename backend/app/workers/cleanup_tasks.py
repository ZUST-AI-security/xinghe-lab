import os
import shutil
from datetime import datetime, timedelta
import logging

from app.core.celery_app import celery_app
from app.core.database import SessionLocal
from app.models.task_record import TaskRecord

logger = logging.getLogger(__name__)

@celery_app.task
def cleanup_old_task_files():
    """
    清理超期（90天）的任务文件和数据库记录
    """
    logger.info("开始执行超期任务文件清理...")
    db = SessionLocal()
    try:
        cutoff_date = datetime.utcnow() - timedelta(days=90)
        
        # 查找所有早于 90 天前的 TaskRecord
        old_tasks = db.query(TaskRecord).filter(TaskRecord.created_at < cutoff_date).all()
        
        deleted_count = 0
        for task in old_tasks:
            # 解析并删除结果中包含的文件路径
            if task.result and isinstance(task.result, dict):
                # 根据 result 的格式进行清理，例如有一个 output_dir 或者 file_path
                output_dir = task.result.get("output_dir")
                if output_dir and os.path.isdir(output_dir):
                    try:
                        shutil.rmtree(output_dir)
                        logger.info(f"已删除任务输出目录: {output_dir}")
                    except Exception as e:
                        logger.error(f"删除任务输出目录失败 {output_dir}: {e}")
                
            # 从数据库中移除记录
            db.delete(task)
            deleted_count += 1
            
        db.commit()
        logger.info(f"清理完成。共删除 {deleted_count} 个超期任务及其文件。")
    except Exception as e:
        logger.error(f"清理超期任务文件时发生异常: {e}")
        db.rollback()
    finally:
        db.close()
