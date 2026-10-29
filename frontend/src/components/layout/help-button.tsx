import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  HelpCircle, Keyboard, BookOpen, X, Sparkles,
  ArrowRight, Coffee,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface HelpButtonProps {
  onStartTour?: () => void
}

const SHORTCUTS = [
  { keys: ['⌘', 'K'], desc: 'Búsqueda global' },
  { keys: ['G', 'H'], desc: 'Ir a Hoy' },
  { keys: ['G', 'M'], desc: 'Ir a Salón (mesas)' },
  { keys: ['G', 'V'], desc: 'Ir a Nueva venta' },
  { keys: ['G', 'P'], desc: 'Ir a Productos' },
  { keys: ['G', 'S'], desc: 'Ir a Predicción ML' },
  { keys: ['?'], desc: 'Abrir esta ayuda' },
  { keys: ['Esc'], desc: 'Cerrar modal/drawer' },
]

const FAQ = [
  {
    q: '¿Por qué me pide "hornear" en vez de "comprar"?',
    a: 'Porque tu panadería PRODUCE el pan. El modelo ML predice cuánto vas a vender, y la app te dice cuántas unidades hornear para cubrir la demanda de los próximos 7 días.',
  },
  {
    q: '¿Cómo funciona la predicción?',
    a: 'Usamos Prophet (de Meta) entrenado con tus últimos 12 meses de ventas. Tiene en cuenta: día de la semana, festivos colombianos (Ley Emiliani), tendencia anual y estacionalidad.',
  },
  {
    q: '¿Qué pasa si no tengo backend?',
    a: 'La app funciona con datos mock realistas (12 meses de una panadería típica). Cuando levantes el backend con `python main.py`, automáticamente usa datos reales.',
  },
  {
    q: '¿Puedo exportar reportes?',
    a: 'Sí, en Hoy / Semana / Productos hay un botón "Exportar" que genera PDF, Excel o CSV con los datos.',
  },
  {
    q: '¿Qué incluye el precio del software?',
    a: 'Esta versión es MVP académico. Software comercial colombiano (Jeloda, Treinta) cobra desde $55.000 COP/mes.',
  },
]

export function HelpButton({ onStartTour }: HelpButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        size="icon"
        className="fixed bottom-6 right-6 z-50 h-12 w-12 rounded-full shadow-lg bg-primary hover:bg-primary/90"
        title="Ayuda"
      >
        <HelpCircle className="h-5 w-5" />
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto p-0">
          <div className="p-6 space-y-6">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <Coffee className="h-5 w-5 text-primary" />
                Centro de ayuda
              </SheetTitle>
              <SheetDescription>
                Todo lo que necesitás para usar SIGPROV como un pro
              </SheetDescription>
            </SheetHeader>

            {/* Tour */}
            <button
              onClick={() => {
                setOpen(false)
                setTimeout(() => onStartTour?.(), 300)
              }}
              className="w-full p-4 rounded-lg border-2 border-primary/30 bg-primary/5 hover:bg-primary/10 text-left transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-md bg-primary/20 flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-sm">Tour guiado interactivo</div>
                  <div className="text-xs text-muted-foreground">5 min · Aprende lo esencial paso a paso</div>
                </div>
                <ArrowRight className="h-4 w-4 text-primary group-hover:translate-x-1 transition-transform" />
              </div>
            </button>

            <Separator />

            {/* Secciones */}
            <div className="space-y-3">
              <h3 className="text-xs uppercase font-semibold tracking-wider text-muted-foreground flex items-center gap-2">
                <BookOpen className="h-3.5 w-3.5" />
                Guías rápidas
              </h3>
              <div className="grid grid-cols-1 gap-2">
                <GuiaCard
                  titulo="Cómo registrar una venta"
                  desc="POS → Nueva venta → elige mesa → agrega productos → cobrar"
                  href="/venta"
                />
                <GuiaCard
                  titulo="Cómo programar producción"
                  desc="Predicción ML → Por producto → ver 'Hornear' para cada item"
                  href="/semana"
                />
                <GuiaCard
                  titulo="Cómo ver el estado del salón"
                  desc="Salón → ver mesas activas con tiempo y total acumulado"
                  href="/mesas"
                />
                <GuiaCard
                  titulo="Cómo exportar reportes"
                  desc="Cualquier página → botón 'Exportar' → PDF/Excel/CSV"
                  href="/configuracion"
                />
              </div>
            </div>

            <Separator />

            {/* Shortcuts */}
            <div>
              <h3 className="text-xs uppercase font-semibold tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                <Keyboard className="h-3.5 w-3.5" />
                Atajos de teclado
              </h3>
              <div className="space-y-1.5">
                {SHORTCUTS.map((s, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{s.desc}</span>
                    <div className="flex items-center gap-0.5">
                      {s.keys.map((k, j) => (
                        <kbd
                          key={j}
                          className="inline-flex h-5 min-w-5 items-center justify-center rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-foreground"
                        >
                          {k}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* FAQ */}
            <div>
              <h3 className="text-xs uppercase font-semibold tracking-wider text-muted-foreground mb-3">
                Preguntas frecuentes
              </h3>
              <div className="space-y-3">
                {FAQ.map((f, i) => (
                  <details key={i} className="group">
                    <summary className="cursor-pointer text-sm font-medium hover:text-primary">
                      {f.q}
                    </summary>
                    <p className="text-xs text-muted-foreground mt-1.5 pl-4 leading-relaxed">{f.a}</p>
                  </details>
                ))}
              </div>
            </div>

            <Separator />

            <div className="text-center text-[11px] text-muted-foreground">
              <p>SIGPROV v2.0.0 · Proyecto Integrador Universidad San Mateo 2026-2</p>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}

function GuiaCard({ titulo, desc, href }: { titulo: string; desc: string; href: string }) {
  return (
    <Link
      to={href}
      className="flex items-center gap-3 p-3 rounded-lg border hover:border-primary/40 hover:bg-accent transition-colors group"
    >
      <div className="flex-1">
        <div className="font-medium text-sm">{titulo}</div>
        <div className="text-[11px] text-muted-foreground">{desc}</div>
      </div>
      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
    </Link>
  )
}