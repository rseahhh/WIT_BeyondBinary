import { create } from 'zustand'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
}

interface ChatState {
  messages: ChatMessage[]
  isStreaming: boolean
  currentStreamId: string | null

  addMessage: (msg: Omit<ChatMessage, 'id' | 'timestamp'>) => string
  appendToMessage: (id: string, chunk: string) => void
  setStreaming: (streaming: boolean, streamId?: string | null) => void
  clearMessages: () => void
}

let messageCounter = 0

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  isStreaming: false,
  currentStreamId: null,

  addMessage: (msg) => {
    const id = `msg-${++messageCounter}`
    set((s) => ({
      messages: [...s.messages, { ...msg, id, timestamp: Date.now() }]
    }))
    return id
  },

  appendToMessage: (id, chunk) => {
    set((s) => ({
      messages: s.messages.map((m) =>
        m.id === id ? { ...m, content: m.content + chunk } : m
      )
    }))
  },

  setStreaming: (streaming, streamId = null) => {
    set({ isStreaming: streaming, currentStreamId: streamId })
  },

  clearMessages: () => set({ messages: [] })
}))
