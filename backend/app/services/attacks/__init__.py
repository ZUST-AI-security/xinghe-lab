"""
XingHe ZhiAn - Attack algorithms module.
"""

from .base import BaseAttack
from .registry import AttackRegistry, get_attack_registry, attack_registry
from .fgsm import FGSMAttack

__all__ = [
    'BaseAttack',
    'AttackRegistry',
    'get_attack_registry',
    'attack_registry',
    'FGSMAttack'
]
