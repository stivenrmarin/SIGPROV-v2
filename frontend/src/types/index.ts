// Tipos compartidos del dominio SIGPROV v2

export type TipoProducto = 'terminado' | 'materia_prima'

export type Categoria =
  | 'panes'
  | 'pasteles'
  | 'cafes'
  | 'bebidas_postobon'
  | 'galletas'
  | 'combos'
  | 'materia_prima'
  | 'otros'

// === MESAS ===
export type EstadoMesa = 'libre' | 'ocupada' | 'pidiendo_cuenta' | 'reservada'

export interface Mesa {
  id: number
  numero: number | string // permite 'B1' para sillas de barra
  capacidad: number // 2, 4, 6 personas
  zona: 'salon_principal' | 'terraza' | 'barra' | 'patio'
  estado: EstadoMesa
  venta_actual_id: number | null
  ocupada_desde: Date | null
  total_acumulado: number // COP acumulado en la mesa actual
  items_actuales: ItemVentaCompleto[]
}

// === COMBOS ===
export interface ComboItem {
  producto_id: number
  cantidad: number
}

export interface Combo {
  id: number
  nombre: string
  descripcion: string
  precio_combo: number
  precio_individual_suma: number // suma si pidiera cada uno por separado
  categoria: Categoria
  items: ComboItem[]
  foto_url?: string
  disponible: boolean
  destacado?: boolean // combos más vendidos
}

export interface Producto {
  id: number
  nombre: string
  tipo: TipoProducto
  categoria: Categoria
  precio_venta: number | null
  costo_unitario: number
  unidad: string
  stock_actual: number
  stock_minimo: number
  activo: boolean
}

export interface Receta {
  id: number
  producto_terminado_id: number
  materia_prima_id: number
  cantidad_necesaria: number
}

export interface ItemVenta {
  producto_id: number
  cantidad: number
}

export interface Venta {
  id: number
  fecha: string // ISO
  total: number
  metodo_pago: 'efectivo' | 'transferencia' | 'datáfono' | 'mixto'
  notas?: string
  items: ItemVentaCompleto[]
}

export interface ItemVentaCompleto extends ItemVenta {
  precio_unitario: number
  subtotal: number
  nombre_producto: string
}

export interface ResumenHoy {
  fecha: string
  total_vendido: number
  num_ventas: number
  ticket_promedio: number
  vs_ayer_pct: number
  productos_stock_bajo: number
  es_festivo: boolean
  nombre_festivo: string | null
  sparkVentas: number[] // últimos 7 días para sparkline
}

export interface PuntoSerie {
  fecha: string
  total: number | null
  es_festivo: boolean
  nombre_festivo: string | null
  limite_inferior?: number | null
  limite_superior?: number | null
  es_prediccion?: boolean
}

export interface SemanaData {
  historico_7_dias: PuntoSerie[]
  prediccion_7_dias: PuntoSerie[]
  modelo_version: string
}

export interface AlertaStock {
  producto_id: number
  nombre: string
  stock_actual: number
  stock_minimo: number
  estado: 'critico' | 'bajo' | 'ok'
}

export interface Alerta {
  id: number
  tipo: 'stock_bajo' | 'prediccion_alta' | 'festivo_manana' | 'sin_ventas_hoy'
  titulo: string
  mensaje: string
  nivel: 'info' | 'warning' | 'critical'
  created_at: string
  resuelta: boolean
}

export interface Festivo {
  fecha: string
  nombre: string
  tipo: 'festivo' | 'puente' | 'semana_santa' | 'navidad' | 'fin_anio'
  efecto_venta: number
}

export interface PrediccionML {
  fecha_prediccion: string
  cantidad_predicha: number
  limite_inferior: number
  limite_superior: number
  modelo_version: string
}

export interface MetricasML {
  fecha_prediccion: string
  cantidad_predicha: number
  cantidad_real: number
  error_pct: number
  modelo_version: string
}

export interface TopProducto {
  producto_id: number
  nombre: string
  categoria: Categoria
  cantidad_vendida: number
  ingresos: number
}

// === HISTORIAL DE VENTAS DIARIAS ===
export interface HistorialVentaDia {
  fecha: string // ISO date
  dia_semana: string // 'Lun', 'Mar', 'Mié'...
  total: number
  num_ventas: number
  ticket_promedio: number
  top_producto: string
}

// === CIERRE DE CAJA ===
export interface BilletesMonedas {
  denominacion: number
  tipo: 'billete' | 'moneda'
  cantidad: number
  subtotal: number
}

export interface ConteoCaja {
  fecha: string
  total_ventas_dia: number
  total_efectivo_dia: number
  total_tarjeta_dia: number
  total_transferencia_dia: number
  otros_pagos_dia: number
  base_inicial: number
  esperado_en_caja: number
  billetes: BilletesMonedas[]
  monedas: BilletesMonedas[]
  total_contado: number
  diferencia: number // contado - esperado
  cerrado: boolean
  cerrado_at: string | null
  notas: string
}

// === PROVEEDORES ===
export interface Proveedor {
  id: number
  nombre: string
  contacto: string
  telefono: string
  email: string
  direccion: string
  categoria: string // 'Harinas', 'Lácteos', 'Bebidas', 'Empaques', etc
  dias_entrega: number // tiempo promedio de entrega
  min_pedido: number // monto mínimo
  calificacion: number // 1-5
  activo: boolean
  notas?: string
}

export interface PedidoProveedor {
  id: number
  proveedor_id: number
  fecha: string
  estado: 'borrador' | 'enviado' | 'confirmado' | 'en_transito' | 'recibido' | 'cancelado'
  total: number
  items: Array<{
    materia_prima_id: number
    cantidad: number
    unidad: string
    precio_unitario: number
    subtotal: number
  }>
  fecha_entrega_estimada: string
  notas?: string
}