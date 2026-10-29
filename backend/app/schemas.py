"""Schemas Pydantic v2 — request/response de la API."""

from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


# ---------- Producto ----------
class ProductoBase(BaseModel):
    nombre: str = Field(..., min_length=1, max_length=120)
    tipo: Literal["terminado", "materia_prima"]
    categoria: str = Field(..., max_length=60)
    precio_venta: Decimal | None = Field(None, ge=0)
    costo_unitario: Decimal = Field(..., ge=0)
    unidad: str = Field(default="unidad", max_length=20)
    stock_minimo: int = Field(default=5, ge=0)


class ProductoCreate(ProductoBase):
    stock_actual: int = Field(default=0, ge=0)


class ProductoUpdate(BaseModel):
    nombre: str | None = None
    categoria: str | None = None
    precio_venta: Decimal | None = None
    costo_unitario: Decimal | None = None
    unidad: str | None = None
    stock_minimo: int | None = None
    activo: bool | None = None


class ProductoOut(ProductoBase):
    id: int
    stock_actual: int
    activo: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ---------- Receta ----------
class RecetaItem(BaseModel):
    materia_prima_id: int
    cantidad_necesaria: Decimal = Field(..., gt=0)


class RecetaReplace(BaseModel):
    items: list[RecetaItem]


# ---------- Movimiento Kardex ----------
class MovimientoCreate(BaseModel):
    producto_id: int
    tipo_movimiento: Literal["entrada", "ajuste", "merma"]
    cantidad: Decimal = Field(..., gt=0)
    motivo: str | None = None
    referencia: str | None = None


class MovimientoOut(BaseModel):
    id: int
    producto_id: int
    tipo_movimiento: str
    cantidad: Decimal
    unidad: str
    motivo: str | None
    referencia: str | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ---------- Venta ----------
class DetalleVentaIn(BaseModel):
    producto_id: int
    cantidad: int = Field(..., gt=0)


class VentaCreate(BaseModel):
    metodo_pago: Literal["efectivo", "transferencia", "datáfono", "mixto"] = "efectivo"
    notas: str | None = None
    items: list[DetalleVentaIn] = Field(..., min_length=1)


class DetalleVentaOut(BaseModel):
    id: int
    producto_id: int
    cantidad: int
    precio_unitario: Decimal
    subtotal: Decimal

    model_config = ConfigDict(from_attributes=True)


class VentaOut(BaseModel):
    id: int
    fecha: datetime
    total: Decimal
    metodo_pago: str
    notas: str | None
    detalles: list[DetalleVentaOut]

    model_config = ConfigDict(from_attributes=True)


# ---------- Dashboard ----------
class ResumenHoy(BaseModel):
    fecha: date
    total_vendido: Decimal
    num_ventas: int
    ticket_promedio: Decimal
    vs_ayer_pct: Decimal


class PuntoSerie(BaseModel):
    fecha: date
    total: Decimal
    es_festivo: bool = False
    nombre_festivo: str | None = None


class SemanaOut(BaseModel):
    ultimos_7_dias: list[PuntoSerie]
    prediccion_proximos_7_dias: list[PuntoSerie]
    total_ultima_semana: Decimal
    total_predicho_proxima_semana: Decimal


class AlertaStock(BaseModel):
    producto_id: int
    nombre: str
    stock_actual: int
    stock_minimo: int
    estado: Literal["critico", "bajo", "ok"]


# ---------- Predicción ----------
class PrediccionOut(BaseModel):
    fecha_prediccion: date
    cantidad_predicha: Decimal
    limite_inferior: Decimal
    limite_superior: Decimal
    modelo_version: str


class MetricasML(BaseModel):
    mape: float
    mae: Decimal
    n_predicciones_evaluadas: int
    ultima_actualizacion: datetime | None


# ---------- Health ----------
class HealthOut(BaseModel):
    status: str
    version: str
    db_ok: bool
    uptime_seconds: float
