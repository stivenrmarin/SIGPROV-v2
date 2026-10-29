import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, HashRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from './components/layout/theme-provider'
import App from './App'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, refetchOnWindowFocus: false },
  },
})

/**
 * En desarrollo se usa BrowserRouter (URLs limpias en http://localhost:5173).
 *
 * En produccion se usa HashRouter porque la app se sirve como sitio estatico
 * (hosting sin reglas de rewrite) y dentro de Electron con el protocolo
 * file://. En ambos casos BrowserRouter devolveria 404 al recargar una ruta
 * interna como /proveedores; con el hash la app siempre resuelve al
 * index.html.
 */
const Router = import.meta.env.PROD ? HashRouter : BrowserRouter

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider defaultTheme="light" storageKey="sigprov-theme">
      <QueryClientProvider client={queryClient}>
        <Router>
          <App />
        </Router>
      </QueryClientProvider>
    </ThemeProvider>
  </React.StrictMode>,
)
