const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'

export interface GroqMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

let apiKey = ''

export async function initGroqClient(): Promise<void> {
  try {
    // Try to get from Electron IPC
    const key = await (window as any).api?.getApiKey()
    if (key) apiKey = key
  } catch {
    // Fallback: try localStorage
    apiKey = localStorage.getItem('groq_api_key') || ''
  }
}

export function setApiKey(key: string): void {
  apiKey = key
  localStorage.setItem('groq_api_key', key)
}

export function getApiKey(): string {
  return apiKey || localStorage.getItem('groq_api_key') || ''
}

export async function* streamChat(
  messages: GroqMessage[],
  systemPrompt?: string
): AsyncGenerator<string> {
  const key = getApiKey()
  if (!key) {
    yield 'Please set your Groq API key in Settings first.'
    return
  }

  const allMessages: GroqMessage[] = []
  if (systemPrompt) {
    allMessages.push({ role: 'system', content: systemPrompt })
  }
  allMessages.push(...messages)

  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: allMessages,
      stream: true,
      temperature: 0.7,
      max_tokens: 1024
    })
  })

  if (!response.ok) {
    const err = await response.text()
    yield `Error: ${response.status} - ${err}`
    return
  }

  const reader = response.body?.getReader()
  if (!reader) return

  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const data = line.slice(6).trim()
      if (data === '[DONE]') return

      try {
        const parsed = JSON.parse(data)
        const content = parsed.choices?.[0]?.delta?.content
        if (content) yield content
      } catch {
        // skip malformed chunks
      }
    }
  }
}

export function buildSystemPrompt(pageUrl: string, pageTitle: string, pageContent: string): string {
  const truncatedContent = pageContent.slice(0, 3000)
  return `You are VocalEyes, a multimodal accessibility assistant. You help users with visual impairments, hearing impairments, and motor disabilities navigate the web.

Be concise and clear in your responses. When describing visual content, be descriptive but brief. When giving instructions, use simple step-by-step language.

IMPORTANT: You are a chat assistant only. You CANNOT perform actions like navigating to websites, clicking elements, or controlling the browser. If a user asks you to do something, tell them the voice command they should use instead. For example, if they say "go to youtube", reply: "To navigate, say or type the command: go to youtube" — do NOT claim you navigated for them.

Current page context:
- URL: ${pageUrl || 'No page loaded'}
- Title: ${pageTitle || 'Unknown'}
- Content preview: ${truncatedContent || 'No content available'}

Voice commands the user can use (suggest these when relevant):
- "Read this page" - reads page content aloud
- "Go to [website]" - navigates to a URL
- "Click [text]" - clicks an element
- "Scroll down/up" - scrolls the page
- "High contrast on/off" - toggles high contrast
- "Show camera" - opens sign language/eye tracking
- "Help" - lists all commands`
}
