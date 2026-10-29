import { useState, useRef, useEffect } from 'react'
import { MessageCircle, X, Send, ChefHat, Minus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import {
  findAnswer,
  suggestedTopics,
  type ChatMessage,
} from './chatbot-knowledge'

/**
 * Chatbot del dashboard "Don Pancracio".
 * Conocimiento embebido del proyecto SIGPROV, sin internet, sin LLM.
 */
export function DashboardChatbot() {
  const [open, setOpen] = useState(false)
  const [minimized, setMinimized] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init',
      role: 'bot',
      content:
        "¡Hola! 👋 Soy **Don Pancracio**, tu guía en SIGPROV.\n\nPreguntame sobre cualquier parte del dashboard o elegí una pregunta de abajo para arrancar.",
      timestamp: Date.now(),
    },
  ])
  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const idCounterRef = useRef(0)

  function nextId() {
    idCounterRef.current += 1
    return `msg-${idCounterRef.current}-${Date.now()}`
  }

  function sendMessage(text: string) {
    const clean = text.trim()
    if (!clean) return

    const userMsg: ChatMessage = {
      id: nextId(),
      role: 'user',
      content: clean,
      timestamp: Date.now(),
    }
    setMessages((m) => [...m, userMsg])
    setInput('')

    // Pequeña demora para simular "pensamiento"
    window.setTimeout(() => {
      const answer = findAnswer(clean)
      const botMsg: ChatMessage = {
        id: nextId(),
        role: 'bot',
        content: answer,
        timestamp: Date.now(),
      }
      setMessages((m) => [...m, botMsg])
    }, 350)
  }

  // Auto-scroll al último mensaje
  useEffect(() => {
    if (scrollRef.current && open && !minimized) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth',
      })
    }
  }, [messages, open, minimized])

  return (
    <>
      {/* Burbuja flotante */}
      {!open && (
        <button
          onClick={() => {
            setOpen(true)
            setMinimized(false)
          }}
          className={cn(
            'fixed bottom-6 right-24 z-50',
            'h-14 w-14 rounded-full shadow-xl',
            'bg-primary text-primary-foreground',
            'flex items-center justify-center',
            'hover:bg-primary/90 transition-all',
            'animate-in fade-in zoom-in duration-200',
            'ring-2 ring-primary/30 ring-offset-2 ring-offset-background',
          )}
          aria-label="Abrir asistente del dashboard"
          title="Don Pancracio — Asistente del dashboard"
        >
          <MessageCircle className="h-6 w-6" />
          <span className="absolute -top-1 -right-1 h-3 w-3 bg-emerald-500 rounded-full ring-2 ring-background animate-pulse" />
        </button>
      )}

      {/* Panel del chat */}
      {open && (
        <div
          className={cn(
            'fixed bottom-24 right-6 z-50',
            'w-[380px] max-w-[calc(100vw-3rem)]',
            minimized ? 'h-14' : 'h-[600px] max-h-[calc(100vh-8rem)]',
            'bg-card text-card-foreground rounded-2xl shadow-2xl',
            'border border-border',
            'flex flex-col overflow-hidden',
            'animate-in slide-in-from-bottom-4 fade-in duration-200',
          )}
          role="dialog"
          aria-label="Asistente del dashboard"
        >
          {/* Header */}
          <div className="flex items-center gap-3 p-3 border-b bg-muted/40">
            <div className="h-9 w-9 rounded-full bg-primary/15 flex items-center justify-center ring-1 ring-primary/30">
              <ChefHat className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm leading-none">
                  Don Pancracio
                </h3>
                <span className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  en línea
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-none mt-1">
                Asistente del dashboard
              </p>
            </div>
            <div className="flex gap-0.5">
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={() => setMinimized(!minimized)}
                aria-label={minimized ? 'Expandir' : 'Minimizar'}
              >
                <Minus className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={() => setOpen(false)}
                aria-label="Cerrar asistente"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {!minimized && (
            <>
              {/* Mensajes */}
              <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-3 space-y-3"
              >
                {messages.map((m) => (
                  <Message key={m.id} message={m} />
                ))}

                {/* Sugerencias rápidas (solo al inicio) */}
                {messages.length <= 1 && (
                  <div className="pt-2 space-y-2">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium px-1">
                      Preguntas frecuentes
                    </p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {suggestedTopics.map((topic) => (
                        <button
                          key={topic.id}
                          onClick={() => sendMessage(topic.question)}
                          className={cn(
                            'text-left text-xs p-2 rounded-lg',
                            'bg-muted/60 hover:bg-muted text-foreground',
                            'transition-colors',
                            'border border-border/40',
                            'leading-snug',
                          )}
                        >
                          <span className="mr-1">{topic.icon}</span>
                          {topic.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Input */}
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  sendMessage(input)
                }}
                className="p-3 border-t bg-muted/20"
              >
                <div className="flex gap-2">
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Preguntame sobre el dashboard..."
                    className="h-9 text-sm"
                    autoComplete="off"
                  />
                  <Button
                    type="submit"
                    size="icon"
                    className="h-9 w-9 shrink-0"
                    disabled={!input.trim()}
                    aria-label="Enviar pregunta"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                <p className="mt-1.5 text-[10px] text-muted-foreground text-center">
                  Respuestas embebidas · sin internet · sin enviar datos
                </p>
              </form>
            </>
          )}
        </div>
      )}
    </>
  )
}

/** Burbuja individual del chat */
function Message({ message }: { message: ChatMessage }) {
  const isBot = message.role === 'bot'
  // Soportar bold con **...** y saltos de línea
  const formatted = formatMessage(message.content)

  return (
    <div
      className={cn(
        'flex gap-2',
        isBot ? 'justify-start' : 'justify-end',
      )}
    >
      {isBot && (
        <div className="h-7 w-7 rounded-full bg-primary/15 flex items-center justify-center shrink-0 mt-0.5">
          <ChefHat className="h-3.5 w-3.5 text-primary" />
        </div>
      )}
      <div
        className={cn(
          'max-w-[80%] rounded-2xl px-3 py-2 text-sm',
          isBot
            ? 'bg-muted text-foreground rounded-tl-sm'
            : 'bg-primary text-primary-foreground rounded-tr-sm',
        )}
      >
        {formatted.map((line, i) => (
          <p
            key={i}
            className={cn(
              'leading-relaxed',
              i > 0 && 'mt-1',
            )}
            dangerouslySetInnerHTML={{ __html: line }}
          />
        ))}
      </div>
    </div>
  )
}

/**
 * Formatea texto simple: soporta **negrita** y saltos de línea.
 * Devuelve array de líneas (HTML safe, sin scripts).
 */
function formatMessage(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      // **negrita**
      line = line.replace(
        /\*\*([^*]+)\*\*/g,
        '<strong>$1</strong>',
      )
      // `código`
      line = line.replace(
        /`([^`]+)`/g,
        '<code class="px-1 py-0.5 rounded bg-background/40 text-[12px] font-mono">$1</code>',
      )
      return line
    })
}
