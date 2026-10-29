"""Router de dashboard: agregaciones para la UI del dueño."""

from __future__ import annotations

from datetime import date, datetime, timedelta
from decimal import Decimal

from fastapi import APIRouter, Depends
from sqlalchemy import and_, func, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import (
    CalendarioFestivo,
    DetalleVenta,
    Producto,
    Venta,
)

router = APIRouter()


@router.get("/resumen")
def resumen_dashboard(db: Session = Depends(get_db)) -> dict:
    """KPIs principales para la pantalla 'Hoy'."""
    hoy = date.today()
    hoy_inicio = datetime.combine(hoy, datetime.min.time())
    hoy_fin = datetime.combine(hoy, datetime.max.time())

    total_hoy, count_hoy = db.execute(
        select(func.coalesce(func.sum(Venta.total), 0), func.count(Venta.id)).where(
            and_(Venta.fecha >= hoy_inicio, Venta.fecha <= hoy_fin)
        )
    ).one()

    # Ventas ayer para comparación
    ayer = hoy - timedelta(days=1)
    ayer_inicio = datetime.combine(ayer, datetime.min.time())
    ayer_fin = datetime.combine(ayer, datetime.max.time())
    total_ayer = db.execute(
        select(func.coalesce(func.sum(Venta.total), 0)).where(
            and_(Venta.fecha >= ayer_inicio, Venta.fecha <= ayer_fin)
        )
    ).scalar()

    # Productos con stock bajo
    productos_bajo = 0
    productos = db.execute(select(Producto).where(Producto.activo.is_(True))).scalars().all()
    for p in productos:
        if p.tipo == "terminado" and p.stock_actual <= p.stock_minimo:
            productos_bajo += 1

    # ¿Es hoy festivo?
    festivo_hoy = db.get(CalendarioFestivo, hoy)

    ticket_promedio = Decimal(total_hoy) / Decimal(count_hoy) if count_hoy > 0 else Decimal("0")
    vs_ayer = Decimal("0")
    if total_ayer and total_ayer > 0:
        vs_ayer = ((Decimal(total_hoy) - Decimal(total_ayer)) / Decimal(total_ayer)) * Decimal(
            "100"
        )

    return {
        "fecha": hoy.isoformat(),
        "total_vendido": float(total_hoy),
        "num_ventas": count_hoy,
        "ticket_promedio": float(ticket_promedio),
        "vs_ayer_pct": float(vs_ayer.quantize(Decimal("0.01"))),
        "productos_stock_bajo": productos_bajo,
        "es_festivo": festivo_hoy is not None,
        "nombre_festivo": festivo_hoy.nombre if festivo_hoy else None,
    }


@router.get("/semana")
def semana_dashboard(db: Session = Depends(get_db)) -> dict:
    """Histórico últimos 7 días + predicción próximos 7 días."""
    hoy = date.today()

    # Últimos 7 días
    desde_historico = hoy - timedelta(days=6)
    desde_dt = datetime.combine(desde_historico, datetime.min.time())
    hasta_dt = datetime.combine(hoy, datetime.max.time())

    ventas = db.execute(
        select(Venta.fecha, Venta.total).where(
            and_(Venta.fecha >= desde_dt, Venta.fecha <= hasta_dt)
        )
    ).all()

    por_dia: dict[str, Decimal] = {}
    for f, t in ventas:
        key = f.date().isoformat()
        por_dia[key] = por_dia.get(key, Decimal("0")) + Decimal(t)

    historico = []
    for i in range(7):
        d = desde_historico + timedelta(days=i)
        total = por_dia.get(d.isoformat(), Decimal("0"))
        festivo = db.get(CalendarioFestivo, d)
        historico.append(
            {
                "fecha": d.isoformat(),
                "total": float(total),
                "es_festivo": festivo is not None,
                "nombre_festivo": festivo.nombre if festivo else None,
            }
        )

    # Predicción próximos 7 días (placeholder — Fase 2 implementa ML)
    prediccion = []
    for i in range(1, 8):
        d = hoy + timedelta(days=i)
        festivo = db.get(CalendarioFestivo, d)
        prediccion.append(
            {
                "fecha": d.isoformat(),
                "total": None,
                "es_festivo": festivo is not None,
                "nombre_festivo": festivo.nombre if festivo else None,
                "limite_inferior": None,
                "limite_superior": None,
                "es_prediccion": True,
            }
        )

    return {
        "historico_7_dias": historico,
        "prediccion_7_dias": prediccion,
        "modelo_version": "pendiente_fase_2",
    }


@router.get("/top-productos")
def top_productos(dias: int = 30, db: Session = Depends(get_db)) -> list[dict]:
    """Top 10 productos más vendidos en los últimos N días."""
    desde = date.today() - timedelta(days=dias)
    desde_dt = datetime.combine(desde, datetime.min.time())

    resultados = db.execute(
        select(
            Producto.id,
            Producto.nombre,
            Producto.categoria,
            func.sum(DetalleVenta.cantidad).label("cantidad_total"),
            func.sum(DetalleVenta.subtotal).label("ingresos_total"),
        )
        .join(DetalleVenta, DetalleVenta.producto_id == Producto.id)
        .join(Venta, Venta.id == DetalleVenta.venta_id)
        .where(Venta.fecha >= desde_dt)
        .group_by(Producto.id, Producto.nombre, Producto.categoria)
        .order_by(func.sum(DetalleVenta.cantidad).desc())
        .limit(10)
    ).all()

    return [
        {
            "producto_id": r.id,
            "nombre": r.nombre,
            "categoria": r.categoria,
            "cantidad_vendida": int(r.cantidad_total),
            "ingresos": float(r.ingresos_total),
        }
        for r in resultados
    ]
