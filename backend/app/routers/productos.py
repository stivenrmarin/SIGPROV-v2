"""Router de productos: CRUD + recetas."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Producto, Receta, StockMateriaPrima
from app.schemas import ProductoCreate, ProductoOut, ProductoUpdate, RecetaItem, RecetaReplace

router = APIRouter()


@router.get("/", response_model=list[ProductoOut])
def listar_productos(
    tipo: str | None = Query(None, description="Filtrar por tipo: terminado | materia_prima"),
    categoria: str | None = Query(None),
    activo: bool | None = Query(True),
    busqueda: str | None = Query(None, description="Buscar por nombre (ILIKE)"),
    db: Session = Depends(get_db),
) -> list[Producto]:
    stmt = select(Producto)
    if activo is not None:
        stmt = stmt.where(Producto.activo == activo)
    if tipo:
        stmt = stmt.where(Producto.tipo == tipo)
    if categoria:
        stmt = stmt.where(Producto.categoria == categoria)
    if busqueda:
        stmt = stmt.where(Producto.nombre.ilike(f"%{busqueda}%"))
    stmt = stmt.order_by(Producto.tipo, Producto.categoria, Producto.nombre)
    return list(db.execute(stmt).scalars().all())


@router.post("/", response_model=ProductoOut, status_code=status.HTTP_201_CREATED)
def crear_producto(payload: ProductoCreate, db: Session = Depends(get_db)) -> Producto:
    # Validación: si es terminado, debe tener precio_venta
    if payload.tipo == "terminado" and payload.precio_venta is None:
        raise HTTPException(400, "Productos terminados requieren precio_venta")

    existente = db.execute(
        select(Producto).where(Producto.nombre == payload.nombre)
    ).scalar_one_or_none()
    if existente:
        raise HTTPException(409, f"Ya existe un producto con nombre '{payload.nombre}'")

    producto = Producto(**payload.model_dump())
    db.add(producto)
    db.flush()

    # Si es materia prima, crear registro de stock
    if producto.tipo == "materia_prima":
        db.add(StockMateriaPrima(producto_id=producto.id, cantidad_actual=0))

    db.commit()
    db.refresh(producto)
    return producto


@router.get("/{producto_id}", response_model=ProductoOut)
def obtener_producto(producto_id: int, db: Session = Depends(get_db)) -> Producto:
    producto = db.get(Producto, producto_id)
    if not producto:
        raise HTTPException(404, "Producto no encontrado")
    return producto


@router.patch("/{producto_id}", response_model=ProductoOut)
def actualizar_producto(
    producto_id: int, payload: ProductoUpdate, db: Session = Depends(get_db)
) -> Producto:
    producto = db.get(Producto, producto_id)
    if not producto:
        raise HTTPException(404, "Producto no encontrado")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(producto, k, v)
    db.commit()
    db.refresh(producto)
    return producto


@router.delete("/{producto_id}", status_code=status.HTTP_204_NO_CONTENT, response_class=Response)
def eliminar_producto(producto_id: int, db: Session = Depends(get_db)) -> Response:
    producto = db.get(Producto, producto_id)
    if not producto:
        raise HTTPException(404, "Producto no encontrado")
    producto.activo = False
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ---------- Recetas ----------
@router.get("/{producto_id}/receta", response_model=list[RecetaItem])
def obtener_receta(producto_id: int, db: Session = Depends(get_db)) -> list[RecetaItem]:
    producto = db.get(Producto, producto_id)
    if not producto:
        raise HTTPException(404, "Producto no encontrado")
    if producto.tipo != "terminado":
        raise HTTPException(400, "Solo los productos terminados tienen receta")

    items = (
        db.execute(select(Receta).where(Receta.producto_terminado_id == producto_id))
        .scalars()
        .all()
    )

    return [
        RecetaItem(materia_prima_id=r.materia_prima_id, cantidad_necesaria=r.cantidad_necesaria)
        for r in items
    ]


@router.put("/{producto_id}/receta")
def reemplazar_receta(
    producto_id: int, payload: RecetaReplace, db: Session = Depends(get_db)
) -> dict:
    producto = db.get(Producto, producto_id)
    if not producto:
        raise HTTPException(404, "Producto no encontrado")
    if producto.tipo != "terminado":
        raise HTTPException(400, "Solo productos terminados tienen receta")

    # Validar que todas las MPs existan y sean materia_prima
    mp_ids = [item.materia_prima_id for item in payload.items]
    if mp_ids:
        mps = db.execute(select(Producto).where(Producto.id.in_(mp_ids))).scalars().all()
        for mp in mps:
            if mp.tipo != "materia_prima":
                raise HTTPException(
                    400,
                    f"Producto {mp.id} ({mp.nombre}) no es materia prima",
                )

    # Borrar receta anterior y crear la nueva
    db.query(Receta).filter(Receta.producto_terminado_id == producto_id).delete()
    for item in payload.items:
        db.add(
            Receta(
                producto_terminado_id=producto_id,
                materia_prima_id=item.materia_prima_id,
                cantidad_necesaria=item.cantidad_necesaria,
            )
        )
    db.commit()
    return {"producto_id": producto_id, "items": len(payload.items), "ok": True}
