import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCOP(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return '$0'
  const n = typeof value === 'string' ? parseFloat(value) : value
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(n)
}

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return '0'
  return new Intl.NumberFormat('es-CO').format(value)
}

export function formatPercent(value: number | null | undefined, decimals = 1): string {
  if (value === null || value === undefined) return '0%'
  return `${value.toFixed(decimals)}%`
}

// ---------------------------------------------------------------------------
// Fechas: todo el negocio opera en hora local de Colombia (UTC-5).
// Los helpers de abajo evitan el desfasaje de un dia que produce
// new Date('YYYY-MM-DD'), porque el parser ISO lo interpreta a medianoche UTC.
// ---------------------------------------------------------------------------

/** Formatea un Date como 'YYYY-MM-DD' usando la fecha local (no UTC). */
export function fechaISO(date: Date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Fecha local de hoy en formato 'YYYY-MM-DD'. */
export function hoyISO(): string {
  return fechaISO(new Date())
}

/** Fecha local de hace N dias en formato 'YYYY-MM-DD'. */
export function diasAtrasISO(dias: number): string {
  const d = new Date()
  d.setDate(d.getDate() - dias)
  return fechaISO(d)
}

/**
 * Parsea una fecha a un Date en hora local.
 * - 'YYYY-MM-DD' -> medianoche local (no UTC, para no perder el dia).
 * - ISO con hora  -> se respeta el offset que trae.
 */
export function parseFechaLocal(fecha: string): Date {
  const soloFecha = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fecha)
  if (soloFecha) {
    return new Date(Number(soloFecha[1]), Number(soloFecha[2]) - 1, Number(soloFecha[3]))
  }
  return new Date(fecha)
}

export function formatDateShort(date: string | Date): string {
  const d = typeof date === 'string' ? parseFechaLocal(date) : date
  return new Intl.DateTimeFormat('es-CO', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(d)
}

export function formatDateLong(date: string | Date): string {
  const d = typeof date === 'string' ? parseFechaLocal(date) : date
  return new Intl.DateTimeFormat('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d)
}

export function timeOfDayGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Buenos días'
  if (h < 18) return 'Buenas tardes'
  return 'Buenas noches'
}