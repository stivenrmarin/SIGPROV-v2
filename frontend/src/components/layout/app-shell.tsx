import { type ReactNode, useEffect, useState } from 'react'
import { Sidebar } from './Sidebar'
import { Topbar } from './topbar'

interface AppShellProps {
  children: ReactNode
  title?: string
  subtitle?: string
  actions?: ReactNode
}

const SIDEBAR_KEY = 'sigprov-sidebar-collapsed'

export function AppShell({ children, title, subtitle, actions }: AppShellProps) {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem(SIDEBAR_KEY) === 'true'
  })

  useEffect(() => {
    localStorage.setItem(SIDEBAR_KEY, String(collapsed))
  }, [collapsed])

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />
      <div className="flex flex-1 flex-col min-w-0">
        <Topbar title={title} subtitle={subtitle} actions={actions} />
        <main className="flex-1 p-6 min-w-0">{children}</main>
      </div>
    </div>
  )
}