import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle, AlertCircle, Info, CheckCircle2, Bell, CalendarClock,
  TrendingUp, Package,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { es as esLocale } from 'date-fns/locale'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { api_alertas } from '@/services/api'
import { toast } from '@/components/ui/sonner'
import { cn } from '@/lib/utils'
import type { Alerta } from '@/types'

const NIVELES = {
  critical: { icon: AlertTriangle, color: 'text-rose-600', bg: 'bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900' },
  warning:  { icon: AlertCircle,   color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900' },
  info:     { icon: Info,          color: 'text-blue-600',   bg: 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900' },
}

const TIPO_LABEL: Record<Alerta['tipo'], string> = {
  stock_bajo: 'Stock bajo',
  prediccion_alta: 'Predicción',
  festivo_manana: 'Festivo',
  sin_ventas_hoy: 'Sin ventas',
}

const TIPO_ICON: Record<Alerta['tipo'], any> = {
  stock_bajo: Package,
  prediccion_alta: TrendingUp,
  festivo_manana: CalendarClock,
  sin_ventas_hoy: Bell,
}

export default function Alertas() {
  const [tabActiva, setTabActiva] = useState<'activas' | 'historial'>('activas')
  const queryClient = useQueryClient()

  const { data: activas, isLoading } = useQuery({
    queryKey: ['alertas', 'activas'],
    queryFn: () => api_alertas.listar(true),
  })

  const { data: todas } = useQuery({
    queryKey: ['alertas', 'todas'],
    queryFn: () => api_alertas.listar(false),
  })

  const mostrar = tabActiva === 'activas' ? activas : todas?.filter((a) => a.resuelta)
  const counts = {
    activas: activas?.length ?? 0,
    resueltas: todas?.filter((a) => a.resuelta).length ?? 0,
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Bell className="h-7 w-7" />
          Alertas
        </h2>
        <p className="text-muted-foreground mt-1">
          Notificaciones automáticas del sistema
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-rose-500" />
              Activas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-rose-600">{counts.activas}</div>
            <p className="text-xs text-muted-foreground mt-1">Requieren tu atención</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              Resueltas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-600">{counts.resueltas}</div>
            <p className="text-xs text-muted-foreground mt-1">Histórico reciente</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total registradas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{todas?.length ?? 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Últimos 30 días</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={tabActiva} onValueChange={(v) => setTabActiva(v as any)}>
        <TabsList>
          <TabsTrigger value="activas">
            Activas {counts.activas > 0 && <Badge variant="destructive" className="ml-2">{counts.activas}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="historial">Historial</TabsTrigger>
        </TabsList>

        <TabsContent value={tabActiva} className="space-y-3">
          {isLoading && (
            <>
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24" />
              ))}
            </>
          )}
          {mostrar && mostrar.length === 0 && (
            <Card>
              <CardContent className="text-center py-12">
                <CheckCircle2 className="h-12 w-12 mx-auto text-emerald-500" />
                <p className="mt-4 font-medium">
                  {tabActiva === 'activas' ? 'No hay alertas activas' : 'No hay alertas resueltas'}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Todo está bajo control
                </p>
              </CardContent>
            </Card>
          )}
          {mostrar?.map((alerta) => {
            const nivel = NIVELES[alerta.nivel]
            const Icon = nivel.icon
            const TipoIcon = TIPO_ICON[alerta.tipo]
            return (
              <Card key={alerta.id} className={cn('border', nivel.bg)}>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className={cn('p-2 rounded-lg bg-background', nivel.color)}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold">{alerta.titulo}</h3>
                        <Badge variant="outline" className="gap-1">
                          <TipoIcon className="h-3 w-3" />
                          {TIPO_LABEL[alerta.tipo]}
                        </Badge>
                        <Badge variant={alerta.resuelta ? 'secondary' : 'default'}>
                          {alerta.resuelta ? 'Resuelta' : alerta.nivel}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{alerta.mensaje}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {formatDistanceToNow(new Date(alerta.created_at), { addSuffix: true, locale: esLocale })}
                      </p>
                    </div>
                    {!alerta.resuelta && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toast.success('Marcada como resuelta')}
                      >
                        Resolver
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </TabsContent>
      </Tabs>
    </div>
  )
}