"""Verificacion F0: el pipeline de ML realmente entrena y predice.

Genera una serie diaria con tendencia + estacionalidad semanal + ruido,
entrena Prophet, evalua el MAPE sobre el ultimo tramo y comprueba que
las metricas de app/ml/metrics.py calculan bien.
"""

from __future__ import annotations

import sys
import warnings
from pathlib import Path

warnings.filterwarnings("ignore")

import numpy as np
import pandas as pd

BACKEND = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND))

from app.ml.metrics import (  # noqa: E402
    baseline_promedio,
    calcular_mae,
    calcular_mape,
    comparar_con_baseline,
)


def serie_demo(dias: int = 365, semilla: int = 7) -> pd.DataFrame:
    """Serie con tendencia, estacionalidad semanal, anual y ruido."""
    rng = np.random.default_rng(semilla)
    fechas = pd.date_range("2025-01-01", periods=dias, freq="D")
    t = np.arange(dias)

    tendencia = 300 + t * 0.08
    semanal = np.where(fechas.dayofweek >= 5, -90, 0)  # finde baja
    anual = 60 * np.sin(2 * np.pi * t / 365)
    ruido = rng.normal(0, 18, dias)

    valores = tendencia + semanal + anual + ruido
    return pd.DataFrame({"ds": fechas, "y": np.clip(valores, 40, None)})


def main() -> int:
    print("=" * 62)
    print("  VERIFICACION ML - Prophet + metricas")
    print("=" * 62)

    df = serie_demo()

    # Corte temporal: 300 dias de entrenamiento, 65 de prueba
    corte = len(df) - 65
    train = df.iloc[:corte].copy()
    test = df.iloc[corte:].copy()

    print(f"\n  Serie: {len(df)} dias | train: {len(train)} | test: {len(test)}")

    print("\n  [1] Entrenando Prophet...")
    from prophet import Prophet

    modelo = Prophet(
        yearly_seasonality=True,
        weekly_seasonality=True,
        daily_seasonality=False,
        changepoint_prior_scale=0.05,
        interval_width=0.95,
    )
    modelo.fit(train[["ds", "y"]])
    print("      OK - modelo entrenado")

    print("\n  [2] Prediciendo...")
    futuro = modelo.predict(test[["ds"]])
    print("      OK - predicciones generadas")

    print("\n  [3] Calculando metricas con app/ml/metrics.py...")
    real = test["y"].to_numpy()
    pred = futuro["yhat"].to_numpy()

    # metrics.py trabaja con el formato de la tabla predicciones
    predicciones = [
        {
            "fecha_prediccion": ds.date(),
            "cantidad_predicha": float(yhat),
        }
        for ds, yhat in zip(futuro["ds"], futuro["yhat"], strict=False)
    ]
    reales = [
        {
            "fecha_prediccion": ds.date(),
            "cantidad_real": float(y),
        }
        for ds, y in zip(test["ds"], test["y"], strict=False)
    ]

    mape = calcular_mape(predicciones, reales)
    mae = calcular_mae(predicciones, reales)
    rmse = float(np.sqrt(np.mean((real - pred) ** 2)))
    print(f"      MAPE = {mape:.2f}%   MAE = {mae} COP   RMSE = {rmse:.2f}")

    print("\n  [4] Comparacion contra baseline (promedio historico)...")
    historico = train["y"].tolist()
    mejora = comparar_con_baseline(mape, historico)
    print(
        f"      Baseline MAPE ~{mape / (1 + mejora / 100) if mejora != -100 else float('nan'):.2f}%"
    )
    print(f"      Mejora del modelo: {mejora:.1f}%")
    print(f"      Baseline (promedio): {baseline_promedio(historico):.1f} unidades/dia")

    print("\n" + "=" * 62)
    if mape < 15:
        print(f"  RESULTADO: [OK] MAPE {mape:.2f}% < 15% objetivo alcanzado")
        print("=" * 62)
        return 0
    print(f"  RESULTADO: [FALLA] MAPE {mape:.2f}% >= 15%")
    print("=" * 62)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
