"""Modelos ORM de las entidades operativas (F2/F3).

Incluye identidad (usuarios/roles), proveedores y pedidos, salon (mesas y
ordenes), caja (arqueos) y auditoria.

Todos los tipos son portables entre PostgreSQL y SQLite:
  - JSON en vez de JSONB
  - Integer autoincremental en vez de SERIAL
  - DateTime(timezone=True) en vez de TIMESTAMPTZ
"""

from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import (
    JSON,
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

# ------------------------------------------------------------------
# Identidad
# ------------------------------------------------------------------
ROLES = ("admin", "gerente", "cajero")


class Usuario(Base):
    """Usuario del sistema con su rol y permisos."""

    __tablename__ = "usuarios"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    username: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    email: Mapped[str | None] = mapped_column(String(120), unique=True, nullable=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    nombre_completo: Mapped[str] = mapped_column(String(120), nullable=False)
    rol: Mapped[str] = mapped_column(String(20), nullable=False, default="cajero")
    permisos_extra: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    activo: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    ultimo_acceso: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    creado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    actualizado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    ventas: Mapped[list[Venta]] = relationship(back_populates="usuario")


class RefreshToken(Base):
    """Refresh token rotativo: permite revocar sesiones."""

    __tablename__ = "refresh_tokens"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    usuario_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False
    )
    token_hash: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    expira_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    revocado: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    creado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class Auditoria(Base):
    """Rastro de acciones sensibles: quien, que, cuando y como cambio."""

    __tablename__ = "auditoria"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    usuario_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True
    )
    username: Mapped[str | None] = mapped_column(String(50), nullable=True)
    accion: Mapped[str] = mapped_column(String(50), nullable=False)
    entidad: Mapped[str] = mapped_column(String(50), nullable=False)
    entidad_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    datos_antes: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    datos_despues: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    ip: Mapped[str | None] = mapped_column(String(45), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


# ------------------------------------------------------------------
# Proveedores
# ------------------------------------------------------------------
class Proveedor(Base):
    """Proveedor de materia prima."""

    __tablename__ = "proveedores"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    nombre: Mapped[str] = mapped_column(String(120), nullable=False)
    categoria: Mapped[str | None] = mapped_column(String(50), nullable=True)
    contacto_nombre: Mapped[str | None] = mapped_column(String(120), nullable=True)
    telefono: Mapped[str | None] = mapped_column(String(30), nullable=True)
    email: Mapped[str | None] = mapped_column(String(120), nullable=True)
    direccion: Mapped[str | None] = mapped_column(String(200), nullable=True)
    dias_entrega: Mapped[int] = mapped_column(Integer, nullable=False, default=3)
    pedido_minimo: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    activo: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    creado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    actualizado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    pedidos: Mapped[list[PedidoProveedor]] = relationship(
        back_populates="proveedor", cascade="all, delete-orphan"
    )


class PedidoProveedor(Base):
    """Pedido de materia prima a un proveedor."""

    __tablename__ = "pedidos_proveedor"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    proveedor_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("proveedores.id", ondelete="RESTRICT"), nullable=False
    )
    numero: Mapped[str] = mapped_column(String(30), unique=True, nullable=False)
    estado: Mapped[str] = mapped_column(String(20), nullable=False, default="borrador")
    fecha_pedido: Mapped[date] = mapped_column(Date, nullable=False, default=date.today)
    fecha_entrega_est: Mapped[date | None] = mapped_column(Date, nullable=True)
    fecha_recibido: Mapped[date | None] = mapped_column(Date, nullable=True)
    total: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False, default=0)
    notas: Mapped[str | None] = mapped_column(Text, nullable=True)
    creado_por: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True
    )
    creado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    actualizado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    proveedor: Mapped[Proveedor] = relationship(back_populates="pedidos")
    detalles: Mapped[list[DetallePedidoProveedor]] = relationship(
        back_populates="pedido", cascade="all, delete-orphan"
    )


class DetallePedidoProveedor(Base):
    """Linea de un pedido a proveedor."""

    __tablename__ = "detalle_pedido_proveedor"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    pedido_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("pedidos_proveedor.id", ondelete="CASCADE"), nullable=False
    )
    producto_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("productos.id", ondelete="RESTRICT"), nullable=False
    )
    cantidad: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    costo_unitario: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)

    pedido: Mapped[PedidoProveedor] = relationship(back_populates="detalles")


# ------------------------------------------------------------------
# Salon
# ------------------------------------------------------------------
class Mesa(Base):
    """Mesa del salon."""

    __tablename__ = "mesas"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    numero: Mapped[int] = mapped_column(Integer, unique=True, nullable=False)
    zona: Mapped[str] = mapped_column(String(30), nullable=False)
    capacidad: Mapped[int] = mapped_column(Integer, nullable=False, default=4)
    estado: Mapped[str] = mapped_column(String(20), nullable=False, default="libre")
    creado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    actualizado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    ordenes: Mapped[list[OrdenMesa]] = relationship(back_populates="mesa")


class OrdenMesa(Base):
    """Orden abierta en una mesa (pedido en curso)."""

    __tablename__ = "ordenes_mesa"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    mesa_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("mesas.id", ondelete="CASCADE"), nullable=False
    )
    usuario_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True
    )
    comensales: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    estado: Mapped[str] = mapped_column(String(20), nullable=False, default="abierta")
    abierta_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    cerrada_en: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    total: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False, default=0)

    mesa: Mapped[Mesa] = relationship(back_populates="ordenes")
    items: Mapped[list[ItemOrdenMesa]] = relationship(
        back_populates="orden", cascade="all, delete-orphan"
    )


class ItemOrdenMesa(Base):
    """Producto pedido en una mesa."""

    __tablename__ = "items_orden_mesa"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    orden_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("ordenes_mesa.id", ondelete="CASCADE"), nullable=False
    )
    producto_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("productos.id", ondelete="RESTRICT"), nullable=False
    )
    cantidad: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    precio_unitario: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    subtotal: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    notas: Mapped[str | None] = mapped_column(String(200), nullable=True)

    orden: Mapped[OrdenMesa] = relationship(back_populates="items")


# ------------------------------------------------------------------
# Caja
# ------------------------------------------------------------------
class ArqueoCaja(Base):
    """Cierre de caja de un turno."""

    __tablename__ = "arqueos_caja"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    usuario_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("usuarios.id", ondelete="RESTRICT"), nullable=False
    )
    fecha: Mapped[date] = mapped_column(Date, nullable=False, default=date.today)
    esperado_efectivo: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    contado_efectivo: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    diferencia: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    desglose: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    estado: Mapped[str] = mapped_column(String(20), nullable=False, default="abierto")
    observaciones: Mapped[str | None] = mapped_column(Text, nullable=True)
    cerrado_en: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    creado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


# ------------------------------------------------------------------
# Trazabilidad de ventas (columnas agregadas por F2)
# ------------------------------------------------------------------
from app.models import Venta  # noqa: E402  (necesario para el back_populates de Usuario)

Venta.__tablename__ = "ventas"
Venta.usuario_id = mapped_column(
    Integer, ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True
)
Venta.usuario = relationship(back_populates="ventas", foreign_keys=[Venta.usuario_id])
