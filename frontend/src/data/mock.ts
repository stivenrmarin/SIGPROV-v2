// Mock data realista — Panaderia-Cafeteria "El Rincon"
// Caso de estudio del Proyecto Integrador 2026-2

import type {
  Producto, Receta as RecetaType, Venta, ResumenHoy, SemanaData,
  AlertaStock, Alerta, Festivo, TopProducto, PuntoSerie, Categoria,
  Mesa, Combo, ItemVentaCompleto,
} from '@/types'
import { formatCOP, fechaISO, hoyISO, diasAtrasISO } from '@/lib/utils'

// Seed estable para que los mocks sean reproducibles
let _seed = 42
const rng = () => {
  _seed = (_seed * 9301 + 49297) % 233280
  return _seed / 233280
}
const randint = (min: number, max: number) => Math.floor(rng() * (max - min + 1)) + min
const choice = <T,>(arr: T[]) => arr[Math.floor(rng() * arr.length)]
const randfloat = (min: number, max: number) => rng() * (max - min) + min

// =========================================================================
// PRODUCTOS
// =========================================================================

const PRODUCTOS_TERMINADOS: Omit<Producto, 'id'>[] = [
  // Panes (con receta)
  { nombre: 'Pan francés',       tipo: 'terminado', categoria: 'panes',    precio_venta: 3000,  costo_unitario: 1200, unidad: 'unidad', stock_actual: 145, stock_minimo: 30, activo: true },
  { nombre: 'Pan dulce',          tipo: 'terminado', categoria: 'panes',    precio_venta: 2500,  costo_unitario: 1000, unidad: 'unidad', stock_actual: 89,  stock_minimo: 20, activo: true },
  { nombre: 'Almojábana',         tipo: 'terminado', categoria: 'panes',    precio_venta: 3500,  costo_unitario: 1400, unidad: 'unidad', stock_actual: 56,  stock_minimo: 15, activo: true },
  { nombre: 'Croissant',          tipo: 'terminado', categoria: 'panes',    precio_venta: 4500,  costo_unitario: 1800, unidad: 'unidad', stock_actual: 28,  stock_minimo: 12, activo: true },
  { nombre: 'Pandebono',          tipo: 'terminado', categoria: 'panes',    precio_venta: 2800,  costo_unitario: 1100, unidad: 'unidad', stock_actual: 73,  stock_minimo: 20, activo: true },
  { nombre: 'Tostado',            tipo: 'terminado', categoria: 'panes',    precio_venta: 6000,  costo_unitario: 2400, unidad: 'unidad', stock_actual: 19,  stock_minimo: 8,  activo: true },
  { nombre: 'Pastel chocolate',   tipo: 'terminado', categoria: 'pasteles', precio_venta: 4500,  costo_unitario: 1800, unidad: 'unidad', stock_actual: 8,   stock_minimo: 5,  activo: true },
  { nombre: 'Pastel arequipe',    tipo: 'terminado', categoria: 'pasteles', precio_venta: 4500,  costo_unitario: 1800, unidad: 'unidad', stock_actual: 11,  stock_minimo: 5,  activo: true },
  { nombre: 'Brazo de reina',     tipo: 'terminado', categoria: 'pasteles', precio_venta: 3800,  costo_unitario: 1500, unidad: 'unidad', stock_actual: 6,   stock_minimo: 5,  activo: true },
  { nombre: 'Tamal santandereano', tipo: 'terminado', categoria: 'otros',   precio_venta: 5500,  costo_unitario: 2200, unidad: 'unidad', stock_actual: 24,  stock_minimo: 10, activo: true },
  { nombre: 'Huevos pericos',     tipo: 'terminado', categoria: 'otros',    precio_venta: 4000,  costo_unitario: 1500, unidad: 'unidad', stock_actual: 32,  stock_minimo: 8,  activo: true },
  { nombre: 'Calentado paisa',    tipo: 'terminado', categoria: 'otros',    precio_venta: 8500,  costo_unitario: 3500, unidad: 'unidad', stock_actual: 15,  stock_minimo: 5,  activo: true },
  { nombre: 'Chocolate santafereño', tipo: 'terminado', categoria: 'cafes', precio_venta: 4500,  costo_unitario: 1200, unidad: 'unidad', stock_actual: 999, stock_minimo: 0,  activo: true },
  // Cafés
  { nombre: 'Tinto',              tipo: 'terminado', categoria: 'cafes',    precio_venta: 2500,  costo_unitario: 500,  unidad: 'unidad', stock_actual: 999, stock_minimo: 0,  activo: true },
  { nombre: 'Café con leche',     tipo: 'terminado', categoria: 'cafes',    precio_venta: 3500,  costo_unitario: 800,  unidad: 'unidad', stock_actual: 999, stock_minimo: 0,  activo: true },
  { nombre: 'Capuchino',          tipo: 'terminado', categoria: 'cafes',    precio_venta: 5500,  costo_unitario: 1200, unidad: 'unidad', stock_actual: 999, stock_minimo: 0,  activo: true },
  { nombre: 'Aromática',          tipo: 'terminado', categoria: 'cafes',    precio_venta: 3000,  costo_unitario: 400,  unidad: 'unidad', stock_actual: 999, stock_minimo: 0,  activo: true },
  // Bebidas Postobón
  { nombre: 'Colombiana',         tipo: 'terminado', categoria: 'bebidas_postobon', precio_venta: 3500, costo_unitario: 1800, unidad: 'unidad', stock_actual: 87, stock_minimo: 24, activo: true },
  { nombre: 'Manzana Postobón',   tipo: 'terminado', categoria: 'bebidas_postobon', precio_venta: 3500, costo_unitario: 1800, unidad: 'unidad', stock_actual: 64, stock_minimo: 24, activo: true },
  { nombre: 'Pony Malta',         tipo: 'terminado', categoria: 'bebidas_postobon', precio_venta: 4000, costo_unitario: 2000, unidad: 'unidad', stock_actual: 42, stock_minimo: 24, activo: true },
  { nombre: 'Hit naranja',        tipo: 'terminado', categoria: 'bebidas_postobon', precio_venta: 4500, costo_unitario: 2200, unidad: 'unidad', stock_actual: 28, stock_minimo: 24, activo: true },
  { nombre: 'Hit mango',          tipo: 'terminado', categoria: 'bebidas_postobon', precio_venta: 4500, costo_unitario: 2200, unidad: 'unidad', stock_actual: 31, stock_minimo: 24, activo: true },
  { nombre: 'Brisa',              tipo: 'terminado', categoria: 'bebidas_postobon', precio_venta: 3500, costo_unitario: 1800, unidad: 'unidad', stock_actual: 53, stock_minimo: 24, activo: true },
  { nombre: 'Agua Cristal',       tipo: 'terminado', categoria: 'bebidas_postobon', precio_venta: 2500, costo_unitario: 1200, unidad: 'unidad', stock_actual: 120,stock_minimo: 24, activo: true },
  { nombre: 'Mr. Tea',            tipo: 'terminado', categoria: 'bebidas_postobon', precio_venta: 4000, costo_unitario: 2000, unidad: 'unidad', stock_actual: 19, stock_minimo: 24, activo: true },
  // Otros
  { nombre: 'Galletas paquete',   tipo: 'terminado', categoria: 'galletas', precio_venta: 5500,  costo_unitario: 2500, unidad: 'unidad', stock_actual: 34,  stock_minimo: 10, activo: true },
  { nombre: 'Empanada',           tipo: 'terminado', categoria: 'otros',    precio_venta: 3500,  costo_unitario: 1500, unidad: 'unidad', stock_actual: 47,  stock_minimo: 12, activo: true },
]

