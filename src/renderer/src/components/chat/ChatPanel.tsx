import { useRef, useEffect, useState } from 'react'
import { Send, Volume2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useChatStore, ChatMessage } from '@/store/chatStore'

interface ChatPanelProps {
  onSendMessage: (message: string) => void
  onSpeakMessage: (text: string) => void
  isStreaming: boolean
}

function MessageBubble({ message, onSpeak }: { message: ChatMessage; onSpeak: (text: string) => void }) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      <div
        className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
          isUser
            ? 'bg-primary text-primary-foreground'
            : 'bg-secondary text-secondary-foreground'
        }`}
      >
        <p className="whitespace-pre-wrap break-words">{message.content}</p>
        {!isUser && message.content && (
          <button
            onClick={() => onSpeak(message.content)}
            className="mt-1 opacity-60 hover:opacity-100 transition-opacity"
            aria-label="Read this message aloud"
          >
            <Volume2 className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  )
}

export function ChatPanel({ onSendMessage, onSpeakMessage, isStreaming }: ChatPanelProps) {
  const { messages } = useChatStore()
  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isStreaming) return
    onSendMessage(input.trim())
    setInput('')
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b">
        <h2 className="text-sm font-semibold">AI Assistant</h2>
        <p className="text-xs text-muted-foreground">Ask questions or use voice commands</p>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3" role="log" aria-label="Chat messages">
        {messages.length === 0 && (
          <div className="text-center text-muted-foreground text-sm mt-8">
            <p className="mb-2">Welcome to VocalEyes!</p>
            <p className="text-xs">Type a message, or use voice commands.</p>
            <p className="text-xs mt-1">Try: "What's on this page?"</p>
          </div>
        )}
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} onSpeak={onSpeakMessage} />
        ))}
        {isStreaming && (
          <div className="flex justify-start mb-3">
            <div className="bg-secondary rounded-lg px-3 py-2">
              <div className="flex gap-1">
                <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-3 border-t">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-secondary rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
            disabled={isStreaming}
            aria-label="Chat message input"
          />
          <Button type="submit" size="icon" disabled={isStreaming || !input.trim()} aria-label="Send message">
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </form>
    </div>
  )
}
