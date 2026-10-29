"""Generador de datos sintéticos para el demo del Proyecto Integrador.

Genera 12 meses de ventas para una panadería-cafetería ficticia en Bogotá
con:
- ~80 ventas/día entre semana, ~120 fines de semana
- Festivos colombianos reales (calendario ya cargado en DB)
- Semana Santa -90%, Navidad +40%
- Tendencia anual creciente
- Ruido aleatorio

Uso:
    python -m scripts.generar_datos_sinteticos
"""

from __future__ import annotations

import random
from datetime import date, datetime, timedelta
from decimal import Decimal

from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models import (
    CalendarioFestivo,
    DetalleVenta,
    MovimientoInventario,
    Producto,
    Receta,
    StockMateriaPrima,
    Venta,
)

# Configuración del generador
# El dataset es ANCLADO A HOY: 12 meses hacia atrás hasta la fecha actual.
# Una fecha fija de fin haría que "hoy" y "últimos 7 días" quedaran vacíos
# en cuanto esa fecha pasara, y los gráficos del dashboard se verían en cero.
FECHA_FIN = date.today()
FECHA_INICIO = FECHA_FIN - timedelta(days=365)

# Productos (idéntico al SPEC)
PRODUCTOS_TERMINADOS = [
    # Panes (con receta)
    ("Pan francés", "panes", 3000, 1200, "unidad"),
    ("Pan dulce", "panes", 2500, 1000, "unidad"),
    ("Almojábana", "panes", 3500, 1400, "unidad"),
    ("Croissant", "panes", 4500, 1800, "unidad"),
    ("Pandebono", "panes", 2800, 1100, "unidad"),
    ("Tostado", "panes", 6000, 2400, "unidad"),
    ("Pastel de chocolate", "pasteles", 4500, 1800, "unidad"),
    ("Pastel de arequipe", "pasteles", 4500, 1800, "unidad"),
    ("Brazo de reina", "pasteles", 3800, 1500, "unidad"),
    # Cafés
    ("Tinto", "cafes", 2500, 500, "unidad"),
    ("Café con leche", "cafes", 3500, 800, "unidad"),
    ("Capuchino", "cafes", 5500, 1200, "unidad"),
    ("Aromática", "cafes", 3000, 400, "unidad"),
    # Bebidas Postobón (sin receta)
    ("Colombiana", "bebidas_postobon", 3500, 1800, "unidad"),
    ("Manzana Postobón", "bebidas_postobon", 3500, 1800, "unidad"),
    ("Pony Malta", "bebidas_postobon", 4000, 2000, "unidad"),
    ("Hit naranja", "bebidas_postobon", 4500, 2200, "unidad"),
    ("Hit mango", "bebidas_postobon", 4500, 2200, "unidad"),
    ("Brisa", "bebidas_postobon", 3500, 1800, "unidad"),
    ("Agua Cristal", "bebidas_postobon", 2500, 1200, "unidad"),
    ("Mr. Tea", "bebidas_postobon", 4000, 2000, "unidad"),
    # Otros
    ("Galletas paquete", "galletas", 5500, 2500, "unidad"),
    ("Empanada", "otros", 3500, 1500, "unidad"),
]

MATERIAS_PRIMAS = [
    ("Harina", "materia_prima", 3500, "kg", 50, 10),
    ("Levadura", "materia_prima", 12000, "kg", 2, 1),
    ("Mantequilla", "materia_prima", 18000, "kg", 5, 2),
    ("Azúcar", "materia_prima", 4500, "kg", 15, 5),
    ("Sal", "materia_prima", 2000, "kg", 3, 1),
    ("Queso", "materia_prima", 22000, "kg", 4, 1),
    ("Arequipe", "materia_prima", 16000, "kg", 3, 1),
    ("Leche", "materia_prima", 5500, "litros", 20, 5),
    ("Chocolate", "materia_prima", 28000, "kg", 2, 1),
    ("Café molido", "materia_prima", 35000, "kg", 3, 1),
    ("Huevos", "materia_prima", 18000, "unidad", 200, 50),
    ("Aceite", "materia_prima", 12000, "litros", 5, 2),
    ("Arepa", "materia_prima", 6000, "kg", 5, 2),
    ("Salchichón", "materia_prima", 16000, "kg", 3, 1),
    ("Papa", "materia_prima", 3500, "kg", 10, 3),
]

