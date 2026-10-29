"""Prepara el runtime de Prophet en Windows.

Prophet 1.1.5 empaqueta el runtime de Stan (incluidas las DLL de TBB) dentro de
`prophet/stan_model`, pero cmdstanpy las localiza con `where tbb.dll`, es decir
buscando en el PATH del sistema. En Windows eso hace fallar el entrenamiento con:

    AttributeError: 'Prophet' object has no attribute 'stan_backend'

Este módulo registra las DLL en el proceso actual antes de construir el modelo,
de modo que el entrenamiento funciona en cualquier equipo Windows sin instalar
ni configurar nada a mano.
"""

from __future__ import annotations

import os
import sys
from contextlib import suppress
from pathlib import Path

_configurado = False


def _directorios_con_dll() -> list[Path]:
    """Directorios de Prophet que contienen DLL de Stan/TBB."""
    try:
        import prophet
    except Exception:  # pragma: no cover - prophet no instalado
        return []

    raiz = Path(prophet.__file__).resolve().parent / "stan_model"
    if not raiz.exists():
        return []

    directorios: set[Path] = {raiz}
    for dll in raiz.rglob("*.dll"):
        directorios.add(dll.parent)
    return sorted(directorios)


def configurar_dll_stan() -> list[str]:
    """Registra las DLL de Stan en el proceso. Devuelve los directorios usados.

    Es idempotente: llamarla varias veces no duplica entradas en el PATH.
    """
    global _configurado
    if _configurado:
        return []

    _configurado = True

    if sys.platform != "win32":
        return []

    agregados: list[str] = []
    for directorio in _directorios_con_dll():
        str_dir = str(directorio)
        try:
            os.add_dll_directory(str_dir)
        except (OSError, AttributeError):  # pragma: no cover
            suppress(OSError, AttributeError)
            pass

        path_actual = os.environ.get("PATH", "")
        if str_dir.lower() not in path_actual.lower():
            os.environ["PATH"] = f"{str_dir}{os.pathsep}{path_actual}"

        agregados.append(str_dir)

    return agregados
