"""Levanta el backend SIGPROV para el modo empaquetado (Electron).

Se invoca desde electron/main.ts cuando no hay ningun servidor escuchando
en 127.0.0.1:8000. El proceso se cierra solo cuando Electron termina.

Uso:
    python run_backend.py
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

BACKEND = Path(__file__).resolve().parent
sys.path.insert(0, str(BACKEND))


def main() -> int:
    try:
        import uvicorn
    except ImportError:
        print("[SIGPROV] uvicorn no esta instalado: pip install -r requirements.txt")
        return 1

    os.environ.setdefault("SIGPROV_ENVIRONMENT", "local")
    os.environ.setdefault("SIGPROV_DB_DRIVER", "sqlite")

    print("[SIGPROV] Iniciando backend en 127.0.0.1:8000 ...")
    uvicorn.run(
        "app.main:app",
        host="127.0.0.1",
        port=8000,
        log_level="warning",
        access_log=False,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
