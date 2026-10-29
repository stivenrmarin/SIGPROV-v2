import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  CalendarDays,
  Package,
  ShoppingCart,
  Bell,
  Settings,
  Armchair,
  ChevronsLeft,
  ChevronsRight,
  Croissant,
  LogOut,
  HelpCircle,
  Truck,
  Calculator,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip'

const items = [
  { to: '/',              label: 'Inicio',          icon: LayoutDashboard, group: 'Principal' },
  { to: '/mesas',         label: 'Salón',          icon: Armchair,         group: 'Principal', badge: 4 },
  { to: '/venta',         label: 'Nueva venta',    icon: ShoppingCart,     group: 'Operación', badge: 'POS' },
  { to: '/productos',     label: 'Productos',      icon: Package,          group: 'Operación' },
  { to: '/proveedores',   label: 'Proveedores',    icon: Truck,            group: 'Operación' },
  { to: '/cierre-caja',   label: 'Cierre de caja', icon: Calculator,       group: 'Operación' },
  { to: '/semana',        label: 'Predicción ML',  icon: CalendarDays,      group: 'Análisis' },
  { to: '/alertas',       label: 'Alertas',        icon: Bell,             group: 'Operación', badge: 2 },
  { to: '/configuracion', label: 'Configuración',   icon: Settings,         group: 'Sistema' },
]

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const grouped = items.reduce<Record<string, typeof items>>((acc, item) => {
    if (!acc[item.group]) acc[item.group] = []
    acc[item.group].push(item)
    return acc
  }, {})

  return (
    <TooltipProvider delayDuration={100}>
      <aside
        className={cn(
          'flex flex-col border-r bg-card transition-all duration-200 ease-out shrink-0',
          collapsed ? 'w-16' : 'w-64',
        )}
      >
        {/* Header del sidebar */}
        <div className={cn(
          'flex items-center border-b h-16 shrink-0',
          collapsed ? 'justify-center px-2' : 'gap-2 px-4',
        )}>
          {!collapsed && (
            <>
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground shrink-0">
                <Croissant className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold truncate">El Rincón</div>
                <div className="text-[10px] text-muted-foreground truncate">Panadería · Café</div>
              </div>
            </>
          )}
          {collapsed && (
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Croissant className="h-4 w-4" />
            </div>
          )}
        </div>

        {/* Items */}
        <nav className="flex-1 p-3 space-y-4 overflow-y-auto scrollbar-thin">
          {Object.entries(grouped).map(([group, groupItems]) => (
            <div key={group}>
              {!collapsed && (
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-2 mb-1.5">
                  {group}
                </div>
              )}
              <div className="space-y-0.5">
                {groupItems.map((item) => {
                  const link = (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.to === '/'}
                      className={({ isActive }) =>
                        cn(
                          'flex items-center rounded-md text-sm font-medium transition-colors',
                          collapsed ? 'justify-center h-9 w-9' : 'gap-3 px-2.5 h-9',
                          isActive
                            ? 'bg-primary/10 text-primary'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                        )
                      }
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!collapsed && (
                        <>
                          <span className="flex-1 truncate">{item.label}</span>
                          {item.badge && (
                            <span className={cn(
                              'text-[10px] font-semibold rounded-full px-1.5 min-w-5 text-center',
                              typeof item.badge === 'number'
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300',
                            )}>
                              {item.badge}
                            </span>
                          )}
                        </>
                      )}
                    </NavLink>
                  )

                  return collapsed ? (
                    <Tooltip key={item.to}>
                      <TooltipTrigger asChild>{link}</TooltipTrigger>
                      <TooltipContent side="right">
                        {item.label}
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    link
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer del sidebar */}
        <div className="border-t p-3 space-y-1 shrink-0">
          {!collapsed && (
            <div className="px-2 mb-2">
              <div className="text-[10px] text-muted-foreground truncate">Universidad San Mateo</div>
              <div className="text-[10px] text-muted-foreground truncate">Proyecto Integrador 2026-2</div>
            </div>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size={collapsed ? 'icon' : 'sm'}
                className={cn('w-full', collapsed ? '' : 'justify-start gap-2')}
                onClick={() => {/* TODO ayuda */}}
              >
                <HelpCircle className="h-4 w-4" />
                {!collapsed && <span className="text-xs">Ayuda</span>}
              </Button>
            </TooltipTrigger>
            {collapsed && <TooltipContent side="right">Ayuda</TooltipContent>}
          </Tooltip>
          <Button
            variant="ghost"
            size={collapsed ? 'icon' : 'sm'}
            className={cn('w-full', collapsed ? '' : 'justify-start gap-2')}
            onClick={onToggle}
            title={collapsed ? 'Expandir' : 'Colapsar'}
          >
            {collapsed ? (
              <ChevronsRight className="h-4 w-4" />
            ) : (
              <>
                <ChevronsLeft className="h-4 w-4" />
                <span className="text-xs">Colapsar</span>
              </>
            )}
          </Button>
        </div>
      </aside>
    </TooltipProvider>
  )
}