"""Router de ventas: registrar venta + consultas."""

from __future__ import annotations

from datetime import date, datetime, timedelta
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import and_, func, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import DetalleVenta, Producto, Venta
from app.schemas import ResumenHoy, VentaCreate, VentaOut

router = APIRouter()


@router.post("/", response_model=VentaOut, status_code=201)
def registrar_venta(payload: VentaCreate, db: Session = Depends(get_db)) -> Venta:
    """Registra una venta. Los triggers de PostgreSQL se encargan de:
    - Validar stock del producto
    - Descontar stock del producto vendido
    - Descontar materia prima segun receta
    """
    # Validar que todos los productos sean tipo='terminado' y obtener precio actual
    items_data: list[dict] = []
    for item in payload.items:
        producto = db.get(Producto, item.producto_id)
        if not producto:
            raise HTTPException(404, f"Producto {item.producto_id} no existe")
        if producto.tipo != "terminado":
            raise HTTPException(
                400,
                f"Producto '{producto.nombre}' es materia prima, no se vende directo",
            )
        if not producto.activo:
            raise HTTPException(400, f"Producto '{producto.nombre}' está inactivo")
        if producto.precio_venta is None:
            raise HTTPException(400, f"Producto '{producto.nombre}' sin precio de venta")

        items_data.append(
            {
                "producto": producto,
                "cantidad": item.cantidad,
                "precio_unitario": producto.precio_venta,
                "subtotal": producto.precio_venta * item.cantidad,
            }
        )

    total = sum(d["subtotal"] for d in items_data)

    venta = Venta(
        total=total,
        metodo_pago=payload.metodo_pago,
        notas=payload.notas,
    )
    db.add(venta)
    db.flush()  # para tener venta.id

    for d in items_data:
        db.add(
            DetalleVenta(
                venta_id=venta.id,
                producto_id=d["producto"].id,
                cantidad=d["cantidad"],
                precio_unitario=d["precio_unitario"],
                subtotal=d["subtotal"],
            )
        )
        # Los triggers en PostgreSQL:
        # 1. Valida stock del producto
        # 2. Descuenta stock (movimiento 'salida')
        # 3. Descuenta materia prima segun receta (movimientos 'consumo_produccion')

    try:
        db.commit()
    except Exception as e:
        db.rollback()
        # Los triggers lanzan RAISE EXCEPTION; FastAPI lo convierte en 500.
        # Lo capturamos y devolvemos 400 con mensaje legible.
        msg = str(e).split("\n")[0] if "\n" in str(e) else str(e)
        raise HTTPException(400, f"No se pudo registrar la venta: {msg}") from e

    db.refresh(venta)
    return venta


@router.get("/", response_model=list[VentaOut])
def listar_ventas(
    desde: datetime | None = None,
    hasta: datetime | None = None,
    limit: int = Query(100, le=500),
    db: Session = Depends(get_db),
) -> list[Venta]:
    stmt = select(Venta)
    if desde:
        stmt = stmt.where(Venta.fecha >= desde)
    if hasta:
        stmt = stmt.where(Venta.fecha <= hasta)
    stmt = stmt.order_by(Venta.fecha.desc()).limit(limit)
    return list(db.execute(stmt).scalars().all())


@router.get("/resumen/hoy", response_model=ResumenHoy)
def resumen_hoy(db: Session = Depends(get_db)) -> ResumenHoy:
    hoy_inicio = datetime.combine(date.today(), datetime.min.time())
    hoy_fin = datetime.combine(date.today(), datetime.max.time())

    total, count = db.execute(
        select(func.coalesce(func.sum(Venta.total), 0), func.count(Venta.id)).where(
            and_(Venta.fecha >= hoy_inicio, Venta.fecha <= hoy_fin)
        )
    ).one()

    ayer_inicio = datetime.combine(date.today() - timedelta(days=1), datetime.min.time())
    ayer_fin = datetime.combine(date.today() - timedelta(days=1), datetime.max.time())
    total_ayer, _ = db.execute(
        select(func.coalesce(func.sum(Venta.total), 0), func.count(Venta.id)).where(
            and_(Venta.fecha >= ayer_inicio, Venta.fecha <= ayer_fin)
        )
    ).one()

    ticket_promedio = Decimal(total) / Decimal(count) if count > 0 else Decimal("0")

    vs_ayer = Decimal("0")
    if total_ayer and total_ayer > 0:
        vs_ayer = ((Decimal(total) - Decimal(total_ayer)) / Decimal(total_ayer)) * Decimal("100")

    return ResumenHoy(
        fecha=date.today(),
        total_vendido=Decimal(total),
        num_ventas=count,
        ticket_promedio=ticket_promedio,
        vs_ayer_pct=vs_ayer.quantize(Decimal("0.01")),
    )


@router.get("/resumen/rango")
def resumen_rango(
    desde: date = Query(...),
    hasta: date = Query(...),
    db: Session = Depends(get_db),
) -> dict:
    desde_dt = datetime.combine(desde, datetime.min.time())
    hasta_dt = datetime.combine(hasta, datetime.max.time())

    ventas = db.execute(
        select(Venta.fecha, Venta.total).where(
            and_(Venta.fecha >= desde_dt, Venta.fecha <= hasta_dt)
        )
    ).all()

    # Agrupar por dia
    por_dia: dict[str, Decimal] = {}
    for f, t in ventas:
        key = f.date().isoformat()
        por_dia[key] = por_dia.get(key, Decimal("0")) + Decimal(t)

    return {
        "desde": desde.isoformat(),
        "hasta": hasta.isoformat(),
        "total": sum(por_dia.values()),
        "num_ventas": len(ventas),
        "por_dia": [{"fecha": k, "total": float(v)} for k, v in sorted(por_dia.items())],
    }


@router.get("/{venta_id}", response_model=VentaOut)
def obtener_venta(venta_id: int, db: Session = Depends(get_db)) -> Venta:
    venta = db.get(Venta, venta_id)
    if not venta:
        raise HTTPException(404, "Venta no encontrada")
    return venta
