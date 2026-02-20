import logging
import sys
from app.core.settings import get_settings

settings = get_settings()


def setup_logging() -> None:
    level = logging.DEBUG if settings.debug else logging.INFO
    fmt = "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s"
    datefmt = "%Y-%m-%d %H:%M:%S"

    logging.basicConfig(
        level=level,
        format=fmt,
        datefmt=datefmt,
        handlers=[logging.StreamHandler(sys.stdout)],
    )


def get_logger(name: str) -> logging.Logger:
    return logging.getLogger(name)
