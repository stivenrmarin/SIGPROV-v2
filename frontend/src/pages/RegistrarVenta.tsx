import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Search, Plus, Minus, Trash2, ShoppingBag, CreditCard,
  Banknote, Smartphone, Wallet, Receipt, Check, Armchair,
  ShoppingBasket, Truck, Tag, ChevronLeft, ChevronRight,
  Sparkles,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { api_productos, api_ventas } from '@/services/api'
import { formatCOP, cn } from '@/lib/utils'
import { toast } from '@/components/ui/sonner'
import type { Producto, ItemVenta } from '@/types'
import { MOCK_MESAS, MOCK_COMBOS, MOCK_PRODUCTOS } from '@/data/mock'

interface CartItem extends ItemVenta {
  id: string
  subtotal: number
  nombre: string
}

let cartIdCounter = 0
const nextCartId = () => `c-${++cartIdCounter}-${Date.now()}`

const METODOS_PAGO = [
  { value: 'efectivo',      label: 'Efectivo',      icon: Banknote,    hint: 'Billetes' },
  { value: 'transferencia', label: 'Transferencia', icon: Smartphone,  hint: 'Nequi/Daviplata' },
  { value: 'datáfono',      label: 'Datáfono',      icon: CreditCard,   hint: 'Tarjeta' },
  { value: 'mixto',         label: 'Mixto',         icon: Wallet,       hint: 'Efectivo + tarjeta' },
] as const

type DestinoVenta = 'mesa' | 'llevar' | 'domicilio'
type MesaOGrupo = number | string | null

const DESTINOS: { value: DestinoVenta; label: string; icon: any }[] = [
  { value: 'mesa',      label: 'En mesa',      icon: Armchair },
  { value: 'llevar',    label: 'Para llevar',  icon: ShoppingBasket },
  { value: 'domicilio', label: 'Domicilio',    icon: Truck },
]

