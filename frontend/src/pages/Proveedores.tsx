import { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Truck, Package, Plus, Phone, Mail, MapPin, Clock, Star,
  Send, CheckCircle2, PackageOpen, AlertTriangle, ShoppingCart,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { es as esLocale } from 'date-fns/locale'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { api_proveedores, api_inventario, api_productos } from '@/services/api'
import { formatCOP, cn } from '@/lib/utils'
import { MOCK_PRODUCTOS, MOCK_RECETAS } from '@/data/mock'
import type { Proveedor, PedidoProveedor } from '@/types'
import { toast } from '@/components/ui/sonner'

const ESTADO_PEDIDO_CONFIG: Record<PedidoProveedor['estado'], { label: string; color: string; bg: string }> = {
  borrador:    { label: 'Borrador',    color: 'text-stone-700',   bg: 'bg-stone-100' },
  enviado:     { label: 'Enviado',     color: 'text-blue-700',    bg: 'bg-blue-100' },
  confirmado:  { label: 'Confirmado',  color: 'text-purple-700',  bg: 'bg-purple-100' },
  en_transito: { label: 'En tránsito', color: 'text-amber-700',   bg: 'bg-amber-100' },
  recibido:    { label: 'Recibido',    color: 'text-emerald-700', bg: 'bg-emerald-100' },
  cancelado:   { label: 'Cancelado',   color: 'text-rose-700',    bg: 'bg-rose-100' },
}

export default function Proveedores() {
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<'directorio' | 'pedidos' | 'stock'>('directorio')
  const [dialogPedidoAbierto, setDialogPedidoAbierto] = useState(false)
  const [proveedorSeleccionado, setProveedorSeleccionado] = useState<Proveedor | null>(null)

  const { data: proveedores, isLoading } = useQuery({
    queryKey: ['proveedores', 'lista'],
    queryFn: () => api_proveedores.listar(),
  })
  const { data: pedidos } = useQuery({
    queryKey: ['proveedores', 'pedidos'],
    queryFn: () => api_proveedores.pedidos(),
  })
  const { data: alertasStock } = useQuery({
    queryKey: ['inventario', 'alertas'],
    queryFn: () => api_inventario.alertas(),
  })

  const crearPedidoMutation = useMutation({
    mutationFn: ({ proveedorId, items }: { proveedorId: number; items: Array<{ materia_prima_id: number; cantidad: number }> }) =>
      api_proveedores.crearPedido(proveedorId, items),
    onSuccess: (pedido) => {
      queryClient.invalidateQueries({ queryKey: ['proveedores'] })
      queryClient.invalidateQueries({ queryKey: ['inventario'] })
      toast.success(`Pedido #${pedido.id} enviado · ${formatCOP(pedido.total)}`)
      setDialogPedidoAbierto(false)
      setProveedorSeleccionado(null)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  // === Productos críticos agrupados por proveedor ===
  const stockPorProveedor = useMemo(() => {
    if (!alertasStock) return new Map<number, typeof alertasStock>()
    const map = new Map<number, typeof alertasStock>()
    for (const alerta of alertasStock) {
      // Buscar proveedor de la materia prima
      const mp = MOCK_PRODUCTOS.find((p) => p.id === alerta.producto_id)
      if (!mp || mp.tipo !== 'terminado') continue
      // Para producto terminado, buscar un proveedor que lo surta (todos son iguales por ahora)
      // Asignamos a Harinas del Valle (id=1) como ejemplo
      const proveedorId = 1
      if (!map.has(proveedorId)) map.set(proveedorId, [])
      map.get(proveedorId)!.push(alerta)
    }
    return map
  }, [alertasStock])

  if (isLoading || !proveedores) {
    return <Skeleton className="h-96" />
  }

  return (
    <div className="space-y-6 max-w-[1400px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display tracking-tight flex items-center gap-2">
            <Truck className="h-7 w-7" />
            Proveedores
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Directorio · Pedidos · Stock crítico
          </p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList>
          <TabsTrigger value="directorio" className="gap-1.5">
            <Truck className="h-3.5 w-3.5" />
            Directorio ({proveedores.length})
          </TabsTrigger>
          <TabsTrigger value="pedidos" className="gap-1.5">
            <Package className="h-3.5 w-3.5" />
            Pedidos ({pedidos?.length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="stock" className="gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5" />
            Stock crítico
            {alertasStock && alertasStock.length > 0 && (
              <Badge variant="destructive" className="ml-1 text-[10px]">{alertasStock.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* === Directorio === */}
        <TabsContent value="directorio" className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {proveedores.map((p) => (
              <ProveedorCard
                key={p.id}
                proveedor={p}
                stockCritico={stockPorProveedor.get(p.id)?.length || 0}
                onCrearPedido={() => {
                  setProveedorSeleccionado(p)
                  setDialogPedidoAbierto(true)
                }}
              />
            ))}
          </div>
        </TabsContent>

        {/* === Pedidos === */}
        <TabsContent value="pedidos" className="space-y-3">
          {pedidos && pedidos.length > 0 ? (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pedido #</TableHead>
                    <TableHead>Proveedor</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Entrega estimada</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pedidos.map((p) => {
                    const proveedor = proveedores.find((pr) => pr.id === p.proveedor_id)
                    const cfg = ESTADO_PEDIDO_CONFIG[p.estado]
                    return (
                      <TableRow key={p.id}>
                        <TableCell className="font-mono font-semibold">#{p.id}</TableCell>
                        <TableCell>{proveedor?.nombre ?? `Proveedor #${p.proveedor_id}`}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(p.fecha), { addSuffix: true, locale: esLocale })}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn('text-[10px]', cfg.color, cfg.bg)}>
                            {cfg.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">
                          {new Date(p.fecha_entrega_estimada).toLocaleDateString('es-CO', {
                            day: 'numeric', month: 'short',
                          })}
                        </TableCell>
                        <TableCell className="text-right tabular-nums font-semibold">
                          {formatCOP(p.total)}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </Card>
          ) : (
            <Card className="p-12 text-center">
              <PackageOpen className="h-12 w-12 mx-auto text-muted-foreground" />
              <p className="mt-3 text-sm font-medium">No hay pedidos registrados</p>
              <p className="text-xs text-muted-foreground mt-1">Crea tu primer pedido desde el Directorio</p>
            </Card>
          )}
        </TabsContent>

        {/* === Stock crítico === */}
        <TabsContent value="stock" className="space-y-3">
          {alertasStock && alertasStock.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-rose-500" />
                  {alertasStock.length} producto{alertasStock.length !== 1 ? 's' : ''} con stock bajo
                </CardTitle>
                <CardDescription>
                  Productos que necesitan reposición. Hacé click en "Pedir" para crear un pedido automático.
                </CardDescription>
              </CardHeader>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead>Stock actual</TableHead>
                    <TableHead>Stock mínimo</TableHead>
                    <TableHead>Cobertura</TableHead>
                    <TableHead>Proveedor sugerido</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {alertasStock.map((alerta) => {
                    const producto = MOCK_PRODUCTOS.find((p) => p.id === alerta.producto_id)
                    const proveedorSugerido = proveedores[0] // Simplificado
                    const diasCobertura = alerta.stock_minimo > 0
                      ? Math.round((alerta.stock_actual / alerta.stock_minimo) * 7)
                      : 0
                    return (
                      <TableRow key={alerta.producto_id}>
                        <TableCell>
                          <div className="font-medium">{alerta.nombre}</div>
                          {producto?.categoria && (
                            <div className="text-[10px] text-muted-foreground capitalize">{producto.categoria.replace('_', ' ')}</div>
                          )}
                        </TableCell>
                        <TableCell className="tabular-nums">
                          <Badge variant={alerta.estado === 'critico' ? 'destructive' : 'warning'}>
                            {alerta.stock_actual} und
                          </Badge>
                        </TableCell>
                        <TableCell className="tabular-nums text-muted-foreground">{alerta.stock_minimo}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                              <div
                                className={cn(
                                  'h-full rounded-full',
                                  alerta.estado === 'critico' ? 'bg-rose-500' : 'bg-amber-500',
                                )}
                                style={{ width: `${Math.min(100, diasCobertura * 14)}%` }}
                              />
                            </div>
                            <span className="text-xs">{diasCobertura}d</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {proveedorSugerido?.nombre}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setProveedorSeleccionado(proveedorSugerido ?? null)
                              setDialogPedidoAbierto(true)
                            }}
                          >
                            <ShoppingCart className="mr-1.5 h-3.5 w-3.5" />
                            Pedir
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </Card>
          ) : (
            <Card className="p-12 text-center">
              <CheckCircle2 className="h-12 w-12 mx-auto text-emerald-500" />
              <p className="mt-3 text-sm font-medium">Todo el stock está en orden</p>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialog crear pedido */}
      {proveedorSeleccionado && (
        <CrearPedidoDialog
          open={dialogPedidoAbierto}
          onClose={() => {
            setDialogPedidoAbierto(false)
            setProveedorSeleccionado(null)
          }}
          proveedor={proveedorSeleccionado}
          onCrear={(items) => crearPedidoMutation.mutate({
            proveedorId: proveedorSeleccionado.id, items,
          })}
          loading={crearPedidoMutation.isPending}
        />
      )}
    </div>
  )
}

function ProveedorCard({ proveedor, stockCritico, onCrearPedido }: {
  proveedor: Proveedor
  stockCritico: number
  onCrearPedido: () => void
}) {
  return (
    <Card className="hover-lift">
      <CardContent className="pt-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-base">{proveedor.nombre}</h3>
              <div className="flex">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={cn(
                      'h-3 w-3',
                      i < proveedor.calificacion ? 'fill-amber-400 text-amber-400' : 'text-stone-300',
                    )}
                  />
                ))}
              </div>
            </div>
            <Badge variant="secondary" className="mt-1 text-[10px]">{proveedor.categoria}</Badge>
          </div>
          {stockCritico > 0 && (
            <Badge variant="destructive" className="text-[10px]">
              <AlertTriangle className="h-3 w-3 mr-1" /> {stockCritico} crítico{stockCritico > 1 ? 's' : ''}
            </Badge>
          )}
        </div>

        <div className="space-y-1.5 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Phone className="h-3 w-3 shrink-0" />
            <span>{proveedor.telefono}</span>
          </div>
          <div className="flex items-center gap-2">
            <Mail className="h-3 w-3 shrink-0" />
            <span className="truncate">{proveedor.email}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="truncate">{proveedor.direccion}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-3 w-3 shrink-0" />
            <span>Entrega en {proveedor.dias_entrega}d · Min {formatCOP(proveedor.min_pedido)}</span>
          </div>
        </div>

        <Separator className="my-3" />

        <div className="flex items-center justify-between">
          <div className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground">
            {proveedor.contacto}
          </div>
          <Button size="sm" onClick={onCrearPedido} className="font-semibold">
            <Send className="mr-1.5 h-3.5 w-3.5" /> Pedir
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function CrearPedidoDialog({ open, onClose, proveedor, onCrear, loading }: {
  open: boolean
  onClose: () => void
  proveedor: Proveedor
  onCrear: (items: Array<{ materia_prima_id: number; cantidad: number }>) => void
  loading: boolean
}) {
  // Materia prima sugerida para este proveedor (simplificado: todas)
  const [items, setItems] = useState<Array<{ materia_prima_id: number; cantidad: number }>>([])

  const materiaPrima = useMemo(
    () => MOCK_PRODUCTOS.filter((p) => p.tipo === 'materia_prima'),
    [],
  )

  // Items pre-cargados con sugerencia basada en stock bajo.
  // Es un efecto (no un memo): setItems dentro de useMemo es un efecto
  // secundario y React lo ejecuta en el render.
  useEffect(() => {
    if (!open || items.length > 0) return

    const sugerencias: Record<string, number> = {
      'Harina': 50,
      'Levadura': 3,
      'Mantequilla': 5,
      'Azúcar': 10,
      'Sal': 3,
      'Queso': 5,
      'Arequipe': 4,
      'Leche': 30,
      'Chocolate': 3,
      'Café molido': 3,
      'Huevos': 100,
      'Aceite': 5,
      'Papa': 10,
    }
    const inicial = materiaPrima.slice(0, 5).map((mp) => ({
      materia_prima_id: mp.id,
      cantidad: sugerencias[mp.nombre] || 10,
    }))
    setItems(inicial)
  }, [open, items.length, materiaPrima])

  const total = items.reduce((sum, item) => {
    const mp = MOCK_PRODUCTOS.find((p) => p.id === item.materia_prima_id)
    return sum + (mp ? Number(mp.costo_unitario) * item.cantidad : 0)
  }, 0)

  const cumpleMinimo = total >= proveedor.min_pedido

  const handleCrear = (e: React.FormEvent) => {
    e.preventDefault()
    if (!cumpleMinimo) {
      toast.error(`Pedido mínimo: ${formatCOP(proveedor.min_pedido)}`)
      return
    }
    if (items.length === 0) {
      toast.error('Agregá al menos un producto')
      return
    }
    onCrear(items)
  }

  const updateCantidad = (id: number, cant: number) => {
    if (cant <= 0) {
      setItems(items.filter((i) => i.materia_prima_id !== id))
    } else {
      setItems(items.map((i) => i.materia_prima_id === id ? { ...i, cantidad: cant } : i))
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="h-4 w-4" />
            Pedido a {proveedor.nombre}
          </DialogTitle>
          <DialogDescription>
            Configurá los productos y cantidades. Mínimo: {formatCOP(proveedor.min_pedido)}.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleCrear} className="space-y-4">
          <div className="border rounded-lg overflow-hidden max-h-72 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Materia prima</TableHead>
                  <TableHead>Unidad</TableHead>
                  <TableHead className="text-right">Costo/u</TableHead>
                  <TableHead className="text-right">Cantidad</TableHead>
                  <TableHead className="text-right">Subtotal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {materiaPrima.map((mp) => {
                  const item = items.find((i) => i.materia_prima_id === mp.id)
                  const cant = item?.cantidad || 0
                  return (
                    <TableRow key={mp.id}>
                      <TableCell>
                        <div className="font-medium text-sm">{mp.nombre}</div>
                        {cant === 0 && (
                          <Badge variant="outline" className="text-[9px] mt-1">Sin pedir</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">{mp.unidad}</TableCell>
                      <TableCell className="text-right text-xs tabular-nums">
                        {formatCOP(Number(mp.costo_unitario))}
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          min="0"
                          value={cant}
                          onChange={(e) => updateCantidad(mp.id, Number(e.target.value) || 0)}
                          className="w-20 h-8 tabular-nums"
                        />
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-medium">
                        {formatCOP(Number(mp.costo_unitario) * cant)}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground">Total pedido</div>
              <div className={cn(
                'text-2xl font-bold font-display tabular-nums',
                cumpleMinimo ? 'text-primary' : 'text-rose-600',
              )}>
                {formatCOP(total)}
              </div>
              {!cumpleMinimo && (
                <div className="text-[10px] text-rose-600 mt-1">
                  Faltan {formatCOP(proveedor.min_pedido - total)} para el mínimo
                </div>
              )}
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground">Entrega estimada</div>
              <div className="text-sm font-semibold mt-1">
                {new Date(Date.now() + proveedor.dias_entrega * 86_400_000).toLocaleDateString('es-CO', {
                  day: 'numeric', month: 'short',
                })}
              </div>
              <div className="text-[10px] text-muted-foreground">
                en {proveedor.dias_entrega} días
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={!cumpleMinimo || loading}>
              <Send className="mr-2 h-4 w-4" />
              {loading ? 'Enviando...' : 'Enviar pedido'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}