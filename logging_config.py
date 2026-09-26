"""Application logging setup. Never log credentials or response bodies."""

import logging
import os
from logging.handlers import RotatingFileHandler
from pathlib import Path


def configure_logging(log_dir=None, level=logging.INFO):
    """Configure application logging once, with a bounded local log file."""
    logger = logging.getLogger("vto_collector")
    if logger.handlers:
        return logger

    if log_dir is None:
        base = os.environ.get("LOCALAPPDATA") or Path.home() / ".local" / "state"
        log_dir = Path(base) / "VTO Collector" / "logs"

    formatter = logging.Formatter(
        "%(asctime)s %(levelname)s %(name)s %(message)s"
    )
    try:
        Path(log_dir).mkdir(parents=True, exist_ok=True)
        handler = RotatingFileHandler(
            Path(log_dir) / "app.log", maxBytes=1_000_000, backupCount=3,
            encoding="utf-8",
        )
    except OSError:
        handler = logging.StreamHandler()
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    logger.setLevel(level)
    logger.propagate = False
    return logger
