import { useEffect, useState, ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  X, ChevronRight, ChevronLeft, Sparkles, Coffee,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface TourStep {
  ruta: string
  titulo: string
  descripcion: string
  highlight?: string // selector CSS (opcional)
  posicion?: 'top' | 'bottom' | 'left' | 'right' | 'center'
}

const TOUR_STEPS: TourStep[] = [
  {
    ruta: '/',
    titulo: '¡Bienvenido a SIGPROV!',
    descripcion: 'Este es el dashboard principal: ves tus ventas de hoy, mesas activas, top productos y alertas de stock. Siempre empieza aquí.',
    posicion: 'center',
  },
  {
    ruta: '/mesas',
    titulo: 'Salón en vivo',
    descripcion: 'Vista en tiempo real de las mesas del local. Verde = libre, azul = ocupada, amarillo = pidiendo cuenta. Click en cualquier mesa para ver el pedido y cobrar.',
    posicion: 'center',
  },
  {
    ruta: '/venta',
    titulo: 'Nueva venta (POS)',
    descripcion: 'Primero elegís mesa/para llevar/domicilio. Después elegís productos o combos. El botón COBRAR descuenta stock automáticamente.',
    posicion: 'center',
  },
  {
    ruta: '/semana',
    titulo: 'Predicción ML',
    descripcion: 'El modelo Prophet predice cuánto vas a vender los próximos 7 días. La tabla "Por producto" te dice CUÁNTO HORNEAR y qué materia prima necesitás.',
    posicion: 'center',
  },
  {
    ruta: '/productos',
    titulo: 'Productos e inventario',
    descripcion: 'Lista completa de productos terminados y materia prima. Acá podés ver alertas de stock bajo y gestionar todo tu inventario.',
    posicion: 'center',
  },
  {
    ruta: '/',
    titulo: 'Botón de ayuda flotante',
    descripcion: 'Siempre vas a ver este botón ❓ abajo a la derecha. Tiene atajos de teclado, guías rápidas y preguntas frecuentes. Usalo cuando tengas dudas.',
    posicion: 'center',
  },
]

const TOUR_KEY = 'sigprov-tour-completed'

interface GuidedTourProps {
  open: boolean
  onClose: () => void
}

export function GuidedTour({ open, onClose }: GuidedTourProps) {
  const navigate = useNavigate()
  const [stepIdx, setStepIdx] = useState(0)
  const step = TOUR_STEPS[stepIdx]
  const isLast = stepIdx === TOUR_STEPS.length - 1

  useEffect(() => {
    if (open) {
      navigate(step.ruta)
    }
  }, [open, step.ruta, navigate])

  if (!open) return null

  const next = () => {
    if (isLast) {
      localStorage.setItem(TOUR_KEY, 'true')
      onClose()
    } else {
      setStepIdx(stepIdx + 1)
    }
  }
  const prev = () => {
    if (stepIdx > 0) setStepIdx(stepIdx - 1)
  }
  const skip = () => {
    localStorage.setItem(TOUR_KEY, 'skipped')
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none">
      {/* Overlay oscuro */}
      <div className="absolute inset-0 bg-stone-900/40 backdrop-blur-[2px] animate-in fade-in-0" />

      {/* Card del tooltip */}
      <div
        className={cn(
          'absolute pointer-events-auto',
          step.posicion === 'center' && 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
          step.posicion === 'top' && 'top-20 left-1/2 -translate-x-1/2',
          step.posicion === 'bottom' && 'bottom-20 left-1/2 -translate-x-1/2',
        )}
      >
        <div className="bg-background border rounded-xl shadow-2xl p-6 w-[480px] max-w-[calc(100vw-2rem)] animate-in zoom-in-95 duration-300">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0">
              <Coffee className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                  Paso {stepIdx + 1} de {TOUR_STEPS.length}
                </span>
                <Sparkles className="h-3 w-3 text-primary" />
              </div>
              <h3 className="text-lg font-bold font-display leading-tight">{step.titulo}</h3>
            </div>
            <button
              onClick={skip}
              className="text-muted-foreground hover:text-foreground p-1 rounded"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <p className="text-sm text-muted-foreground leading-relaxed mb-5">
            {step.descripcion}
          </p>

          {/* Progress dots */}
          <div className="flex items-center gap-1 mb-5">
            {TOUR_STEPS.map((_, i) => (
              <div
                key={i}
                className={cn(
                  'h-1 flex-1 rounded-full transition-colors',
                  i === stepIdx ? 'bg-primary' : i < stepIdx ? 'bg-primary/40' : 'bg-stone-200 dark:bg-stone-800',
                )}
              />
            ))}
          </div>

          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={skip} className="text-muted-foreground">
              Saltar tour
            </Button>
            <div className="flex items-center gap-2">
              {stepIdx > 0 && (
                <Button variant="outline" size="sm" onClick={prev}>
                  <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                  Atrás
                </Button>
              )}
              <Button size="sm" onClick={next}>
                {isLast ? 'Finalizar' : 'Siguiente'}
                {!isLast && <ChevronRight className="h-3.5 w-3.5 ml-1" />}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Hook para manejar el tour
export function useTour() {
  const [tourOpen, setTourOpen] = useState(false)

  useEffect(() => {
    // Auto-mostrar el tour si nunca se ha completado
    const completed = localStorage.getItem(TOUR_KEY)
    if (!completed) {
      // Pequeño delay para que la app cargue primero
      setTimeout(() => setTourOpen(true), 1500)
    }
  }, [])

  return {
    tourOpen,
    startTour: () => setTourOpen(true),
    endTour: () => setTourOpen(false),
  }
}