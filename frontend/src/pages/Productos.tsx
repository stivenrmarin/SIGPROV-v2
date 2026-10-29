import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus, Search, Filter, Pencil, Trash2, Package, AlertTriangle,
  TrendingDown, TrendingUp, Download, FileText, FileSpreadsheet, ChevronDown,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader,
  DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { api_productos, api_inventario } from '@/services/api'
import { formatCOP, formatNumber } from '@/lib/utils'
import type { Producto } from '@/types'
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { reporteProductos } from '@/lib/export'
import { toast } from '@/components/ui/sonner'

const CATEGORIAS = [
  'panes', 'pasteles', 'cafes', 'bebidas_postobon', 'galletas', 'otros', 'materia_prima',
] as const

export default function Productos() {
  const [busqueda, setBusqueda] = useState('')
  const [tabActiva, setTabActiva] = useState<'terminado' | 'materia_prima'>('terminado')
  const [modalAbierto, setModalAbierto] = useState(false)
  const queryClient = useQueryClient()

  const { data: productos, isLoading } = useQuery({
    queryKey: ['productos'],
    queryFn: () => api_productos.listar({ activo: true }),
  })

  const { data: alertas } = useQuery({
    queryKey: ['inventario', 'alertas'],
    queryFn: api_inventario.alertas,
  })

  const crearMutation = useMutation({
    mutationFn: api_productos.crear,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productos'] })
      toast.success('Producto creado ✅')
      setModalAbierto(false)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const productosFiltrados = productos
    ?.filter((p) => p.tipo === tabActiva)
    .filter((p) => !busqueda || p.nombre.toLowerCase().includes(busqueda.toLowerCase()))

  const exportarInventario = (formato: 'csv' | 'excel' | 'pdf') => {
    if (!productos || !alertas) return
    try {
      const reporte = reporteProductos(productos, alertas)
      if (formato === 'csv') reporte.csv()
      else if (formato === 'excel') reporte.excel()
      else reporte.pdf()
      toast.success(`Inventario exportado (${formato.toUpperCase()})`)
    } catch (e: any) {
      toast.error(`Error al exportar: ${e.message}`)
    }
  }

  const handleCrear = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const data = {
      nombre: formData.get('nombre') as string,
      tipo: formData.get('tipo') as 'terminado' | 'materia_prima',
      categoria: formData.get('categoria') as Producto['categoria'],
      precio_venta: formData.get('precio_venta') ? Number(formData.get('precio_venta')) : null,
      costo_unitario: Number(formData.get('costo_unitario')),
      unidad: (formData.get('unidad') as string) || 'unidad',
      stock_minimo: Number(formData.get('stock_minimo') || 5),
      stock_actual: Number(formData.get('stock_actual') || 0),
      activo: true,
    }
    crearMutation.mutate(data)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Package className="h-7 w-7" />
            Productos
          </h2>
          <p className="text-muted-foreground mt-1">
            Tu inventario y materia prima
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="pl-9 w-64"
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Exportar
                <ChevronDown className="ml-2 h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => exportarInventario('pdf')}>
                <FileText className="mr-2 h-4 w-4 text-rose-500" /> PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportarInventario('excel')}>
                <FileSpreadsheet className="mr-2 h-4 w-4 text-emerald-600" /> Excel
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportarInventario('csv')}>
                <FileText className="mr-2 h-4 w-4 text-blue-500" /> CSV
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Dialog open={modalAbierto} onOpenChange={setModalAbierto}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nuevo producto
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Crear producto</DialogTitle>
                <DialogDescription>
                  Agrega un producto terminado o materia prima al inventario.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCrear} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="nombre">Nombre</Label>
                    <Input id="nombre" name="nombre" required placeholder="Ej: Pan integral" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tipo">Tipo</Label>
                    <Select name="tipo" defaultValue="terminado" required>
                      <SelectTrigger id="tipo">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="terminado">Producto terminado</SelectItem>
                        <SelectItem value="materia_prima">Materia prima</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="categoria">Categoría</Label>
                    <Select name="categoria" defaultValue="panes" required>
                      <SelectTrigger id="categoria">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIAS.map((c) => (
                          <SelectItem key={c} value={c}>{c.replace('_', ' ')}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="precio_venta">Precio venta (COP)</Label>
                    <Input
                      id="precio_venta"
                      name="precio_venta"
                      type="number"
                      placeholder="Solo para terminados"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="costo_unitario">Costo unitario (COP)</Label>
                    <Input id="costo_unitario" name="costo_unitario" type="number" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="unidad">Unidad</Label>
                    <Input id="unidad" name="unidad" defaultValue="unidad" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="stock_actual">Stock actual</Label>
                    <Input id="stock_actual" name="stock_actual" type="number" defaultValue="0" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="stock_minimo">Stock mínimo</Label>
                    <Input id="stock_minimo" name="stock_minimo" type="number" defaultValue="5" />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setModalAbierto(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={crearMutation.isPending}>
                    {crearMutation.isPending ? 'Creando...' : 'Crear producto'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Alertas activas */}
      {alertas && alertas.length > 0 && (
        <Card className="border-rose-200 bg-rose-50 dark:bg-rose-950/20 dark:border-rose-900">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-rose-700 dark:text-rose-300">
              <AlertTriangle className="h-4 w-4" />
              {alertas.length} producto{alertas.length !== 1 ? 's' : ''} con stock bajo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {alertas.slice(0, 6).map((a) => (
                <div key={a.producto_id} className="bg-background rounded-lg p-3 border">
                  <div className="font-medium text-sm">{a.nombre}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Stock: <strong>{a.stock_actual}</strong> / mín {a.stock_minimo}
                  </div>
                  <Progress
                    value={a.stock_minimo > 0 ? (a.stock_actual / (a.stock_minimo * 2)) * 100 : 0}
                    className="mt-2 [&>div]:bg-rose-500"
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs value={tabActiva} onValueChange={(v) => setTabActiva(v as any)}>
        <TabsList>
          <TabsTrigger value="terminado">
            Productos terminados ({productos?.filter((p) => p.tipo === 'terminado').length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="materia_prima">
            Materia prima ({productos?.filter((p) => p.tipo === 'materia_prima').length ?? 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={tabActiva}>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead className="text-right">
                    {tabActiva === 'terminado' ? 'Precio venta' : 'Costo'}
                  </TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead className="w-32">Estado</TableHead>
                  <TableHead className="w-24 text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <>
                    {[1, 2, 3, 4, 5].map((i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={6}>
                          <Skeleton className="h-12" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </>
                )}
                {productosFiltrados?.map((p) => {
                  const stockBajo = p.stock_actual <= p.stock_minimo && p.stock_minimo > 0
                  const stockCritico = p.stock_actual === 0 && p.stock_minimo > 0
                  return (
                    <TableRow key={p.id}>
                      <TableCell>
                        <div className="font-medium">{p.nombre}</div>
                      </TableCell>
                      <TableCell className="text-muted-foreground capitalize">
                        {p.categoria.replace('_', ' ')}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCOP(tabActiva === 'terminado' ? (p.precio_venta ?? 0) : p.costo_unitario)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="font-medium">
                          {formatNumber(p.stock_actual)} <span className="text-xs text-muted-foreground">{p.unidad}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {stockCritico ? (
                          <Badge variant="destructive" className="gap-1">
                            <TrendingDown className="h-3 w-3" /> Crítico
                          </Badge>
                        ) : stockBajo ? (
                          <Badge variant="warning" className="gap-1">
                            <AlertTriangle className="h-3 w-3" /> Bajo
                          </Badge>
                        ) : (
                          <Badge variant="success" className="gap-1">
                            <TrendingUp className="h-3 w-3" /> OK
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button size="icon" variant="ghost" className="h-8 w-8">
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-rose-500">
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
                {productosFiltrados?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No hay productos
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}