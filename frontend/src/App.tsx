import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AppShell } from '@/components/layout/app-shell'
import { HelpButton } from '@/components/layout/help-button'
import { DashboardChatbot } from '@/components/layout/dashboard-chatbot'
import { GuidedTour, useTour } from '@/components/layout/guided-tour'
import { Routes, Route, Navigate } from 'react-router-dom'
import Hoy from '@/pages/Hoy'
import Semana from '@/pages/Semana'
import Productos from '@/pages/Productos'
import RegistrarVenta from '@/pages/RegistrarVenta'
import Alertas from '@/pages/Alertas'
import Configuracion from '@/pages/Configuracion'
import Mesas from '@/pages/Mesas'
import CierreCaja from '@/pages/CierreCaja'
import Proveedores from '@/pages/Proveedores'

export default function App() {
  const { tourOpen, startTour, endTour } = useTour()

  return (
    <TooltipProvider delayDuration={300}>
      <AppShell>
        <Routes>
          <Route path="/" element={<Hoy />} />
          <Route path="/mesas" element={<Mesas />} />
          <Route path="/semana" element={<Semana />} />
          <Route path="/productos" element={<Productos />} />
          <Route path="/venta" element={<RegistrarVenta />} />
          <Route path="/proveedores" element={<Proveedores />} />
          <Route path="/cierre-caja" element={<CierreCaja />} />
          <Route path="/alertas" element={<Alertas />} />
          <Route path="/configuracion" element={<Configuracion />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppShell>
      <HelpButton onStartTour={startTour} />
      <DashboardChatbot />
      <GuidedTour open={tourOpen} onClose={endTour} />
      <Toaster richColors position="top-right" />
    </TooltipProvider>
  )
}