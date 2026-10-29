import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Banknote, Coins, Lock, Unlock, AlertTriangle, CheckCircle2,
  Receipt, CreditCard, Smartphone, Wallet, ArrowDownToLine,
  Calculator, FileText, AlertCircle,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { api_caja, api_historial } from '@/services/api'
import { formatCOP, cn } from '@/lib/utils'
import { toast } from '@/components/ui/sonner'
import type { ConteoCaja, BilletesMonedas } from '@/types'

export default function CierreCaja() {
  const queryClient = useQueryClient()
  const { data: conteo, isLoading } = useQuery({
    queryKey: ['caja', 'conteo-hoy'],
    queryFn: () => api_caja.conteoHoy(),
  })
  const { data: kpis } = useQuery({
    queryKey: ['historial', 'kpis-hoy'],
    queryFn: () => api_historial.kpisHoy(),
  })

  // Estado para el conteo del cajero (editable)
  const [conteoBilletes, setConteoBilletes] = useState<Record<number, number>>({})
  const [conteoMonedas, setConteoMonedas] = useState<Record<number, number>>({})
  const [cerrado, setCerrado] = useState(false)
  const [diferenciaFinal, setDiferenciaFinal] = useState(0)
  const [totalContado, setTotalContado] = useState(0)

  // Calcular totales en tiempo real
  const totalBilletes = Object.entries(conteoBilletes).reduce(
    (s, [denom, cant]) => s + Number(denom) * cant, 0,
  )
  const totalMonedas = Object.entries(conteoMonedas).reduce(
    (s, [denom, cant]) => s + Number(denom) * cant, 0,
  )
  const totalContadoActual = totalBilletes + totalMonedas
  const esperado = conteo?.esperado_en_caja ?? 0
  const diferenciaActual = totalContadoActual - esperado

  const cerrarCajaMutation = useMutation({
    mutationFn: () => api_caja.cerrarCaja({
      billetes: Object.entries(conteoBilletes).map(([d, c]) => ({
        denominacion: Number(d), cantidad: c,
      })),
      monedas: Object.entries(conteoMonedas).map(([d, c]) => ({
        denominacion: Number(d), cantidad: c,
      })),
    }),
    onSuccess: (res) => {
      setCerrado(true)
      setDiferenciaFinal(res.diferencia)
      setTotalContado(res.total_contado)
      toast.success('Caja cerrada ✅')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  if (isLoading || !conteo) {
    return <Skeleton className="h-96" />
  }

  const fmt = (n: number) => formatCOP(n)

  return (
    <div className="space-y-6 max-w-[1400px]">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold font-display tracking-tight flex items-center gap-2">
          <Calculator className="h-7 w-7" />
          Cierre de caja
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Conteo de efectivo al final del día · {new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      {cerrado && (
        <Alert variant="success">
          <CheckCircle2 className="h-4 w-4" />
          <AlertTitle>¡Caja cerrada!</AlertTitle>
          <AlertDescription>
            Cerrada a las {new Date().toLocaleTimeString('es-CO')}.
            {diferenciaFinal === 0
              ? ' Cuadre exacto, sin diferencias.'
              : diferenciaFinal > 0
                ? ` Sobrante de ${fmt(diferenciaFinal)}.`
                : ` Faltante de ${fmt(Math.abs(diferenciaFinal))}.`}
          </AlertDescription>
        </Alert>
      )}

      {/* Stats operacionales */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-5">
            <div className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground">Ventas hoy</div>
            <div className="text-2xl font-bold font-display tabular-nums mt-1">{fmt(conteo.total_ventas_dia)}</div>
            <div className="text-[11px] text-muted-foreground mt-1">
              {kpis?.num_ventas ?? 0} ventas
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground">Efectivo</div>
            <div className="text-2xl font-bold font-display tabular-nums mt-1 text-emerald-600">{fmt(conteo.total_efectivo_dia)}</div>
            <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
              <Banknote className="h-3 w-3" /> en caja
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground">Tarjeta/transfer</div>
            <div className="text-2xl font-bold font-display tabular-nums mt-1 text-blue-600">
              {fmt(conteo.total_tarjeta_dia + conteo.total_transferencia_dia)}
            </div>
            <div className="text-[11px] text-muted-foreground mt-1">no entra a caja</div>
          </CardContent>
        </Card>
        <Card className="border-primary/30">
          <CardContent className="pt-5">
            <div className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground">Esperado en caja</div>
            <div className="text-2xl font-bold font-display tabular-nums mt-1 text-primary">{fmt(esperado)}</div>
            <div className="text-[11px] text-muted-foreground mt-1">
              base {fmt(conteo.base_inicial)} + ventas efectivo
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Conteo interactivo */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Billetes */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Banknote className="h-4 w-4" />
              Billetes
            </CardTitle>
            <CardDescription className="text-xs">Contá cuántos hay de cada denominación</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {[100000, 50000, 20000, 10000, 5000, 2000, 1000].map((denom) => {
                const cant = conteoBilletes[denom] || 0
                const subtotal = cant * denom
                return (
                  <div key={denom} className="flex items-center gap-3">
                    <div className="w-24 text-sm font-semibold tabular-nums">{fmt(denom)}</div>
                    <Input
                      type="number"
                      min="0"
                      value={cant}
                      onChange={(e) => setConteoBilletes({
                        ...conteoBilletes,
                        [denom]: Number(e.target.value) || 0,
                      })}
                      className="w-20 tabular-nums"
                      disabled={cerrado}
                    />
                    <div className="flex-1 text-right text-sm tabular-nums text-muted-foreground">
                      {cant > 0 ? fmt(subtotal) : '—'}
                    </div>
                  </div>
                )
              })}
              <Separator />
              <div className="flex items-center justify-between text-sm font-semibold">
                <span>Subtotal billetes</span>
                <span className="tabular-nums">{fmt(totalBilletes)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Monedas */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Coins className="h-4 w-4" />
              Monedas
            </CardTitle>
            <CardDescription className="text-xs">Conteo de monedas</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {[1000, 500, 200, 100, 50].map((denom) => {
                const cant = conteoMonedas[denom] || 0
                const subtotal = cant * denom
                return (
                  <div key={denom} className="flex items-center gap-3">
                    <div className="w-24 text-sm font-semibold tabular-nums">{fmt(denom)}</div>
                    <Input
                      type="number"
                      min="0"
                      value={cant}
                      onChange={(e) => setConteoMonedas({
                        ...conteoMonedas,
                        [denom]: Number(e.target.value) || 0,
                      })}
                      className="w-20 tabular-nums"
                      disabled={cerrado}
                    />
                    <div className="flex-1 text-right text-sm tabular-nums text-muted-foreground">
                      {cant > 0 ? fmt(subtotal) : '—'}
                    </div>
                  </div>
                )
              })}
              <Separator />
              <div className="flex items-center justify-between text-sm font-semibold">
                <span>Subtotal monedas</span>
                <span className="tabular-nums">{fmt(totalMonedas)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Resumen del conteo */}
      <Card className="border-primary/30 bg-primary/[0.02]">
        <CardContent className="py-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            <div className="text-center md:text-left">
              <div className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground">Total contado</div>
              <div className="text-3xl font-bold font-display tabular-nums mt-1">{fmt(totalContadoActual)}</div>
            </div>
            <div className="text-center">
              <div className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground">Esperado en caja</div>
              <div className="text-3xl font-bold font-display tabular-nums mt-1 text-primary">{fmt(esperado)}</div>
            </div>
            <div className="text-center md:text-right">
              <div className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground">Diferencia</div>
              <div className={cn(
                'text-3xl font-bold font-display tabular-nums mt-1',
                diferenciaActual === 0 ? 'text-emerald-600' : diferenciaActual > 0 ? 'text-blue-600' : 'text-rose-600',
              )}>
                {diferenciaActual === 0 ? 'Cuadre exacto' : diferenciaActual > 0 ? `+${fmt(diferenciaActual)}` : `-${fmt(Math.abs(diferenciaActual))}`}
              </div>
              <div className="text-[11px] text-muted-foreground mt-1">
                {diferenciaActual === 0
                  ? 'Todo cuadra ✓'
                  : diferenciaActual > 0
                    ? 'Sobrante'
                    : 'Faltante'}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Acciones */}
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs text-muted-foreground">
          {cerrado
            ? `Cerrado a las ${new Date().toLocaleTimeString('es-CO')}`
            : 'La caja se cierra al final del turno'}
        </div>
        <div className="flex items-center gap-2">
          {!cerrado && (
            <Button
              size="lg"
              onClick={() => cerrarCajaMutation.mutate()}
              disabled={cerrarCajaMutation.isPending}
              className="font-semibold"
            >
              <Lock className="mr-2 h-4 w-4" />
              {cerrarCajaMutation.isPending ? 'Cerrando...' : 'Cerrar caja ahora'}
            </Button>
          )}
        </div>
      </div>

      {/* Métodos de pago - desglose */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            Desglose de métodos de pago
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Método</TableHead>
                <TableHead className="text-right">Monto</TableHead>
                <TableHead className="text-right">% del total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <MetodoPagoRow
                icon={<Banknote className="h-4 w-4 text-emerald-600" />}
                nombre="Efectivo"
                monto={conteo.total_efectivo_dia}
                total={conteo.total_ventas_dia}
              />
              <MetodoPagoRow
                icon={<CreditCard className="h-4 w-4 text-blue-600" />}
                nombre="Datáfono"
                monto={conteo.total_tarjeta_dia}
                total={conteo.total_ventas_dia}
              />
              <MetodoPagoRow
                icon={<Smartphone className="h-4 w-4 text-purple-600" />}
                nombre="Transferencia"
                monto={conteo.total_transferencia_dia}
                total={conteo.total_ventas_dia}
              />
              <MetodoPagoRow
                icon={<Wallet className="h-4 w-4 text-amber-600" />}
                nombre="Mixto / Otros"
                monto={conteo.otros_pagos_dia}
                total={conteo.total_ventas_dia}
              />
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

function MetodoPagoRow({ icon, nombre, monto, total }: {
  icon: React.ReactNode
  nombre: string
  monto: number
  total: number
}) {
  const pct = total > 0 ? (monto / total) * 100 : 0
  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-medium">{nombre}</span>
        </div>
      </TableCell>
      <TableCell className="text-right tabular-nums font-semibold">{formatCOP(monto)}</TableCell>
      <TableCell className="text-right tabular-nums text-muted-foreground">{pct.toFixed(1)}%</TableCell>
    </TableRow>
  )
}