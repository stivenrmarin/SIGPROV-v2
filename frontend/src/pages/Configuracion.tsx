import { useState } from 'react'
import {
  Settings as SettingsIcon, Store, Bell, Database, Download, Upload,
  Shield, Sparkles, AlertTriangle, Check,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { useTheme } from '@/components/layout/theme-provider'
import { toast } from '@/components/ui/sonner'

export default function Configuracion() {
  const { theme, setTheme } = useTheme()
  const [nombreLocal, setNombreLocal] = useState('El Rincón')
  const [direccion, setDireccion] = useState('Calle 123 #45-67, Bogotá')
  const [telefono, setTelefono] = useState('+57 300 123 4567')

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <SettingsIcon className="h-7 w-7" />
          Configuración
        </h2>
        <p className="text-muted-foreground mt-1">
          Personaliza el sistema para tu local
        </p>
      </div>

      <Alert>
        <Sparkles className="h-4 w-4" />
        <AlertTitle>Sistema funcionando con datos mock</AlertTitle>
        <AlertDescription>
          El frontend detecta automáticamente si el backend FastAPI está disponible.
          Si no, usa datos simulados de una panadería-cafetería con 12 meses de historial.
          Esto te permite probar toda la UI sin necesidad de Docker.
        </AlertDescription>
      </Alert>

      {/* Datos del local */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Store className="h-4 w-4" />
            Datos del local
          </CardTitle>
          <CardDescription>Información básica que aparece en tickets y reportes</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre del local</Label>
              <Input id="nombre" value={nombreLocal} onChange={(e) => setNombreLocal(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="telefono">Teléfono</Label>
              <Input id="telefono" value={telefono} onChange={(e) => setTelefono(e.target.value)} />
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="direccion">Dirección</Label>
              <Input id="direccion" value={direccion} onChange={(e) => setDireccion(e.target.value)} />
            </div>
          </div>
          <Button onClick={() => toast.success('Configuración guardada ✅')}>
            Guardar cambios
          </Button>
        </CardContent>
      </Card>

      {/* Apariencia */}
      <Card>
        <CardHeader>
          <CardTitle>Apariencia</CardTitle>
          <CardDescription>Cómo se ve la interfaz</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="text-sm font-medium">Tema</div>
            <div className="grid grid-cols-3 gap-3">
              {(['light', 'dark', 'system'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTheme(t)}
                  className={`p-3 rounded-lg border-2 transition-colors ${
                    theme === t ? 'border-primary bg-primary/10' : 'border-border'
                  }`}
                >
                  <div className="font-medium text-sm capitalize">
                    {t === 'light' ? '☀️ Claro' : t === 'dark' ? '🌙 Oscuro' : '💻 Sistema'}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ML Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Modelo de predicción (ML)
          </CardTitle>
          <CardDescription>Configuración del modelo Prophet</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="text-sm font-medium">Modelo activo</div>
              <Badge variant="secondary">prophet-2026-10-19-v1</Badge>
            </div>
            <div className="space-y-1">
              <div className="text-sm font-medium">MAPE (error %)</div>
              <Badge variant="success">18.5%</Badge>
            </div>
            <div className="space-y-1">
              <div className="text-sm font-medium">Datos de entrenamiento</div>
              <div className="text-sm text-muted-foreground">365 días · 12 meses</div>
            </div>
            <div className="space-y-1">
              <div className="text-sm font-medium">Festivos cargados</div>
              <div className="text-sm text-muted-foreground">39 (2025-2026)</div>
            </div>
          </div>
          <Separator />
          <div className="flex gap-2">
            <Button onClick={() => toast.success('Reentrenamiento iniciado')}>
              <Sparkles className="mr-2 h-4 w-4" /> Reentrenar modelo
            </Button>
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" /> Descargar model card
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Datos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Datos
          </CardTitle>
          <CardDescription>Respaldo y restauración</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => toast.success('Backup descargado')}>
              <Download className="mr-2 h-4 w-4" /> Descargar backup (JSON)
            </Button>
            <Button variant="outline" onClick={() => toast.info('Selecciona archivo .json')}>
              <Upload className="mr-2 h-4 w-4" /> Restaurar backup
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Información del sistema */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Información del sistema
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Versión</span>
              <span className="font-medium">SIGPROV v2.0.0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Stack</span>
              <span>React 18 + Vite + FastAPI + Postgres</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">ML</span>
              <span>Prophet (Meta)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Proyecto</span>
              <span>Proyecto Integrador 2026-2 · Universidad San Mateo</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}