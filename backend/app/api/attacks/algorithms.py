"""
星河智安 (XingHe ZhiAn) - 算法列表API路由
提供所有可用的攻击算法列表
"""

from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any

from app.services.attacks.registry import get_attack_registry
from app.services.model_manager import model_registry

router = APIRouter()

@router.get("/")
async def get_algorithms():
    """
    获取所有可用的攻击算法列表
    返回算法的基本信息和参数配置
    """
    try:
        attack_registry = get_attack_registry()
        attacks = attack_registry.list_attacks()
        
        # 获取模型信息
        models = model_registry.list_models()
        
        # 构建算法列表，包含参数配置
        algorithms = []
        
        for attack in attacks:
            attack_name = attack['name']
            
            # 为每个攻击算法生成配置项
            inputs = []
            
            if attack_name == 'cw':
                # C&W攻击的参数配置
                inputs = [
                    {
                        "name": "image",
                        "type": "image_upload",
                        "label": "上传图片",
                        "required": True,
                        "description": "请选择要攻击的图片（JPEG/PNG格式）"
                    },
                    {
                        "name": "c",
                        "type": "slider",
                        "label": "权衡系数 c",
                        "min": 0.001,
                        "max": 10.0,
                        "step": 0.1,
                        "default": 1.0,
                        "description": "平衡扰动大小和攻击成功率，越大越注重攻击成功率"
                    },
                    {
                        "name": "kappa",
                        "type": "slider",
                        "label": "置信度阈值 κ",
                        "min": 0.0,
                        "max": 10.0,
                        "step": 0.1,
                        "default": 0.0,
                        "description": "控制攻击的置信度阈值"
                    },
                    {
                        "name": "lr",
                        "type": "slider",
                        "label": "学习率",
                        "min": 0.001,
                        "max": 0.1,
                        "step": 0.001,
                        "default": 0.01,
                        "description": "优化器学习率"
                    },
                    {
                        "name": "max_iter",
                        "type": "slider",
                        "label": "最大迭代次数",
                        "min": 100,
                        "max": 1000,
                        "step": 50,
                        "default": 100,
                        "description": "攻击算法的最大迭代次数"
                    },
                    {
                        "name": "binary_search_steps",
                        "type": "slider",
                        "label": "二分搜索步数",
                        "min": 1,
                        "max": 20,
                        "step": 1,
                        "default": 1,
                        "description": "二分搜索最优c值的步数"
                    },
                    {
                        "name": "targeted",
                        "type": "select",
                        "label": "攻击类型",
                        "options": [
                            {"label": "非定向攻击", "value": False},
                            {"label": "定向攻击", "value": True}
                        ],
                        "default": False,
                        "description": "是否为定向攻击"
                    }
                ]
            
            # 构建算法对象
            algorithm = {
                "id": attack_name,
                "name": attack.get('display_name', attack_name),
                "description": attack.get('description', ''),
                "category": attack.get('category', 'general'),
                "type": "classification" if 'classification' in attack.get('supported_models', []) else 'detection',
                "inputs": inputs,
                "tags": attack.get('tags', []),
                "supported_models": attack.get('supported_models', [])
            }
            
            algorithms.append(algorithm)
        
        # 如果没有注册的攻击算法，至少返回C&W攻击
        if not algorithms:
            algorithms = [{
                "id": "cw",
                "name": "C&W Attack",
                "description": "Carlini & Wagner L2攻击算法，强大的基于优化的对抗攻击方法",
                "category": "optimization",
                "type": "classification",
                "inputs": [
                    {
                        "name": "image",
                        "type": "image_upload",
                        "label": "上传图片",
                        "required": True,
                        "description": "请选择要攻击的图片（JPEG/PNG格式）"
                    },
                    {
                        "name": "c",
                        "type": "slider",
                        "label": "权衡系数 c",
                        "min": 0.001,
                        "max": 10.0,
                        "step": 0.1,
                        "default": 1.0,
                        "description": "平衡扰动大小和攻击成功率，越大越注重攻击成功率"
                    },
                    {
                        "name": "kappa",
                        "type": "slider",
                        "label": "置信度阈值 κ",
                        "min": 0.0,
                        "max": 10.0,
                        "step": 0.1,
                        "default": 0.0,
                        "description": "控制攻击的置信度阈值"
                    },
                    {
                        "name": "lr",
                        "type": "slider",
                        "label": "学习率",
                        "min": 0.001,
                        "max": 0.1,
                        "step": 0.001,
                        "default": 0.01,
                        "description": "优化器学习率"
                    },
                    {
                        "name": "max_iter",
                        "type": "slider",
                        "label": "最大迭代次数",
                        "min": 100,
                        "max": 1000,
                        "step": 50,
                        "default": 100,
                        "description": "攻击算法的最大迭代次数"
                    },
                    {
                        "name": "binary_search_steps",
                        "type": "slider",
                        "label": "二分搜索步数",
                        "min": 1,
                        "max": 20,
                        "step": 1,
                        "default": 1,
                        "description": "二分搜索最优c值的步数"
                    },
                    {
                        "name": "targeted",
                        "type": "select",
                        "label": "攻击类型",
                        "options": [
                            {"label": "非定向攻击", "value": False},
                            {"label": "定向攻击", "value": True}
                        ],
                        "default": False,
                        "description": "是否为定向攻击"
                    }
                ],
                "tags": ["l2", "optimization", "carlini", "wagner"],
                "supported_models": ["classification"]
            }]
        
        return {
            "algorithms": algorithms,
            "total": len(algorithms)
        }
        
    except Exception as e:
        # 如果出错，返回基本的C&W攻击配置
        return {
            "algorithms": [{
                "id": "cw",
                "name": "C&W Attack",
                "description": "Carlini & Wagner L2攻击算法，强大的基于优化的对抗攻击方法",
                "category": "optimization",
                "type": "classification",
                "inputs": [
                    {
                        "name": "image",
                        "type": "image_upload",
                        "label": "上传图片",
                        "required": True,
                        "description": "请选择要攻击的图片（JPEG/PNG格式）"
                    },
                    {
                        "name": "c",
                        "type": "slider",
                        "label": "权衡系数 c",
                        "min": 0.001,
                        "max": 10.0,
                        "step": 0.1,
                        "default": 1.0,
                        "description": "平衡扰动大小和攻击成功率"
                    },
                    {
                        "name": "max_iter",
                        "type": "slider",
                        "label": "最大迭代次数",
                        "min": 100,
                        "max": 1000,
                        "step": 50,
                        "default": 100,
                        "description": "攻击算法的最大迭代次数"
                    }
                ],
                "tags": ["l2", "optimization"],
                "supported_models": ["classification"]
            }],
            "total": 1
        }
