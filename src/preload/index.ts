import { contextBridge, ipcRenderer } from 'electron'

const api = {
  getApiKey: (): Promise<string> => ipcRenderer.invoke('get-api-key')
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore
  window.api = api
}