const MATERIAS_PRIMAS: Omit<Producto, 'id'>[] = [
  { nombre: 'Harina',          tipo: 'materia_prima', categoria: 'materia_prima', precio_venta: null, costo_unitario: 3500,  unidad: 'kg',     stock_actual: 50,  stock_minimo: 10, activo: true },
  { nombre: 'Levadura',        tipo: 'materia_prima', categoria: 'materia_prima', precio_venta: null, costo_unitario: 12000, unidad: 'kg',     stock_actual: 2,   stock_minimo: 1,  activo: true },
  { nombre: 'Mantequilla',     tipo: 'materia_prima', categoria: 'materia_prima', precio_venta: null, costo_unitario: 18000, unidad: 'kg',     stock_actual: 5,   stock_minimo: 2,  activo: true },
  { nombre: 'Azúcar',          tipo: 'materia_prima', categoria: 'materia_prima', precio_venta: null, costo_unitario: 4500,  unidad: 'kg',     stock_actual: 15,  stock_minimo: 5,  activo: true },
  { nombre: 'Sal',             tipo: 'materia_prima', categoria: 'materia_prima', precio_venta: null, costo_unitario: 2000,  unidad: 'kg',     stock_actual: 3,   stock_minimo: 1,  activo: true },
  { nombre: 'Queso',           tipo: 'materia_prima', categoria: 'materia_prima', precio_venta: null, costo_unitario: 22000, unidad: 'kg',     stock_actual: 4,   stock_minimo: 1,  activo: true },
  { nombre: 'Arequipe',        tipo: 'materia_prima', categoria: 'materia_prima', precio_venta: null, costo_unitario: 16000, unidad: 'kg',     stock_actual: 3,   stock_minimo: 1,  activo: true },
  { nombre: 'Leche',           tipo: 'materia_prima', categoria: 'materia_prima', precio_venta: null, costo_unitario: 5500,  unidad: 'litros', stock_actual: 20,  stock_minimo: 5,  activo: true },
  { nombre: 'Chocolate',       tipo: 'materia_prima', categoria: 'materia_prima', precio_venta: null, costo_unitario: 28000, unidad: 'kg',     stock_actual: 2,   stock_minimo: 1,  activo: true },
  { nombre: 'Café molido',     tipo: 'materia_prima', categoria: 'materia_prima', precio_venta: null, costo_unitario: 35000, unidad: 'kg',     stock_actual: 3,   stock_minimo: 1,  activo: true },
  { nombre: 'Huevos',          tipo: 'materia_prima', categoria: 'materia_prima', precio_venta: null, costo_unitario: 18000, unidad: 'unidad', stock_actual: 200, stock_minimo: 50, activo: true },
  { nombre: 'Aceite',          tipo: 'materia_prima', categoria: 'materia_prima', precio_venta: null, costo_unitario: 12000, unidad: 'litros', stock_actual: 5,   stock_minimo: 2,  activo: true },
  { nombre: 'Papa',            tipo: 'materia_prima', categoria: 'materia_prima', precio_venta: null, costo_unitario: 3500,  unidad: 'kg',     stock_actual: 10,  stock_minimo: 3,  activo: true },
]

// Generar productos con id
export const MOCK_PRODUCTOS: Producto[] = [
  ...PRODUCTOS_TERMINADOS.map((p, i) => ({ ...p, id: i + 1 })),
  ...MATERIAS_PRIMAS.map((p, i) => ({ ...p, id: PRODUCTOS_TERMINADOS.length + i + 1 })),
] as Producto[]

// =========================================================================
// COMBOS (típicos de panadería colombiana)
// =========================================================================

export const MOCK_COMBOS: Combo[] = [
  {
    id: 1,
    nombre: 'Desayuno Completo',
    descripcion: 'Calentado paisa + Huevos pericos + Tinto',
    precio_combo: 13000,
    precio_individual_suma: 15000,
    categoria: 'combos',
    disponible: true,
    destacado: true,
    items: [
      { producto_id: 12, cantidad: 1 }, // Calentado paisa
      { producto_id: 11, cantidad: 1 }, // Huevos pericos
      { producto_id: 14, cantidad: 1 }, // Tinto
    ],
  },
  {
    id: 2,
    nombre: 'Tamal con Chocolate',
    descripcion: 'Tamal santandereano + Chocolate santafereño',
    precio_combo: 9500,
    precio_individual_suma: 10000,
    categoria: 'combos',
    disponible: true,
    destacado: true,
    items: [
      { producto_id: 10, cantidad: 1 }, // Tamal santandereano
      { producto_id: 13, cantidad: 1 }, // Chocolate santafereño
    ],
  },
  {
    id: 3,
    nombre: 'Combo Pan + Café',
    descripcion: 'Pan francés + Café con leche',
    precio_combo: 5500,
    precio_individual_suma: 6500,
    categoria: 'combos',
    disponible: true,
    destacado: true,
    items: [
      { producto_id: 1,  cantidad: 1 }, // Pan francés
      { producto_id: 15, cantidad: 1 }, // Café con leche
    ],
  },
  {
    id: 4,
    nombre: 'Combo Familiar',
    descripcion: '4 panes + Colombiana + Brisa',
    precio_combo: 14500,
    precio_individual_suma: 17500,
    categoria: 'combos',
    disponible: true,
    items: [
      { producto_id: 1,  cantidad: 4 }, // 4 Panes
      { producto_id: 18, cantidad: 1 }, // Colombiana
      { producto_id: 23, cantidad: 1 }, // Brisa
    ],
  },
  {
    id: 5,
    nombre: 'Almuerzo Express',
    descripcion: 'Empanada + Tinto + Almojábana',
    precio_combo: 7500,
    precio_individual_suma: 9500,
    categoria: 'combos',
    disponible: true,
    items: [
      { producto_id: 27, cantidad: 1 }, // Empanada
      { producto_id: 14, cantidad: 1 }, // Tinto
      { producto_id: 3,  cantidad: 1 }, // Almojábana
    ],
  },
  {
    id: 6,
    nombre: 'Combo Postobón',
    descripcion: '2 Bebidas Postobón a elección',
    precio_combo: 6500,
    precio_individual_suma: 7000,
    categoria: 'combos',
    disponible: true,
    destacado: true,
    items: [
      { producto_id: 18, cantidad: 1 }, // Colombiana
      { producto_id: 19, cantidad: 1 }, // Manzana Postobón
    ],
  },
  {
    id: 7,
    nombre: 'Combo Pandebono',
    descripcion: 'Pandebono + Café con leche',
    precio_combo: 5500,
    precio_individual_suma: 6300,
    categoria: 'combos',
    disponible: true,
    items: [
      { producto_id: 5,  cantidad: 1 }, // Pandebono
      { producto_id: 15, cantidad: 1 }, // Café con leche
    ],
  },
  {
    id: 8,
    nombre: 'Combo Croissant',
    descripcion: 'Croissant + Capuchino',
    precio_combo: 8500,
    precio_individual_suma: 10000,
    categoria: 'combos',
    disponible: true,
    destacado: true,
    items: [
      { producto_id: 4,  cantidad: 1 }, // Croissant
      { producto_id: 16, cantidad: 1 }, // Capuchino
    ],
  },
]

// =========================================================================
// MESAS (12 mesas distribuidas por zonas)
// =========================================================================

function randomItemsParaMesa(): ItemVentaCompleto[] {
  // Genera 1-4 items aleatorios para simular una mesa activa
  const prods = MOCK_PRODUCTOS.filter((p) => p.tipo === 'terminado')
  const nItems = choice([1, 2, 2, 3, 3, 4])
  const items: ItemVentaCompleto[] = []
  const usados = new Set<number>()
  for (let i = 0; i < nItems; i++) {
    let prod: Producto
    do {
      prod = choice(prods)
    } while (usados.has(prod.id) && usados.size < prods.length)
    usados.add(prod.id)
    const cant = choice([1, 1, 2, 2, 3])
    items.push({
      producto_id: prod.id,
      cantidad: cant,
      precio_unitario: prod.precio_venta ?? 0,
      subtotal: (prod.precio_venta ?? 0) * cant,
      nombre_producto: prod.nombre,
    })
  }
  return items
}

