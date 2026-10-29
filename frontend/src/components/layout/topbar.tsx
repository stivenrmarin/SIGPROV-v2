import { Bell, Search, Plus, Keyboard } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ModeToggle } from './mode-toggle'

interface TopbarProps {
  title?: string
  subtitle?: string
  actions?: React.ReactNode
}

export function Topbar({ title, subtitle, actions }: TopbarProps) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background/95 px-6 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      {/* Title section */}
      <div className="flex-1 min-w-0 flex items-center gap-4">
        {title && (
          <div className="min-w-0">
            <h1 className="text-sm font-semibold font-display truncate">{title}</h1>
            {subtitle && <p className="text-xs text-muted-foreground truncate">{subtitle}</p>}
          </div>
        )}
      </div>

      {/* Search global */}
      <div className="relative hidden md:block">
        <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Buscar producto, venta..."
          className="h-8 w-72 pl-9 pr-12 text-sm bg-muted/40 border-transparent focus-visible:bg-background focus-visible:border-input"
        />
        <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 hidden md:inline-flex h-5 select-none items-center gap-0.5 rounded border bg-background px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
          <span className="text-xs">⌘</span>K
        </kbd>
      </div>

      {/* Actions */}
      {actions}

      {/* Quick action - Nueva venta */}
      <Button asChild size="sm" className="h-8 hidden sm:flex">
        <Link to="/venta">
          <Plus className="mr-1 h-3.5 w-3.5" />
          Nueva venta
        </Link>
      </Button>

      {/* Notifications */}
      <Button variant="ghost" size="icon" className="h-8 w-8 relative">
        <Bell className="h-4 w-4" />
        <Badge variant="destructive" className="absolute -top-0.5 -right-0.5 h-4 min-w-4 p-0 text-[10px] flex items-center justify-center">
          2
        </Badge>
      </Button>

      <ModeToggle />

      {/* Avatar */}
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-stone-900 text-xs font-semibold text-white cursor-pointer hover:bg-stone-700 dark:bg-stone-100 dark:text-stone-900">
        DP
      </div>
    </header>
  )
}