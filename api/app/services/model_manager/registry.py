"""
星河智安 (XingHe ZhiAn) - 模型注册中心
单例模式管理所有可用模型，支持动态注册和获取
"""

from typing import Dict, Type, Optional, List
import logging
from .base import BaseModel

logger = logging.getLogger(__name__)

class ModelRegistry:
    """
    模型注册中心（单例模式）
    
    功能:
    1. 注册模型类
    2. 获取模型实例
    3. 列出所有可用模型
    4. 模型元信息管理
    
    设计理念:
    - 单例模式：全局唯一注册中心
    - 装饰器注册：简化模型注册流程
    - 类型安全：强类型检查
    - 延迟加载：按需创建模型实例
    """
    
    _instance = None
    _models: Dict[str, Type[BaseModel]] = {}
    _model_metadata: Dict[str, Dict] = {}
    
    def __new__(cls):
        """单例模式实现"""
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            logger.info("模型注册中心初始化")
        return cls._instance
    
    @classmethod
    def register(cls, name: str, **metadata):
        """
        装饰器：注册模型
        
        Args:
            name: 模型名称（唯一标识）
            **metadata: 模型元数据（显示名称、描述等）
            
        Returns:
            装饰器函数
            
        使用示例:
        @ModelRegistry.register('resnet100_imagenet', 
                               display_name='ResNet100 (ImageNet)',
                               description='ImageNet预训练的1000分类模型')
        class ResNet100Model(BaseModel):
            pass
        """
        def decorator(model_class: Type[BaseModel]):
            # 验证模型类
            if not issubclass(model_class, BaseModel):
                raise ValueError(f"模型类 {model_class.__name__} 必须继承自 BaseModel")
            
            # 注册模型
            cls._models[name] = model_class
            cls._model_metadata[name] = {
                'name': name,
                'display_name': metadata.get('display_name', name),
                'description': metadata.get('description', ''),
                'category': metadata.get('category', 'general'),
                'tags': metadata.get('tags', []),
                **metadata
            }
            
            logger.info(f"注册模型: {name} -> {model_class.__name__}")
            return model_class
        
        return decorator
    
    @classmethod
    def get_model(cls, name: str, **kwargs) -> Optional[BaseModel]:
        """
        获取模型实例
        
        Args:
            name: 模型名称
            **kwargs: 模型初始化参数
            
        Returns:
            Optional[BaseModel]: 模型实例，不存在返回None
        """
        model_class = cls._models.get(name)
        if model_class is None:
            logger.warning(f"模型 '{name}' 未注册")
            return None
        
        try:
            model = model_class(name, **kwargs)
            logger.info(f"创建模型实例: {name}")
            return model
        except Exception as e:
            logger.error(f"创建模型实例失败 '{name}': {str(e)}")
            return None
    
    @classmethod
    def list_models(cls, category: str = None) -> List[Dict]:
        """
        列出所有可用模型及其元信息
        
        Args:
            category: 按类别过滤，None表示不过滤
            
        Returns:
            List[Dict]: 模型信息列表
        """
        models = []
        
        for name, model_class in cls._models.items():
            metadata = cls._model_metadata.get(name, {})
            
            # 类别过滤
            if category and metadata.get('category') != category:
                continue
            
            try:
                # 创建临时实例获取基本信息
                temp_model = model_class(name)
                model_info = temp_model.get_model_info()
                
                # 合并元数据
                model_info.update(metadata)
                models.append(model_info)
                
            except Exception as e:
                logger.warning(f"获取模型信息失败 '{name}': {str(e)}")
                # 即使获取信息失败，也返回基本信息
                models.append({
                    'name': name,
                    'type': 'unknown',
                    'input_shape': None,
                    'num_classes': None,
                    'error': str(e),
                    **metadata
                })
        
        return models
    
    @classmethod
    def get_model_metadata(cls, name: str) -> Optional[Dict]:
        """
        获取模型元数据
        
        Args:
            name: 模型名称
            
        Returns:
            Optional[Dict]: 模型元数据，不存在返回None
        """
        return cls._model_metadata.get(name)
    
    @classmethod
    def is_registered(cls, name: str) -> bool:
        """
        检查模型是否已注册
        
        Args:
            name: 模型名称
            
        Returns:
            bool: 是否已注册
        """
        return name in cls._models
    
    @classmethod
    def unregister(cls, name: str) -> bool:
        """
        注销模型
        
        Args:
            name: 模型名称
            
        Returns:
            bool: 是否成功注销
        """
        if name in cls._models:
            del cls._models[name]
            if name in cls._model_metadata:
                del cls._model_metadata[name]
            logger.info(f"注销模型: {name}")
            return True
        return False
    
    @classmethod
    def get_categories(cls) -> List[str]:
        """
        获取所有模型类别
        
        Returns:
            List[str]: 类别列表
        """
        categories = set()
        for metadata in cls._model_metadata.values():
            category = metadata.get('category', 'general')
            categories.add(category)
        return sorted(list(categories))
    
    @classmethod
    def search_models(cls, query: str) -> List[Dict]:
        """
        搜索模型
        
        Args:
            query: 搜索关键词
            
        Returns:
            List[Dict]: 匹配的模型列表
        """
        query = query.lower()
        results = []
        
        for model_info in cls.list_models():
            # 在名称、显示名称、描述、标签中搜索
            searchable_text = [
                model_info.get('name', ''),
                model_info.get('display_name', ''),
                model_info.get('description', ''),
                ' '.join(model_info.get('tags', []))
            ]
            
            if any(query in text.lower() for text in searchable_text):
                results.append(model_info)
        
        return results
    
    @classmethod
    def get_stats(cls) -> Dict:
        """
        获取注册中心统计信息
        
        Returns:
            Dict: 统计信息
        """
        stats = {
            'total_models': len(cls._models),
            'categories': {},
            'types': {}
        }
        
        for name, model_class in cls._models.items():
            # 统计类别
            metadata = cls._model_metadata.get(name, {})
            category = metadata.get('category', 'general')
            stats['categories'][category] = stats['categories'].get(category, 0) + 1
            
            # 统计类型
            try:
                temp_model = model_class(name)
                model_type = temp_model.get_model_type().value
                stats['types'][model_type] = stats['types'].get(model_type, 0) + 1
            except:
                stats['types']['unknown'] = stats['types'].get('unknown', 0) + 1
        
        return stats

# 便捷函数
def get_model_registry() -> ModelRegistry:
    """
    获取全局模型注册中心实例
    
    Returns:
        ModelRegistry: 注册中心实例
    """
    return ModelRegistry()

# 全局注册中心实例
model_registry = get_model_registry()