export const MOCK_MESAS: Mesa[] = [
  // Salón principal (6 mesas)
  { id: 1, numero: 1, capacidad: 4, zona: 'salon_principal', estado: 'libre',  venta_actual_id: null, ocupada_desde: null, total_acumulado: 0, items_actuales: [] },
  { id: 2, numero: 2, capacidad: 4, zona: 'salon_principal', estado: 'ocupada', venta_actual_id: 1001, ocupada_desde: new Date(Date.now() - 28*60*1000), total_acumulado: 34500, items_actuales: [
    { producto_id: 1, cantidad: 2, precio_unitario: 3000, subtotal: 6000, nombre_producto: 'Pan francés' },
    { producto_id: 15, cantidad: 2, precio_unitario: 3500, subtotal: 7000, nombre_producto: 'Café con leche' },
    { producto_id: 27, cantidad: 3, precio_unitario: 3500, subtotal: 10500, nombre_producto: 'Empanada' },
    { producto_id: 18, cantidad: 2, precio_unitario: 3500, subtotal: 7000, nombre_producto: 'Colombiana' },
    { producto_id: 3, cantidad: 1, precio_unitario: 3500, subtotal: 3500, nombre_producto: 'Almojábana' },
  ] },
  { id: 3, numero: 3, capacidad: 2, zona: 'salon_principal', estado: 'libre',  venta_actual_id: null, ocupada_desde: null, total_acumulado: 0, items_actuales: [] },
  { id: 4, numero: 4, capacidad: 4, zona: 'salon_principal', estado: 'pidiendo_cuenta', venta_actual_id: 1002, ocupada_desde: new Date(Date.now() - 55*60*1000), total_acumulado: 47800, items_actuales: randomItemsParaMesa() },
  { id: 5, numero: 5, capacidad: 6, zona: 'salon_principal', estado: 'ocupada', venta_actual_id: 1003, ocupada_desde: new Date(Date.now() - 12*60*1000), total_acumulado: 18900, items_actuales: randomItemsParaMesa() },
  { id: 6, numero: 6, capacidad: 2, zona: 'salon_principal', estado: 'libre',  venta_actual_id: null, ocupada_desde: null, total_acumulado: 0, items_actuales: [] },

  // Terraza (3 mesas)
  { id: 7, numero: 7, capacidad: 4, zona: 'terraza', estado: 'ocupada', venta_actual_id: 1004, ocupada_desde: new Date(Date.now() - 8*60*1000), total_acumulado: 9200, items_actuales: randomItemsParaMesa() },
  { id: 8, numero: 8, capacidad: 4, zona: 'terraza', estado: 'libre',  venta_actual_id: null, ocupada_desde: null, total_acumulado: 0, items_actuales: [] },
  { id: 9, numero: 9, capacidad: 2, zona: 'terraza', estado: 'libre',  venta_actual_id: null, ocupada_desde: null, total_acumulado: 0, items_actuales: [] },

  // Barra (2 sillas)
  { id: 10, numero: 'B1', capacidad: 1, zona: 'barra', estado: 'ocupada', venta_actual_id: 1005, ocupada_desde: new Date(Date.now() - 4*60*1000), total_acumulado: 5500, items_actuales: randomItemsParaMesa() },
  { id: 11, numero: 'B2', capacidad: 1, zona: 'barra', estado: 'libre',  venta_actual_id: null, ocupada_desde: null, total_acumulado: 0, items_actuales: [] },

  // Patio (1 mesa grande)
  { id: 12, numero: 12, capacidad: 8, zona: 'patio', estado: 'reservada', venta_actual_id: null, ocupada_desde: null, total_acumulado: 0, items_actuales: [] },
]

// =========================================================================
// RECETAS (BOM)
// =========================================================================

export const MOCK_RECETAS: RecetaType[] = [
  // Pan francés
  { id: 1,  producto_terminado_id: 1, materia_prima_id: 14, cantidad_necesaria: 0.300 }, // harina
  { id: 2,  producto_terminado_id: 1, materia_prima_id: 15, cantidad_necesaria: 0.050 }, // levadura
  { id: 3,  producto_terminado_id: 1, materia_prima_id: 16, cantidad_necesaria: 0.020 }, // mantequilla
  { id: 4,  producto_terminado_id: 1, materia_prima_id: 18, cantidad_necesaria: 0.005 }, // sal
  // Pan dulce
  { id: 5,  producto_terminado_id: 2, materia_prima_id: 14, cantidad_necesaria: 0.250 },
  { id: 6,  producto_terminado_id: 2, materia_prima_id: 15, cantidad_necesaria: 0.040 },
  { id: 7,  producto_terminado_id: 2, materia_prima_id: 17, cantidad_necesaria: 0.050 },
  { id: 8,  producto_terminado_id: 2, materia_prima_id: 24, cantidad_necesaria: 1     }, // huevos MP
  // Almojábana
  { id: 9,  producto_terminado_id: 3, materia_prima_id: 14, cantidad_necesaria: 0.150 },
  { id: 10, producto_terminado_id: 3, materia_prima_id: 19, cantidad_necesaria: 0.080 }, // queso
  { id: 11, producto_terminado_id: 3, materia_prima_id: 24, cantidad_necesaria: 1     },
  // Croissant
  { id: 12, producto_terminado_id: 4, materia_prima_id: 14, cantidad_necesaria: 0.150 },
  { id: 13, producto_terminado_id: 4, materia_prima_id: 16, cantidad_necesaria: 0.040 },
  { id: 14, producto_terminado_id: 4, materia_prima_id: 17, cantidad_necesaria: 0.030 },
  { id: 15, producto_terminado_id: 4, materia_prima_id: 21, cantidad_necesaria: 0.025 }, // leche
  // Pandebono
  { id: 16, producto_terminado_id: 5, materia_prima_id: 14, cantidad_necesaria: 0.100 },
  { id: 17, producto_terminado_id: 5, materia_prima_id: 19, cantidad_necesaria: 0.080 },
  { id: 18, producto_terminado_id: 5, materia_prima_id: 24, cantidad_necesaria: 1     },
  // Tinto
  { id: 19, producto_terminado_id: 14, materia_prima_id: 23, cantidad_necesaria: 0.020 }, // café molido
  // Café con leche
  { id: 20, producto_terminado_id: 15, materia_prima_id: 23, cantidad_necesaria: 0.020 },
  { id: 21, producto_terminado_id: 15, materia_prima_id: 21, cantidad_necesaria: 0.200 },
  // Capuchino
  { id: 22, producto_terminado_id: 16, materia_prima_id: 23, cantidad_necesaria: 0.025 },
  { id: 23, producto_terminado_id: 16, materia_prima_id: 21, cantidad_necesaria: 0.250 },
]

// =========================================================================
// FESTIVOS COLOMBIANOS 2025-2026 (Ley Emiliani)
// =========================================================================

