"""
Algorithm package — importing this module registers all built-in algorithms.

To add a new algorithm:
1. Create app/algorithms/my_algo.py  (subclass BaseAlgorithm)
2. Add one line here:  register(MyAlgorithm)
"""

from app.algorithms.registry import register
from app.algorithms.fgsm import FGSMAlgorithm
from app.algorithms.cw import CWAlgorithm
from app.algorithms.pgd import PGDAlgorithm
from app.algorithms.ifgsm import IFGSMAlgorithm
from app.algorithms.deepfool import DeepFoolAlgorithm

register(FGSMAlgorithm)
register(CWAlgorithm)
register(PGDAlgorithm)
register(IFGSMAlgorithm)
register(DeepFoolAlgorithm)

__all__ = [
    "FGSMAlgorithm", "CWAlgorithm", "PGDAlgorithm",
    "IFGSMAlgorithm", "DeepFoolAlgorithm", "register",
]
