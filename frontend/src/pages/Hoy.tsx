import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  TrendingUp, TrendingDown, ShoppingBag, Armchair, Timer,
  Receipt, Flame, Tag, AlertTriangle, CheckCircle2, Coffee,
  Download, FileText, FileSpreadsheet, ChevronDown, ChevronRight,
  Sparkles, ArrowUpRight, Wallet, Users, Package,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import {
  Area, AreaChart, ResponsiveContainer, Tooltip as ChartTooltip,
  XAxis, YAxis, BarChart, Bar, Cell, CartesianGrid,
} from 'recharts'
import { formatDistanceToNow } from 'date-fns'
import { es as esLocale } from 'date-fns/locale'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import { api_dashboard, api_inventario } from '@/services/api'
import { formatCOP, formatDateLong, timeOfDayGreeting, cn, fechaISO } from '@/lib/utils'
import { MOCK_MESAS, MOCK_COMBOS, MOCK_PRODUCTOS, getTopProductos } from '@/data/mock'
import { reporteHoy } from '@/lib/export'
import { toast } from '@/components/ui/sonner'

interface KpiProps {
  label: string
  value: React.ReactNode
  delta?: { value: number; prefix?: string; label: string }
  spark?: number[]
  icon: React.ComponentType<{ className?: string }>
  accent?: 'primary' | 'success' | 'warning' | 'destructive' | 'info' | 'muted'
  detail?: React.ReactNode
}

