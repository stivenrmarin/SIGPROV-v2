import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Users, Clock, DollarSign, Coffee, Plus,
  CheckCircle2, Receipt, Armchair, Maximize2,
  Sparkles, ChevronRight, X, Trash2,
} from 'lucide-react'
import { formatDistanceToNow, differenceInMinutes } from 'date-fns'
import { es as esLocale } from 'date-fns/locale'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn, formatCOP } from '@/lib/utils'
import { MOCK_MESAS, MOCK_COMBOS, MOCK_PRODUCTOS } from '@/data/mock'
import type { Mesa } from '@/types'
import { toast } from '@/components/ui/sonner'

const ZONA_LABEL: Record<Mesa['zona'], string> = {
  salon_principal: 'Salón principal',
  terraza: 'Terraza',
  barra: 'Barra',
  patio: 'Patio',
}

const ESTADO_CONFIG: Record<Mesa['estado'], { color: string; bg: string; ring: string; icon: any; label: string; pulse?: boolean }> = {
  libre: {
    color: 'text-emerald-700 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-950/30 hover:bg-emerald-100/80',
    ring: 'ring-emerald-300/60 dark:ring-emerald-700/50',
    icon: CheckCircle2,
    label: 'Libre',
  },
  ocupada: {
    color: 'text-blue-700 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-950/30 hover:bg-blue-100/80',
    ring: 'ring-blue-300/60 dark:ring-blue-700/50',
    icon: Users,
    label: 'Ocupada',
    pulse: true,
  },
  pidiendo_cuenta: {
    color: 'text-amber-700 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100/80',
    ring: 'ring-amber-300/60 dark:ring-amber-700/50',
    icon: Receipt,
    label: 'Pidiendo cuenta',
  },
  reservada: {
    color: 'text-purple-700 dark:text-purple-400',
    bg: 'bg-purple-50 dark:bg-purple-950/30 hover:bg-purple-100/80',
    ring: 'ring-purple-300/60 dark:ring-purple-700/50',
    icon: Clock,
    label: 'Reservada',
  },
}

