import logging
import sys
from typing import Optional

def setup_logging(level: int = logging.INFO):
    """
    Configures the global logging settings.
    """
    logging.basicConfig(
        level=level,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.StreamHandler(sys.stdout)
        ]
    )

def get_logger(name: Optional[str] = None):
    """
    Returns a logger instance for the given name.
    """
    return logging.getLogger(name or "xinghe-lab")
