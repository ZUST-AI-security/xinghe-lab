"""
星河智安 (XingHe ZhiAn) - 攻击算法注册中心
单例模式管理所有攻击算法，支持动态注册和获取
"""

from typing import Dict, Type, Optional, List
import logging
from .base import BaseAttack

logger = logging.getLogger(__name__)

class AttackRegistry:
    """
    攻击算法注册中心（单例模式）
    
    功能:
    1. 注册攻击算法类
    2. 获取攻击算法实例
    3. 列出所有可用算法
    4. 算法元信息管理
    
    设计理念:
    - 单例模式：全局唯一注册中心
    - 装饰器注册：简化算法注册流程
    - 模型适配：自动检查算法与模型的兼容性
    - 延迟加载：按需创建算法实例
    """
    
    _instance = None
    _attacks: Dict[str, Type[BaseAttack]] = {}
    _attack_metadata: Dict[str, Dict] = {}
    
    def __new__(cls):
        """单例模式实现"""
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            logger.info("攻击算法注册中心初始化")
        return cls._instance
    
    @classmethod
    def register(cls, name: str, **metadata):
        """
        装饰器：注册攻击算法
        
        Args:
            name: 算法名称（唯一标识）
            **metadata: 算法元数据（显示名称、描述等）
            
        Returns:
            装饰器函数
            
        使用示例:
        @AttackRegistry.register('cw', 
                               display_name='C&W Attack',
                               description='Carlini & Wagner L2攻击',
                               supported_models=['classification'])
        class CWAttack(BaseAttack):
            pass
        """
        def decorator(attack_class: Type[BaseAttack]):
            # 验证攻击算法类
            if not issubclass(attack_class, BaseAttack):
                raise ValueError(f"攻击算法类 {attack_class.__name__} 必须继承自 BaseAttack")
            
            # 注册攻击算法
            cls._attacks[name] = attack_class
            cls._attack_metadata[name] = {
                'name': name,
                'display_name': metadata.get('display_name', name),
                'description': metadata.get('description', ''),
                'category': metadata.get('category', 'general'),
                'supported_models': metadata.get('supported_models', ['classification']),
                'tags': metadata.get('tags', []),
                **metadata
            }
            
            logger.info(f"注册攻击算法: {name} -> {attack_class.__name__}")
            return attack_class
        
        return decorator
    
    @classmethod
    def get_attack(cls, name: str, model, **kwargs) -> Optional[BaseAttack]:
        """
        获取攻击算法实例
        
        Args:
            name: 算法名称
            model: 模型实例
            **kwargs: 算法初始化参数
            
        Returns:
            Optional[BaseAttack]: 攻击算法实例，不存在返回None
        """
        attack_class = cls._attacks.get(name)
        if attack_class is None:
            logger.warning(f"攻击算法 '{name}' 未注册")
            return None
        
        try:
            attack = attack_class(model, **kwargs)
            logger.info(f"创建攻击算法实例: {name}")
            return attack
        except Exception as e:
            logger.error(f"创建攻击算法实例失败 '{name}': {str(e)}")
            return None
    
    @classmethod
    def list_attacks(cls, category: str = None) -> List[Dict]:
        """
        列出所有可用攻击算法及其元信息
        
        Args:
            category: 按类别过滤，None表示不过滤
            
        Returns:
            List[Dict]: 攻击算法信息列表
        """
        attacks = []
        
        for name, attack_class in cls._attacks.items():
            metadata = cls._attack_metadata.get(name, {})
            
            # 类别过滤
            if category and metadata.get('category') != category:
                continue
            
            try:
                # 创建临时实例获取基本信息
                # 注意：这里需要虚拟模型，实际使用时会传入真实模型
                attack_info = {
                    'name': name,
                    'class_name': attack_class.__name__,
                    'params_schema': attack_class.get_params_schema(),
                    **metadata
                }
                
                attacks.append(attack_info)
                
            except Exception as e:
                logger.warning(f"获取攻击算法信息失败 '{name}': {str(e)}")
                # 即使获取信息失败，也返回基本信息
                attacks.append({
                    'name': name,
                    'class_name': attack_class.__name__,
                    'error': str(e),
                    **metadata
                })
        
        return attacks
    
    @classmethod
    def get_attack_metadata(cls, name: str) -> Optional[Dict]:
        """
        获取攻击算法元数据
        
        Args:
            name: 算法名称
            
        Returns:
            Optional[Dict]: 算法元数据，不存在返回None
        """
        return cls._attack_metadata.get(name)
    
    @classmethod
    def is_registered(cls, name: str) -> bool:
        """
        检查攻击算法是否已注册
        
        Args:
            name: 算法名称
            
        Returns:
            bool: 是否已注册
        """
        return name in cls._attacks
    
    @classmethod
    def unregister(cls, name: str) -> bool:
        """
        注销攻击算法
        
        Args:
            name: 算法名称
            
        Returns:
            bool: 是否成功注销
        """
        if name in cls._attacks:
            del cls._attacks[name]
            if name in cls._attack_metadata:
                del cls._attack_metadata[name]
            logger.info(f"注销攻击算法: {name}")
            return True
        return False
    
    @classmethod
    def get_categories(cls) -> List[str]:
        """
        获取所有攻击算法类别
        
        Returns:
            List[str]: 类别列表
        """
        categories = set()
        for metadata in cls._attack_metadata.values():
            category = metadata.get('category', 'general')
            categories.add(category)
        return sorted(list(categories))
    
    @classmethod
    def get_attacks_for_model(cls, model_type: str) -> List[Dict]:
        """
        获取支持特定模型类型的攻击算法
        
        Args:
            model_type: 模型类型 ('classification', 'detection')
            
        Returns:
            List[Dict]: 支持的攻击算法列表
        """
        compatible_attacks = []
        
        for name, metadata in cls._attack_metadata.items():
            supported_models = metadata.get('supported_models', ['classification'])
            
            if model_type in supported_models:
                attack_info = {
                    'name': name,
                    **metadata
                }
                
                # 添加参数schema
                if name in cls._attacks:
                    attack_info['params_schema'] = cls._attacks[name].get_params_schema()
                
                compatible_attacks.append(attack_info)
        
        return compatible_attacks
    
    @classmethod
    def search_attacks(cls, query: str) -> List[Dict]:
        """
        搜索攻击算法
        
        Args:
            query: 搜索关键词
            
        Returns:
            List[Dict]: 匹配的攻击算法列表
        """
        query = query.lower()
        results = []
        
        for attack_info in cls.list_attacks():
            # 在名称、显示名称、描述、标签中搜索
            searchable_text = [
                attack_info.get('name', ''),
                attack_info.get('display_name', ''),
                attack_info.get('description', ''),
                ' '.join(attack_info.get('tags', []))
            ]
            
            if any(query in text.lower() for text in searchable_text):
                results.append(attack_info)
        
        return results
    
    @classmethod
    def get_stats(cls) -> Dict:
        """
        获取注册中心统计信息
        
        Returns:
            Dict: 统计信息
        """
        stats = {
            'total_attacks': len(cls._attacks),
            'categories': {},
            'supported_models': {}
        }
        
        for name, metadata in cls._attack_metadata.items():
            # 统计类别
            category = metadata.get('category', 'general')
            stats['categories'][category] = stats['categories'].get(category, 0) + 1
            
            # 统计支持的模型类型
            supported_models = metadata.get('supported_models', ['classification'])
            for model_type in supported_models:
                stats['supported_models'][model_type] = stats['supported_models'].get(model_type, 0) + 1
        
        return stats

# 便捷函数
def get_attack_registry() -> AttackRegistry:
    """
    获取全局攻击算法注册中心实例
    
    Returns:
        AttackRegistry: 注册中心实例
    """
    return AttackRegistry()

# 全局注册中心实例
attack_registry = get_attack_registry()