# Recetas: producto -> [(materia_prima_id, cantidad)]
RECETAS = {
    "Pan francés": [("Harina", 0.300), ("Levadura", 0.050), ("Mantequilla", 0.020), ("Sal", 0.005)],
    "Pan dulce": [("Harina", 0.250), ("Levadura", 0.040), ("Azúcar", 0.050), ("Huevos", 1)],
    "Almojábana": [("Harina", 0.150), ("Queso", 0.080), ("Huevos", 1)],
    "Croissant": [("Harina", 0.150), ("Mantequilla", 0.040), ("Azúcar", 0.030), ("Leche", 0.025)],
    "Pandebono": [("Harina", 0.100), ("Queso", 0.080), ("Huevos", 1)],
    "Tostado": [("Pan francés", 2), ("Huevos", 1), ("Salchichón", 0.050)],
    "Pastel de chocolate": [
        ("Harina", 0.200),
        ("Chocolate", 0.100),
        ("Azúcar", 0.150),
        ("Huevos", 2),
        ("Mantequilla", 0.080),
    ],
    "Pastel de arequipe": [
        ("Harina", 0.200),
        ("Arequipe", 0.150),
        ("Azúcar", 0.150),
        ("Huevos", 2),
        ("Mantequilla", 0.080),
    ],
    "Brazo de reina": [("Harina", 0.150), ("Arequipe", 0.100), ("Huevos", 2)],
    "Tinto": [("Café molido", 0.020)],
    "Café con leche": [("Café molido", 0.020), ("Leche", 0.200)],
    "Capuchino": [("Café molido", 0.025), ("Leche", 0.250)],
    "Aromática": [("Arepa", 0.030)],
    "Empanada": [("Papa", 0.150), ("Carne" if False else "Huevos", 1)],  # simplificado
}


def limpiar_tablas(db: Session) -> None:
    """Borra ventas, movimientos, recetas y productos para empezar de cero."""
    print("Limpiando tablas...")
    db.query(DetalleVenta).delete()
    db.query(Venta).delete()
    db.query(MovimientoInventario).delete()
    db.query(Receta).delete()
    db.query(StockMateriaPrima).delete()
    db.query(Producto).delete()
    db.commit()


def crear_productos(db: Session) -> dict[str, Producto]:
    """Crea todos los productos (terminados + materia prima)."""
    print(
        f"Creando {len(PRODUCTOS_TERMINADOS)} productos terminados + {len(MATERIAS_PRIMAS)} materias primas..."
    )
    productos: dict[str, Producto] = {}

    # Terminados
    for nombre, cat, precio, costo, unidad in PRODUCTOS_TERMINADOS:
        p = Producto(
            nombre=nombre,
            tipo="terminado",
            categoria=cat,
            precio_venta=Decimal(precio),
            costo_unitario=Decimal(costo),
            unidad=unidad,
            stock_actual=random.randint(30, 100),
            stock_minimo=10,
            activo=True,
        )
        db.add(p)
        db.flush()
        productos[nombre] = p

    # Materias primas
    for nombre, cat, costo, unidad, stock, minimo in MATERIAS_PRIMAS:
        p = Producto(
            nombre=nombre,
            tipo="materia_prima",
            categoria=cat,
            precio_venta=None,
            costo_unitario=Decimal(costo),
            unidad=unidad,
            stock_actual=int(stock),  # solo display, lo real va en stock_materia_prima
            stock_minimo=minimo,
            activo=True,
        )
        db.add(p)
        db.flush()
        db.add(
            StockMateriaPrima(
                producto_id=p.id,
                cantidad_actual=Decimal(stock),
            )
        )
        productos[nombre] = p

    db.commit()
    return productos


def crear_recetas(db: Session, productos: dict[str, Producto]) -> None:
    """Crea las recetas (BOM). Solo productos hechos en casa tienen receta."""
    print(f"Creando {len(RECETAS)} recetas...")
    for prod_nombre, items in RECETAS.items():
        prod_obj = productos.get(prod_nombre)
        if not prod_obj:
            continue
        for mp_nombre, cantidad in items:
            mp_obj = productos.get(mp_nombre)
            if not mp_obj:
                continue
            db.add(
                Receta(
                    producto_terminado_id=prod_obj.id,
                    materia_prima_id=mp_obj.id,
                    cantidad_necesaria=Decimal(cantidad),
                )
            )
    db.commit()


