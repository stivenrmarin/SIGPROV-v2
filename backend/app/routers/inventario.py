"""Router de inventario: kardex, alertas, entradas."""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import MovimientoInventario, Producto, StockMateriaPrima
from app.schemas import AlertaStock, MovimientoCreate, MovimientoOut

router = APIRouter()


def _obtener_unidad(db: Session, producto_id: int) -> str:
    p = db.get(Producto, producto_id)
    if not p:
        raise HTTPException(404, "Producto no encontrado")
    return p.unidad


@router.get("/stock")
def stock_actual(db: Session = Depends(get_db)) -> dict:
    """Devuelve stock actual de todos los productos (terminados + materia prima)."""
    productos = (
        db.execute(
            select(Producto)
            .where(Producto.activo.is_(True))
            .order_by(Producto.tipo, Producto.nombre)
        )
        .scalars()
        .all()
    )

    resultado: dict[str, list[dict]] = {
        "terminados": [],
        "materia_prima": [],
    }
    for p in productos:
        item = {
            "id": p.id,
            "nombre": p.nombre,
            "categoria": p.categoria,
            "unidad": p.unidad,
            "stock_minimo": p.stock_minimo,
        }
        if p.tipo == "terminado":
            item["stock_actual"] = p.stock_actual
            resultado["terminados"].append(item)
        else:
            smp = db.get(StockMateriaPrima, p.id)
            item["cantidad_actual"] = float(smp.cantidad_actual) if smp else 0.0
            resultado["materia_prima"].append(item)
    return resultado


@router.get("/alertas", response_model=list[AlertaStock])
def alertas_stock(db: Session = Depends(get_db)) -> list[AlertaStock]:
    """Productos con stock bajo el mínimo (terminados) o en cero (materia prima)."""
    alertas: list[AlertaStock] = []
    productos = db.execute(select(Producto).where(Producto.activo.is_(True))).scalars().all()

    for p in productos:
        if p.tipo == "terminado":
            if p.stock_actual <= p.stock_minimo:
                estado: Literal["critico", "bajo", "ok"] = (
                    "critico" if p.stock_actual == 0 else "bajo"
                )
                alertas.append(
                    AlertaStock(
                        producto_id=p.id,
                        nombre=p.nombre,
                        stock_actual=p.stock_actual,
                        stock_minimo=p.stock_minimo,
                        estado=estado,
                    )
                )
        else:
            smp = db.get(StockMateriaPrima, p.id)
            cant = int(smp.cantidad_actual) if smp else 0
            if cant <= p.stock_minimo:
                estado = "critico" if cant == 0 else "bajo"
                alertas.append(
                    AlertaStock(
                        producto_id=p.id,
                        nombre=p.nombre,
                        stock_actual=cant,
                        stock_minimo=p.stock_minimo,
                        estado=estado,
                    )
                )

    return alertas


@router.get("/kardex", response_model=list[MovimientoOut])
def kardex(
    producto_id: int = Query(...),
    desde: datetime | None = None,
    hasta: datetime | None = None,
    limit: int = Query(100, le=500),
    db: Session = Depends(get_db),
) -> list[MovimientoInventario]:
    stmt = select(MovimientoInventario).where(MovimientoInventario.producto_id == producto_id)
    if desde:
        stmt = stmt.where(MovimientoInventario.created_at >= desde)
    if hasta:
        stmt = stmt.where(MovimientoInventario.created_at <= hasta)
    stmt = stmt.order_by(MovimientoInventario.created_at.desc()).limit(limit)
    return list(db.execute(stmt).scalars().all())


@router.post("/entrada", response_model=MovimientoOut, status_code=201)
def registrar_entrada(
    payload: MovimientoCreate, db: Session = Depends(get_db)
) -> MovimientoInventario:
    """Registra una entrada (compra a proveedor / reposición de stock)."""
    if payload.tipo_movimiento != "entrada":
        raise HTTPException(400, "Este endpoint solo acepta tipo_movimiento='entrada'")
    unidad = _obtener_unidad(db, payload.producto_id)
    mov = MovimientoInventario(
        producto_id=payload.producto_id,
        tipo_movimiento="entrada",
        cantidad=payload.cantidad,
        unidad=unidad,
        motivo=payload.motivo or "Entrada manual",
        referencia=payload.referencia,
    )
    db.add(mov)
    db.commit()
    db.refresh(mov)
    return mov


@router.post("/ajuste", response_model=MovimientoOut, status_code=201)
def registrar_ajuste(
    payload: MovimientoCreate, db: Session = Depends(get_db)
) -> MovimientoInventario:
    """Ajuste por conteo físico: el stock queda en payload.cantidad (valor absoluto)."""
    if payload.tipo_movimiento != "ajuste":
        raise HTTPException(400, "Este endpoint solo acepta tipo_movimiento='ajuste'")
    unidad = _obtener_unidad(db, payload.producto_id)
    mov = MovimientoInventario(
        producto_id=payload.producto_id,
        tipo_movimiento="ajuste",
        cantidad=payload.cantidad,
        unidad=unidad,
        motivo=payload.motivo or "Ajuste por conteo físico",
        referencia=payload.referencia,
    )
    db.add(mov)
    db.commit()
    db.refresh(mov)
    return mov


@router.post("/merma", response_model=MovimientoOut, status_code=201)
def registrar_merma(
    payload: MovimientoCreate, db: Session = Depends(get_db)
) -> MovimientoInventario:
    """Registra merma (producto dañado, vencido, quemado, etc.)."""
    if payload.tipo_movimiento != "merma":
        raise HTTPException(400, "Este endpoint solo acepta tipo_movimiento='merma'")
    unidad = _obtener_unidad(db, payload.producto_id)
    mov = MovimientoInventario(
        producto_id=payload.producto_id,
        tipo_movimiento="merma",
        cantidad=payload.cantidad,
        unidad=unidad,
        motivo=payload.motivo or "Merma",
        referencia=payload.referencia,
    )
    db.add(mov)
    db.commit()
    db.refresh(mov)
    return mov
