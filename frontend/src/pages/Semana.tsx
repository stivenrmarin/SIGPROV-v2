import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Sparkles, AlertCircle, AlertTriangle, Package, TrendingUp,
  TrendingDown, Calendar, Download, FileText, FileSpreadsheet,
  ChevronDown, ChevronRight, CheckCircle2, ArrowRight,
  Clock, ShoppingCart, Truck, Coffee, Wallet,
} from 'lucide-react'
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import { api_dashboard, api_prediccion } from '@/services/api'
import { formatCOP, cn, formatDateShort, hoyISO } from '@/lib/utils'
import { reporteSemana } from '@/lib/export'
import { toast } from '@/components/ui/sonner'
import type { DistribucionCategoria, PrediccionProducto, HeatmapCelda, Recomendacion } from '@/data/mock'
import { MOCK_COMBOS, MOCK_FESTIVOS } from '@/data/mock'

const CATEGORIA_COLORS: Record<string, string> = {
  panes: '#EA580C',
  cafes: '#92400E',
  bebidas_postobon: '#2563EB',
  pasteles: '#DB2777',
  galletas: '#65A30D',
  combos: '#7C3AED',
  materia_prima: '#6B7280',
  otros: '#0EA5E9',
}

const CATEGORIA_LABEL: Record<string, string> = {
  panes: 'Panes',
  cafes: 'Cafés',
  bebidas_postobon: 'Bebidas Postobón',
  pasteles: 'Pasteles',
  galletas: 'Galletas',
  combos: 'Combos',
  materia_prima: 'Materia prima',
  otros: 'Otros',
}

const DIAS_SEMANA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