export const MOCK_FESTIVOS: Festivo[] = [
  // 2025
  { fecha: '2025-01-01', nombre: 'Año Nuevo',                  tipo: 'fin_anio',     efecto_venta:  0.40 },
  { fecha: '2025-01-06', nombre: 'Día de Reyes',               tipo: 'festivo',      efecto_venta: -0.30 },
  { fecha: '2025-03-24', nombre: 'Día de San José',            tipo: 'festivo',      efecto_venta: -0.30 },
  { fecha: '2025-04-13', nombre: 'Domingo de Ramos',           tipo: 'semana_santa', efecto_venta: -0.90 },
  { fecha: '2025-04-17', nombre: 'Jueves Santo',               tipo: 'semana_santa', efecto_venta: -0.90 },
  { fecha: '2025-04-18', nombre: 'Viernes Santo',              tipo: 'semana_santa', efecto_venta: -0.90 },
  { fecha: '2025-04-20', nombre: 'Domingo de Resurrección',    tipo: 'semana_santa', efecto_venta: -0.50 },
  { fecha: '2025-05-01', nombre: 'Día del Trabajo',            tipo: 'festivo',      efecto_venta: -0.30 },
  { fecha: '2025-06-02', nombre: 'Ascensión del Señor',        tipo: 'puente',       efecto_venta: -0.30 },
  { fecha: '2025-06-23', nombre: 'Corpus Christi',             tipo: 'festivo',      efecto_venta: -0.30 },
  { fecha: '2025-06-30', nombre: 'San Pedro y San Pablo',      tipo: 'festivo',      efecto_venta: -0.30 },
  { fecha: '2025-07-20', nombre: 'Día de la Independencia',    tipo: 'festivo',      efecto_venta: -0.30 },
  { fecha: '2025-08-07', nombre: 'Batalla de Boyacá',          tipo: 'festivo',      efecto_venta: -0.30 },
  { fecha: '2025-08-18', nombre: 'Asunción de la Virgen',      tipo: 'festivo',      efecto_venta: -0.30 },
  { fecha: '2025-10-12', nombre: 'Día de la Raza',             tipo: 'festivo',      efecto_venta: -0.30 },
  { fecha: '2025-11-03', nombre: 'Todos los Santos',           tipo: 'puente',       efecto_venta: -0.30 },
  { fecha: '2025-11-17', nombre: 'Independencia de Cartagena', tipo: 'festivo',      efecto_venta: -0.30 },
  { fecha: '2025-12-08', nombre: 'Inmaculada Concepción',      tipo: 'festivo',      efecto_venta: -0.30 },
  { fecha: '2025-12-25', nombre: 'Navidad',                    tipo: 'navidad',      efecto_venta:  0.40 },
  { fecha: '2025-12-31', nombre: 'Víspera de Año Nuevo',       tipo: 'fin_anio',     efecto_venta:  0.40 },
  // 2026
  { fecha: '2026-01-01', nombre: 'Año Nuevo',                  tipo: 'fin_anio',     efecto_venta:  0.40 },
  { fecha: '2026-01-12', nombre: 'Día de Reyes',               tipo: 'puente',       efecto_venta: -0.30 },
  { fecha: '2026-03-23', nombre: 'Día de San José',            tipo: 'puente',       efecto_venta: -0.30 },
  { fecha: '2026-04-02', nombre: 'Jueves Santo',               tipo: 'semana_santa', efecto_venta: -0.90 },
  { fecha: '2026-04-03', nombre: 'Viernes Santo',              tipo: 'semana_santa', efecto_venta: -0.90 },
  { fecha: '2026-04-05', nombre: 'Domingo de Resurrección',    tipo: 'semana_santa', efecto_venta: -0.50 },
  { fecha: '2026-05-01', nombre: 'Día del Trabajo',            tipo: 'festivo',      efecto_venta: -0.30 },
  { fecha: '2026-05-25', nombre: 'Ascensión del Señor',        tipo: 'puente',       efecto_venta: -0.30 },
  { fecha: '2026-06-15', nombre: 'Corpus Christi',             tipo: 'puente',       efecto_venta: -0.30 },
  { fecha: '2026-06-29', nombre: 'San Pedro y San Pablo',      tipo: 'puente',       efecto_venta: -0.30 },
  { fecha: '2026-07-20', nombre: 'Día de la Independencia',    tipo: 'festivo',      efecto_venta: -0.30 },
  { fecha: '2026-08-07', nombre: 'Batalla de Boyacá',          tipo: 'festivo',      efecto_venta: -0.30 },
  { fecha: '2026-08-17', nombre: 'Asunción de la Virgen',      tipo: 'puente',       efecto_venta: -0.30 },
  { fecha: '2026-10-12', nombre: 'Día de la Raza',             tipo: 'festivo',      efecto_venta: -0.30 },
  { fecha: '2026-11-02', nombre: 'Todos los Santos',           tipo: 'puente',       efecto_venta: -0.30 },
  { fecha: '2026-11-16', nombre: 'Independencia de Cartagena', tipo: 'puente',       efecto_venta: -0.30 },
  { fecha: '2026-12-08', nombre: 'Inmaculada Concepción',      tipo: 'festivo',      efecto_venta: -0.30 },
  { fecha: '2026-12-25', nombre: 'Navidad',                    tipo: 'navidad',      efecto_venta:  0.40 },
  { fecha: '2026-12-31', nombre: 'Víspera de Año Nuevo',       tipo: 'fin_anio',     efecto_venta:  0.40 },
]

// =========================================================================
// VENTAS (12 meses: oct 2025 → oct 2026)
// =========================================================================

function getFestivo(date: string): Festivo | undefined {
  return MOCK_FESTIVOS.find((f) => f.fecha === date)
}

function generarVentas(): Venta[] {
  const ventas: Venta[] = []

  // El dataset va anclado a HOY: 12 meses hacia atras hasta la fecha actual.
  // Si se dejara una fecha fija de fin, en cuanto esa fecha pasara las ventanas
  // de "hoy" y "ultimos 7 dias" quedarian vacias y los graficos quedarian en cero.
  const hoy = new Date()
  const inicio = new Date(hoy.getFullYear(), hoy.getMonth() - 12, hoy.getDate())
  const fin = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())
  const productosTerminados = MOCK_PRODUCTOS.filter((p) => p.tipo === 'terminado')

  // Pesos de venta por producto (algunos son bestsellers)
  const pesos: number[] = []
  for (const p of productosTerminados) {
    if (['Colombiana', 'Tinto', 'Pan francés', 'Manzana Postobón'].includes(p.nombre)) pesos.push(15)
    else if (['Café con leche', 'Pan dulce', 'Almojábana'].includes(p.nombre)) pesos.push(10)
    else pesos.push(5)
  }

  let ventaId = 1
  for (let d = new Date(inicio); d <= fin; d.setDate(d.getDate() + 1)) {
    const fechaStr = fechaISO(d)
    const festivo = getFestivo(fechaStr)
    let multiplicador = 1

    if (festivo) {
      multiplicador = 1 + festivo.efecto_venta
    } else {
      const wd = d.getDay()
      if (wd === 5 || wd === 6) multiplicador = 1.5
      else if (wd === 4) multiplicador = 1.2
      else multiplicador = 1.0

      // Tendencia anual +2% mensual (medida desde el inicio del dataset)
      const meses = (d.getFullYear() - inicio.getFullYear()) * 12 + (d.getMonth() - inicio.getMonth())
      multiplicador *= 1 + 0.02 * meses

      // Ruido
      multiplicador *= randfloat(0.85, 1.15)
    }

    const nVentas = Math.max(5, Math.floor(80 * multiplicador))

    for (let i = 0; i < nVentas; i++) {
      const nItems = choice([1, 1, 1, 2, 2, 3])
      const itemsCount: Record<number, number> = {}
      for (let j = 0; j < nItems; j++) {
        const idx = Math.floor(rng() * pesos.length)
        const cant = choice([1, 1, 1, 2, 2, 3, 5])
        itemsCount[productosTerminados[idx].id] = (itemsCount[productosTerminados[idx].id] || 0) + cant
      }

      let total = 0
      const itemsCompletos: Venta['items'] = []
      for (const [pid, cant] of Object.entries(itemsCount)) {
        const prod = MOCK_PRODUCTOS.find((p) => p.id === Number(pid))!
        const precio = prod.precio_venta || 0
        const subtotal = precio * cant
        total += subtotal
        itemsCompletos.push({
          producto_id: prod.id,
          cantidad: cant,
          precio_unitario: precio,
          subtotal,
          nombre_producto: prod.nombre,
        })
      }

      const hora = choice([6, 7, 7, 7, 8, 8, 9, 9, 10, 11, 12, 14, 15, 16, 17, 18, 19])
      const minuto = randint(0, 59)

      ventas.push({
        id: ventaId++,
        fecha: `${fechaStr}T${String(hora).padStart(2, '0')}:${String(minuto).padStart(2, '0')}:00`,
        total,
        metodo_pago: choice(['efectivo', 'efectivo', 'efectivo', 'transferencia', 'datáfono']),
        items: itemsCompletos,
      })
    }
  }
  return ventas
}

export const MOCK_VENTAS: Venta[] = generarVentas()

// =========================================================================
// RESUMEN HOY
// =========================================================================

