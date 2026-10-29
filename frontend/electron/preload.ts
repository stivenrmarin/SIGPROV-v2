/**
 * Preload de Electron.
 *
 * Expone una API minima y de solo lectura al renderer. No se comparte
 * ningun objeto de Node.js: solo datos primitivos y funciones simples.
 */

import { contextBridge } from 'electron'

export interface SigprovBridge {
  readonly isElectron: true
  readonly platform: NodeJS.Platform
  readonly backendUrl: string
  readonly version: string
  readonly electronVersion: string
}

const bridge: SigprovBridge = {
  isElectron: true,
  platform: process.platform,
  backendUrl: process.env.SIGPROV_BACKEND_URL ?? 'http://127.0.0.1:8000',
  version: process.env.APP_VERSION ?? '2.0.0',
  electronVersion: process.versions.electron ?? '',
}

contextBridge.exposeInMainWorld('sigprov', bridge)