export default function Semana() {
  const [tab, setTab] = useState<'general' | 'productos' | 'patron'>('general')

  const { data: semana, isLoading } = useQuery({
    queryKey: ['dashboard', 'semana'],
    queryFn: api_dashboard.semana,
  })
  const { data: metricas } = useQuery({
    queryKey: ['prediccion', 'metricas'],
    queryFn: api_prediccion.resumenMetricas,
  })
  const { data: distribucion } = useQuery({
    queryKey: ['prediccion', 'distribucion'],
    queryFn: () => api_prediccion.distribucionPorCategoria(30),
  })
  const { data: predicciones } = useQuery({
    queryKey: ['prediccion', 'productos'],
    queryFn: () => api_prediccion.prediccionesPorProducto(),
  })
  const { data: heatmap } = useQuery({
    queryKey: ['prediccion', 'heatmap'],
    queryFn: () => api_prediccion.heatmapSemanal(),
  })
  const { data: recomendaciones } = useQuery({
    queryKey: ['prediccion', 'recomendaciones'],
    queryFn: () => api_prediccion.recomendaciones(),
  })

  const exportar = (formato: 'csv' | 'excel' | 'pdf') => {
    if (!semana) return
    try {
      const reporte = reporteSemana(semana)
      if (formato === 'csv') reporte.csv()
      else if (formato === 'excel') reporte.excel()
      else reporte.pdf()
      toast.success(`Reporte descargado (${formato.toUpperCase()})`)
    } catch (e: any) {
      toast.error(`Error: ${e.message}`)
    }
  }

  const reentrenar = () => {
    toast.success('Reentrenando Prophet con 12 meses de datos...')
    api_prediccion.entrenar().then(() => toast.success('Modelo actualizado ✅'))
  }

  if (isLoading || !semana || !predicciones || !distribucion) {
    return (
      <div className="space-y-6 max-w-[1400px]">
        <Skeleton className="h-16" />
        <Skeleton className="h-72" />
      </div>
    )
  }

  const totalUltimos7 = semana.historico_7_dias.reduce((s, d) => s + (d.total ?? 0), 0)
  const totalPredicho7 = semana.prediccion_7_dias.reduce((s, d) => s + (d.total ?? 0), 0)
  const variacionVs7d = totalUltimos7 > 0 ? ((totalPredicho7 - totalUltimos7) / totalUltimos7) * 100 : 0

  const productosUrgentes = predicciones.filter((p) => p.urgente)
  const productosRecomendados = predicciones.filter((p) => p.recomendado_producir > 0)

  return (
    <div className="space-y-6 max-w-[1400px]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold font-display tracking-tight">Predicción ML</h1>
          <p className="text-sm text-muted-foreground">
            Modelo Prophet con festivos colombianos ·{' '}
            <Badge variant="secondary" className="text-[10px] font-mono">
              <Sparkles className="h-2.5 w-2.5 mr-0.5" /> {semana.modelo_version}
            </Badge>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={reentrenar}>
            <Sparkles className="mr-1.5 h-3.5 w-3.5" /> Reentrenar
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Download className="mr-1.5 h-3.5 w-3.5" /> Exportar
                <ChevronDown className="ml-1.5 h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Reporte semanal</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => exportar('pdf')}>
                <FileText className="mr-2 h-4 w-4 text-rose-500" /> PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportar('excel')}>
                <FileSpreadsheet className="mr-2 h-4 w-4 text-emerald-600" /> Excel
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportar('csv')}>
                <FileText className="mr-2 h-4 w-4 text-blue-500" /> CSV
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Hero card - predicción principal */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/[0.04] via-background to-background">
        <CardContent className="py-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-1">
              <div className="flex items-center gap-2 text-xs uppercase font-semibold tracking-wider text-muted-foreground">
                <Wallet className="h-3.5 w-3.5" />
                Predicción próxima semana
              </div>
              <div className="text-4xl font-bold font-display tabular-nums tracking-tight mt-2">
                {formatCOP(totalPredicho7)}
              </div>
              <div className={cn(
                'flex items-center gap-1.5 mt-2 text-sm font-semibold',
                variacionVs7d >= 0 ? 'text-emerald-600' : 'text-rose-600',
              )}>
                {variacionVs7d >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                <span className="tabular-nums">{variacionVs7d >= 0 ? '+' : ''}{variacionVs7d.toFixed(1)}%</span>
                <span className="text-muted-foreground font-normal">vs semana pasada</span>
              </div>
              <div className="mt-4 text-xs text-muted-foreground">
                <span className="font-semibold text-foreground tabular-nums">{metricas?.n_predicciones_evaluadas ?? 0}</span> predicciones evaluadas ·
                MAPE <span className="font-semibold text-foreground tabular-nums">{metricas?.mape?.toFixed(1) ?? '—'}%</span>
              </div>
            </div>

            {/* Mini-stats */}
            <div className="lg:col-span-3 grid grid-cols-3 gap-3">
              <MiniStat
                icon={AlertTriangle}
                accent="destructive"
                label="Necesitan pedido"
                value={productosUrgentes.length}
                detail={`${productosRecomendados.length} con recomendación`}
              />
              <MiniStat
                icon={ShoppingCart}
                accent="info"
                label="Ticket predicho"
                value={formatCOP(totalPredicho7 / Math.max(semana.prediccion_7_dias.length, 1))}
                detail="promedio por día"
              />
              <MiniStat
                icon={CheckCircle2}
                accent="success"
                label="Precisión modelo"
                value={`${metricas ? (100 - metricas.mape).toFixed(0) : '—'}%`}
                detail={`MAPE ${metricas?.mape?.toFixed(1) ?? '—'}% · MAE ${metricas ? formatCOP(metricas.mae) : '—'}`}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recomendaciones automáticas */}
      {recomendaciones && recomendaciones.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Recomendaciones automáticas
            </CardTitle>
            <CardDescription className="text-xs">
              Basado en tu histórico y la predicción actual
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {recomendaciones.map((r, idx) => (
                <RecomendacionCard key={idx} recomendacion={r} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList>
          <TabsTrigger value="general">Vista general</TabsTrigger>
          <TabsTrigger value="productos">Por producto</TabsTrigger>
          <TabsTrigger value="patron">Por día y hora</TabsTrigger>
        </TabsList>

        {/* === Vista general === */}
        <TabsContent value="general" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Distribución por categoría */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Distribución por categoría</CardTitle>
                <CardDescription className="text-xs">% de ventas últimos 30 días</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center gap-4">
                  <ResponsiveContainer width={140} height={140}>
                    <PieChart>
                      <Pie
                        data={distribucion}
                        dataKey="total"
                        nameKey="categoria"
                        innerRadius={36}
                        outerRadius={60}
                        paddingAngle={2}
                      >
                        {distribucion.map((d, i) => (
                          <Cell key={i} fill={CATEGORIA_COLORS[d.categoria] || '#94a3b8'} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex-1 space-y-1.5 min-w-0">
                    {distribucion.slice(0, 6).map((d) => (
                      <div key={d.categoria} className="flex items-center gap-2 text-xs">
                        <div
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: CATEGORIA_COLORS[d.categoria] || '#94a3b8' }}
                        />
                        <span className="capitalize flex-1 truncate">
                          {CATEGORIA_LABEL[d.categoria] || d.categoria}
                        </span>
                        <span className="font-semibold tabular-nums">{d.porcentaje.toFixed(0)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Festivos próximos */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-amber-500" />
                  Festivos próximos 14 días
                </CardTitle>
                <CardDescription className="text-xs">Impacto en ventas esperado</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                {(() => {
                  const hoy = hoyISO()
                  const futuros = MOCK_FESTIVOS.filter((f) => f.fecha > hoy).slice(0, 3)
                  if (futuros.length === 0) {
                    return (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Sin festivos próximos · ventas normales
                      </p>
                    )
                  }
                  return (
                    <div className="space-y-2.5">
                      {futuros.map((f) => (
                        <div key={f.fecha} className="flex items-start gap-3 p-2.5 rounded-md border">
                          <div className={cn(
                            'w-8 h-8 rounded-md flex items-center justify-center font-bold text-xs tabular-nums shrink-0',
                            f.efecto_venta > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700',
                          )}>
                            {new Date(f.fecha).getDate()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">{f.nombre}</div>
                            <div className="text-[10px] text-muted-foreground">{f.fecha}</div>
                          </div>
                          <Badge variant={f.efecto_venta > 0 ? 'success' : 'destructive'} className="text-[10px]">
                            {f.efecto_venta > 0 ? '+' : ''}{(f.efecto_venta * 100).toFixed(0)}%
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )
                })()}
              </CardContent>
            </Card>

            {/* Predicción próxima semana - resumen */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Predicción día a día
                </CardTitle>
                <CardDescription className="text-xs">Próximos 7 días</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-1.5">
                  {semana.prediccion_7_dias.map((p, i) => {
                    const d = new Date(p.fecha)
                    const esHoy = i === 0
                    return (
                      <div key={p.fecha} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-muted-foreground w-8">
                            {DIAS_SEMANA[d.getDay()]}
                          </span>
                          <span className="text-[11px] text-muted-foreground tabular-nums">
                            {d.getDate()}
                          </span>
                          {p.es_festivo && (
                            <span className="text-[10px]">🎉</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary"
                              style={{ width: `${Math.min(100, ((p.total ?? 0) / totalPredicho7) * 100 * 2)}%` }}
                            />
                          </div>
                          <span className="text-sm font-semibold tabular-nums w-24 text-right">
                            {formatCOP(p.total ?? 0)}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Histórico + predicción chart */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Histórico 7d + Predicción 7d</CardTitle>
              <CardDescription className="text-xs">
                Línea azul: real · Línea verde: predicho · Área verde: intervalo de confianza 95%
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <div>Chart placeholder</div>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* === Por producto === */}
        <TabsContent value="productos" className="space-y-4">
          <Card className="border-primary/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="h-4 w-4" />
                Producción por producto · próximos 7 días
              </CardTitle>
              <CardDescription className="text-xs">
                Cuánto vas a vender · cuánto stock tienes · cuánto <strong>hornear</strong> y qué materia prima necesitas
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead className="text-right">Vendidos 7d</TableHead>
                      <TableHead className="text-right">Predicción 7d</TableHead>
                      <TableHead className="text-right">Stock hoy</TableHead>
                      <TableHead>Cobertura</TableHead>
                      <TableHead className="text-right">Hornear</TableHead>
                      <TableHead>Materia prima</TableHead>
                      <TableHead className="text-right">Margen</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {predicciones.slice(0, 20).map((p) => (
                      <ProductoRow key={p.producto_id} producto={p} />
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* === Por día y hora === */}
        <TabsContent value="patron" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Heatmap semanal
              </CardTitle>
              <CardDescription className="text-xs">
                Cuándo vendes más: día × hora (más oscuro = más ventas)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {heatmap && <HeatmapGrid data={heatmap} />}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// =============================================================
// Componentes auxiliares
// =============================================================

function MiniStat({ icon: Icon, accent, label, value, detail }: {
  icon: any
  accent: 'primary' | 'success' | 'warning' | 'destructive' | 'info'
  label: string
  value: React.ReactNode
  detail?: React.ReactNode
}) {
  const cls = {
    primary: 'text-primary bg-primary/10',
    success: 'text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/40',
    warning: 'text-amber-700 bg-amber-50 dark:text-amber-400 dark:bg-amber-950/40',
    destructive: 'text-rose-700 bg-rose-50 dark:text-rose-400 dark:bg-rose-950/40',
    info: 'text-blue-700 bg-blue-50 dark:text-blue-400 dark:bg-blue-950/40',
  }[accent]
  return (
    <Card className="border-stone-200/80">
      <CardContent className="py-4">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <div className={cn('flex h-5 w-5 items-center justify-center rounded', cls)}>
            <Icon className="h-3 w-3" />
          </div>
          {label}
        </div>
        <div className="text-2xl font-bold font-display tabular-nums mt-2">{value}</div>
        {detail && <div className="text-[11px] text-muted-foreground mt-1">{detail}</div>}
      </CardContent>
    </Card>
  )
}

function RecomendacionCard({ recomendacion: r }: { recomendacion: Recomendacion }) {
  const accents = {
    alta: 'border-rose-200 bg-rose-50/60 dark:border-rose-900 dark:bg-rose-950/20',
    media: 'border-amber-200 bg-amber-50/60 dark:border-amber-900 dark:bg-amber-950/20',
    baja: 'border-blue-200 bg-blue-50/60 dark:border-blue-900 dark:bg-blue-950/20',
  }
  const iconMap = {
    pedido: Truck,
    combo: ShoppingCart,
    festivo: Calendar,
    precio: Wallet,
  }
  const Icon = iconMap[r.tipo] || Sparkles
  const accentCls = accents[r.nivel]

  return (
    <div className={cn('p-3.5 rounded-lg border', accentCls)}>
      <div className="flex items-start gap-2.5">
        <div className="w-8 h-8 rounded-md bg-background flex items-center justify-center shrink-0 border">
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-sm font-semibold leading-tight">{r.titulo}</h4>
            <Badge variant="outline" className="text-[10px] capitalize">{r.nivel}</Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">{r.descripcion}</p>
          <div className="mt-2 pt-2 border-t flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">{r.impacto}</span>
            {r.accion && (
              <Button size="sm" variant="ghost" className="h-6 text-xs gap-1">
                {r.accion} <ArrowRight className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function ProductoRow({ producto: p }: { producto: PrediccionProducto }) {
  const colors = {
    critico: { bg: 'bg-rose-50 dark:bg-rose-950/20', text: 'text-rose-700 dark:text-rose-400', dot: 'bg-rose-500' },
    bajo:    { bg: 'bg-amber-50 dark:bg-amber-950/20', text: 'text-amber-700 dark:text-amber-400', dot: 'bg-amber-500' },
    ok:      { bg: '',                                  text: 'text-emerald-700 dark:text-emerald-400', dot: 'bg-emerald-500' },
    exceso:  { bg: 'bg-blue-50 dark:bg-blue-950/20',   text: 'text-blue-700 dark:text-blue-400', dot: 'bg-blue-500' },
  }
  const c = colors[p.nivel]

  const coberturaPct = p.stock_actual > 0
    ? Math.min(100, (p.dias_cobertura / 14) * 100)
    : 0

  return (
    <TableRow className={c.bg}>
      <TableCell>
        <div className="flex items-center gap-2">
          <div className={cn('w-1.5 h-8 rounded-full', c.dot)} />
          <div>
            <div className="font-medium text-sm">{p.nombre}</div>
            <div className="text-[10px] text-muted-foreground capitalize">
              {CATEGORIA_LABEL[p.categoria] || p.categoria}
            </div>
          </div>
        </div>
      </TableCell>
      <TableCell className="text-right tabular-nums text-sm">{p.unidades_vendidas_7d}</TableCell>
      <TableCell className="text-right">
        <div className="font-semibold tabular-nums text-sm">{p.prediccion_7d}</div>
        <div className="text-[10px] text-muted-foreground tabular-nums">
          {p.prediccion_7d_min}–{p.prediccion_7d_max}
        </div>
      </TableCell>
      <TableCell className="text-right tabular-nums text-sm">{p.stock_actual}</TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className={cn('h-full rounded-full', c.dot)}
              style={{ width: `${coberturaPct}%` }}
            />
          </div>
          <span className={cn('text-xs font-medium tabular-nums', c.text)}>
            {p.dias_cobertura}d
          </span>
        </div>
      </TableCell>
      <TableCell className="text-right">
        {p.recomendado_producir > 0 ? (
          <span className="font-bold tabular-nums text-primary text-sm">+{p.recomendado_producir}</span>
        ) : (
          <span className="text-muted-foreground text-xs">—</span>
        )}
      </TableCell>
      <TableCell>
        {p.materia_prima_necesaria.length > 0 ? (
          <div className="text-[11px] space-y-0.5">
            {p.materia_prima_necesaria.slice(0, 2).map((m, i) => (
              <div key={i} className="text-muted-foreground">
                <span className="font-medium tabular-nums text-foreground">{m.cantidad_total}{m.unidad}</span> {m.materia_prima}
              </div>
            ))}
            {p.materia_prima_necesaria.length > 2 && (
              <div className="text-muted-foreground">+{p.materia_prima_necesaria.length - 2} más</div>
            )}
          </div>
        ) : (
          <span className="text-[11px] text-muted-foreground">Sin receta</span>
        )}
      </TableCell>
      <TableCell className="text-right">
        <div className={cn(
          'text-xs font-semibold tabular-nums',
          p.margen_pct >= 50 ? 'text-emerald-600' : p.margen_pct >= 30 ? 'text-amber-600' : 'text-rose-600',
        )}>
          {p.margen_pct.toFixed(0)}%
        </div>
        <div className="text-[10px] text-muted-foreground tabular-nums">
          costo {formatCOP(p.costo_unitario)}
        </div>
      </TableCell>
      <TableCell>
        <Badge
          variant={p.nivel === 'critico' ? 'destructive' : p.nivel === 'bajo' ? 'warning' : p.nivel === 'exceso' ? 'secondary' : 'success'}
          className="text-[10px] capitalize"
        >
          {p.nivel}
        </Badge>
      </TableCell>
    </TableRow>
  )
}

function HeatmapGrid({ data }: { data: HeatmapCelda[] }) {
  const horas = Array.from(new Set(data.map((d) => d.hora))).sort((a, b) => a - b)

  const cellColor = (intensidad: number) => {
    if (intensidad === 0) return 'bg-muted/30'
    if (intensidad < 20) return 'bg-orange-100/60'
    if (intensidad < 40) return 'bg-orange-200/70'
    if (intensidad < 60) return 'bg-orange-300/80'
    if (intensidad < 80) return 'bg-orange-400'
    return 'bg-orange-500'
  }

  return (
    <div>
      <div className="flex items-center gap-3 text-[11px] text-muted-foreground mb-3">
        <span>Mañana</span>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-3 rounded bg-muted/30" />
          <span>bajo</span>
          <div className="w-4 h-3 rounded bg-orange-200/70" />
          <div className="w-4 h-3 rounded bg-orange-300/80" />
          <div className="w-4 h-3 rounded bg-orange-400" />
          <div className="w-4 h-3 rounded bg-orange-500" />
          <span>alto</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          <div className="flex items-center mb-1.5 pl-12">
            {horas.map((h) => (
              <div key={h} className="flex-1 text-center text-[10px] text-muted-foreground tabular-nums min-w-7">
                {h}
              </div>
            ))}
          </div>
          {[0, 1, 2, 3, 4, 5, 6].map((dia) => (
            <div key={dia} className="flex items-center mb-0.5">
              <div className="w-12 text-[11px] font-medium text-muted-foreground">
                {DIAS_SEMANA[dia]}
              </div>
              {horas.map((h) => {
                const cell = data.find((d) => d.dia === dia && d.hora === h)
                return (
                  <div
                    key={`${dia}-${h}`}
                    className={cn(
                      'flex-1 h-7 mx-0.5 rounded transition-colors',
                      cellColor(cell?.intensidad ?? 0),
                    )}
                    title={`${DIAS_SEMANA[dia]} ${h}:00 · ${cell?.intensidad?.toFixed(0) ?? 0}% intensidad`}
                  />
                )
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 pt-4 border-t">
        <h4 className="text-sm font-semibold mb-2">Pico de ventas detectado</h4>
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 bg-muted/40 rounded-md">
            <div className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">Día más fuerte</div>
            <div className="text-base font-bold font-display mt-1">Sábado</div>
          </div>
          <div className="p-3 bg-muted/40 rounded-md">
            <div className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">Hora pico</div>
            <div className="text-base font-bold font-display mt-1">7 - 9 AM</div>
          </div>
          <div className="p-3 bg-muted/40 rounded-md">
            <div className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">Día más bajo</div>
            <div className="text-base font-bold font-display mt-1">Lunes</div>
          </div>
        </div>
      </div>
    </div>
  )
}