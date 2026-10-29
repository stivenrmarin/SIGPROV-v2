"""Fixtures compartidos de la suite de tests de SIGPROV.

Cada corrida usa una base SQLite aislada en un directorio temporal, con el
schema completo (tablas + triggers + calendario de festivos). Entre tests se
limpian todas las tablas para que el orden de ejecucion no importe.
"""

from __future__ import annotations

import os
import sqlite3
import sys
from collections.abc import Iterator
from pathlib import Path

import pytest

BACKEND = Path(__file__).resolve().parent.parent
if str(BACKEND) not in sys.path:
    sys.path.insert(0, str(BACKEND))


def _dividir_sqlite(sql: str) -> list[str]:
    """Divide un script SQLite en statements completos (respeta triggers)."""
    statements: list[str] = []
    buffer = ""
    for linea in sql.splitlines(keepends=True):
        buffer += linea
        if sqlite3.complete_statement(buffer):
            if buffer.strip():
                statements.append(buffer.strip())
            buffer = ""
    return statements


@pytest.fixture(scope="session", autouse=True)
def base_de_datos(tmp_path_factory: pytest.TempPathFactory) -> Iterator[object]:
    """Crea la base de datos de test: tablas, triggers y festivos."""
    db_dir = tmp_path_factory.mktemp("sigprov-test-db")
    db_path = db_dir / "test.db"

    # El entorno tiene prioridad sobre el archivo .env en pydantic-settings.
    os.environ["SIGPROV_DB_DRIVER"] = "sqlite"
    os.environ["SIGPROV_SQLITE_PATH"] = str(db_path)
    os.environ["SIGPROV_DB_PASSWORD"] = "test"
    os.environ["SIGPROV_SECRET_KEY"] = "clave_de_pruebas_0123456789_0123456789_0123456789"
    os.environ["SIGPROV_ENVIRONMENT"] = "test"

    # Importar despues de fijar el entorno para que el engine apunte al temporal.
    import app.models  # noqa: F401  (registra las tablas en Base.metadata)
    from app.database import Base, engine

    Base.metadata.create_all(bind=engine)

    triggers = BACKEND / "sql" / "triggers.sqlite.sql"
    if triggers.exists():
        with engine.begin() as conn:
            for statement in _dividir_sqlite(triggers.read_text(encoding="utf-8")):
                conn.exec_driver_sql(statement)

    yield engine

    Base.metadata.drop_all(bind=engine)


@pytest.fixture(autouse=True)
def limpiar_tablas(base_de_datos: object) -> Iterator[None]:
    """Limpia las tablas antes de cada test."""
    from app.database import SessionLocal
    from app.models import (
        CalendarioFestivo,
        DetalleVenta,
        MovimientoInventario,
        Prediccion,
        Producto,
        Receta,
        StockMateriaPrima,
        Venta,
    )

    db = SessionLocal()
    try:
        # Orden inverso de dependencias para no violar las FK.
        for modelo in (
            DetalleVenta,
            Venta,
            MovimientoInventario,
            Prediccion,
            Receta,
            StockMateriaPrima,
            Producto,
            CalendarioFestivo,
        ):
            db.query(modelo).delete()
        db.commit()
    finally:
        db.close()

    yield
