/**
 * Proceso principal de Electron.
 *
 * Seguridad:
 *   - contextIsolation: true  (el renderer no toca Node.js)
 *   - nodeIntegration: false
 *   - sandbox: true
 *   - CSP restrictiva y ningun acceso a archivos desde el renderer
 *
 * Modos:
 *   - Desarrollo: carga el servidor de Vite (http://localhost:5173)
 *   - Produccion: carga el bundle estatico (dist/index.html)
 *
 * El backend es opcional: SIGPROV funciona con datos simulados cuando no
 * hay ningun servidor en 127.0.0.1:8000 (el cliente HTTP cae a mocks solo).
 */

import { spawn, type ChildProcess } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { app, BrowserWindow, dialog, shell } from 'electron'

const isDev = !app.isPackaged
const DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL ?? 'http://localhost:5173'
const BACKEND_URL = process.env.SIGPROV_BACKEND_URL ?? 'http://127.0.0.1:8000'

let mainWindow: BrowserWindow | null = null
let backendProcess: ChildProcess | null = null

/** Comprueba si hay un backend escuchando. */
async function backendDisponible(): Promise<boolean> {
  try {
    const control = new AbortController()
    const timer = setTimeout(() => control.abort(), 1500)
    const res = await fetch(`${BACKEND_URL}/health`, { signal: control.signal })
    clearTimeout(timer)
    return res.ok
  } catch {
    return false
  }
}

/**
 * Intenta arrancar el backend local si existe un interprete de Python con
 * el proyecto disponible. Si no, SIGPROV sigue funcionando en modo demo.
 */
async function intentarArrancarBackend(): Promise<boolean> {
  if (await backendDisponible()) return true

  if (isDev) {
    // En desarrollo el backend se levanta aparte (uvicorn).
    return false
  }

  const env = process.env.SIGPROV_BACKEND_DIR
  if (!env || !existsSync(env)) return false

  const python = process.env.SIGPROV_PYTHON ?? 'python'
  const script = join(env, 'scripts', 'inicializar_db.py')
  const run = join(env, 'run_backend.py')

  if (!existsSync(run)) return false

  try {
    backendProcess = spawn(python, [run], {
      cwd: env,
      detached: false,
      stdio: 'ignore',
      windowsHide: true,
    })
    backendProcess.on('error', () => {
      backendProcess = null
    })

    // Espera activa hasta 20 segundos a que levante.
    for (let i = 0; i < 20; i += 1) {
      await new Promise((r) => setTimeout(r, 1000))
      if (await backendDisponible()) return true
    }
  } catch {
    backendProcess = null
  }
  return false
}

function crearVentana(): void {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1120,
    minHeight: 700,
    show: false,
    backgroundColor: '#0c0a09',
    title: 'SIGPROV',
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
    },
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
    mainWindow?.focus()
  })

  // Los enlaces externos se abren en el navegador del sistema.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) void shell.openExternal(url)
    return { action: 'deny' }
  })

  // Nunca navegar fuera de la app.
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const permitido = isDev ? url.startsWith(DEV_SERVER_URL) : url.startsWith('file://')
    if (!permitido) {
      event.preventDefault()
      if (/^https?:\/\//i.test(url)) void shell.openExternal(url)
    }
  })

  if (isDev) {
    void mainWindow.loadURL(DEV_SERVER_URL)
  } else {
    void mainWindow.loadFile(join(__dirname, '../dist/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// Una sola instancia de la app.
const instancesBloqueadas = app.requestSingleInstanceLock()
if (!instancesBloqueadas) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })
}

void app.whenReady().then(async () => {
  const conBackend = await intentarArrancarBackend()
  crearVentana()

  if (!conBackend) {
    console.log('[SIGPROV] Modo demo: sin backend local, se usan datos simulados.')
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) crearVentana()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  if (backendProcess && !backendProcess.killed) {
    backendProcess.kill()
  }
})

process.on('uncaughtException', (error) => {
  console.error('[SIGPROV] Error no capturado:', error)
  if (!isDev) {
    dialog.showErrorBox('SIGPROV - Error inesperado', String(error))
  }
})
