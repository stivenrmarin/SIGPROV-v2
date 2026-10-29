"""Entrenador del modelo Prophet para forecasting de ventas.

Entrena un modelo Prophet por serie (local total + por producto).
Incluye los festivos colombianos como holidays con efecto negativo.
"""

from __future__ import annotations

import logging
import pickle
from datetime import date, timedelta
from decimal import Decimal
from pathlib import Path

import pandas as pd
from sqlalchemy import and_, func, select
from sqlalchemy.orm import Session

from app.config import settings
from app.ml._entorno import configurar_dll_stan
from app.models import (
    CalendarioFestivo,
    Prediccion,
    Venta,
)

logger = logging.getLogger(__name__)

# En Windows las DLL de Stan/TBB vienen dentro de prophet/stan_model y hay que
# registrarlas antes de construir el modelo.
configurar_dll_stan()

try:
    from prophet import Prophet  # noqa: F401

    PROPHET_DISPONIBLE = True
except (ImportError, AttributeError, Exception) as e:
    # AttributeError cuando prophet es incompatible con numpy 2.x (np.float_ removed)
    logger.warning(f"Prophet no disponible ({type(e).__name__}: {e}). Fallback a mocks.")
    PROPHET_DISPONIBLE = False
    Prophet = None


def _cargar_historico_total(db: Session, dias: int = 365) -> pd.DataFrame:
    """Carga el histórico diario de ventas totales del local."""
    desde = date.today() - timedelta(days=dias)
    rows = db.execute(
        select(func.date(Venta.fecha).label("fecha"), func.sum(Venta.total).label("total"))
        .where(Venta.fecha >= desde)
        .group_by(func.date(Venta.fecha))
    ).all()
    df = pd.DataFrame(rows, columns=["ds", "y"])
    df["ds"] = pd.to_datetime(df["ds"])
    return df


def _cargar_festivos_prophet(db: Session) -> pd.DataFrame:
    """Carga los festivos en el formato que espera Prophet (holidays dataframe)."""
    rows = db.execute(select(CalendarioFestivo)).scalars().all()
    holidays = []
    for f in rows:
        # Prophet espera lower_window / upper_window (días afectados antes/después)
        holidays.append(
            {
                "holiday": "festivo_colombia",
                "ds": pd.to_datetime(f.fecha),
                "lower_window": -1,
                "upper_window": 1,
            }
        )
    return pd.DataFrame(holidays)


def entrenar_modelo_total(db: Session, dias_historico: int = 365) -> dict | None:
    """Entrena el modelo Prophet con el histórico del local.

    Returns:
        Dict con info del modelo entrenado o None si no hay datos.
    """
    if not PROPHET_DISPONIBLE:
        logger.error("Prophet no disponible. Instala: pip install prophet")
        return None

    df = _cargar_historico_total(db, dias=dias_historico)
    if len(df) < settings.ml_min_dias_entrenamiento:
        logger.warning(
            f"Solo {len(df)} días de histórico, mínimo {settings.ml_min_dias_entrenamiento}"
        )
        return None

    holidays = _cargar_festivos_prophet(db)

    modelo = Prophet(
        yearly_seasonality=True,
        weekly_seasonality=True,
        daily_seasonality=False,
        holidays=holidays,
        holidays_prior_scale=10.0,  # peso fuerte a los festivos
        changepoint_prior_scale=0.05,
        interval_width=0.95,
    )
    modelo.fit(df)

    return {
        "modelo": modelo,
        "datos_entrenamiento": len(df),
        "festivos_cargados": len(holidays),
        "version": f"prophet-{date.today().isoformat()}-v1",
    }


def predecir_proximos(modelo_dict: dict, dias: int = 7) -> pd.DataFrame:
    """Genera predicciones para los próximos N días."""
    modelo = modelo_dict["modelo"]
    future = modelo.make_future_dataframe(periods=dias)
    forecast = modelo.predict(future)

    # Solo los últimos N días
    pred = forecast.tail(dias)[["ds", "yhat", "yhat_lower", "yhat_upper"]].copy()
    pred.columns = ["fecha_prediccion", "cantidad_predicha", "limite_inferior", "limite_superior"]
    pred["fecha_prediccion"] = pred["fecha_prediccion"].dt.date
    pred["cantidad_predicha"] = pred["cantidad_predicha"].clip(lower=0).round(2)
    pred["limite_inferior"] = pred["limite_inferior"].clip(lower=0).round(2)
    pred["limite_superior"] = pred["limite_superior"].clip(lower=0).round(2)
    return pred


def guardar_predicciones(db: Session, predicciones: pd.DataFrame, modelo_version: str) -> int:
    """Persiste las predicciones en la tabla `predicciones` para evaluación posterior."""
    count = 0
    for _, row in predicciones.iterrows():
        p = Prediccion(
            fecha_prediccion=row["fecha_prediccion"],
            producto_id=None,  # NULL = total del local
            cantidad_predicha=Decimal(str(row["cantidad_predicha"])),
            limite_inferior=Decimal(str(row["limite_inferior"])),
            limite_superior=Decimal(str(row["limite_superior"])),
            modelo_version=modelo_version,
        )
        db.add(p)
        count += 1
    db.commit()
    return count


def actualizar_reales(db: Session) -> int:
    """Al final del día, cuando se conocen las ventas reales,
    actualiza la tabla predicciones con cantidad_real y error_pct.
    """

    pendientes = (
        db.execute(
            select(Prediccion).where(
                and_(
                    Prediccion.cantidad_real.is_(None), Prediccion.fecha_prediccion <= date.today()
                )
            )
        )
        .scalars()
        .all()
    )

    count = 0
    for pred in pendientes:
        real = db.execute(
            select(func.coalesce(func.sum(Venta.total), 0)).where(
                func.date(Venta.fecha) == pred.fecha_prediccion
            )
        ).scalar()
        pred.cantidad_real = Decimal(str(real))
        if real and real > 0:
            pred.error_pct = Decimal(
                str(abs(float(pred.cantidad_predicha) - float(real)) / float(real) * 100)
            ).quantize(Decimal("0.01"))
        count += 1

    db.commit()
    return count


def guardar_modelo_pickle(modelo_dict: dict) -> Path:
    """Guarda el modelo entrenado como pickle para reutilizarlo sin reentrenar."""
    settings.ml_model_dir.mkdir(parents=True, exist_ok=True)
    path = settings.ml_model_dir / f"{modelo_dict['version']}.pkl"
    with path.open("wb") as f:
        pickle.dump(modelo_dict, f)
    return path


def cargar_ultimo_modelo() -> dict | None:
    """Carga el último modelo entrenado desde disco."""
    if not settings.ml_model_dir.exists():
        return None
    pickles = sorted(settings.ml_model_dir.glob("prophet-*.pkl"), reverse=True)
    if not pickles:
        return None
    try:
        with pickles[0].open("rb") as f:
            return pickle.load(f)
    except Exception as e:
        logger.error(f"Error cargando modelo: {e}")
        return None
