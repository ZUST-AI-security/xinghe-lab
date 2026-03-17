"""
星河智安 (XingHe ZhiAn) - 模型注册中心
单例模式管理所有可用模型，支持动态注册和获取
"""

from typing import Dict, Type, Optional, List, Any
import logging
from .base import BaseModel
import torch

logger = logging.getLogger(__name__)

class ModelRegistry:
    """
    模型注册中心（单例模式）
    
    功能:
    1. 注册模型类
    2. 获取模型实例
    3. 列出所有可用模型
    4. 模型元信息管理
    5. 设备管理
    6. 模型缓存
    
    设计理念:
    - 单例模式：全局唯一注册中心
    - 装饰器注册：简化模型注册流程
    - 类型安全：强类型检查
    - 延迟加载：按需创建模型实例
    - 实例缓存：避免重复加载
    """
    
    _instance = None
    _models: Dict[str, Type[BaseModel]] = {}          # 模型类注册表
    _model_metadata: Dict[str, Dict] = {}             # 模型元数据
    _model_instances: Dict[str, BaseModel] = {}       # 模型实例缓存
    _model_configs: Dict[str, Dict] = {}              # 模型配置
    
    def __new__(cls):
        """单例模式实现"""
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._models = {}
            cls._instance._model_metadata = {}
            cls._instance._model_instances = {}
            cls._instance._model_configs = {}
            logger.info("模型注册中心初始化")
        return cls._instance
    
    def __init__(self):
        """确保初始化只执行一次"""
        if not hasattr(self, '_initialized'):
            self._initialized = True
            self._device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
            logger.info(f"注册中心默认设备: {self.device}")
    
    @property
    def device(self):
        """获取当前设备"""
        return self._device
    
    @device.setter
    def device(self, device):
        """设置设备"""
        self._device = device
        logger.info(f"注册中心设备更新为: {device}")
    
    @classmethod
    def register(cls, name: str, **metadata):
        """
        装饰器：注册模型
        
        Args:
            name: 模型名称（唯一标识）
            **metadata: 模型元数据
                - display_name: 显示名称
                - description: 描述
                - category: 类别
                - tags: 标签
                - version: 版本
                - author: 作者
                - license: 许可证
                - paper: 论文链接
                - weights_url: 权重下载地址
                - input_size: 输入尺寸
                - num_classes: 类别数
                - framework: 框架
                - requires_gpu: 是否需要GPU
                - min_gpu_memory: 最小GPU内存
                
        Returns:
            装饰器函数
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
                'version': metadata.get('version', '1.0.0'),
                'author': metadata.get('author', 'unknown'),
                'license': metadata.get('license', 'unknown'),
                'paper': metadata.get('paper', ''),
                'weights_url': metadata.get('weights_url', ''),
                'input_size': metadata.get('input_size', None),
                'num_classes': metadata.get('num_classes', None),
                'framework': metadata.get('framework', 'pytorch'),
                'requires_gpu': metadata.get('requires_gpu', False),
                'min_gpu_memory': metadata.get('min_gpu_memory', 0),
                **metadata
            }
            
            logger.info(f"注册模型: {name} -> {model_class.__name__}")
            return model_class
        
        return decorator
    
    @classmethod
    def get_model(cls, name: str, use_cache: bool = True, **kwargs) -> Optional[BaseModel]:
        """
        获取模型实例
        
        Args:
            name: 模型名称
            use_cache: 是否使用缓存实例
            **kwargs: 模型初始化参数
                - device: 指定设备
                - load_weights: 是否立即加载权重
                - force_reload: 强制重新加载
                
        Returns:
            Optional[BaseModel]: 模型实例，不存在返回None
        """
        model_class = cls._models.get(name)
        if model_class is None:
            logger.warning(f"模型 '{name}' 未注册")
            return None
        
        # 检查缓存
        cache_key = f"{name}_{hash(frozenset(kwargs.items()))}"
        if use_cache and cache_key in cls._model_instances:
            logger.info(f"使用缓存的模型实例: {name}")
            return cls._model_instances[cache_key]
        
        try:
            # 创建设备
            device = kwargs.pop('device', cls._instance.device)
            load_weights = kwargs.pop('load_weights', True)
            force_reload = kwargs.pop('force_reload', False)
            
            # 创建模型实例
            model = model_class(name, device=device, **kwargs)
            
            # 加载权重
            if load_weights:
                success = model.load()
                if not success and not force_reload:
                    logger.error(f"模型 '{name}' 权重加载失败")
                    return None
            
            # 缓存实例
            if use_cache:
                cls._model_instances[cache_key] = model
                logger.info(f"模型实例已缓存: {name}")
            
            logger.info(f"创建模型实例成功: {name}")
            return model
            
        except Exception as e:
            logger.error(f"创建模型实例失败 '{name}': {str(e)}")
            return None
    
    @classmethod
    def list_models(cls, category: str = None, framework: str = None) -> List[Dict]:
        """
        列出所有可用模型及其元信息
        
        Args:
            category: 按类别过滤
            framework: 按框架过滤
            
        Returns:
            List[Dict]: 模型信息列表
        """
        models = []
        
        for name, model_class in cls._models.items():
            metadata = cls._model_metadata.get(name, {}).copy()
            
            # 类别过滤
            if category and metadata.get('category') != category:
                continue
            
            # 框架过滤
            if framework and metadata.get('framework') != framework:
                continue
            
            # 添加类信息
            metadata['class_name'] = model_class.__name__
            metadata['module'] = model_class.__module__
            
            # 检查是否需要GPU
            if metadata.get('requires_gpu') and not torch.cuda.is_available():
                metadata['available'] = False
                metadata['unavailable_reason'] = '需要GPU但不可用'
            else:
                metadata['available'] = True
            
            # 检查GPU内存
            if metadata.get('min_gpu_memory', 0) > 0 and torch.cuda.is_available():
                gpu_memory = torch.cuda.get_device_properties(0).total_memory / 1e9
                if gpu_memory < metadata['min_gpu_memory']:
                    metadata['available'] = False
                    metadata['unavailable_reason'] = f'GPU内存不足 (需要{metadata["min_gpu_memory"]}GB，实际{gpu_memory:.1f}GB)'
            
            models.append(metadata)
        
        return models
    
    @classmethod
    def get_model_metadata(cls, name: str) -> Optional[Dict]:
        """获取模型元数据"""
        return cls._model_metadata.get(name)
    
    @classmethod
    def is_registered(cls, name: str) -> bool:
        """检查模型是否已注册"""
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
            # 清理缓存实例
            keys_to_delete = [k for k in cls._model_instances.keys() if k.startswith(f"{name}_")]
            for key in keys_to_delete:
                if key in cls._model_instances:
                    cls._model_instances[key].unload()
                    del cls._model_instances[key]
            
            del cls._models[name]
            if name in cls._model_metadata:
                del cls._model_metadata[name]
            if name in cls._model_configs:
                del cls._model_configs[name]
            
            logger.info(f"注销模型: {name}")
            return True
        return False
    
    @classmethod
    def get_categories(cls) -> List[str]:
        """获取所有模型类别"""
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
        
        for name, metadata in cls._model_metadata.items():
            # 在名称、显示名称、描述、标签中搜索
            searchable_text = [
                name.lower(),
                metadata.get('display_name', '').lower(),
                metadata.get('description', '').lower(),
                ' '.join(metadata.get('tags', [])).lower()
            ]
            
            if any(query in text for text in searchable_text):
                results.append(metadata.copy())
        
        return results
    
    @classmethod
    def get_stats(cls) -> Dict:
        """获取注册中心统计信息"""
        stats = {
            'total_models': len(cls._models),
            'total_cached': len(cls._model_instances),
            'categories': {},
            'frameworks': {},
            'device': str(cls._instance.device),
            'gpu_available': torch.cuda.is_available()
        }
        
        for name, metadata in cls._model_metadata.items():
            # 统计类别
            category = metadata.get('category', 'general')
            stats['categories'][category] = stats['categories'].get(category, 0) + 1
            
            # 统计框架
            framework = metadata.get('framework', 'unknown')
            stats['frameworks'][framework] = stats['frameworks'].get(framework, 0) + 1
        
        # 添加GPU信息
        if torch.cuda.is_available():
            stats['gpu_name'] = torch.cuda.get_device_name(0)
            stats['gpu_memory'] = torch.cuda.get_device_properties(0).total_memory / 1e9
        
        return stats
    
    @classmethod
    def clear_cache(cls):
        """清空模型缓存"""
        for instance in cls._model_instances.values():
            instance.unload()
        cls._model_instances.clear()
        logger.info("模型缓存已清空")
    
    @classmethod
    def warmup(cls, names: List[str] = None):
        """
        预热模型（提前加载到内存）
        
        Args:
            names: 要预热的模型名称列表，None表示预热所有
        """
        if names is None:
            names = list(cls._models.keys())
        
        for name in names:
            logger.info(f"预热模型: {name}")
            cls.get_model(name, use_cache=True)


# 便捷函数
def get_model_registry() -> ModelRegistry:
    """获取全局模型注册中心实例"""
    return ModelRegistry()

def register_model(name: str, **metadata):
    """装饰器：注册模型"""
    return ModelRegistry.register(name, **metadata)

def get_model(name: str, **kwargs) -> Optional[BaseModel]:
    """获取模型实例"""
    return ModelRegistry.get_model(name, **kwargs)

def list_models(**filters) -> List[Dict]:
    """列出模型"""
    return ModelRegistry.list_models(**filters)

# 全局注册中心实例
model_registry = get_model_registry()
