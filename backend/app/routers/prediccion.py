"""Router de predicción: endpoints ML con Prophet."""

from __future__ import annotations

from datetime import date as _date
from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import DetalleVenta, Prediccion, Producto, Venta
from app.services import prediccion_service

router = APIRouter()


@router.post("/entrenar")
def entrenar():
    """Lanza el reentrenamiento del modelo Prophet en background."""
    if not prediccion_service.PROPHET_DISPONIBLE:
        return {
            "status": "warning",
            "message": "Prophet no está instalado. Ejecuta: pip install prophet",
        }
    job_id = prediccion_service.iniciar_entrenamiento_async()
    return {"job_id": job_id, "status": "pending"}


@router.get("/entrenar/{job_id}")
def estado_entrenamiento(job_id: str) -> dict:
    return prediccion_service.get_job_status(job_id)


@router.get("/proxima-semana")
def prediccion_proxima_semana(db: Session = Depends(get_db)) -> dict:
    """Predicción de los próximos 7 días (total del local)."""
    try:
        preds = prediccion_service.get_predicciones_proximas(dias=7)
        if not preds:
            return {
                "desde": (_date.today() + timedelta(days=1)).isoformat(),
                "hasta": (_date.today() + timedelta(days=7)).isoformat(),
                "predicciones": [],
                "modelo_version": "sin_datos",
                "message": "Aún no hay predicciones. Ejecuta POST /api/prediccion/entrenar primero.",
            }
        return {
            "desde": preds[0]["fecha_prediccion"],
            "hasta": preds[-1]["fecha_prediccion"],
            "predicciones": preds,
            "modelo_version": preds[0]["modelo_version"] if preds else "unknown",
        }
    except Exception as e:
        raise HTTPException(500, f"Error en predicción: {e}") from e


@router.get("/producto/{producto_id}")
def prediccion_por_producto(
    producto_id: int,
    dias: int = Query(7, ge=1, le=30),
    db: Session = Depends(get_db),
) -> dict:
    """Predicción por producto (cantidad estimada a vender)."""
    producto = db.get(Producto, producto_id)
    if not producto:
        raise HTTPException(404, "Producto no encontrado")

    # Para simplificar, devolvemos la predicción del total
    # ponderada por la participación histórica del producto.
    total_pred = prediccion_service.get_predicciones_proximas(dias=dias)

    # Participación del producto en las últimas ventas
    participacion = _participacion_producto(db, producto_id)

    # Predicciones del producto: total del local ponderado por su participacion
    predicciones_producto = [
        {
            **p,
            "cantidad_predicha": round(float(p.get("cantidad_predicha", 0)) * participacion, 2),
        }
        for p in total_pred
    ]

    return {
        "producto_id": producto_id,
        "nombre": producto.nombre,
        "dias": dias,
        "participacion_historica": round(participacion, 4),
        "predicciones": predicciones_producto,
        "modelo_version": total_pred[0]["modelo_version"] if total_pred else "unknown",
        "message": (
            "Predicción del producto: total del local ponderado por la participación "
            "histórica del producto en las unidades vendidas."
        ),
    }


def _participacion_producto(db: Session, producto_id: int) -> float:
    """Fracción de las unidades vendidas que corresponde al producto (0.0 - 1.0)."""
    por_producto = (
        select(
            DetalleVenta.producto_id.label("producto_id"),
            func.sum(DetalleVenta.cantidad).label("cantidad"),
        )
        .join(Venta)
        .group_by(DetalleVenta.producto_id)
        .subquery()
    )

    total = db.execute(select(func.sum(por_producto.c.cantidad))).scalar() or 0
    if not total:
        return 0.0

    del_producto = (
        db.execute(
            select(por_producto.c.cantidad).where(por_producto.c.producto_id == producto_id)
        ).scalar()
        or 0
    )

    return float(del_producto) / float(total)


@router.get("/metricas")
def metricas() -> dict:
    """MAPE, MAE y número de predicciones evaluadas."""
    return prediccion_service.get_metricas()


@router.get("/historial-metricas")
def historial_metricas(db: Session = Depends(get_db)) -> list[dict]:
    """Histórico día a día de error del modelo."""
    rows = (
        db.execute(
            select(Prediccion)
            .where(Prediccion.cantidad_real.isnot(None))
            .order_by(Prediccion.fecha_prediccion.desc())
            .limit(90)
        )
        .scalars()
        .all()
    )

    return [
        {
            "fecha_prediccion": p.fecha_prediccion.isoformat(),
            "cantidad_predicha": float(p.cantidad_predicha or 0),
            "cantidad_real": float(p.cantidad_real or 0),
            "error_pct": float(p.error_pct) if p.error_pct is not None else None,
            "modelo_version": p.modelo_version,
        }
        for p in rows
    ]