function getResumenHoy(): ResumenHoy {
  const hoy = hoyISO()
  const ayer = diasAtrasISO(1)

  const ventasHoy = MOCK_VENTAS.filter((v) => v.fecha.startsWith(hoy))
  const ventasAyer = MOCK_VENTAS.filter((v) => v.fecha.startsWith(ayer))

  const totalHoy = ventasHoy.reduce((sum, v) => sum + v.total, 0)
  const totalAyer = ventasAyer.reduce((sum, v) => sum + v.total, 0)

  const festivoHoy = getFestivo(hoy)

  const stockBajo = MOCK_PRODUCTOS.filter(
    (p) => p.tipo === 'terminado' && p.stock_actual <= p.stock_minimo && p.stock_minimo > 0,
  ).length

  const vsAyer = totalAyer > 0 ? ((totalHoy - totalAyer) / totalAyer) * 100 : 0

  // Sparkline: total vendido cada uno de los últimos 7 días (ayer hacia atrás)
  const sparkVentas: number[] = []
  for (let i = 6; i >= 0; i--) {
    const d = diasAtrasISO(i)
    const ventasDia = MOCK_VENTAS.filter((v) => v.fecha.startsWith(d))
    sparkVentas.push(ventasDia.reduce((s, v) => s + v.total, 0))
  }

  return {
    fecha: hoy,
    total_vendido: totalHoy,
    num_ventas: ventasHoy.length,
    ticket_promedio: ventasHoy.length > 0 ? totalHoy / ventasHoy.length : 0,
    vs_ayer_pct: Number(vsAyer.toFixed(1)),
    productos_stock_bajo: stockBajo,
    es_festivo: !!festivoHoy,
    nombre_festivo: festivoHoy?.nombre || null,
    sparkVentas,
  }
}

export const MOCK_RESUMEN_HOY: ResumenHoy = getResumenHoy()

// =========================================================================
// SEMANA (historico 7 + prediccion 7)
// =========================================================================

function generarSemana(): SemanaData {
  const hoy = new Date()
  const historico: PuntoSerie[] = []
  const prediccion: PuntoSerie[] = []

  for (let i = 6; i >= 0; i--) {
    const d = new Date(hoy)
    d.setDate(d.getDate() - i)
    const fechaStr = fechaISO(d)
    const ventasDia = MOCK_VENTAS.filter((v) => v.fecha.startsWith(fechaStr))
    const total = ventasDia.reduce((sum, v) => sum + v.total, 0)
    const festivo = getFestivo(fechaStr)
    historico.push({
      fecha: fechaStr,
      total,
      es_festivo: !!festivo,
      nombre_festivo: festivo?.nombre || null,
    })
  }

  // Predicción: tomar el promedio de los últimos 28 días del mismo día de la semana
  // + ajuste por festivo si aplica
  const ultimos28: Venta[] = []
  for (let i = 0; i < 28; i++) {
    const d = new Date(hoy)
    d.setDate(d.getDate() - i)
    const fs = fechaISO(d)
    ultimos28.push(...MOCK_VENTAS.filter((v) => v.fecha.startsWith(fs)))
  }

  for (let i = 1; i <= 7; i++) {
    const d = new Date(hoy)
    d.setDate(d.getDate() + i)
    const fechaStr = fechaISO(d)
    const wd = d.getDay()

    // Promedio del mismo día de la semana en últimos 28 días
    const mismas: number[] = []
    for (let j = 0; j < 28; j++) {
      const dd = new Date(d)
      dd.setDate(dd.getDate() - (j * 7 + wd - hoy.getDay()))
      const fs = fechaISO(dd)
      const ventasMismoDia = MOCK_VENTAS.filter((v) => v.fecha.startsWith(fs))
      if (ventasMismoDia.length > 0) {
        mismas.push(ventasMismoDia.reduce((s, v) => s + v.total, 0))
      }
    }

    const promedio = mismas.length > 0 ? mismas.reduce((a, b) => a + b, 0) / mismas.length : 0
    const festivo = getFestivo(fechaStr)
    const predicho = promedio * (festivo ? 1 + festivo.efecto_venta * 0.7 : 1)

    // Intervalo de confianza ±18% (MAPE simulado ~18%)
    const li = predicho * 0.82
    const ls = predicho * 1.18

    prediccion.push({
      fecha: fechaStr,
      total: Number(predicho.toFixed(0)),
      es_festivo: !!festivo,
      nombre_festivo: festivo?.nombre || null,
      limite_inferior: Number(li.toFixed(0)),
      limite_superior: Number(ls.toFixed(0)),
      es_prediccion: true,
    })
  }

  return {
    historico_7_dias: historico,
    prediccion_7_dias: prediccion,
    modelo_version: 'prophet-2026-10-19-v1',
  }
}

export const MOCK_SEMANA: SemanaData = generarSemana()

// =========================================================================
// ALERTAS STOCK
// =========================================================================

export const MOCK_ALERTAS_STOCK: AlertaStock[] = MOCK_PRODUCTOS.filter(
  (p) => p.tipo === 'terminado' && p.stock_minimo > 0 && p.stock_actual <= p.stock_minimo * 1.5,
).map((p) => ({
  producto_id: p.id,
  nombre: p.nombre,
  stock_actual: p.stock_actual,
  stock_minimo: p.stock_minimo,
  estado: p.stock_actual === 0 ? 'critico' : p.stock_actual <= p.stock_minimo ? 'bajo' : 'ok',
}))

// =========================================================================
// ALERTAS GENERALES
// =========================================================================

export const MOCK_ALERTAS: Alerta[] = [
  {
    id: 1,
    tipo: 'stock_bajo',
    titulo: 'Pastel arequipe bajo stock',
    mensaje: 'Quedan 8 unidades. Stock mínimo: 5. Pedir antes del viernes.',
    nivel: 'warning',
    created_at: new Date(Date.now() - 2 * 3600_000).toISOString(),
    resuelta: false,
  },
  {
    id: 2,
    tipo: 'stock_bajo',
    titulo: 'Mr. Tea por agotarse',
    mensaje: 'Solo quedan 19 unidades, debajo del mínimo (24).',
    nivel: 'critical',
    created_at: new Date(Date.now() - 5 * 3600_000).toISOString(),
    resuelta: false,
  },
  {
    id: 3,
    tipo: 'prediccion_alta',
    titulo: 'Sábado con ventas预计 altas',
    mensaje: 'El ML predice 18% más ventas que el sábado pasado. Asegúrate de tener harina suficiente.',
    nivel: 'info',
    created_at: new Date(Date.now() - 12 * 3600_000).toISOString(),
    resuelta: false,
  },
  {
    id: 4,
    tipo: 'festivo_manana',
    titulo: 'Festivo mañana',
    mensaje: 'Mañana es festivo (Asunción de la Virgen). Las ventas预计 bajar 18%.',
    nivel: 'info',
    created_at: new Date(Date.now() - 24 * 3600_000).toISOString(),
    resuelta: false,
  },
  {
    id: 5,
    tipo: 'stock_bajo',
    titulo: 'Levadura en stock mínimo',
    mensaje: 'Solo quedan 2 kg de levadura. Stock mínimo: 1 kg. Comprar esta semana.',
    nivel: 'warning',
    created_at: new Date(Date.now() - 48 * 3600_000).toISOString(),
    resuelta: true,
  },
]

// =========================================================================
// TOP PRODUCTOS (últimos 30 días)
// =========================================================================

export function getTopProductos(dias = 30): TopProducto[] {
  const desde = diasAtrasISO(dias)
  const ventas: Record<number, TopProducto> = {}

  for (const v of MOCK_VENTAS) {
    if (v.fecha < desde) continue
    for (const item of v.items) {
      const prod = MOCK_PRODUCTOS.find((p) => p.id === item.producto_id)
      if (!prod) continue
      if (!ventas[prod.id]) {
        ventas[prod.id] = {
          producto_id: prod.id,
          nombre: prod.nombre,
          categoria: prod.categoria as Categoria,
          cantidad_vendida: 0,
          ingresos: 0,
        }
      }
      ventas[prod.id].cantidad_vendida += item.cantidad
      ventas[prod.id].ingresos += item.subtotal
    }
  }

  return Object.values(ventas).sort((a, b) => b.cantidad_vendida - a.cantidad_vendida).slice(0, 10)
}

// =========================================================================
// MÉTRICAS ML (histórico de predicciones)
// =========================================================================

export interface MetricaML {
  fecha_prediccion: string
  cantidad_predicha: number
  cantidad_real: number
  error_pct: number
}