export default function RegistrarVenta() {
  const [busqueda, setBusqueda] = useState('')
  const [cart, setCart] = useState<CartItem[]>([])
  const [metodoPago, setMetodoPago] = useState<typeof METODOS_PAGO[number]['value']>('efectivo')
  const [ventaExitosa, setVentaExitosa] = useState<{ id: number; total: number } | null>(null)
  const [destino, setDestino] = useState<DestinoVenta>('mesa')
  const [mesaSeleccionada, setMesaSeleccionada] = useState<MesaOGrupo>(null)
  const [vistaActual, setVistaActual] = useState<'combos' | 'productos'>('combos')
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>('todos')
  const queryClient = useQueryClient()

  const { data: productos, isLoading } = useQuery({
    queryKey: ['productos', 'terminado'],
    queryFn: () => api_productos.listar({ tipo: 'terminado', activo: true }),
  })

  const mesasDisponibles = MOCK_MESAS.filter((m) => m.estado !== 'reservada')
  const mesaActual = MOCK_MESAS.find((m) => m.numero === mesaSeleccionada)

  const categorias = useMemo(() => {
    if (!productos) return []
    const set = new Set(productos.map((p) => p.categoria))
    return Array.from(set)
  }, [productos])

  const registrarMutation = useMutation({
    mutationFn: () => {
      const items: ItemVenta[] = cart.map((c) => ({
        producto_id: c.producto_id,
        cantidad: c.cantidad,
      }))
      return api_ventas.registrar(items, metodoPago)
    },
    onSuccess: (venta) => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['productos'] })
      queryClient.invalidateQueries({ queryKey: ['inventario'] })
      toast.success(`Venta cobrada · ${formatCOP(venta.total)}`)
      setCart([])
      setVentaExitosa({ id: venta.id, total: venta.total })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const productosFiltrados = useMemo(() => {
    if (!productos) return []
    const term = busqueda.toLowerCase()
    return productos.filter((p) => {
      if (categoriaFiltro !== 'todos' && p.categoria !== categoriaFiltro) return false
      if (term && !p.nombre.toLowerCase().includes(term)) return false
      return true
    })
  }, [productos, busqueda, categoriaFiltro])

  const agregarCombo = (comboId: number) => {
    const combo = MOCK_COMBOS.find((c) => c.id === comboId)
    if (!combo) return
    setCart((prev) => {
      const items: CartItem[] = []
      const totalUnidades = combo.items.reduce((s, i) => s + i.cantidad, 0)
      const precioUnitario = combo.precio_combo / totalUnidades
      for (const item of combo.items) {
        const prod = productos?.find((p) => p.id === item.producto_id)
        if (!prod) continue
        items.push({
          id: nextCartId(),
          producto_id: prod.id,
          nombre: `${combo.nombre} · ${prod.nombre}`,
          cantidad: item.cantidad,
          subtotal: precioUnitario * item.cantidad,
        })
      }
      return [...prev, ...items]
    })
    toast.success(`Combo "${combo.nombre}" agregado`)
  }

  const agregar = (p: Producto) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.producto_id === p.id && !c.nombre.includes(' · '))
      if (existing) {
        return prev.map((c) =>
          c.id === existing.id ? { ...c, cantidad: c.cantidad + 1, subtotal: (c.cantidad + 1) * (p.precio_venta ?? 0) } : c,
        )
      }
      return [...prev, {
        id: nextCartId(),
        producto_id: p.id,
        nombre: p.nombre,
        cantidad: 1,
        subtotal: p.precio_venta ?? 0,
      }]
    })
  }

  const cambiarCantidad = (cartItemId: string, delta: number) => {
    setCart((prev) => {
      return prev.flatMap((c) => {
        if (c.id !== cartItemId) return [c]
        const nuevaCantidad = c.cantidad + delta
        if (nuevaCantidad <= 0) return []
        const p = productos?.find((x) => x.id === c.producto_id)
        const precio = c.nombre.includes(' · ')
          ? c.subtotal / c.cantidad
          : (p?.precio_venta ?? 0)
        return [{ ...c, cantidad: nuevaCantidad, subtotal: precio * nuevaCantidad }]
      })
    })
  }

  const eliminarDelCart = (cartItemId: string) => {
    setCart((prev) => prev.filter((c) => c.id !== cartItemId))
  }

  const total = cart.reduce((s, c) => s + c.subtotal, 0)
  const totalItems = cart.reduce((s, c) => s + c.cantidad, 0)
  const iva = total * 0.08 // 8% IVA demo
  const totalConIva = total + iva

  const exportar = (formato: 'csv' | 'excel' | 'pdf') => {
    // TODO integrar con export.ts
  }

  const labelDestino = destino === 'mesa'
    ? (mesaActual ? `Mesa ${mesaActual.numero}` : 'Selecciona mesa')
    : destino === 'llevar' ? 'Para llevar'
    : 'Domicilio'

  return (
    <div className="space-y-4 max-w-[1400px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display tracking-tight">Nueva venta</h1>
          <p className="text-sm text-muted-foreground">POS · {labelDestino}</p>
        </div>
      </div>

      {/* Selector de destino */}
      <Card>
        <CardContent className="p-3">
          <Tabs value={destino} onValueChange={(v) => setDestino(v as DestinoVenta)}>
            <TabsList className="grid grid-cols-3 w-full max-w-md">
              {DESTINOS.map((d) => (
                <TabsTrigger key={d.value} value={d.value} className="gap-1.5">
                  <d.icon className="h-4 w-4" /> {d.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {destino === 'mesa' && (
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Selecciona mesa
                </span>
                {mesaActual && mesaActual.estado === 'ocupada' && (
                  <Badge variant="default" className="text-xs gap-1">
                    <Receipt className="h-3 w-3" /> Pedido en curso · {formatCOP(mesaActual.total_acumulado)}
                  </Badge>
                )}
              </div>
              <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-12 gap-1.5">
                {mesasDisponibles.map((m) => {
                  const isSelected = mesaSeleccionada === m.numero
                  return (
                    <button
                      key={m.id}
                      onClick={() => setMesaSeleccionada(m.numero)}
                      className={cn(
                        'p-1.5 rounded-md border-2 transition-all flex flex-col items-center gap-0.5',
                        isSelected
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-primary/50',
                        m.estado === 'ocupada' && !isSelected && 'bg-blue-50/60 dark:bg-blue-950/20',
                      )}
                    >
                      <span className={cn(
                        'font-bold text-xs font-display',
                        m.estado === 'ocupada' ? 'text-blue-700 dark:text-blue-400' : 'text-foreground',
                      )}>
                        {m.numero}
                      </span>
                      <span className="text-[9px] text-muted-foreground">{m.capacidad}p</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* === Catálogo === */}
        <div className="lg:col-span-3 space-y-3">
          <Tabs value={vistaActual} onValueChange={(v) => setVistaActual(v as any)}>
            <TabsList>
              <TabsTrigger value="combos" className="gap-1.5">
                <Sparkles className="h-3.5 w-3.5" />
                Combos
                <Badge variant="secondary" className="ml-1 text-[10px]">{MOCK_COMBOS.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="productos" className="gap-1.5">
                <Tag className="h-3.5 w-3.5" />
                Productos
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {vistaActual === 'combos' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {MOCK_COMBOS.filter((c) => c.disponible).map((combo) => {
                const totalUnidades = combo.items.reduce((s, i) => s + i.cantidad, 0)
                const ahorro = combo.precio_individual_suma - combo.precio_combo
                return (
                  <button
                    key={combo.id}
                    onClick={() => agregarCombo(combo.id)}
                    className="group relative text-left p-3.5 rounded-xl border bg-card hover-lift hover:border-primary/40"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <h4 className="font-semibold text-sm">{combo.nombre}</h4>
                          {combo.destacado && (
                            <Badge variant="warning" className="text-[10px] px-1.5 py-0">Popular</Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">{combo.descripcion}</div>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {combo.items.slice(0, 3).map((item, idx) => {
                            const prod = MOCK_PRODUCTOS.find((p) => p.id === item.producto_id)
                            return (
                              <span key={idx} className="text-[10px] bg-muted px-1.5 py-0.5 rounded">
                                {item.cantidad}× {prod?.nombre.split(' ')[0]}
                              </span>
                            )
                          })}
                          {combo.items.length > 3 && (
                            <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                              +{combo.items.length - 3}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-xl font-bold font-display tabular-nums text-primary">{formatCOP(combo.precio_combo)}</div>
                        {ahorro > 0 && (
                          <Badge variant="success" className="text-[10px] mt-0.5">
                            -{formatCOP(ahorro)}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          ) : (
            <>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Buscar producto..."
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    className="pl-9 h-10"
                    autoFocus
                  />
                </div>
              </div>
              <div className="flex gap-1.5 overflow-x-auto scrollbar-thin">
                <button
                  onClick={() => setCategoriaFiltro('todos')}
                  className={cn(
                    'px-3 h-7 text-xs font-medium rounded-md border whitespace-nowrap',
                    categoriaFiltro === 'todos' ? 'bg-foreground text-background border-foreground' : 'bg-card hover:bg-muted',
                  )}
                >
                  Todos
                </button>
                {categorias.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCategoriaFiltro(cat)}
                    className={cn(
                      'px-3 h-7 text-xs font-medium rounded-md border whitespace-nowrap capitalize',
                      categoriaFiltro === cat ? 'bg-foreground text-background border-foreground' : 'bg-card hover:bg-muted',
                    )}
                  >
                    {cat.replace('_', ' ')}
                  </button>
                ))}
              </div>

              {isLoading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <Skeleton key={i} className="h-24" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                  {productosFiltrados.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => agregar(p)}
                      disabled={p.stock_actual === 0}
                      className={cn(
                        'group relative text-left p-3 rounded-lg border bg-card hover-lift hover:border-primary/40 transition-colors',
                        p.stock_actual === 0 && 'opacity-50 cursor-not-allowed',
                      )}
                    >
                      <div className="font-semibold text-sm leading-tight">{p.nombre}</div>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-base font-bold font-display tabular-nums text-primary">
                          {formatCOP(p.precio_venta ?? 0)}
                        </span>
                        <Badge
                          variant={p.stock_actual === 0 ? 'destructive' : p.stock_actual < 20 ? 'warning' : 'secondary'}
                          className="text-[10px]"
                        >
                          {p.stock_actual}
                        </Badge>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* === Carrito === */}
        <div className="lg:col-span-2">
          <Card className="sticky top-20 flex flex-col h-[calc(100vh-7rem)]">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <ShoppingBag className="h-4 w-4" />
                  Carrito
                </span>
                {totalItems > 0 && <Badge>{totalItems}</Badge>}
              </CardTitle>
            </CardHeader>

            {cart.length === 0 ? (
              <CardContent className="flex-1 flex flex-col items-center justify-center text-center py-12">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                  <ShoppingBag className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium">Carrito vacío</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">
                  Selecciona productos o combos del catálogo
                </p>
              </CardContent>
            ) : (
              <>
                <CardContent className="flex-1 overflow-y-auto p-3 scrollbar-thin">
                  <div className="space-y-2">
                    {cart.map((item) => (
                      <div key={item.id} className="flex items-center gap-2 p-2 rounded-md bg-muted/40">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{item.nombre}</div>
                          <div className="text-[11px] text-muted-foreground tabular-nums">
                            {formatCOP(item.subtotal / item.cantidad)} × {item.cantidad}
                          </div>
                        </div>
                        <div className="flex items-center gap-0.5">
                          <Button size="icon" variant="outline" className="h-6 w-6" onClick={() => cambiarCantidad(item.id, -1)}>
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-7 text-center font-semibold text-sm tabular-nums">{item.cantidad}</span>
                          <Button size="icon" variant="outline" className="h-6 w-6" onClick={() => cambiarCantidad(item.id, 1)}>
                            <Plus className="h-3 w-3" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-6 w-6 text-rose-500 ml-1" onClick={() => eliminarDelCart(item.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>

                <div className="border-t p-4 space-y-3 bg-muted/30">
                  {/* Método de pago */}
                  <div className="grid grid-cols-2 gap-1.5">
                    {METODOS_PAGO.map((m) => (
                      <button
                        key={m.value}
                        onClick={() => setMetodoPago(m.value)}
                        className={cn(
                          'flex items-center gap-2 p-2 rounded-md border-2 text-xs font-medium transition-colors',
                          metodoPago === m.value
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border hover:border-primary/50 bg-card',
                        )}
                      >
                        <m.icon className="h-3.5 w-3.5" />
                        {m.label}
                      </button>
                    ))}
                  </div>

                  <Separator />

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground tabular-nums">
                      <span>Subtotal</span>
                      <span>{formatCOP(total)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground tabular-nums">
                      <span>IVA (8%)</span>
                      <span>{formatCOP(iva)}</span>
                    </div>
                    <div className="flex justify-between text-xl font-bold font-display pt-1 border-t">
                      <span>Total</span>
                      <span className="text-primary tabular-nums">{formatCOP(totalConIva)}</span>
                    </div>
                  </div>

                  <Button
                    size="lg"
                    className="w-full font-semibold"
                    onClick={() => registrarMutation.mutate()}
                    disabled={registrarMutation.isPending || (destino === 'mesa' && mesaSeleccionada == null)}
                  >
                    {registrarMutation.isPending ? (
                      'Procesando...'
                    ) : (
                      <>
                        <Check className="mr-2 h-5 w-5" />
                        {destino === 'mesa' && mesaSeleccionada != null
                          ? `Cobrar ${labelDestino} · ${formatCOP(totalConIva)}`
                          : `Cobrar · ${formatCOP(totalConIva)}`}
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}
          </Card>
        </div>
      </div>

      {/* Confirmación */}
      <Dialog open={!!ventaExitosa} onOpenChange={() => setVentaExitosa(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-600">
              <Check className="h-5 w-5" /> ¡Venta cobrada!
            </DialogTitle>
            <DialogDescription>
              Venta #{ventaExitosa?.id} registrada. Stock descontado automáticamente.
            </DialogDescription>
          </DialogHeader>
          <div className="text-center py-4">
            <div className="text-4xl font-bold font-display tabular-nums text-primary">
              {formatCOP(ventaExitosa?.total ?? 0)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Total cobrado</div>
          </div>
          <DialogFooter>
            <Button onClick={() => setVentaExitosa(null)} className="w-full">
              Nueva venta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}