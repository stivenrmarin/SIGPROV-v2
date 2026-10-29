"""Métricas de evaluación del modelo Prophet.

Calcula MAPE (Mean Absolute Percentage Error) y MAE (Mean Absolute Error)
comparando predicciones con valores reales.
"""

from __future__ import annotations

import logging
from collections.abc import Iterable
from decimal import Decimal

logger = logging.getLogger(__name__)


def calcular_mape(predicciones: Iterable[dict], reales: Iterable[dict]) -> float:
    """Calcula MAPE entre dos series.

    Args:
        predicciones: iterable de dicts con 'fecha_prediccion' y 'cantidad_predicha'
        reales:      iterable de dicts con 'fecha_prediccion' y 'cantidad_real'

    Returns:
        MAPE en porcentaje (ej. 18.5 = 18.5% error promedio)
    """
    reales_map = {
        (
            r["fecha_prediccion"].isoformat()
            if hasattr(r["fecha_prediccion"], "isoformat")
            else str(r["fecha_prediccion"])
        ): float(r["cantidad_real"])
        for r in reales
    }
    errores = []
    for p in predicciones:
        fecha = (
            p["fecha_prediccion"].isoformat()
            if hasattr(p["fecha_prediccion"], "isoformat")
            else str(p["fecha_prediccion"])
        )
        real = reales_map.get(fecha)
        if real is None or real == 0:
            continue
        pred = float(p["cantidad_predicha"])
        error_pct = abs(pred - real) / real * 100
        errores.append(error_pct)

    if not errores:
        return 0.0
    return sum(errores) / len(errores)


def calcular_mae(predicciones: Iterable[dict], reales: Iterable[dict]) -> Decimal:
    """Calcula MAE en valor absoluto (COP)."""
    reales_map = {
        (
            r["fecha_prediccion"].isoformat()
            if hasattr(r["fecha_prediccion"], "isoformat")
            else str(r["fecha_prediccion"])
        ): float(r["cantidad_real"])
        for r in reales
    }
    errores = []
    for p in predicciones:
        fecha = (
            p["fecha_prediccion"].isoformat()
            if hasattr(p["fecha_prediccion"], "isoformat")
            else str(p["fecha_prediccion"])
        )
        real = reales_map.get(fecha)
        if real is None:
            continue
        errores.append(abs(float(p["cantidad_predicha"]) - real))
    if not errores:
        return Decimal("0")
    return Decimal(str(sum(errores) / len(errores))).quantize(Decimal("1"))


def baseline_promedio(historico: list[float]) -> float:
    """Baseline tonto: predecir el promedio del histórico."""
    if not historico:
        return 0
    return sum(historico) / len(historico)


def comparar_con_baseline(mape_modelo: float, historico: list[float]) -> float:
    """Cuánto mejora el modelo vs el baseline de 'siempre predecir el promedio'.

    Returns:
        Porcentaje de mejora. Positivo = el modelo es mejor.
    """
    if not historico:
        return 0.0
    promedio = sum(historico) / len(historico)
    errores = []
    for v in historico:
        if promedio == 0:
            continue
        errores.append(abs(v - promedio) / promedio * 100)
    if not errores:
        return 0.0
    mape_baseline = sum(errores) / len(errores)
    if mape_baseline == 0:
        return 0.0
    return ((mape_baseline - mape_modelo) / mape_baseline) * 100
