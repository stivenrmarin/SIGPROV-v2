"""Inicializa la base de datos: tablas, triggers y calendario de festivos.

Las tablas se crean desde los modelos ORM (app/models.py), que son la fuente
de verdad de la estructura. Los triggers se aplican desde el archivo que
corresponde al motor en uso.

Uso:
    python scripts/inicializar_db.py            # crea lo que falte
    python scripts/inicializar_db.py --reset    # borra y recrea todo
    python scripts/inicializar_db.py --festivos # solo carga el calendario
"""

from __future__ import annotations

import argparse
import sqlite3
import sys
from pathlib import Path

BACKEND = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND))

from sqlalchemy import text  # noqa: E402

import app.models  # noqa: E402,F401  (registra las tablas en Base.metadata)
from app.config import settings  # noqa: E402
from app.database import Base, engine  # noqa: E402


def _aplicar_sql(script: Path) -> None:
    """Ejecuta un archivo .sql statement por statement.

    PostgreSQL acepta varios statements en una sola llamada, pero SQLite no.
    Para SQLite usamos sqlite3.complete_statement, que sabe detectar el
    BEGIN...END de los triggers y no los parte por error.
    """
    sql = script.read_text(encoding="utf-8")

    with engine.begin() as conn:
        if engine.dialect.name == "sqlite":
            for statement in _dividir_sqlite(sql):
                conn.exec_driver_sql(statement)
        else:
            conn.exec_driver_sql(sql)


def _dividir_sqlite(sql: str) -> list[str]:
    """Divide un script SQLite en statements completos (respeta triggers)."""
    statements: list[str] = []
    buffer = ""

    for linea in sql.splitlines(keepends=True):
        buffer += linea
        if sqlite3.complete_statement(buffer):
            limpio = buffer.strip()
            if limpio:
                statements.append(limpio)
            buffer = ""

    if buffer.strip():
        statements.append(buffer.strip())

    return statements


def _crear_tablas() -> None:
    print("  - creando tablas desde los modelos ORM...")
    Base.metadata.create_all(bind=engine)


def _crear_triggers() -> None:
    dialect = engine.dialect.name
    if dialect == "sqlite":
        archivo = settings.sql_dir / "triggers.sqlite.sql"
    elif dialect == "postgresql":
        archivo = settings.sql_dir / "triggers.postgres.sql"
    else:
        print(f"  [AVISO] motor '{dialect}' sin archivo de triggers propio")
        return

    if not archivo.exists():
        print(f"  [AVISO] no existe {archivo.name}, se omiten los triggers")
        return

    print(f"  - aplicando triggers ({archivo.name})...")
    _aplicar_sql(archivo)


def _cargar_festivos() -> None:
    archivo = settings.sql_dir / "02_festivos.sql"
    if not archivo.exists():
        print("  [AVISO] no existe 02_festivos.sql")
        return

    print("  - cargando calendario de festivos...")
    sql = archivo.read_text(encoding="utf-8")
    with engine.begin() as conn:
        for statement in sql.split(";"):
            limpio = statement.strip()
            if limpio and not limpio.startswith("--"):
                try:
                    conn.execute(text(limpio))
                except Exception as exc:  # noqa: BLE001
                    print(f"    [AVISO] statement omitido: {str(exc)[:80]}")


def _reset() -> None:
    print("  - borrando todas las tablas...")
    Base.metadata.drop_all(bind=engine)


def main() -> int:
    parser = argparse.ArgumentParser(description="Inicializa la base de datos de SIGPROV")
    parser.add_argument("--reset", action="store_true", help="Borra y recrea todo")
    parser.add_argument("--festivos", action="store_true", help="Solo carga el calendario")
    args = parser.parse_args()

    print("=" * 62)
    print("  SIGPROV - Inicializacion de base de datos")
    print("=" * 62)
    print(f"  Motor:  {engine.dialect.name}")
    print(f"  URL:    {engine.url.render_as_string(hide_password=True)}")
    print()

    if args.festivos:
        _cargar_festivos()
        print("\n  Listo.")
        return 0

    if args.reset:
        _reset()

    _crear_tablas()
    _crear_triggers()
    _cargar_festivos()

    # Verificacion
    from sqlalchemy import inspect

    inspector = inspect(engine)
    tablas = sorted(inspector.get_table_names())
    print()
    print(f"  Tablas ({len(tablas)}): {', '.join(tablas)}")

    print()
    print("  Base de datos inicializada correctamente.")
    print("=" * 62)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
