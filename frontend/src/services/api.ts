// Cliente API con fallback automático a mocks cuando no hay backend
// Esto permite que el frontend funcione 100% sin Docker ni backend corriendo.

import {
  MOCK_PRODUCTOS,
  MOCK_RESUMEN_HOY,
  MOCK_SEMANA,
  MOCK_ALERTAS_STOCK,
  MOCK_ALERTAS,
  MOCK_METRICAS_ML,
  MOCK_RESUMEN_METRICAS,
  getTopProductos,
  MOCK_VENTAS,
  getDistribucionPorCategoria,
  getPrediccionesPorProducto,
  getHeatmapSemanal,
  getRecomendaciones,
  MOCK_PROVEEDORES,
  MOCK_PEDIDOS_PROVEEDOR,
  getConteoCajaHoy,
  getHistorialVentas,
  getKPIsHoy,
} from '@/data/mock'
import type {
  Producto,
  ResumenHoy,
  SemanaData,
  AlertaStock,
  Alerta,
  TopProducto,
  ItemVenta,
  Venta,
  Proveedor,
  PedidoProveedor,
  ConteoCaja,
  HistorialVentaDia,
} from '@/types'
import { formatCOP } from '@/lib/utils'

// Detección del modo de operación
// En Electron (file://) SIEMPRE usamos mocks (no hay backend)
// En web (http://localhost:5173) intentamos backend UNA SOLA VEZ al inicio,
// y si falla usamos mocks sin volver a chequear (cache permanente).
const USE_MOCKS_ONLY = typeof window !== 'undefined' && window.location.protocol === 'file:'

let backendDisponible: boolean | null = null
let checkIniciado = false

async function checkBackend(): Promise<boolean> {
  if (USE_MOCKS_ONLY) return false
  if (backendDisponible !== null) return backendDisponible
  if (checkIniciado) return false // ya está corriendo el check en background
  checkIniciado = true

  try {
    // Usamos un endpoint que probablemente NO existe (silencioso si falla)
    const r = await fetch('/api/dashboard/resumen', {
      method: 'GET',
      signal: AbortSignal.timeout(3000),
    })
    backendDisponible = r.ok
    return backendDisponible
  } catch {
    backendDisponible = false
    return false
  }
}

// Wrapper que elige backend o mock
async function smartFetch<T>(backendCall: () => Promise<T>, mockCall: () => T): Promise<T> {
  const ok = await checkBackend()
  if (ok) {
    try {
      return await backendCall()
    } catch {
      // Si falla UNA llamada, no volver a intentar el backend
      backendDisponible = false
      return mockCall()
    }
  }
  return mockCall()
}

// Llamar checkBackend una vez al cargar la app (sin bloquear)
if (typeof window !== 'undefined') {
  setTimeout(() => checkBackend(), 100)
}

// =========================================================================
// API: PRODUCTOS
// =========================================================================