export default function Mesas() {
  const [mesas, setMesas] = useState<Mesa[]>(MOCK_MESAS)
  const [mesaSeleccionada, setMesaSeleccionada] = useState<Mesa | null>(null)
  const [filtroZona, setFiltroZona] = useState<string>('todas')
  const [dialogCrearAbierto, setDialogCrearAbierto] = useState(false)
  const [dialogAgregarAbierto, setDialogAgregarAbierto] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // === Handlers funcionales ===

  const handleCrearMesa = (numero: number, capacidad: number, zona: Mesa['zona']) => {
    const nuevaMesa: Mesa = {
      id: Math.max(...mesas.map((m) => m.id)) + 1,
      numero,
      capacidad,
      zona,
      estado: 'libre',
      venta_actual_id: null,
      ocupada_desde: null,
      total_acumulado: 0,
      items_actuales: [],
    }
    setMesas([...mesas, nuevaMesa])
    toast.success(`Mesa ${numero} creada en ${ZONA_LABEL[zona]}`)
    setDialogCrearAbierto(false)
  }

  const handleEliminarMesa = (mesaId: number) => {
    const mesa = mesas.find((m) => m.id === mesaId)
    if (!mesa) return
    if (mesa.estado !== 'libre' && mesa.estado !== 'reservada') {
      toast.error('Solo podés eliminar mesas libres o reservadas')
      return
    }
    if (!confirm(`¿Eliminar Mesa ${mesa.numero}?`)) return
    setMesas(mesas.filter((m) => m.id !== mesaId))
    toast.success(`Mesa ${mesa.numero} eliminada`)
    setMesaSeleccionada(null)
  }

  const handleSentarClientes = (mesaId: number) => {
    setMesas(mesas.map((m) =>
      m.id === mesaId ? { ...m, estado: 'ocupada', ocupada_desde: new Date() } : m,
    ))
    toast.success('Clientes sentados')
    setMesaSeleccionada(null)
  }

  const handleLiberarReserva = (mesaId: number) => {
    setMesas(mesas.map((m) =>
      m.id === mesaId ? { ...m, estado: 'libre', ocupada_desde: null, venta_actual_id: null } : m,
    ))
    toast.success('Reserva liberada')
    setMesaSeleccionada(null)
  }

  const handleCerrarCuenta = (mesaId: number) => {
    const mesa = mesas.find((m) => m.id === mesaId)
    if (!mesa) return
    setMesas(mesas.map((m) =>
      m.id === mesaId
        ? { ...m, estado: 'pidiendo_cuenta', venta_actual_id: 9000 + mesaId }
        : m,
    ))
    toast.info(`Mesa ${mesa.numero} → Pidiendo cuenta ($${formatCOP(mesa.total_acumulado)})`)
  }

  const handleCobrarMesa = (mesaId: number) => {
    const mesa = mesas.find((m) => m.id === mesaId)
    if (!mesa) return
    setMesas(mesas.map((m) =>
      m.id === mesaId
        ? { ...m, estado: 'libre', ocupada_desde: null, venta_actual_id: null, total_acumulado: 0, items_actuales: [] }
        : m,
    ))
    toast.success(`Mesa ${mesa.numero} cobrada · ${formatCOP(mesa.total_acumulado)}`)
    setMesaSeleccionada(null)
  }

  const handleAgregarItem = (mesaId: number, nombreProducto: string, cantidad: number, precioUnitario: number) => {
    setMesas(mesas.map((m) => {
      if (m.id !== mesaId) return m
      const nuevoItem = {
        producto_id: 999,
        cantidad,
        precio_unitario: precioUnitario,
        subtotal: precioUnitario * cantidad,
        nombre_producto: nombreProducto,
      }
      return {
        ...m,
        items_actuales: [...m.items_actuales, nuevoItem],
        total_acumulado: m.total_acumulado + nuevoItem.subtotal,
      }
    }))
    toast.success(`Agregado: ${cantidad}× ${nombreProducto}`)
    setDialogAgregarAbierto(false)
  }

  const handleQuitarItem = (mesaId: number, itemIdx: number) => {
    setMesas(mesas.map((m) => {
      if (m.id !== mesaId) return m
      const item = m.items_actuales[itemIdx]
      if (!item) return m
      const nuevosItems = m.items_actuales.filter((_, i) => i !== itemIdx)
      return {
        ...m,
        items_actuales: nuevosItems,
        total_acumulado: m.total_acumulado - item.subtotal,
      }
    }))
    toast.success('Item quitado del pedido')
  }

  // === Memoizado ===

  const mesasFiltradas = useMemo(() => {
    if (filtroZona === 'todas') return mesas
    return mesas.filter((m) => m.zona === filtroZona)
  }, [mesas, filtroZona])

  const mesasPorZona = useMemo(() => {
    return mesasFiltradas.reduce<Record<string, Mesa[]>>((acc, m) => {
      if (!acc[m.zona]) acc[m.zona] = []
      acc[m.zona].push(m)
      return acc
    }, {})
  }, [mesasFiltradas])

  const stats = useMemo(() => {
    if (!mesas) return { total: 0, ocupadas: 0, cuentas: 0, libres: 0, reservas: 0, capacidad_ocupada: 0, capacidad_total: 0, ventas_en_curso: 0, ocupacion_pct: 0 }
    const capacidad_total = mesas.reduce((s, m) => s + m.capacidad, 0)
    const capacidad_ocupada = mesas.filter((m) => m.estado !== 'libre').reduce((s, m) => s + m.capacidad, 0)
    return {
      total: mesas.length,
      ocupadas: mesas.filter((m) => m.estado === 'ocupada').length,
      cuentas: mesas.filter((m) => m.estado === 'pidiendo_cuenta').length,
      libres: mesas.filter((m) => m.estado === 'libre').length,
      reservas: mesas.filter((m) => m.estado === 'reservada').length,
      capacidad_ocupada,
      capacidad_total,
      ventas_en_curso: mesas.filter((m) => m.estado !== 'libre').reduce((s, m) => s + m.total_acumulado, 0),
      ocupacion_pct: capacidad_total > 0 ? Math.round((capacidad_ocupada / capacidad_total) * 100) : 0,
    }
  }, [mesas])

  const zonasDisponibles = useMemo(() => {
    if (!mesas) return []
    const counts: Record<string, number> = {}
    mesas.forEach((m) => { counts[m.zona] = (counts[m.zona] || 0) + 1 })
    return Object.entries(counts)
  }, [mesas])

  return (
    <div className="space-y-6 max-w-[1400px]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display tracking-tight">Salón en vivo</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Vista en tiempo real de las mesas del local
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border bg-card p-0.5">
            <button
              onClick={() => setFiltroZona('todas')}
              className={cn(
                'px-3 h-7 text-xs font-medium rounded-sm transition-colors',
                filtroZona === 'todas' ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              Todas ({stats.total})
            </button>
            {zonasDisponibles.map(([zona, count]) => (
              <button
                key={zona}
                onClick={() => setFiltroZona(zona)}
                className={cn(
                  'px-3 h-7 text-xs font-medium rounded-sm transition-colors hidden sm:block',
                  filtroZona === zona ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {ZONA_LABEL[zona as Mesa['zona']].split(' ')[0]} ({count})
              </button>
            ))}
          </div>
          <Button size="sm" variant="outline" onClick={() => setDialogCrearAbierto(true)}>
            <Plus className="mr-1.5 h-3.5 w-3.5" /> Mesa
          </Button>
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <Card className="col-span-2 md:col-span-1 border-stone-200/80">
          <CardContent className="py-4">
            <div className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground">Ocupación</div>
            <div className="text-2xl font-bold font-display tabular-nums mt-1.5">
              {stats.ocupacion_pct}<span className="text-base text-muted-foreground">%</span>
            </div>
            <div className="text-[11px] text-muted-foreground mt-1 tabular-nums">
              {stats.capacidad_ocupada}/{stats.capacidad_total} pers.
            </div>
            <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${stats.ocupacion_pct}%` }}
              />
            </div>
          </CardContent>
        </Card>
        <Card className="border-stone-200/80">
          <CardContent className="py-4">
            <div className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground">Ocupadas</div>
            <div className="text-2xl font-bold font-display tabular-nums mt-1.5 text-blue-600">{stats.ocupadas}</div>
            <div className="text-[11px] text-muted-foreground mt-1">en servicio</div>
          </CardContent>
        </Card>
        <Card className="border-stone-200/80">
          <CardContent className="py-4">
            <div className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground">Pidiendo</div>
            <div className="text-2xl font-bold font-display tabular-nums mt-1.5 text-amber-600">{stats.cuentas}</div>
            <div className="text-[11px] text-muted-foreground mt-1">la cuenta</div>
          </CardContent>
        </Card>
        <Card className="border-stone-200/80">
          <CardContent className="py-4">
            <div className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground">Libres</div>
            <div className="text-2xl font-bold font-display tabular-nums mt-1.5 text-emerald-600">{stats.libres}</div>
            <div className="text-[11px] text-muted-foreground mt-1">disponibles</div>
          </CardContent>
        </Card>
        <Card className="border-stone-200/80">
          <CardContent className="py-4">
            <div className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground">Reservadas</div>
            <div className="text-2xl font-bold font-display tabular-nums mt-1.5 text-purple-600">{stats.reservas}</div>
            <div className="text-[11px] text-muted-foreground mt-1">próximas</div>
          </CardContent>
        </Card>
        <Card className="col-span-2 md:col-span-2 border-stone-200/80">
          <CardContent className="py-4">
            <div className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground">En mesas (pendiente cobro)</div>
            <div className="text-3xl font-bold font-display tabular-nums mt-1 text-primary">
              {formatCOP(stats.ventas_en_curso)}
            </div>
            <div className="text-[11px] text-muted-foreground mt-1">comandas abiertas ahora mismo</div>
          </CardContent>
        </Card>
      </div>

      {/* Mesas por zona */}
      {isLoading ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : (
        Object.entries(mesasPorZona).map(([zona, mesasZona]) => (
          <div key={zona}>
            <div className="flex items-center gap-2 mb-2.5">
              <h2 className="text-sm font-semibold font-display">{ZONA_LABEL[zona as Mesa['zona']]}</h2>
              <Badge variant="secondary" className="text-[10px]">{mesasZona.length}</Badge>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {mesasZona.map((mesa) => (
                <MesaCard key={mesa.id} mesa={mesa} onClick={() => setMesaSeleccionada(mesa)} />
              ))}
            </div>
          </div>
        ))
      )}

      <Sheet open={!!mesaSeleccionada} onOpenChange={() => setMesaSeleccionada(null)}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto p-0">
          {mesaSeleccionada && (
            <MesaDetalle
              mesa={mesaSeleccionada}
              onSentarClientes={handleSentarClientes}
              onCerrarCuenta={handleCerrarCuenta}
              onCobrarMesa={handleCobrarMesa}
              onLiberarReserva={handleLiberarReserva}
              onEliminarMesa={handleEliminarMesa}
              onAgregarItem={() => setDialogAgregarAbierto(true)}
              onVolverAOcupada={(id) => {
                setMesas((curr) => curr.map((m) =>
                  m.id === id ? { ...m, estado: 'ocupada', venta_actual_id: null } : m,
                ))
                toast.info('Volvió a "ocupada"')
              }}
              onQuitarItem={handleQuitarItem}
            />
          )}
        </SheetContent>
      </Sheet>

      {/* === Dialog: Crear nueva mesa === */}
      <CrearMesaDialog
        open={dialogCrearAbierto}
        onClose={() => setDialogCrearAbierto(false)}
        onCrear={handleCrearMesa}
        mesasExistentes={mesas}
      />

      {/* === Dialog: Agregar item al pedido === */}
      {mesaSeleccionada && (
        <AgregarItemDialog
          open={dialogAgregarAbierto}
          onClose={() => setDialogAgregarAbierto(false)}
          onAgregar={(nombre, cantidad, precio) =>
            handleAgregarItem(mesaSeleccionada.id, nombre, cantidad, precio)
          }
        />
      )}
    </div>
  )
}

function MesaCard({ mesa, onClick }: { mesa: Mesa; onClick: () => void }) {
  const config = ESTADO_CONFIG[mesa.estado]
  const Icon = config.icon
  const tiempo = mesa.ocupada_desde ? differenceInMinutes(new Date(), mesa.ocupada_desde) : 0
  const tieneConsumo = mesa.estado !== 'libre'
  const minutosColor = tiempo > 60 ? 'text-rose-600' : tiempo > 30 ? 'text-amber-600' : 'text-muted-foreground'

  return (
    <button
      onClick={onClick}
      className={cn(
        'group text-left rounded-xl border bg-card hover-lift overflow-hidden',
        config.bg,
        config.ring,
        config.pulse && 'relative',
      )}
    >
      {config.pulse && (
        <span className="absolute top-2 right-2 flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
        </span>
      )}

      <div className="p-3.5 pb-3">
        <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-wider">
          <Icon className={cn('h-3 w-3', config.color)} />
          <span className={config.color}>{config.label}</span>
        </div>
        <div className={cn(
          'mt-1.5 font-bold font-display tabular-nums leading-none',
          mesa.numero.toString().length > 2 ? 'text-2xl' : 'text-3xl',
          config.color,
        )}>
          {mesa.numero}
        </div>
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-1">
          <Users className="h-2.5 w-2.5" />
          {mesa.capacidad} {mesa.capacidad === 1 ? 'persona' : 'personas'}
        </div>
      </div>

      {tieneConsumo && (
        <div className="px-3.5 pb-3 pt-0">
          <div className="border-t border-current/10 pt-2 mt-1">
            <div className="text-lg font-bold font-display tabular-nums text-foreground">
              {formatCOP(mesa.total_acumulado)}
            </div>
            <div className={cn('flex items-center gap-1 text-[10px] mt-0.5 font-medium tabular-nums', minutosColor)}>
              <Clock className="h-2.5 w-2.5" />
              {tiempo} min
            </div>
          </div>
        </div>
      )}
    </button>
  )
}

interface MesaDetalleProps {
  mesa: Mesa
  onSentarClientes: (id: number) => void
  onCerrarCuenta: (id: number) => void
  onCobrarMesa: (id: number) => void
  onLiberarReserva: (id: number) => void
  onEliminarMesa: (id: number) => void
  onAgregarItem: () => void
  onVolverAOcupada: (id: number) => void
  onQuitarItem: (mesaId: number, itemIdx: number) => void
}

function MesaDetalle({
  mesa, onSentarClientes, onCerrarCuenta, onCobrarMesa, onLiberarReserva,
  onEliminarMesa, onAgregarItem, onVolverAOcupada, onQuitarItem,
}: MesaDetalleProps) {
  const config = ESTADO_CONFIG[mesa.estado]
  const tiempo = mesa.ocupada_desde ? differenceInMinutes(new Date(), mesa.ocupada_desde) : 0
  const tieneConsumo = mesa.estado !== 'libre'

  return (
    <div className="p-6 space-y-6">
      <SheetHeader className="space-y-3">
        <SheetTitle className="flex items-center gap-3">
          <div className={cn(
            'flex items-center justify-center w-12 h-12 rounded-lg text-xl font-bold font-display',
            config.bg, config.color,
          )}>
            {mesa.numero}
          </div>
          <div>
            <div className="text-base font-semibold">Mesa {mesa.numero}</div>
            <div className="text-xs text-muted-foreground font-normal flex items-center gap-1.5">
              {ZONA_LABEL[mesa.zona]} · {mesa.capacidad} personas
            </div>
          </div>
        </SheetTitle>
        <SheetDescription>
          <Badge variant="outline" className={cn('text-xs', config.color)}>
            {config.label}
          </Badge>
        </SheetDescription>
      </SheetHeader>

      {tieneConsumo && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Card>
              <CardContent className="py-3.5">
                <div className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground">Tiempo</div>
                <div className="text-xl font-bold font-display tabular-nums mt-1">{tiempo} min</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-3.5">
                <div className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground">Total</div>
                <div className="text-xl font-bold font-display tabular-nums mt-1 text-primary">
                  {formatCOP(mesa.total_acumulado)}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Coffee className="h-4 w-4" />
                Pedido actual
              </CardTitle>
              <CardDescription className="text-xs">{mesa.items_actuales.length} items</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="divide-y">
                {mesa.items_actuales.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 py-2 first:pt-0 last:pb-0">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{item.nombre_producto}</div>
                      <div className="text-[11px] text-muted-foreground tabular-nums">
                        {item.cantidad} × {formatCOP(item.precio_unitario)}
                      </div>
                    </div>
                    <div className="text-sm font-semibold tabular-nums">{formatCOP(item.subtotal)}</div>
                    <button
                      onClick={() => onQuitarItem(mesa.id, idx)}
                      className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded p-1"
                      title="Quitar del pedido"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Acciones */}
      <div className="space-y-2">
        {mesa.estado === 'libre' && (
          <>
            <Button className="w-full" onClick={() => onSentarClientes(mesa.id)}>
              <Users className="mr-2 h-4 w-4" /> Sentar clientes
            </Button>
            <Button
              className="w-full text-rose-600 hover:text-rose-700"
              variant="outline"
              onClick={() => onEliminarMesa(mesa.id)}
            >
              <Trash2 className="mr-2 h-4 w-4" /> Eliminar mesa
            </Button>
          </>
        )}
        {mesa.estado === 'ocupada' && (
          <>
            <Button
              className="w-full"
              variant="outline"
              onClick={onAgregarItem}
            >
              <Plus className="mr-2 h-4 w-4" /> Agregar item
            </Button>
            <Button
              className="w-full"
              onClick={() => onCerrarCuenta(mesa.id)}
            >
              <Receipt className="mr-2 h-4 w-4" /> Cerrar cuenta · {formatCOP(mesa.total_acumulado)}
            </Button>
          </>
        )}
        {mesa.estado === 'pidiendo_cuenta' && (
          <>
            <Button
              className="w-full"
              onClick={() => onCobrarMesa(mesa.id)}
            >
              <CheckCircle2 className="mr-2 h-4 w-4" /> Cobrar {formatCOP(mesa.total_acumulado)}
            </Button>
            <Button
              className="w-full"
              variant="outline"
              onClick={() => onVolverAOcupada(mesa.id)}
            >
              Volver a ocupada
            </Button>
          </>
        )}
        {mesa.estado === 'reservada' && (
          <>
            <Button
              className="w-full"
              variant="outline"
              onClick={() => onLiberarReserva(mesa.id)}
            >
              Liberar reserva
            </Button>
            <Button
              className="w-full text-rose-600 hover:text-rose-700"
              variant="ghost"
              onClick={() => onEliminarMesa(mesa.id)}
            >
              <Trash2 className="mr-2 h-4 w-4" /> Eliminar mesa
            </Button>
          </>
        )}
      </div>

      <Separator />

      {/* Combos sugeridos */}
      <div>
        <div className="flex items-center gap-2 mb-2.5">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <h3 className="text-xs font-semibold uppercase tracking-wider">Sugerir al cliente</h3>
        </div>
        <div className="space-y-2">
          {MOCK_COMBOS.slice(0, 3).map((combo) => (
            <div key={combo.id} className="flex items-center justify-between p-2.5 rounded-lg border hover:bg-accent cursor-pointer">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{combo.nombre}</div>
                <div className="text-[11px] text-muted-foreground truncate">{combo.descripcion}</div>
              </div>
              <div className="text-right shrink-0 ml-3">
                <div className="text-sm font-bold font-display tabular-nums text-primary">{formatCOP(combo.precio_combo)}</div>
                {combo.precio_combo < combo.precio_individual_suma && (
                  <Badge variant="success" className="text-[10px] mt-0.5">
                    -{formatCOP(combo.precio_individual_suma - combo.precio_combo)}
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// =========================================================================
// Dialog: Crear nueva mesa
// =========================================================================

function CrearMesaDialog({
  open, onClose, onCrear, mesasExistentes,
}: {
  open: boolean
  onClose: () => void
  onCrear: (numero: number, capacidad: number, zona: Mesa['zona']) => void
  mesasExistentes: Mesa[]
}) {
  const [numero, setNumero] = useState('')
  const [capacidad, setCapacidad] = useState('4')
  const [zona, setZona] = useState<Mesa['zona']>('salon_principal')

  const handleCrear = (e: React.FormEvent) => {
    e.preventDefault()
    const num = Number(numero)
    const cap = Number(capacidad)
    if (!num || num <= 0) {
      toast.error('Ingresá un número de mesa válido')
      return
    }
    if (mesasExistentes.some((m) => String(m.numero) === String(num))) {
      toast.error(`Ya existe la mesa ${num}`)
      return
    }
    if (!cap || cap < 1 || cap > 20) {
      toast.error('Capacidad debe estar entre 1 y 20')
      return
    }
    onCrear(num, cap, zona)
    // Reset
    setNumero('')
    setCapacidad('4')
    setZona('salon_principal')
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Nueva mesa
          </DialogTitle>
          <DialogDescription>
            Agregá una mesa nueva al salón. El número debe ser único.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleCrear} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="numero">Número</Label>
              <Input
                id="numero"
                type="number"
                min="1"
                placeholder="13"
                value={numero}
                onChange={(e) => setNumero(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="capacidad">Capacidad</Label>
              <Input
                id="capacidad"
                type="number"
                min="1"
                max="20"
                value={capacidad}
                onChange={(e) => setCapacidad(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="zona">Zona</Label>
            <Select value={zona} onValueChange={(v) => setZona(v as Mesa['zona'])}>
              <SelectTrigger id="zona">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="salon_principal">Salón principal</SelectItem>
                <SelectItem value="terraza">Terraza</SelectItem>
                <SelectItem value="barra">Barra</SelectItem>
                <SelectItem value="patio">Patio</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit">Crear mesa</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// =========================================================================
// Dialog: Agregar item al pedido de la mesa
// =========================================================================

function AgregarItemDialog({
  open, onClose, onAgregar,
}: {
  open: boolean
  onClose: () => void
  onAgregar: (nombre: string, cantidad: number, precio: number) => void
}) {
  const [tipo, setTipo] = useState<'producto' | 'combo'>('producto')
  const [itemId, setItemId] = useState('')
  const [cantidad, setCantidad] = useState('1')

  const handleAgregar = (e: React.FormEvent) => {
    e.preventDefault()
    const cant = Number(cantidad)
    if (!cant || cant < 1) { toast.error('Cantidad inválida'); return }

    if (tipo === 'combo') {
      const c = MOCK_COMBOS.find((x) => x.id === Number(itemId))
      if (!c) { toast.error('Selecciona un combo'); return }
      onAgregar(c.nombre, cant, c.precio_combo)
    } else {
      const p = MOCK_PRODUCTOS.find((x) => x.id === Number(itemId) && x.tipo === 'terminado')
      if (!p || !p.precio_venta) { toast.error('Selecciona un producto'); return }
      onAgregar(p.nombre, cant, p.precio_venta)
    }
  }

  const items = tipo === 'combo'
    ? MOCK_COMBOS.map((c) => ({ id: c.id, label: `${c.nombre} · ${formatCOP(c.precio_combo)}` }))
    : MOCK_PRODUCTOS
        .filter((p) => p.tipo === 'terminado' && p.precio_venta)
        .map((p) => ({ id: p.id, label: `${p.nombre} · ${formatCOP(p.precio_venta ?? 0)}` }))

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Agregar item al pedido
          </DialogTitle>
          <DialogDescription>
            Sumá un producto o combo al pedido actual de la mesa.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleAgregar} className="space-y-4">
          <div className="space-y-2">
            <Label>Tipo</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={tipo === 'producto' ? 'default' : 'outline'}
                size="sm"
                onClick={() => { setTipo('producto'); setItemId('') }}
                className="flex-1"
              >
                Producto
              </Button>
              <Button
                type="button"
                variant={tipo === 'combo' ? 'default' : 'outline'}
                size="sm"
                onClick={() => { setTipo('combo'); setItemId('') }}
                className="flex-1"
              >
                Combo
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="item">Item</Label>
            <Select value={itemId} onValueChange={setItemId}>
              <SelectTrigger id="item">
                <SelectValue placeholder="Selecciona..." />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {items.map((it) => (
                  <SelectItem key={it.id} value={String(it.id)}>
                    {it.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cantidad">Cantidad</Label>
            <Input
              id="cantidad"
              type="number"
              min="1"
              max="50"
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit">Agregar al pedido</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}