def generar_ventas(db: Session, productos: dict[str, Producto]) -> int:
    """Genera 12 meses de ventas sintéticas."""
    print(f"Generando ventas desde {FECHA_INICIO} hasta {FECHA_FIN}...")
    total_ventas = 0
    productos_terminados = [p for p in productos.values() if p.tipo == "terminado"]

    # Pesos de venta por producto (algunos son bestsellers)
    pesos = []
    for p in productos_terminados:
        if p.nombre in ("Colombiana", "Tinto", "Pan francés", "Manzana Postobón"):
            pesos.append(15)  # bestsellers
        elif p.nombre in ("Café con leche", "Pan dulce", "Almojábana"):
            pesos.append(10)
        else:
            pesos.append(5)

    d = FECHA_INICIO
    while d <= FECHA_FIN:
        # ¿Es festivo?
        festivo = db.get(CalendarioFestivo, d)
        if festivo:
            multiplicador = Decimal(str(1 + festivo.efecto_venta))
        else:
            # Efecto por día de semana
            wd = d.weekday()  # 0=lun, 6=dom
            if wd in (5, 6):  # sábado o domingo
                base = 120
            elif wd == 4:  # viernes
                base = 95
            else:
                base = 80

            # Tendencia anual (crece 2% por mes desde oct 2025)
            meses_desde_inicio = (d.year - FECHA_INICIO.year) * 12 + (d.month - FECHA_INICIO.month)
            tendencia = 1 + 0.02 * meses_desde_inicio

            # Ruido
            ruido = random.uniform(0.85, 1.15)

            multiplicador = Decimal(str(base * tendencia * ruido))

        # Número de ventas para hoy
        n_ventas = max(5, int(multiplicador))

        for _ in range(n_ventas):
            # Seleccionar 1-3 productos por venta (ponderados)
            n_items = random.choices([1, 2, 3], weights=[60, 30, 10])[0]
            items_seleccionados: dict[int, int] = {}
            for _ in range(n_items):
                idx = random.choices(range(len(productos_terminados)), weights=pesos)[0]
                prod = productos_terminados[idx]
                cantidad = random.choices([1, 2, 3, 5], weights=[60, 25, 10, 5])[0]
                items_seleccionados[prod.id] = items_seleccionados.get(prod.id, 0) + cantidad

            # Calcular total
            total = Decimal(0)
            detalles = []
            for pid, cant in items_seleccionados.items():
                p = productos[pid]
                precio = p.precio_venta or Decimal(0)
                subtotal = precio * cant
                total += subtotal
                detalles.append(
                    {
                        "producto_id": pid,
                        "cantidad": cant,
                        "precio_unitario": precio,
                        "subtotal": subtotal,
                    }
                )

            # Crear venta (hora aleatoria del día)
            hora = random.choices(
                range(6, 21),  # 6am a 9pm
                weights=[5, 8, 10, 12, 9, 7, 6, 5, 4, 3, 4, 6, 8, 7, 6],
            )[0]
            minuto = random.randint(0, 59)
            fecha_venta = datetime(d.year, d.month, d.day, hora, minuto)

            venta = Venta(
                fecha=fecha_venta,
                total=total,
                metodo_pago=random.choices(
                    ["efectivo", "transferencia", "datáfono"],
                    weights=[60, 25, 15],
                )[0],
            )
            db.add(venta)
            db.flush()

            for det in detalles:
                db.add(
                    DetalleVenta(
                        venta_id=venta.id,
                        producto_id=det["producto_id"],
                        cantidad=det["cantidad"],
                        precio_unitario=det["precio_unitario"],
                        subtotal=det["subtotal"],
                    )
                )
            total_ventas += 1

        # Commit cada 30 días para no ahogar la memoria
        if (d - FECHA_INICIO).days % 30 == 0:
            db.commit()
            print(f"  ... {d} ({total_ventas} ventas generadas)")

        d += timedelta(days=1)

    db.commit()
    return total_ventas


def generar_compras_periodicas(db: Session, productos: dict[str, Producto]) -> int:
    """Genera entradas periódicas de materia prima (compras a proveedores)."""
    print("Generando compras periùdicas de materia prima...")
    total_movs = 0

    # Comprar MP cada 5-7 días
    d = FECHA_INICIO
    while d <= FECHA_FIN:
        if d.weekday() in (0, 3):  # lunes y jueves
            for nombre_mp, _, _, _, stock_default, _ in MATERIAS_PRIMAS:
                mp = productos.get(nombre_mp)
                if not mp:
                    continue
                cantidad = Decimal(str(random.uniform(0.5, 1.5))) * Decimal(stock_default)
                db.add(
                    MovimientoInventario(
                        producto_id=mp.id,
                        tipo_movimiento="entrada",
                        cantidad=cantidad,
                        unidad=mp.unidad,
                        motivo="Compra a proveedor",
                        referencia=f"compra-{d.isoformat()}",
                    )
                )
                total_movs += 1

        # Reposición de Postobón cada 3-4 días
        if d.weekday() in (2, 5):
            for nombre in [
                "Colombiana",
                "Manzana Postobón",
                "Pony Malta",
                "Hit naranja",
                "Hit mango",
                "Brisa",
                "Agua Cristal",
                "Mr. Tea",
            ]:
                prod = productos.get(nombre)
                if not prod:
                    continue
                cantidad = random.randint(20, 50)
                db.add(
                    MovimientoInventario(
                        producto_id=prod.id,
                        tipo_movimiento="entrada",
                        cantidad=Decimal(cantidad),
                        unidad=prod.unidad,
                        motivo="Reposición Postobón",
                        referencia=f"postobon-{d.isoformat()}",
                    )
                )
                total_movs += 1

        d += timedelta(days=1)

    db.commit()
    return total_movs


def main() -> None:
    random.seed(42)  # resultados reproducibles
    db = SessionLocal()
    try:
        limpiar_tablas(db)
        productos = crear_productos(db)
        crear_recetas(db, productos)
        n_ventas = generar_ventas(db, productos)
        n_movs = generar_compras_periodicas(db, productos)
        print()
        print("=" * 50)
        print("✅ Generación completa:")
        print(f"   - {len(productos)} productos")
        print(f"   - {len(RECETAS)} recetas")
        print(f"   - {n_ventas} ventas en {((FECHA_FIN - FECHA_INICIO).days)} días")
        print(f"   - {n_movs} movimientos de inventario")
        print("=" * 50)
    finally:
        db.close()


if __name__ == "__main__":
    main()
