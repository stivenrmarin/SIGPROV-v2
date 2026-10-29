"""Servicio de predicción: orquesta entrenamiento + predicciones + métricas."""

from __future__ import annotations

import logging
import threading
from datetime import date

from sqlalchemy import and_, func, select

from app.database import SessionLocal
from app.ml.metrics import calcular_mae, calcular_mape
from app.ml.trainer import (
    PROPHET_DISPONIBLE,
    actualizar_reales,
    entrenar_modelo_total,
    guardar_predicciones,
    predecir_proximos,
)
from app.models import Prediccion

logger = logging.getLogger(__name__)

__all__ = [
    "PROPHET_DISPONIBLE",
    "actualizar_reales",
    "calcular_mae",
    "calcular_mape",
    "entrenar_modelo_total",
    "get_job_status",
    "get_metricas",
    "get_predicciones_proximas",
    "guardar_predicciones",
    "iniciar_entrenamiento_async",
    "predecir_proximos",
]


# Jobs en background (un dict thread-safe básico)
_JOBS: dict[str, dict] = {}


def _run_entrenamiento_job(job_id: str) -> None:
    """Ejecuta el entrenamiento en background."""
    try:
        _JOBS[job_id] = {"status": "running", "progress": 10}
        db = SessionLocal()
        try:
            _JOBS[job_id]["progress"] = 30
            modelo_dict = entrenar_modelo_total(db, dias_historico=365)
            if modelo_dict is None:
                _JOBS[job_id] = {"status": "failed", "error": "Datos insuficientes"}
                return

            _JOBS[job_id]["progress"] = 70
            predicciones = predecir_proximos(modelo_dict, dias=7)
            guardar_predicciones(db, predicciones, modelo_dict["version"])

            _JOBS[job_id] = {
                "status": "completed",
                "progress": 100,
                "version": modelo_dict["version"],
                "datos_entrenamiento": modelo_dict["datos_entrenamiento"],
                "festivos_cargados": modelo_dict["festivos_cargados"],
            }
        finally:
            db.close()
    except Exception as e:
        logger.exception("Error en entrenamiento")
        _JOBS[job_id] = {"status": "failed", "error": str(e)}


def iniciar_entrenamiento_async() -> str:
    """Lanza el entrenamiento en background thread. Devuelve job_id."""
    job_id = f"job-{date.today().isoformat()}-{hash(str(_JOBS)) % 10000}"
    _JOBS[job_id] = {"status": "pending", "progress": 0}
    thread = threading.Thread(target=_run_entrenamiento_job, args=(job_id,), daemon=True)
    thread.start()
    return job_id


def get_job_status(job_id: str) -> dict:
    return _JOBS.get(job_id, {"status": "not_found"})


def get_predicciones_proximas(dias: int = 7, producto_id: int | None = None) -> list[dict]:
    """Devuelve las predicciones de los próximos N días (las más recientes en BD)."""
    db = SessionLocal()
    try:
        # Tomar las predicciones más recientes de cada fecha
        fechas = db.execute(
            select(Prediccion.fecha_prediccion, func.max(Prediccion.created_at).label("last"))
            .where(
                Prediccion.producto_id.is_(None)
                if producto_id is None
                else Prediccion.producto_id == producto_id
            )
            .group_by(Prediccion.fecha_prediccion)
            .order_by(Prediccion.fecha_prediccion)
            .limit(dias)
        ).all()

        results = []
        for f, _ in fechas:
            pred = db.execute(
                select(Prediccion)
                .where(
                    and_(
                        Prediccion.fecha_prediccion == f,
                        (
                            Prediccion.producto_id.is_(None)
                            if producto_id is None
                            else Prediccion.producto_id == producto_id
                        ),
                    )
                )
                .order_by(Prediccion.created_at.desc())
                .limit(1)
            ).scalar_one_or_none()
            if pred:
                results.append(
                    {
                        "fecha_prediccion": pred.fecha_prediccion.isoformat(),
                        "cantidad_predicha": float(pred.cantidad_predicha),
                        "limite_inferior": float(pred.limite_inferior),
                        "limite_superior": float(pred.limite_superior),
                        "modelo_version": pred.modelo_version,
                    }
                )
        return results
    finally:
        db.close()


def get_metricas() -> dict:
    """Calcula MAPE y MAE sobre predicciones ya evaluadas (con cantidad_real)."""
    db = SessionLocal()
    try:
        # Actualizar reales primero
        actualizar_reales(db)

        # Obtener predicciones evaluadas
        evaluadas = (
            db.execute(select(Prediccion).where(Prediccion.cantidad_real.isnot(None)).limit(100))
            .scalars()
            .all()
        )

        if not evaluadas:
            return {
                "mape": None,
                "mae": None,
                "n_predicciones_evaluadas": 0,
                "ultima_actualizacion": None,
            }

        preds = [
            {"fecha_prediccion": p.fecha_prediccion, "cantidad_predicha": p.cantidad_predicha}
            for p in evaluadas
        ]
        reales = [
            {"fecha_prediccion": p.fecha_prediccion, "cantidad_real": p.cantidad_real}
            for p in evaluadas
        ]

        mape = calcular_mape(preds, reales)
        mae = calcular_mae(preds, reales)

        return {
            "mape": round(mape, 2),
            "mae": float(mae),
            "n_predicciones_evaluadas": len(evaluadas),
            "ultima_actualizacion": max(p.created_at for p in evaluadas).isoformat(),
        }
    finally:
        db.close()
