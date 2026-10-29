"""Módulo de Machine Learning: entrenamiento, predicción y métricas.

Importar este paquete prepara el runtime de Prophet (necesario en Windows).
"""

from app.ml._entorno import configurar_dll_stan

configurar_dll_stan()

__all__ = ["configurar_dll_stan"]
