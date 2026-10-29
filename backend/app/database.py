"""Conexión a la base de datos con SQLAlchemy 2.0.

Soporta dos motores:
  - PostgreSQL (produccion):  postgresql+psycopg2://usuario:clave@host:puerto/db
  - SQLite (desarrollo/test): sqlite:///data/sigprov.db

El motor se elige con SIGPROV_DB_DRIVER. Docker Compose define las variables
para PostgreSQL; el .env local usa SQLite para que el backend arranque sin
depender de Docker.
"""

from __future__ import annotations

import logging
from collections.abc import Iterator
from pathlib import Path

from sqlalchemy import create_engine, text
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import settings

logger = logging.getLogger(__name__)


def _crear_engine():
    """Crea el engine con los parametros correctos para cada motor."""
    url = settings.database_url

    if settings.es_sqlite:
        if ":memory:" not in url:
            ruta = Path(settings.sqlite_path)
            ruta.parent.mkdir(parents=True, exist_ok=True)
        # check_same_thread=False: FastAPI usa un pool de hilos para las sesiones.
        return create_engine(
            url,
            connect_args={"check_same_thread": False},
            pool_pre_ping=True,
            echo=settings.debug,
        )

    return create_engine(
        url,
        pool_pre_ping=True,  # detecta conexiones muertas
        pool_size=5,
        max_overflow=10,
        echo=settings.debug,
    )


engine = _crear_engine()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine, expire_on_commit=False)


class Base(DeclarativeBase):
    """Base para todos los modelos ORM."""

    pass


def get_db() -> Iterator[Session]:
    """Dependencia FastAPI para inyeccion de sesion."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def healthcheck() -> bool:
    """Verifica conectividad a la DB."""
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except Exception:
        logger.warning("Healthcheck de base de datos fallo", exc_info=True)
        return False