export const api_productos = {
  async listar(filtros?: { tipo?: string; activo?: boolean; categoria?: string }): Promise<Producto[]> {
    return smartFetch(
      async () => {
        const params = new URLSearchParams()
        if (filtros?.tipo) params.set('tipo', filtros.tipo)
        if (filtros?.activo !== undefined) params.set('activo', String(filtros.activo))
        if (filtros?.categoria) params.set('categoria', filtros.categoria)
        const r = await fetch(`/api/productos/?${params}`)
        if (!r.ok) throw new Error('Backend error')
        return r.json()
      },
      () => {
        let list = MOCK_PRODUCTOS
        if (filtros?.tipo) list = list.filter((p) => p.tipo === filtros.tipo)
        if (filtros?.activo !== undefined) list = list.filter((p) => p.activo === filtros.activo)
        if (filtros?.categoria) list = list.filter((p) => p.categoria === filtros.categoria)
        return list
      },
    )
  },

  async crear(data: Omit<Producto, 'id'>): Promise<Producto> {
    return smartFetch(
      async () => {
        const r = await fetch('/api/productos/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })
        if (!r.ok) throw new Error('Backend error')
        return r.json()
      },
      () => ({ ...data, id: MOCK_PRODUCTOS.length + 1 }),
    )
  },

  async actualizar(id: number, data: Partial<Producto>): Promise<Producto> {
    return smartFetch(
      async () => {
        const r = await fetch(`/api/productos/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })
        if (!r.ok) throw new Error('Backend error')
        return r.json()
      },
      () => {
        const idx = MOCK_PRODUCTOS.findIndex((p) => p.id === id)
        if (idx < 0) throw new Error('No encontrado')
        return { ...MOCK_PRODUCTOS[idx], ...data }
      },
    )
  },
}

// =========================================================================
// API: INVENTARIO
// =========================================================================

export const api_inventario = {
  async alertas(): Promise<AlertaStock[]> {
    return smartFetch(
      async () => {
        const r = await fetch('/api/inventario/alertas')
        if (!r.ok) throw new Error('Backend error')
        return r.json()
      },
      () => MOCK_ALERTAS_STOCK,
    )
  },

  async registrarEntrada(producto_id: number, cantidad: number, motivo?: string): Promise<{ ok: true }> {
    return smartFetch(
      async () => {
        const r = await fetch('/api/inventario/entrada', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ producto_id, tipo_movimiento: 'entrada', cantidad, motivo }),
        })
        if (!r.ok) throw new Error('Backend error')
        return { ok: true }
      },
      () => ({ ok: true }),
    )
  },
}

// =========================================================================
// API: VENTAS
// =========================================================================

export const api_ventas = {
  async registrar(items: ItemVenta[], metodo_pago = 'efectivo'): Promise<Venta> {
    return smartFetch(
      async () => {
        const r = await fetch('/api/ventas/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items, metodo_pago }),
        })
        if (!r.ok) throw new Error('Backend error')
        return r.json()
      },
      () => {
        const total = items.reduce((sum, item) => {
          const p = MOCK_PRODUCTOS.find((x) => x.id === item.producto_id)
          return sum + (p?.precio_venta || 0) * item.cantidad
        }, 0)
        return {
          id: MOCK_VENTAS.length + 1,
          fecha: new Date().toISOString(),
          total,
          metodo_pago,
          items: items.map((item) => {
            const p = MOCK_PRODUCTOS.find((x) => x.id === item.producto_id)!
            return {
              ...item,
              precio_unitario: p.precio_venta || 0,
              subtotal: (p.precio_venta || 0) * item.cantidad,
              nombre_producto: p.nombre,
            }
          }),
        }
      },
    )
  },

  async resumenHoy(): Promise<ResumenHoy> {
    return smartFetch(
      async () => {
        const r = await fetch('/api/ventas/resumen/hoy')
        if (!r.ok) throw new Error('Backend error')
        return r.json()
      },
      () => MOCK_RESUMEN_HOY,
    )
  },
}

// =========================================================================
// API: DASHBOARD
// =========================================================================

export const api_dashboard = {
  async resumen(): Promise<ResumenHoy> {
    return smartFetch(
      async () => {
        const r = await fetch('/api/dashboard/resumen')
        if (!r.ok) throw new Error('Backend error')
        return r.json()
      },
      () => MOCK_RESUMEN_HOY,
    )
  },

  async semana(): Promise<SemanaData> {
    return smartFetch(
      async () => {
        const r = await fetch('/api/dashboard/semana')
        if (!r.ok) throw new Error('Backend error')
        return r.json()
      },
      () => MOCK_SEMANA,
    )
  },

  async topProductos(dias = 30): Promise<TopProducto[]> {
    return smartFetch(
      async () => {
        const r = await fetch(`/api/dashboard/top-productos?dias=${dias}`)
        if (!r.ok) throw new Error('Backend error')
        return r.json()
      },
      () => getTopProductos(dias),
    )
  },
}

// =========================================================================
// API: PREDICCIÓN (ML)
// =========================================================================

export const api_prediccion = {
  async resumenMetricas() {
    return smartFetch(
      async () => {
        const r = await fetch('/api/prediccion/metricas')
        if (!r.ok) throw new Error('Backend error')
        return r.json()
      },
      () => MOCK_RESUMEN_METRICAS,
    )
  },

  async historialMetricas() {
    return smartFetch(
      async () => {
        const r = await fetch('/api/prediccion/historial-metricas')
        if (!r.ok) throw new Error('Backend error')
        return r.json()
      },
      () => MOCK_METRICAS_ML,
    )
  },

  async entrenar(): Promise<{ job_id: string; status: string }> {
    return smartFetch(
      async () => {
        const r = await fetch('/api/prediccion/entrenar', { method: 'POST' })
        if (!r.ok) throw new Error('Backend error')
        return r.json()
      },
      () => ({ job_id: `mock-${Date.now()}`, status: 'completed' }),
    )
  },

  // Nuevas funciones analíticas
  async distribucionPorCategoria(dias = 30) {
    return getDistribucionPorCategoria(dias)
  },

  async prediccionesPorProducto() {
    return getPrediccionesPorProducto()
  },

  async heatmapSemanal() {
    return getHeatmapSemanal()
  },

  async recomendaciones() {
    return getRecomendaciones()
  },
}

// =========================================================================
// API: ALERTAS
// =========================================================================

export const api_alertas = {
  async listar(soloActivas = false): Promise<Alerta[]> {
    return smartFetch(
      async () => {
        const r = await fetch(`/api/alertas/?activas=${soloActivas}`)
        if (!r.ok) throw new Error('Backend error')
        return r.json()
      },
      () => (soloActivas ? MOCK_ALERTAS.filter((a) => !a.resuelta) : MOCK_ALERTAS),
    )
  },
}

// =========================================================================
// API: PROVEEDORES
// =========================================================================

export const api_proveedores = {
  async listar(): Promise<Proveedor[]> {
    return MOCK_PROVEEDORES
  },

  async pedidos(): Promise<PedidoProveedor[]> {
    return MOCK_PEDIDOS_PROVEEDOR
  },

  async crearPedido(proveedorId: number, items: Array<{ materia_prima_id: number; cantidad: number }>) {
    const proveedor = MOCK_PROVEEDORES.find((p) => p.id === proveedorId)
    if (!proveedor) throw new Error('Proveedor no encontrado')

    const itemsDetallados = items.map((item) => {
      const mp = MOCK_PRODUCTOS.find((p) => p.id === item.materia_prima_id)
      if (!mp) throw new Error(`Materia prima ${item.materia_prima_id} no encontrada`)
      return {
        materia_prima_id: mp.id,
        cantidad: item.cantidad,
        unidad: mp.unidad,
        precio_unitario: Number(mp.costo_unitario),
        subtotal: Number(mp.costo_unitario) * item.cantidad,
      }
    })

    const total = itemsDetallados.reduce((s, i) => s + i.subtotal, 0)
    if (total < proveedor.min_pedido) {
      throw new Error(`Pedido mínimo: ${formatCOP(proveedor.min_pedido)}`)
    }

    const nuevoPedido: PedidoProveedor = {
      id: Math.max(...MOCK_PEDIDOS_PROVEEDOR.map((p) => p.id), 0) + 1,
      proveedor_id: proveedorId,
      fecha: new Date().toISOString(),
      estado: 'enviado',
      total,
      items: itemsDetallados,
      fecha_entrega_estimada: new Date(Date.now() + proveedor.dias_entrega * 86_400_000).toISOString(),
    }

    MOCK_PEDIDOS_PROVEEDOR.push(nuevoPedido)
    return nuevoPedido
  },
}

// =========================================================================
// API: CIERRE DE CAJA
// =========================================================================

export const api_caja = {
  async conteoHoy() {
    return getConteoCajaHoy()
  },

  async cerrarCaja(conteoFinal: { billetes: Array<{ denominacion: number; cantidad: number }>; monedas: Array<{ denominacion: number; cantidad: number }>; notas?: string }) {
    // Calcular total contado
    let totalContado = 0
    for (const b of conteoFinal.billetes) totalContado += b.denominacion * b.cantidad
    for (const m of conteoFinal.monedas) totalContado += m.denominacion * m.cantidad

    const conteoBase = getConteoCajaHoy()
    return {
      ...conteoBase,
      total_contado: totalContado,
      diferencia: totalContado - conteoBase.esperado_en_caja,
      cerrado: true,
      cerrado_at: new Date().toISOString(),
      notas: conteoFinal.notas || '',
      billetes: conteoFinal.billetes.map((b) => ({
        denominacion: b.denominacion,
        tipo: 'billete' as const,
        cantidad: b.cantidad,
        subtotal: b.denominacion * b.cantidad,
      })),
      monedas: conteoFinal.monedas.map((m) => ({
        denominacion: m.denominacion,
        tipo: 'moneda' as const,
        cantidad: m.cantidad,
        subtotal: m.denominacion * m.cantidad,
      })),
    }
  },
}

// =========================================================================
// API: HISTORIAL
// =========================================================================

export const api_historial = {
  async ventas(dias = 30) {
    return getHistorialVentas(dias)
  },

  async kpisHoy() {
    return getKPIsHoy()
  },
}

// Indicador para la UI: ¿estamos usando mocks?
export function isUsingMocks(): boolean {
  return backendDisponible === false || USE_MOCKS_ONLY
}