export const MOCK_METRICAS_ML: MetricaML[] = (() => {
  const out: MetricaML[] = []
  for (let i = 30; i >= 1; i--) {
    const fs = diasAtrasISO(i)
    const real = MOCK_VENTAS.filter((v) => v.fecha.startsWith(fs)).reduce((s, v) => s + v.total, 0)
    const error = (rng() - 0.5) * 30 // ±15%
    const pred = real * (1 + error / 100)
    out.push({
      fecha_prediccion: fs,
      cantidad_predicha: Math.round(pred),
      cantidad_real: Math.round(real),
      error_pct: Number(error.toFixed(1)),
    })
  }
  return out
})()

// Resumen métricas
export const MOCK_RESUMEN_METRICAS = {
  mape: Number(
    (MOCK_METRICAS_ML.reduce((s, m) => s + Math.abs(m.error_pct), 0) / MOCK_METRICAS_ML.length).toFixed(1),
  ),
  mae: Math.round(
    MOCK_METRICAS_ML.reduce((s, m) => s + Math.abs(m.cantidad_predicha - m.cantidad_real), 0) /
      MOCK_METRICAS_ML.length,
  ),
  n_predicciones_evaluadas: MOCK_METRICAS_ML.length,
  ultima_actualizacion: new Date().toISOString(),
}

// =========================================================================
// ANÁLISIS AVANZADOS (para Semana.tsx)
// =========================================================================

export interface DistribucionCategoria {
  categoria: Categoria
  total: number
  porcentaje: number
  unidades: number
  unidades_pct: number
}

export interface PrediccionProducto {
  producto_id: number
  nombre: string
  categoria: Categoria
  unidades_vendidas_7d: number
  unidades_vendidas_30d: number
  prediccion_7d: number
  prediccion_7d_min: number
  prediccion_7d_max: number
  stock_actual: number
  dias_cobertura: number // cuántos días alcanza con el ritmo actual
  recomendado_producir: number // unidades a PRODUCIR (no comprar)
  urgente: boolean // necesita producción antes de X días
  nivel: 'critico' | 'bajo' | 'ok' | 'exceso'
  // Para producción
  costo_unitario: number // COP por unidad (calculado desde MP)
  precio_venta: number
  margen_pct: number // % de margen
  // Materia prima necesaria
  materia_prima_necesaria: Array<{
    materia_prima: string
    unidad: string
    cantidad_por_unidad: number
    cantidad_total: number
    stock_actual_mp: number
    stock_suficiente: boolean
  }>
}

export interface TandaProduccion {
  id: number
  nombre: string // "Tanda mañana", "Tanda mediodía", "Tanda onces"
  hora_inicio: string // "04:00"
  hora_fin: string // "08:00"
  productos: Array<{
    producto: string
    cantidad: number
    tiempo_horneado_min: number
    listo_venta: string // "08:30"
  }>
  capacidad_horno_pct: number // 0-100
}

export interface MermaDiaria {
  fecha: string
  producto: string
  unidades_producidas: number
  unidades_vendidas: number
  unidades_mermadas: number
  merma_pct: number
  razon: 'excedente' | 'vencimiento' | 'daño' | 'otro'
  valor_perdido_cop: number
}

export interface HeatmapCelda {
  dia: number // 0=Dom, 6=Sáb
  hora: number // 0-23
  intensidad: number // 0-100
  ventas: number
}

export interface Recomendacion {
  tipo: 'pedido' | 'combo' | 'precio' | 'festivo'
  titulo: string
  descripcion: string
  impacto: string
  accion?: string
  nivel: 'alta' | 'media' | 'baja'
}

export function getDistribucionPorCategoria(dias = 30): DistribucionCategoria[] {
  const desde = Date.now() - dias * 86_400_000
  const ventasPorCat: Record<string, { total: number; unidades: number }> = {}

  for (const v of MOCK_VENTAS) {
    if (new Date(v.fecha).getTime() < desde) continue
    for (const item of v.items) {
      const prod = MOCK_PRODUCTOS.find((p) => p.id === item.producto_id)
      if (!prod) continue
      if (!ventasPorCat[prod.categoria]) {
        ventasPorCat[prod.categoria] = { total: 0, unidades: 0 }
      }
      ventasPorCat[prod.categoria].total += item.subtotal
      ventasPorCat[prod.categoria].unidades += item.cantidad
    }
  }

  const totalGlobal = Object.values(ventasPorCat).reduce((s, v) => s + v.total, 0)
  const totalUnidades = Object.values(ventasPorCat).reduce((s, v) => s + v.unidades, 0)

  return Object.entries(ventasPorCat)
    .map(([cat, datos]) => ({
      categoria: cat as Categoria,
      total: datos.total,
      unidades: datos.unidades,
      porcentaje: totalGlobal > 0 ? (datos.total / totalGlobal) * 100 : 0,
      unidades_pct: totalUnidades > 0 ? (datos.unidades / totalUnidades) * 100 : 0,
    }))
    .sort((a, b) => b.total - a.total)
}

export function getPrediccionesPorProducto(): PrediccionProducto[] {
  // Calcular ventas históricas por producto
  const hace30d = Date.now() - 30 * 86_400_000
  const hace7d = Date.now() - 7 * 86_400_000

  const ventasPorProd: Record<number, { ultimos7d: number; ultimos30d: number }> = {}

  for (const v of MOCK_VENTAS) {
    const t = new Date(v.fecha).getTime()
    for (const item of v.items) {
      if (!ventasPorProd[item.producto_id]) {
        ventasPorProd[item.producto_id] = { ultimos7d: 0, ultimos30d: 0 }
      }
      if (t >= hace7d) ventasPorProd[item.producto_id].ultimos7d += item.cantidad
      if (t >= hace30d) ventasPorProd[item.producto_id].ultimos30d += item.cantidad
    }
  }

  // Generar predicción para próximos 7 días
  const productosTerminados = MOCK_PRODUCTOS.filter((p) => p.tipo === 'terminado')

  return productosTerminados
    .map((p) => {
      const v = ventasPorProd[p.id] || { ultimos7d: 0, ultimos30d: 0 }

      // Predicción: promedio diario de últimos 30d × 7, con ajuste por estacionalidad
      const promedioDiario = v.ultimos30d / 30
      const factorEstacional = p.categoria === 'panes' || p.categoria === 'cafes' ? 1.15 : 1.0
      const prediccion = Math.round(promedioDiario * 7 * factorEstacional)
      const prediccionMin = Math.round(prediccion * 0.82)
      const prediccionMax = Math.round(prediccion * 1.18)

      const ritmoDiario = v.ultimos7d > 0 ? v.ultimos7d / 7 : promedioDiario || 0.1
      const diasCobertura = ritmoDiario > 0 ? p.stock_actual / ritmoDiario : 99

      // Recomendación: PRODUCCIÓN (no compra) para 7 días
      const stockObjetivo = prediccion
      const recomendadoProducir = Math.max(0, Math.ceil(stockObjetivo - p.stock_actual))
      const urgente = diasCobertura < 3

      let nivel: PrediccionProducto['nivel'] = 'ok'
      if (p.stock_actual === 0) nivel = 'critico'
      else if (diasCobertura < 2) nivel = 'critico'
      else if (diasCobertura < 5) nivel = 'bajo'
      else if (p.stock_actual > stockObjetivo * 1.3) nivel = 'exceso'

      // Materia prima necesaria
      const recetas = MOCK_RECETAS.filter((r) => r.producto_terminado_id === p.id)
      const materiaPrima: PrediccionProducto['materia_prima_necesaria'] = []
      for (const receta of recetas) {
        const mp = MOCK_PRODUCTOS.find((x) => x.id === receta.materia_prima_id)
        if (!mp) continue
        const cantidadPorUnidad = Number(receta.cantidad_necesaria)
        const cantidadTotal = recomendadoProducir * cantidadPorUnidad
        materiaPrima.push({
          materia_prima: mp.nombre,
          unidad: mp.unidad,
          cantidad_por_unidad: cantidadPorUnidad,
          cantidad_total: Number(cantidadTotal.toFixed(2)),
          stock_actual_mp: 50,
          stock_suficiente: true,
        })
      }

      // Costo y margen
      const costoUnitario = recetas.reduce((sum, r) => {
        const mp = MOCK_PRODUCTOS.find((x) => x.id === r.materia_prima_id)
        return sum + (mp ? Number(mp.costo_unitario) * Number(r.cantidad_necesaria) : 0)
      }, 0)
      const precioVenta = p.precio_venta ?? 0
      const margenPct = precioVenta > 0 ? ((precioVenta - costoUnitario) / precioVenta) * 100 : 0

      return {
        producto_id: p.id,
        nombre: p.nombre,
        categoria: p.categoria,
        unidades_vendidas_7d: v.ultimos7d,
        unidades_vendidas_30d: v.ultimos30d,
        prediccion_7d: prediccion,
        prediccion_7d_min: prediccionMin,
        prediccion_7d_max: prediccionMax,
        stock_actual: p.stock_actual,
        dias_cobertura: Number(diasCobertura.toFixed(1)),
        recomendado_producir: recomendadoProducir,
        urgente,
        nivel,
        costo_unitario: Number(costoUnitario.toFixed(0)),
        precio_venta: precioVenta,
        margen_pct: Number(margenPct.toFixed(1)),
        materia_prima_necesaria: materiaPrima,
      }
    })
    .sort((a, b) => {
      const prioridad = { critico: 0, bajo: 1, ok: 2, exceso: 3 }
      if (prioridad[a.nivel] !== prioridad[b.nivel]) return prioridad[a.nivel] - prioridad[b.nivel]
      return b.prediccion_7d - a.prediccion_7d
    })
}

