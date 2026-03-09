from app.core.celery_app import celery_app
from app.services.cv.classification_attacks import ClassificationAttackService
from app.services.cv.detection_attacks import DetectionAttackService
from app.core.logging_config import get_logger
import os
import traceback
from typing import Any, Dict

logger = get_logger(__name__)

# Lazily initialize services within the worker process
class AttackServices:
    _classification = None
    _detection = None

    @classmethod
    def get_classification(cls):
        if cls._classification is None:
            # Assuming models/resnet18_cifar10.pth exists, or it will use default
            cls._classification = ClassificationAttackService()
        return cls._classification

    @classmethod
    def get_detection(cls):
        if cls._detection is None:
            cls._detection = DetectionAttackService()
        return cls._detection

@celery_app.task(name="app.tasks.cv_tasks.process_attack")
def process_attack(algorithm_id: str, params: Dict[str, Any]):
    """
    Main entry point for CV attack tasks. Supports single or multiple image inputs.
    """
    logger.info(f"Task started: {algorithm_id}")
    
    # 1. Determine Input Image Path(s)
    image_urls = params.get("images") or params.get("image") or params.get("dataset_sample_url")
    if not image_urls:
        logger.warning(f"Task {algorithm_id} failed: No input image(s) provided")
        return {"error": "No input image(s) provided"}
    
    # Ensure image_urls is a list
    if isinstance(image_urls, str):
        image_urls = [image_urls]
    
    # Strip leading slash for local file access
    image_paths = [url.lstrip("/") for url in image_urls]

    try:
        if algorithm_id == "resnet18_cifar10":
            service = AttackServices.get_classification()
        elif algorithm_id == "yolov8_attack":
            service = AttackServices.get_detection()
        else:
            logger.error(f"Task {algorithm_id} failed: Unsupported algorithm")
            return {"error": f"Unsupported algorithm: {algorithm_id}"}

        # Run attack for each image path
        results = []
        for path in image_paths:
            logger.debug(f"Running attack on image: {path}")
            res = service.run_attack(path, params)
            results.append(res)
        
        logger.info(f"Task {algorithm_id} completed successfully.")
        # Return single object if only one image, otherwise return list
        return results if len(results) > 1 else results[0]

    except Exception as e:
        error_tb = traceback.format_exc()
        logger.error(f"Task {algorithm_id} failed with error: {str(e)}\n{error_tb}")
        return {"error": str(e), "traceback": error_tb}
