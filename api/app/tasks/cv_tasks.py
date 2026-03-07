from app.core.celery_app import celery_app
from app.services.cv.classification_attacks import ClassificationAttackService
from app.services.cv.detection_attacks import DetectionAttackService
import os
from typing import Any, Dict

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
    Main entry point for CV attack tasks.
    """
    print(f"Task started: {algorithm_id}")
    
    # 1. Determine Input Image Path
    # 'image' comes from upload, 'dataset_sample_url' comes from picker
    image_url = params.get("image") or params.get("dataset_sample_url")
    if not image_url:
        return {"error": "No input image provided"}
        
    # Strip leading slash for local file access
    image_path = image_url.lstrip("/")

    try:
        if algorithm_id == "resnet18_cifar10":
            service = AttackServices.get_classification()
            return service.run_attack(image_path, params)
        
        elif algorithm_id == "yolov8_attack":
            service = AttackServices.get_detection()
            return service.run_attack(image_path, params)
            
        return {"error": f"Unsupported algorithm: {algorithm_id}"}
    except Exception as e:
        import traceback
        return {"error": str(e), "traceback": traceback.format_exc()}