export function getHeatmapSemanal(): HeatmapCelda[] {
  // Calcular ventas por día de semana y hora
  const matriz: Record<string, { ventas: number; count: number }> = {}

  for (const v of MOCK_VENTAS) {
    const d = new Date(v.fecha)
    const dia = d.getDay()
    const hora = d.getHours()
    const key = `${dia}-${hora}`
    if (!matriz[key]) matriz[key] = { ventas: 0, count: 0 }
    matriz[key].ventas += v.total
    matriz[key].count += 1
  }

  // Calcular intensidad normalizada
  const maxVentas = Math.max(...Object.values(matriz).map((m) => m.ventas / Math.max(m.count, 1)))

  const celdas: HeatmapCelda[] = []
  for (let dia = 0; dia < 7; dia++) {
    for (let hora = 6; hora <= 21; hora++) { // 6am a 9pm
      const key = `${dia}-${hora}`
      const m = matriz[key]
      const promedio = m ? m.ventas / Math.max(m.count, 1) : 0
      const intensidad = maxVentas > 0 ? (promedio / maxVentas) * 100 : 0
      celdas.push({
        dia,
        hora,
        intensidad,
        ventas: m ? m.ventas : 0,
      })
    }
  }
  return celdas
}

export function getRecomendaciones(): Recomendacion[] {
  const recomendaciones: Recomendacion[] = []
  const predicciones = getPrediccionesPorProducto()

  // Recomendaciones de producción (top 3)
  const criticos = predicciones.filter((p) => p.nivel === 'critico' || p.urgente).slice(0, 3)
  for (const c of criticos) {
    const mpResumen = c.materia_prima_necesaria
      .slice(0, 2)
      .map((m) => `${m.cantidad_total}${m.unidad} ${m.materia_prima}`)
      .join(' + ')
    recomendaciones.push({
      tipo: 'pedido',
      titulo: `Hornear ${c.recomendado_producir}× ${c.nombre}`,
      descripcion: `Stock: ${c.stock_actual} → objetivo ${c.prediccion_7d} und. Materia prima: ${mpResumen || 'sin receta'}`,
      impacto: `Recomponer stock antes del ${c.dias_cobertura < 2 ? 'mediodía' : 'fin de semana'}`,
      accion: 'Programar producción',
      nivel: c.nivel === 'critico' ? 'alta' : 'media',
    })
  }

  // Festivos próximos
  const hoy = hoyISO()
  const futurosFestivos = MOCK_FESTIVOS.filter((f) => f.fecha > hoy).slice(0, 2)
  for (const f of futurosFestivos) {
    recomendaciones.push({
      tipo: 'festivo',
      titulo: `${f.nombre} en ${f.fecha}`,
      descripcion: `Las ventas预计 ${f.efecto_venta > 0 ? 'subir' : 'bajar'} ${Math.abs(f.efecto_venta * 100).toFixed(0)}% ese día`,
      impacto: f.efecto_venta > 0 ? 'Aumentar stock de productos populares' : 'Reducir pedidos (menos demanda)',
      nivel: 'media',
    })
  }

  // Combo más vendido
  const topCombo = MOCK_COMBOS.find((c) => c.destacado)
  if (topCombo) {
    recomendaciones.push({
      tipo: 'combo',
      titulo: `Promocionar "${topCombo.nombre}"`,
      descripcion: `Este combo tiene ${formatCOP(topCombo.precio_individual_suma - topCombo.precio_combo)} de ahorro vs individual`,
      impacto: 'Los combos aumentan el ticket promedio ~25%',
      nivel: 'baja',
    })
  }

  return recomendaciones
}

// =========================================================================
// PROVEEDORES
// =========================================================================

import type {
  Proveedor, PedidoProveedor, ConteoCaja, HistorialVentaDia,
} from '@/types'

export const MOCK_PROVEEDORES: Proveedor[] = [
  {
    id: 1,
    nombre: 'Harinas del Valle',
    contacto: 'Carlos Ramírez',
    telefono: '+57 311 555 1234',
    email: 'ventas@harinasdelvalle.com.co',
    direccion: 'Cra 50 #15-80, Bogotá',
    categoria: 'Harinas',
    dias_entrega: 2,
    min_pedido: 200000,
    calificacion: 5,
    activo: true,
    notas: 'Proveedor de harina de trigo desde 2015. Calidad consistente.',
  },
  {
    id: 2,
    nombre: 'Levaduras PanMaster',
    contacto: 'María González',
    telefono: '+57 320 444 5678',
    email: 'pedidos@panmaster.co',
    direccion: 'Calle 13 #45-67, Bogotá',
    categoria: 'Fermentos',
    dias_entrega: 3,
    min_pedido: 80000,
    calificacion: 4,
    activo: true,
  },
  {
    id: 3,
    nombre: 'Lácteos Andinos',
    contacto: 'Pedro Silva',
    telefono: '+57 315 777 9012',
    email: 'despachos@lacteosandinos.com',
    direccion: 'Cra 30 #8-25, Zipaquirá',
    categoria: 'Lácteos',
    dias_entrega: 1,
    min_pedido: 150000,
    calificacion: 5,
    activo: true,
    notas: 'Entrega diaria en la mañana. Leche y mantequilla frescas.',
  },
  {
    id: 4,
    nombre: 'Postobón Distribución',
    contacto: 'Sandra López',
    telefono: '+57 318 888 1122',
    email: 'sandra.lopez@postobon.com.co',
    direccion: 'Cra 7 #80-30, Bogotá',
    categoria: 'Bebidas',
    dias_entrega: 2,
    min_pedido: 300000,
    calificacion: 4,
    activo: true,
    notas: 'Distribuidor autorizado Postobón. Visita lunes y jueves.',
  },
  {
    id: 5,
    nombre: 'Empaques del Sur',
    contacto: 'Andrés Castro',
    telefono: '+57 312 666 3344',
    email: 'andres@empaquesdelsur.com',
    direccion: 'Calle 80 #20-15, Bogotá',
    categoria: 'Empaques',
    dias_entrega: 3,
    min_pedido: 100000,
    calificacion: 4,
    activo: true,
  },
  {
    id: 6,
    nombre: 'Arequipe La Abuela',
    contacto: 'Lucía Mendoza',
    telefono: '+57 314 999 5566',
    email: 'pedidos@arequipelaabuela.com',
    direccion: 'Calle 7 #40-50, Bogotá',
    categoria: 'Dulces',
    dias_entrega: 2,
    min_pedido: 120000,
    calificacion: 5,
    activo: true,
    notas: 'Arequipe artesanal, son los mejores de la zona.',
  },
  {
    id: 7,
    nombre: 'Café Premium Colombia',
    contacto: 'Roberto Pérez',
    telefono: '+57 317 333 7788',
    email: 'roberto@cafepremium.co',
    direccion: 'Cra 15 #93-50, Bogotá',
    categoria: 'Café',
    dias_entrega: 4,
    min_pedido: 180000,
    calificacion: 5,
    activo: true,
    notas: 'Café especial de origen. Tueste artesanal.',
  },
]