function Kpi({ label, value, delta, spark, icon: Icon, accent = 'primary', detail }: KpiProps) {
  const positive = delta ? delta.value >= 0 : true
  const accentClass = {
    primary: 'text-primary bg-primary/10',
    success: 'text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/40',
    warning: 'text-amber-700 bg-amber-50 dark:text-amber-400 dark:bg-amber-950/40',
    destructive: 'text-rose-700 bg-rose-50 dark:text-rose-400 dark:bg-rose-950/40',
    info: 'text-blue-700 bg-blue-50 dark:text-blue-400 dark:bg-blue-950/40',
    muted: 'text-stone-700 bg-stone-100 dark:text-stone-300 dark:bg-stone-800/50',
  }[accent]

  return (
    <Card className="border-stone-200/80 dark:border-stone-800 hover-lift">
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <div className={cn('flex h-6 w-6 items-center justify-center rounded-md shrink-0', accentClass)}>
                <Icon className="h-3.5 w-3.5" />
              </div>
              <div className="text-xs font-medium text-muted-foreground truncate">{label}</div>
            </div>
            <div className="text-3xl font-bold mt-3 font-display tabular-nums tracking-tight">{value}</div>
            {detail && <div className="text-xs text-muted-foreground mt-1">{detail}</div>}
            {delta && (
              <div className={cn(
                'flex items-center gap-1 text-xs font-medium mt-2',
                positive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400',
              )}>
                {positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                <span>{positive ? '+' : ''}{delta.prefix}{delta.value.toFixed(1)}%</span>
                <span className="text-muted-foreground font-normal">{delta.label}</span>
              </div>
            )}
          </div>
        </div>
        {spark && spark.length > 1 && (
          <div className="h-10 mt-4 -mx-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={spark.map((v, i) => ({ i, v }))}>
                <defs>
                  <linearGradient id={`sg-${label}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="currentColor" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="currentColor" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="v"
                  stroke="currentColor"
                  fill={`url(#sg-${label})`}
                  strokeWidth={1.5}
                  className={cn(
                    accent === 'success' && 'text-emerald-500',
                    accent === 'warning' && 'text-amber-500',
                    accent === 'destructive' && 'text-rose-500',
                    accent === 'info' && 'text-blue-500',
                    accent === 'primary' && 'text-primary',
                    accent === 'muted' && 'text-stone-500',
                  )}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default function Hoy() {
  const { data: resumen, isLoading } = useQuery({
    queryKey: ['dashboard', 'resumen'],
    queryFn: api_dashboard.resumen,
  })

  const { data: alertas } = useQuery({
    queryKey: ['inventario', 'alertas'],
    queryFn: api_inventario.alertas,
  })

  if (isLoading || !resumen) {
    return (
      <div className="space-y-6 max-w-[1400px]">
        <Skeleton className="h-20" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-36" />)}
        </div>
        <Skeleton className="h-72" />
      </div>
    )
  }

  // Métricas
  const mesasOcupadas = MOCK_MESAS.filter((m) => m.estado === 'ocupada').length
  const mesasPidiendoCuenta = MOCK_MESAS.filter((m) => m.estado === 'pidiendo_cuenta').length
  const mesasLibres = MOCK_MESAS.filter((m) => m.estado === 'libre').length
  const totalEnMesas = MOCK_MESAS
    .filter((m) => m.estado === 'ocupada' || m.estado === 'pidiendo_cuenta')
    .reduce((s, m) => s + m.total_acumulado, 0)

  const capacidadTotal = MOCK_MESAS.reduce((s, m) => s + m.capacidad, 0)
  const capacidadOcupada = MOCK_MESAS
    .filter((m) => m.estado !== 'libre')
    .reduce((s, m) => s + m.capacidad, 0)
  const ocupacionPct = capacidadTotal > 0 ? Math.round((capacidadOcupada / capacidadTotal) * 100) : 0

  const stockBajo = alertas?.length ?? 0
  const totalProductos = MOCK_PRODUCTOS.length
  const productosActivos = MOCK_PRODUCTOS.filter((p) => p.activo).length
  const combosDisponibles = MOCK_COMBOS.filter((c) => c.disponible).length

  const topProductos = getTopProductos(1).slice(0, 6)
  const topCombos = MOCK_COMBOS.filter((c) => c.destacado).slice(0, 3)

  // Sparklines
  const sparkVentas = resumen.sparkVentas

  // Datos para gráfico de barras (últimos 7 días con nombres reales)
  const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
  const ventasData = resumen.sparkVentas.map((v, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (resumen.sparkVentas.length - 1 - i))
    const esHoy = i === resumen.sparkVentas.length - 1
    return {
      dia: esHoy ? 'Hoy' : `${DIAS[d.getDay()]} ${d.getDate()}`,
      fecha: fechaISO(d),
      total: v,
    }
  })

  // Reporte
  const reporte = reporteHoy(resumen, stockBajo, mesasOcupadas + mesasPidiendoCuenta, totalEnMesas)
  const exportar = (formato: 'csv' | 'excel' | 'pdf') => {
    try {
      if (formato === 'csv') reporte.csv()
      else if (formato === 'excel') reporte.excel()
      else reporte.pdf()
      toast.success(`Reporte descargado (${formato.toUpperCase()})`)
    } catch (e: any) {
      toast.error(`Error: ${e.message}`)
    }
  }

  const ahora = new Date()
  const hora = ahora.getHours()
  const saludo = hora < 12 ? 'Buenos días' : hora < 18 ? 'Buenas tardes' : 'Buenas noches'

  return (
    <div className="space-y-6 max-w-[1400px]">
      {/* Hero header */}
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 pb-2">
        <div>
          <div className="flex items-baseline gap-2">
            <h1 className="text-3xl font-bold font-display tracking-tight">
              {saludo}, <span className="text-primary">Don Pedro</span>
            </h1>
            <span className="text-2xl">👋</span>
          </div>
          <p className="text-sm text-muted-foreground mt-1 capitalize">
            {formatDateLong(resumen.fecha)}
            {resumen.es_festivo && resumen.nombre_festivo && (
              <Badge variant="warning" className="ml-2 text-xs font-medium">
                <Coffee className="h-3 w-3 mr-1" />
                Festivo: {resumen.nombre_festivo}
              </Badge>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Download className="mr-2 h-3.5 w-3.5" />
                Exportar
                <ChevronDown className="ml-1.5 h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuLabel>Reporte del día</DropdownMenuLabel>
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
          <Button asChild size="sm">
            <Link to="/venta">
              <Receipt className="mr-1.5 h-3.5 w-3.5" /> Nueva venta
            </Link>
          </Button>
        </div>
      </div>

      {/* === Hero KPI: Ventas hoy === */}
      <Card className="border-primary/30 bg-gradient-to-br from-primary/5 via-background to-background">
        <CardContent className="py-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <div className="flex items-center gap-2 text-xs uppercase font-semibold tracking-wider text-muted-foreground">
                <Wallet className="h-3.5 w-3.5" />
                Ventas de hoy
              </div>
              <div className="text-5xl font-bold font-display tracking-tight mt-2 tabular-nums">
                {formatCOP(resumen.total_vendido)}
              </div>
              <div className={cn(
                'flex items-center gap-1.5 mt-2 text-sm font-semibold',
                resumen.vs_ayer_pct >= 0 ? 'text-emerald-600' : 'text-rose-600',
              )}>
                {resumen.vs_ayer_pct >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                <span className="tabular-nums">{resumen.vs_ayer_pct >= 0 ? '+' : ''}{resumen.vs_ayer_pct.toFixed(1)}%</span>
                <span className="text-muted-foreground font-normal">vs ayer</span>
              </div>
              <div className="mt-3 text-xs text-muted-foreground">
                <span className="font-semibold text-foreground tabular-nums">{resumen.num_ventas}</span> transacciones ·
                ticket <span className="font-semibold text-foreground tabular-nums">{formatCOP(resumen.ticket_promedio)}</span>
              </div>
            </div>

            <div className="lg:col-span-2">
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={ventasData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="dia" tickLine={false} axisLine={false} fontSize={11} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis
                    tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                    tickLine={false}
                    axisLine={false}
                    fontSize={11}
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    width={50}
                  />
                  <ChartTooltip
                    cursor={{ fill: 'hsl(var(--primary) / 0.05)' }}
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null
                      return (
                        <div className="rounded-lg border bg-popover p-2.5 shadow-md">
                          <div className="text-[10px] uppercase font-medium tracking-wider text-muted-foreground mb-1">
                            {payload[0].payload.dia}
                          </div>
                          <div className="text-base font-bold tabular-nums">{formatCOP(payload[0].value as number)}</div>
                        </div>
                      )
                    }}
                  />
                  <Bar dataKey="total" radius={[6, 6, 0, 0]}>
                    {ventasData.map((_, i) => (
                      <Cell
                        key={i}
                        fill={i === ventasData.length - 1 ? 'hsl(var(--primary))' : 'hsl(var(--primary) / 0.35)'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* === Secondary KPIs === */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi
          label="Mesas activas"
          value={`${mesasOcupadas + mesasPidiendoCuenta}/${MOCK_MESAS.length}`}
          icon={Armchair}
          accent="info"
          delta={{ value: ocupacionPct - 50, label: 'vs típico' }}
          detail={
            <span>
              <span className="font-semibold text-foreground">{ocupacionPct}%</span> ocupación ·
              {' '}{mesasLibres} libres
            </span>
          }
        />
        <Kpi
          label="En mesas"
          value={formatCOP(totalEnMesas)}
          icon={Timer}
          accent="warning"
          detail={
            <span>
              <span className="font-semibold text-foreground">{mesasPidiendoCuenta}</span> pidiendo cuenta ·
              {' '}{mesasOcupadas} en servicio
            </span>
          }
        />
        <Kpi
          label="Stock bajo"
          value={stockBajo}
          icon={AlertTriangle}
          accent={stockBajo > 5 ? 'destructive' : stockBajo > 0 ? 'warning' : 'success'}
          detail={stockBajo === 0 ? 'Inventario en orden ✅' : 'productos requieren pedido'}
        />
        <Kpi
          label="Combos disponibles"
          value={combosDisponibles}
          icon={Tag}
          accent="primary"
          detail={`${topCombos.length} destacados`}
        />
      </div>

      {/* === Sección principal: Salón + Top productos === */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Salón */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Armchair className="h-4 w-4 text-info" />
                Salón en vivo
              </CardTitle>
              <CardDescription className="text-xs">Mesas con actividad ahora mismo</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild className="text-primary">
              <Link to="/mesas" className="gap-1">
                Ver plano
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
              {MOCK_MESAS.filter((m) => m.estado !== 'libre').slice(0, 8).map((mesa) => {
                const isPidiendo = mesa.estado === 'pidiendo_cuenta'
                return (
                  <Link
                    to="/mesas"
                    key={mesa.id}
                    className={cn(
                      'group block p-3 rounded-lg border transition-all hover:shadow-sm',
                      isPidiendo
                        ? 'border-amber-200 bg-amber-50/60 hover:border-amber-300 dark:border-amber-800 dark:bg-amber-950/20'
                        : 'border-blue-200 bg-blue-50/60 hover:border-blue-300 dark:border-blue-800 dark:bg-blue-950/20',
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className={cn(
                        'font-bold text-2xl font-display tabular-nums',
                        isPidiendo ? 'text-amber-700 dark:text-amber-400' : 'text-blue-700 dark:text-blue-400',
                      )}>
                        {mesa.numero}
                      </div>
                      <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div className="text-sm font-semibold tabular-nums mt-1">{formatCOP(mesa.total_acumulado)}</div>
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-1">
                      <Timer className="h-2.5 w-2.5" />
                      {mesa.ocupada_desde && formatDistanceToNow(mesa.ocupada_desde, { locale: esLocale })}
                      <span>·</span>
                      <Users className="h-2.5 w-2.5" />
                      {mesa.capacidad}p
                    </div>
                  </Link>
                )
              })}
              {MOCK_MESAS.filter((m) => m.estado !== 'libre').length === 0 && (
                <div className="col-span-full text-center py-8 text-sm text-muted-foreground">
                  Todas las mesas están libres
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top productos */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Flame className="h-4 w-4 text-orange-500" />
              Más vendidos hoy
            </CardTitle>
            <CardDescription className="text-xs">Top productos por unidades</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="divide-y">
              {topProductos.map((p, i) => (
                <div key={p.producto_id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                  <div className={cn(
                    'flex h-7 w-7 items-center justify-center rounded-md font-bold text-xs shrink-0',
                    i === 0 ? 'bg-amber-100 text-amber-700' :
                    i === 1 ? 'bg-stone-200 text-stone-700' :
                    i === 2 ? 'bg-orange-100 text-orange-800' :
                    'bg-muted text-muted-foreground',
                  )}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{p.nombre}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {p.cantidad_vendida} und · {formatCOP(p.ingresos)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* === Combos + Alertas === */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 border-stone-200/80">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Combos populares
              </CardTitle>
              <CardDescription className="text-xs">Para sugerir a los clientes</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild className="text-primary">
              <Link to="/venta" className="gap-1">
                Vender combo
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {topCombos.map((combo) => (
                <div
                  key={combo.id}
                  className="group relative p-3.5 rounded-lg border hover:border-primary/40 hover:bg-primary/[0.02] transition-colors"
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="font-semibold text-sm leading-tight">{combo.nombre}</div>
                    <Badge variant="success" className="text-[10px] shrink-0">
                      -{formatCOP(combo.precio_individual_suma - combo.precio_combo)}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mb-2">{combo.descripcion}</div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs text-muted-foreground line-through tabular-nums">
                      {formatCOP(combo.precio_individual_suma)}
                    </span>
                    <span className="text-lg font-bold font-display tabular-nums text-primary">
                      {formatCOP(combo.precio_combo)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className={cn('border-stone-200/80', stockBajo > 0 && 'border-rose-200')}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 justify-between">
              <span className="flex items-center gap-2">
                <AlertTriangle className={cn('h-4 w-4', stockBajo > 0 ? 'text-rose-500' : 'text-emerald-500')} />
                Stock bajo
              </span>
              {stockBajo > 0 && <Badge variant="destructive" className="text-xs">{stockBajo}</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {stockBajo > 0 ? (
              <div className="space-y-3">
                {alertas?.slice(0, 4).map((a) => (
                  <div key={a.producto_id} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium truncate flex-1">{a.nombre}</span>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {a.stock_actual} / {a.stock_minimo}
                      </span>
                    </div>
                    <Progress
                      value={a.stock_minimo > 0 ? (a.stock_actual / (a.stock_minimo * 2)) * 100 : 0}
                      className={cn(
                        'h-1.5',
                        a.estado === 'critico' ? '[&>div]:bg-rose-500' : '[&>div]:bg-amber-500',
                      )}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <CheckCircle2 className="h-10 w-10 mx-auto text-emerald-500" />
                <p className="mt-2 text-sm font-medium">Inventario en orden</p>
                <p className="text-xs text-muted-foreground">Ningún producto bajo mínimo</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}