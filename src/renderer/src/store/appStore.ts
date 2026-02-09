import { create } from 'zustand'

export type AppMode = 'browser' | 'camera'
export type CameraMode = 'sign-language' | 'eye-tracking' | 'both'

interface AppState {
  mode: AppMode
  cameraMode: CameraMode
  isVoiceActive: boolean
  isHighContrast: boolean
  textScale: number
  isSidebarOpen: boolean
  statusMessage: string

  setMode: (mode: AppMode) => void
  setCameraMode: (mode: CameraMode) => void
  setVoiceActive: (active: boolean) => void
  toggleHighContrast: () => void
  setTextScale: (scale: number) => void
  toggleSidebar: () => void
  setStatusMessage: (msg: string) => void
}

export const useAppStore = create<AppState>((set) => ({
  mode: 'browser',
  cameraMode: 'sign-language',
  isVoiceActive: false,
  isHighContrast: false,
  textScale: 100,
  isSidebarOpen: true,
  statusMessage: 'Ready',

  setMode: (mode) => set({ mode }),
  setCameraMode: (mode) => set({ cameraMode: mode }),
  setVoiceActive: (active) => set({ isVoiceActive: active }),
  toggleHighContrast: () => set((s) => ({ isHighContrast: !s.isHighContrast })),
  setTextScale: (scale) => set({ textScale: scale }),
  toggleSidebar: () => set((s) => ({ isSidebarOpen: !s.isSidebarOpen })),
  setStatusMessage: (msg) => set({ statusMessage: msg })
}))