// Pedidos recientes (histórico)
export const MOCK_PEDIDOS_PROVEEDOR: PedidoProveedor[] = [
  {
    id: 1,
    proveedor_id: 1,
    fecha: new Date(Date.now() - 5 * 86_400_000).toISOString(),
    estado: 'recibido',
    total: 350000,
    items: [
      { materia_prima_id: 28, cantidad: 50, unidad: 'kg', precio_unitario: 3500, subtotal: 175000 },
      { materia_prima_id: 30, cantidad: 10, unidad: 'kg', precio_unitario: 18000, subtotal: 175000 },
    ],
    fecha_entrega_estimada: new Date(Date.now() - 3 * 86_400_000).toISOString(),
  },
  {
    id: 2,
    proveedor_id: 4,
    fecha: new Date(Date.now() - 2 * 86_400_000).toISOString(),
    estado: 'confirmado',
    total: 480000,
    items: [
      { materia_prima_id: 18, cantidad: 48, unidad: 'unidad', precio_unitario: 3500, subtotal: 168000 },
      { materia_prima_id: 19, cantidad: 48, unidad: 'unidad', precio_unitario: 3500, subtotal: 168000 },
      { materia_prima_id: 21, cantidad: 24, unidad: 'unidad', precio_unitario: 6000, subtotal: 144000 },
    ],
    fecha_entrega_estimada: new Date(Date.now() + 1 * 86_400_000).toISOString(),
  },
  {
    id: 3,
    proveedor_id: 3,
    fecha: new Date(Date.now() - 1 * 86_400_000).toISOString(),
    estado: 'en_transito',
    total: 220000,
    items: [
      { materia_prima_id: 31, cantidad: 40, unidad: 'litros', precio_unitario: 5500, subtotal: 220000 },
    ],
    fecha_entrega_estimada: new Date().toISOString(),
  },
]

// =========================================================================
// HISTORIAL DE VENTAS DIARIAS (para gráficos con nombres reales)
// =========================================================================

const DIAS_SEMANA_FULL = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const DIAS_SEMANA_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

export function getHistorialVentas(dias = 30): HistorialVentaDia[] {
  const result: HistorialVentaDia[] = []
  for (let i = dias - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const fechaStr = fechaISO(d)
    const ventasDelDia = MOCK_VENTAS.filter((v) => v.fecha.startsWith(fechaStr))
    const total = ventasDelDia.reduce((s, v) => s + v.total, 0)
    const topProd = ventasDelDia
      .flatMap((v) => v.items.map((i) => ({ nombre: i.nombre_producto, cantidad: i.cantidad })))
      .reduce<Record<string, number>>((acc, item) => {
        acc[item.nombre] = (acc[item.nombre] || 0) + item.cantidad
        return acc
      }, {})
    const topNombre = Object.entries(topProd).sort((a, b) => b[1] - a[1])[0]?.[0] || '—'

    result.push({
      fecha: fechaStr,
      dia_semana: DIAS_SEMANA_FULL[d.getDay()],
      total,
      num_ventas: ventasDelDia.length,
      ticket_promedio: ventasDelDia.length > 0 ? total / ventasDelDia.length : 0,
      top_producto: topNombre,
    })
  }
  return result
}

export function getDiasSemanaShort(): string[] {
  return DIAS_SEMANA_SHORT
}

// =========================================================================
// CIERRE DE CAJA
// =========================================================================

const DENOMINACIONES_BILLETES = [100000, 50000, 20000, 10000, 5000, 2000, 1000]
const DENOMINACIONES_MONEDAS = [1000, 500, 200, 100, 50]

export function getConteoCajaHoy(): ConteoCaja {
  const hoy = hoyISO()
  const ventasHoy = MOCK_VENTAS.filter((v) => v.fecha.startsWith(hoy))
  const totalVentas = ventasHoy.reduce((s, v) => s + v.total, 0)

  // Distribución de pagos realista
  const efectivo = ventasHoy.filter((v) => v.metodo_pago === 'efectivo').reduce((s, v) => s + v.total, 0)
  const tarjeta = ventasHoy.filter((v) => v.metodo_pago === 'datáfono').reduce((s, v) => s + v.total, 0)
  const transferencia = ventasHoy.filter((v) => v.metodo_pago === 'transferencia').reduce((s, v) => s + v.total, 0)
  const otros = ventasHoy.filter((v) => v.metodo_pago === 'mixto').reduce((s, v) => s + v.total, 0)

  // Base inicial típica de una panadería (para cambio)
  const baseInicial = 200000
  const esperadoEnCaja = baseInicial + efectivo

  // Conteo esperado (lo que DEBERÍA haber según ventas)
  // Simular distribución realista de billetes/monedas
  const billetes = DENOMINACIONES_BILLETES.map((denom) => ({
    denominacion: denom,
    tipo: 'billete' as const,
    cantidad: 0,
    subtotal: 0,
  }))
  const monedas = DENOMINACIONES_MONEDAS.map((denom) => ({
    denominacion: denom,
    tipo: 'moneda' as const,
    cantidad: 0,
    subtotal: 0,
  }))

  // Calcular distribución óptima del efectivo esperado
  let restante = esperadoEnCaja
  for (const b of billetes) {
    b.cantidad = Math.floor(restante / b.denominacion)
    b.subtotal = b.cantidad * b.denominacion
    restante -= b.subtotal
  }
  for (const m of monedas) {
    m.cantidad = Math.floor(restante / m.denominacion)
    m.subtotal = m.cantidad * m.denominacion
    restante -= m.subtotal
  }

  const totalContado = [...billetes, ...monedas].reduce((s, d) => s + d.subtotal, 0)

  return {
    fecha: hoy,
    total_ventas_dia: totalVentas,
    total_efectivo_dia: efectivo,
    total_tarjeta_dia: tarjeta,
    total_transferencia_dia: transferencia,
    otros_pagos_dia: otros,
    base_inicial: baseInicial,
    esperado_en_caja: esperadoEnCaja,
    billetes,
    monedas,
    total_contado: totalContado,
    diferencia: totalContado - esperadoEnCaja,
    cerrado: false,
    cerrado_at: null,
    notas: '',
  }
}

// =========================================================================
// KPIs REALISTAS DE HOY (volumen real panadería)
// =========================================================================

export function getKPIsHoy() {
  const hoy = hoyISO()
  const ayer = diasAtrasISO(1)

  const ventasHoy = MOCK_VENTAS.filter((v) => v.fecha.startsWith(hoy))
  const ventasAyer = MOCK_VENTAS.filter((v) => v.fecha.startsWith(ayer))

  const totalHoy = ventasHoy.reduce((s, v) => s + v.total, 0)
  const totalAyer = ventasAyer.reduce((s, v) => s + v.total, 0)
  const ticketPromedio = ventasHoy.length > 0 ? totalHoy / ventasHoy.length : 0

  // Sparkline: ventas totales de los últimos 15 días
  const spark: number[] = []
  for (let i = 14; i >= 0; i--) {
    const d = diasAtrasISO(i)
    const ventasDia = MOCK_VENTAS.filter((v) => v.fecha.startsWith(d))
    spark.push(ventasDia.reduce((s, v) => s + v.total, 0))
  }

  // Mismo cálculo pero de tickets
  const sparkTickets: number[] = []
  for (let i = 14; i >= 0; i--) {
    const d = diasAtrasISO(i)
    const ventasDia = MOCK_VENTAS.filter((v) => v.fecha.startsWith(d))
    sparkTickets.push(ventasDia.length > 0
      ? ventasDia.reduce((s, v) => s + v.total, 0) / ventasDia.length
      : 0)
  }

  return {
    total_hoy: totalHoy,
    total_ayer: totalAyer,
    variacion_pct: totalAyer > 0 ? ((totalHoy - totalAyer) / totalAyer) * 100 : 0,
    num_ventas: ventasHoy.length,
    ticket_promedio: ticketPromedio,
    spark_ventas: spark,
    spark_tickets: sparkTickets,
  }
}