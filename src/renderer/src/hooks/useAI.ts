import { useCallback, useRef } from 'react'
import { useChatStore } from '@/store/chatStore'
import { useBrowserStore } from '@/store/browserStore'
import { streamChat, buildSystemPrompt, GroqMessage } from '@/utils/groqClient'

export function useAI() {
  const { messages, addMessage, appendToMessage, setStreaming } = useChatStore()
  const { url, pageTitle, pageContent } = useBrowserStore()
  const abortRef = useRef(false)

  const sendMessage = useCallback(async (userMessage: string, onComplete?: (response: string) => void) => {
    abortRef.current = false

    // Add user message
    addMessage({ role: 'user', content: userMessage })

    // Create assistant placeholder
    const assistantId = addMessage({ role: 'assistant', content: '' })
    setStreaming(true, assistantId)

    const systemPrompt = buildSystemPrompt(url, pageTitle, pageContent)

    // Build conversation history (last 10 messages for context)
    const history: GroqMessage[] = messages.slice(-10).map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content
    }))
    history.push({ role: 'user', content: userMessage })

    let fullResponse = ''

    try {
      for await (const chunk of streamChat(history, systemPrompt)) {
        if (abortRef.current) break
        appendToMessage(assistantId, chunk)
        fullResponse += chunk
      }
    } catch (error) {
      const errMsg = `Sorry, I encountered an error: ${error}`
      appendToMessage(assistantId, errMsg)
      fullResponse = errMsg
    }

    setStreaming(false)
    onComplete?.(fullResponse)
  }, [messages, url, pageTitle, pageContent, addMessage, appendToMessage, setStreaming])

  const abort = useCallback(() => {
    abortRef.current = true
    setStreaming(false)
  }, [setStreaming])

  return { sendMessage, abort }
}
