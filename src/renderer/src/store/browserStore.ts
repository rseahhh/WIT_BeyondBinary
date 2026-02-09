import { create } from 'zustand'

interface BrowserState {
  url: string
  pageTitle: string
  pageContent: string
  isLoading: boolean

  setUrl: (url: string) => void
  setPageTitle: (title: string) => void
  setPageContent: (content: string) => void
  setLoading: (loading: boolean) => void
}

export const useBrowserStore = create<BrowserState>((set) => ({
  url: 'https://www.google.com',
  pageTitle: '',
  pageContent: '',
  isLoading: false,

  setUrl: (url) => set({ url }),
  setPageTitle: (title) => set({ pageTitle: title }),
  setPageContent: (content) => set({ pageContent: content }),
  setLoading: (loading) => set({ isLoading: loading })
}))
