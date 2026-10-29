"""Prueba funcional de los triggers de stock.

Verifica el ciclo completo de inventario:
  1. Registrar stock inicial (materia prima)
  2. Vender un producto terminado
  3. Comprobar que se descontó el stock del producto Y el de la materia prima
  4. Comprobar que el kardex (movimientos) quedó registrado
  5. Comprobar que una venta sin stock suficiente se rechaza
"""

from __future__ import annotations

import sys
from decimal import Decimal
from pathlib import Path

BACKEND = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND))

from sqlalchemy import text  # noqa: E402

from app.database import Base, engine  # noqa: E402
from app.models import (  # noqa: E402
    MovimientoInventario,
    Producto,
    Receta,
    StockMateriaPrima,
)
from app.schemas import DetalleVentaIn, VentaCreate  # noqa: E402


def limpiar() -> None:
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    sql_dir = BACKEND / "sql"
    with engine.begin() as conn:
        for statement in _statements(sql_dir / "triggers.sqlite.sql"):
            conn.exec_driver_sql(statement)


def _statements(path: Path) -> list[str]:
    import sqlite3

    out: list[str] = []
    buf = ""
    for line in path.read_text(encoding="utf-8").splitlines(keepends=True):
        buf += line
        if sqlite3.complete_statement(buf):
            if buf.strip():
                out.append(buf.strip())
            buf = ""
    return out


def main() -> int:
    from app.database import SessionLocal

    print("=" * 62)
    print("  PRUEBA DE TRIGGERS DE INVENTARIO")
    print("=" * 62)

    limpiar()
    db = SessionLocal()

    # --- Setup: materia prima + producto terminado con receta ---
    harina = Producto(
        nombre="Harina de trigo",
        tipo="materia_prima",
        categoria="Insumos",
        costo_unitario=Decimal("2500"),
        unidad="kg",
        stock_actual=0,
        stock_minimo=5,
    )
    croissant = Producto(
        nombre="Croissant",
        tipo="terminado",
        categoria="Panaderia",
        precio_venta=Decimal("4500"),
        costo_unitario=Decimal("1400"),
        unidad="unidad",
        stock_actual=20,
        stock_minimo=3,
    )
    db.add_all([harina, croissant])
    db.flush()

    db.add(StockMateriaPrima(producto_id=harina.id, cantidad_actual=Decimal("0")))
    db.add(
        Receta(
            producto_terminado_id=croissant.id,
            materia_prima_id=harina.id,
            cantidad_necesaria=Decimal("0.080"),
        )
    )
    db.commit()

    # --- Entrada de inventario: 10 kg de harina ---
    db.add(
        MovimientoInventario(
            producto_id=harina.id,
            tipo_movimiento="entrada",
            cantidad=Decimal("10"),
            unidad="kg",
            motivo="Compra inicial",
            referencia="compra-001",
        )
    )
    db.commit()
    db.refresh(harina)

    stock_inicial = db.get(StockMateriaPrima, harina.id)
    print(f"\n  [1] Stock inicial de harina: {stock_inicial.cantidad_actual} kg")
    assert stock_inicial.cantidad_actual == Decimal("10.000"), "El trigger de entrada no sumo"

    # --- Venta de 3 croissants ---
    from app.routers.ventas import registrar_venta

    payload = VentaCreate(
        items=[DetalleVentaIn(producto_id=croissant.id, cantidad=3)],
        metodo_pago="efectivo",
    )
    venta = registrar_venta(payload, db)
    db.commit()
    db.refresh(croissant)
    db.refresh(stock_inicial)

    print(f"  [2] Venta registrada: #{venta.id} total {venta.total}")
    print(f"      Stock croissant: 20 -> {croissant.stock_actual} (esperado 17)")
    print(f"      Stock harina:    10 -> {stock_inicial.cantidad_actual} kg (esperado 9.760)")

    assert croissant.stock_actual == 17, f"Stock de producto mal: {croissant.stock_actual}"
    assert stock_inicial.cantidad_actual == Decimal(
        "9.760"
    ), f"Stock de MP mal: {stock_inicial.cantidad_actual}"

    # --- Kardex ---
    movimientos = db.execute(
        text(
            """
            SELECT tipo_movimiento, producto_id, cantidad, motivo
            FROM movimientos_inventario ORDER BY id
        """
        )
    ).all()
    print(f"  [3] Kardex ({len(movimientos)} movimientos):")
    for mov in movimientos:
        print(
            f"      - {mov.tipo_movimiento:20} producto={mov.producto_id} "
            f"cant={mov.cantidad} ({mov.motivo})"
        )

    assert len(movimientos) == 3, f"Esperaba 3 movimientos, hay {len(movimientos)}"

    # --- Venta sin stock suficiente debe fallar ---
    print("\n  [4] Probando venta sin stock suficiente...")
    try:
        payload_exceso = VentaCreate(
            items=[DetalleVentaIn(producto_id=croissant.id, cantidad=999)],
            metodo_pago="efectivo",
        )
        registrar_venta(payload_exceso, db)
        db.commit()
        print("      [FALLA] La venta sin stock se permitio")
        db.close()
        return 1
    except Exception as exc:
        db.rollback()
        print(f"      [OK] Rechazada: {str(exc)[:90]}")

    db.close()

    print("\n" + "=" * 62)
    print("  RESULTADO: [OK] Triggers de inventario funcionando")
    print("=" * 62)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
