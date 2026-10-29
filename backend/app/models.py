"""Modelos ORM SQLAlchemy 2.0 — espejo del schema SQL."""

from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Producto(Base):
    __tablename__ = "productos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    nombre: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)
    tipo: Mapped[str] = mapped_column(String(20), nullable=False)
    categoria: Mapped[str] = mapped_column(String(60), nullable=False)
    precio_venta: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    costo_unitario: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    unidad: Mapped[str] = mapped_column(String(20), nullable=False, default="unidad")
    stock_actual: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    stock_minimo: Mapped[int] = mapped_column(Integer, nullable=False, default=5)
    activo: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    receta_items: Mapped[list[Receta]] = relationship(
        "Receta", foreign_keys="Receta.producto_terminado_id", cascade="all, delete-orphan"
    )


class StockMateriaPrima(Base):
    __tablename__ = "stock_materia_prima"

    producto_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("productos.id", ondelete="CASCADE"), primary_key=True
    )
    cantidad_actual: Mapped[Decimal] = mapped_column(Numeric(10, 3), nullable=False, default=0)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Receta(Base):
    __tablename__ = "recetas"
    __table_args__ = (
        UniqueConstraint(
            "producto_terminado_id", "materia_prima_id", name="recetas_producto_mp_unique"
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    producto_terminado_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("productos.id", ondelete="CASCADE"), nullable=False
    )
    materia_prima_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("productos.id", ondelete="RESTRICT"), nullable=False
    )
    cantidad_necesaria: Mapped[Decimal] = mapped_column(Numeric(10, 3), nullable=False)


class MovimientoInventario(Base):
    __tablename__ = "movimientos_inventario"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    producto_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("productos.id", ondelete="RESTRICT"), nullable=False
    )
    tipo_movimiento: Mapped[str] = mapped_column(String(20), nullable=False)
    cantidad: Mapped[Decimal] = mapped_column(Numeric(10, 3), nullable=False)
    unidad: Mapped[str] = mapped_column(String(20), nullable=False)
    motivo: Mapped[str | None] = mapped_column(String(200), nullable=True)
    referencia: Mapped[str | None] = mapped_column(String(60), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Venta(Base):
    __tablename__ = "ventas"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    fecha: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    total: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    metodo_pago: Mapped[str] = mapped_column(String(20), nullable=False, default="efectivo")
    notas: Mapped[str | None] = mapped_column(String(200), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    detalles: Mapped[list[DetalleVenta]] = relationship(
        "DetalleVenta", cascade="all, delete-orphan", lazy="selectin"
    )


class DetalleVenta(Base):
    __tablename__ = "detalle_ventas"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    venta_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("ventas.id", ondelete="CASCADE"), nullable=False
    )
    producto_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("productos.id", ondelete="RESTRICT"), nullable=False
    )
    cantidad: Mapped[int] = mapped_column(Integer, nullable=False)
    precio_unitario: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    subtotal: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)


class Prediccion(Base):
    __tablename__ = "predicciones"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    fecha_prediccion: Mapped[date] = mapped_column(Date, nullable=False)
    producto_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("productos.id", ondelete="CASCADE"), nullable=True
    )
    cantidad_predicha: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    limite_inferior: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    limite_superior: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    cantidad_real: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    error_pct: Mapped[Decimal | None] = mapped_column(Numeric(6, 2), nullable=True)
    modelo_version: Mapped[str] = mapped_column(String(30), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class CalendarioFestivo(Base):
    __tablename__ = "calendario_festivos"

    fecha: Mapped[date] = mapped_column(Date, primary_key=True)
    nombre: Mapped[str] = mapped_column(String(60), nullable=False)
    tipo: Mapped[str] = mapped_column(String(15), nullable=False)
    efecto_venta: Mapped[Decimal] = mapped_column(
        Numeric(4, 2), nullable=False, default=Decimal("-0.30")
    )
