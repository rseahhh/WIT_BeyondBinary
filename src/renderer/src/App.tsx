import { useCallback, useEffect, useState } from 'react'
import { Globe, Settings, Hand, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AccessibilityBar } from '@/components/layout/AccessibilityBar'
import { BrowserPanel } from '@/components/browser/BrowserPanel'
import { ChatPanel } from '@/components/chat/ChatPanel'
import { CameraPanel } from '@/components/camera/CameraPanel'
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition'
import { useSpeechSynthesis } from '@/hooks/useSpeechSynthesis'
import { useSignLanguage } from '@/hooks/useSignLanguage'
import { useEyeTracking } from '@/hooks/useEyeTracking'
import { useAI } from '@/hooks/useAI'
import { useAppStore } from '@/store/appStore'
import { useChatStore } from '@/store/chatStore'
import { useBrowserStore } from '@/store/browserStore'
import { parseCommand, HELP_TEXT } from '@/utils/commandParser'
import { initGroqClient, setApiKey, getApiKey } from '@/utils/groqClient'
import { DetectedSign } from '@/utils/signClassifier'

export default function App() {
  const { mode, setMode, isHighContrast, setStatusMessage, cameraMode, setCameraMode } = useAppStore()
  const { isStreaming } = useChatStore()
  const { url } = useBrowserStore()
  const { sendMessage } = useAI()
  const [showSettings, setShowSettings] = useState(false)
  const [apiKeyInput, setApiKeyInput] = useState('')

  // Speech hooks
  const tts = useSpeechSynthesis()

  const handleVoiceResult = useCallback((transcript: string) => {
    setStatusMessage(`Heard: "${transcript}"`)

    const command = parseCommand(transcript)
    if (!command) return

    switch (command.type) {
      case 'read': {
        setStatusMessage('Reading page...')
        const bp = (window as any).__browserPanel
        bp?.extractContent().then((data: any) => {
          if (data) {
            const text = data.paragraphs?.join('. ') || 'No readable content found on this page.'
            tts.speak(text)
            setStatusMessage('Reading aloud...')
          }
        })
        break
      }
      case 'navigate': {
        if (command.payload) {
          setStatusMessage(`Navigating to ${command.payload}`)
          tts.speak(`Going to ${command.payload}`)
          setMode('browser')
          const bp = (window as any).__browserPanel
          bp?.navigateTo(command.payload)
        }
        break
      }
      case 'search': {
        if (command.payload) {
          const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(command.payload)}`
          setStatusMessage(`Searching for ${command.payload}`)
          tts.speak(`Searching for ${command.payload}`)
          setMode('browser')
          const bp = (window as any).__browserPanel
          bp?.navigateTo(searchUrl)
        }
        break
      }
      case 'click': {
        if (command.payload) {
          setStatusMessage(`Clicking "${command.payload}"`)
          const bp = (window as any).__browserPanel
          bp?.webviewRef?.current?.executeJavaScript(`
            (function() {
              const target = '${command.payload.replace(/'/g, "\\'")}';
              const elements = Array.from(document.querySelectorAll('a, button, [role="button"], input[type="submit"]'));
              const match = elements.find(el => el.textContent.toLowerCase().includes(target.toLowerCase()));
              if (match) { match.click(); return 'clicked'; }
              return 'not found';
            })()
          `).then((result: string) => {
            if (result === 'clicked') {
              tts.speak(`Clicked ${command.payload}`)
            } else {
              tts.speak(`Could not find ${command.payload}`)
            }
          })
        }
        break
      }
      case 'scroll': {
        const bp = (window as any).__browserPanel
        const scrollMap: Record<string, string> = {
          down: 'window.scrollBy(0, 500)',
          up: 'window.scrollBy(0, -500)',
          top: 'window.scrollTo(0, 0)',
          bottom: 'window.scrollTo(0, document.body.scrollHeight)'
        }
        const scrollCmd = scrollMap[command.payload || 'down']
        bp?.webviewRef?.current?.executeJavaScript(scrollCmd)
        setStatusMessage(`Scrolling ${command.payload}`)
        break
      }
      case 'contrast': {
        useAppStore.getState().toggleHighContrast()
        const newState = !useAppStore.getState().isHighContrast
        tts.speak(`High contrast ${newState ? 'enabled' : 'disabled'}`)
        setStatusMessage(`High contrast ${newState ? 'on' : 'off'}`)
        break
      }
      case 'textsize': {
        const current = useAppStore.getState().textScale
        const newScale = command.payload === 'increase'
          ? Math.min(200, current + 20)
          : Math.max(80, current - 20)
        useAppStore.getState().setTextScale(newScale)
        tts.speak(`Text size ${newScale} percent`)
        setStatusMessage(`Text scale: ${newScale}%`)
        break
      }
      case 'mode': {
        if (command.payload === 'camera') {
          setMode('camera')
          tts.speak('Switching to camera mode')
          setStatusMessage('Camera mode')
        } else {
          setMode('browser')
          tts.speak('Switching to browser mode')
          setStatusMessage('Browser mode')
        }
        break
      }
      case 'stop': {
        tts.stop()
        setStatusMessage('Stopped')
        break
      }
      case 'help': {
        tts.speak(HELP_TEXT)
        setStatusMessage('Listing commands...')
        break
      }
      case 'youtube': {
        const bp = (window as any).__browserPanel
        if (command.payload === 'list') {
          bp?.webviewRef?.current?.executeJavaScript(`
            Array.from(document.querySelectorAll('#video-title'))
              .map(el => el.textContent.trim())
              .filter(Boolean)
              .slice(0, 5)
              .join('|||')
          `).then((result: string) => {
            if (result) {
              const titles = result.split('|||')
              const speech = titles.map((t, i) => `Video ${i + 1}: ${t}`).join('. ')
              tts.speak(`I found ${titles.length} videos. ${speech}`)
            } else {
              tts.speak('No videos found on this page. Try navigating to YouTube first.')
            }
          })
        } else if (command.payload?.startsWith('play-')) {
          const idx = parseInt(command.payload.replace('play-', '')) - 1
          bp?.webviewRef?.current?.executeJavaScript(`
            const videos = document.querySelectorAll('#video-title');
            if (videos[${idx}]) { videos[${idx}].click(); 'played'; } else { 'not found'; }
          `).then((result: string) => {
            tts.speak(result === 'played' ? `Playing video ${idx + 1}` : 'Video not found')
          })
        } else if (command.payload === 'toggle-play') {
          bp?.webviewRef?.current?.executeJavaScript(`
            const video = document.querySelector('video');
            if (video) { video.paused ? video.play() : video.pause(); 'toggled'; } else { 'no video'; }
          `)
        }
        break
      }
      case 'volume': {
        const bp = (window as any).__browserPanel
        if (command.payload === 'up') {
          bp?.webviewRef?.current?.executeJavaScript(`
            const v = document.querySelector('video');
            if (v) v.volume = Math.min(1, v.volume + 0.2);
          `)
          tts.speak('Volume up')
        } else if (command.payload === 'down') {
          bp?.webviewRef?.current?.executeJavaScript(`
            const v = document.querySelector('video');
            if (v) v.volume = Math.max(0, v.volume - 0.2);
          `)
          tts.speak('Volume down')
        } else if (command.payload === 'mute') {
          bp?.webviewRef?.current?.executeJavaScript(`
            const v = document.querySelector('video');
            if (v) v.muted = !v.muted;
          `)
          tts.speak('Toggled mute')
        }
        break
      }
      case 'chat': {
        if (command.payload) {
          sendMessage(command.payload, (response) => {
            tts.speak(response)
          })
        }
        break
      }
    }
  }, [setMode, setStatusMessage, tts, sendMessage])

  const stt = useSpeechRecognition(handleVoiceResult)

  // Sign language detection
  const handleSignDetected = useCallback((sign: DetectedSign) => {
    setStatusMessage(`Sign detected: ${sign.sign} (${sign.dialect})`)
    tts.speak(`${sign.sign}`)
  }, [setStatusMessage, tts])

  const signLanguage = useSignLanguage(handleSignDetected)

  // Eye tracking - double blink
  const handleDoubleBlink = useCallback(() => {
    setStatusMessage('Double blink detected - Click!')
    tts.speak('Click')
    // Simulate click on the focused element
    const bp = (window as any).__browserPanel
    bp?.webviewRef?.current?.executeJavaScript(`
      const focused = document.activeElement;
      if (focused && focused !== document.body) {
        focused.click();
      }
    `)
  }, [setStatusMessage, tts])

  const eyeTracking = useEyeTracking(handleDoubleBlink)

  // Initialize Groq client
  useEffect(() => {
    initGroqClient()
  }, [])

  // Apply high contrast class to root
  useEffect(() => {
    document.documentElement.classList.toggle('high-contrast', isHighContrast)
  }, [isHighContrast])

  // Welcome message on first load
  useEffect(() => {
    tts.speak('Welcome to VocalEyes. Your multimodal accessibility assistant. Say help to learn available commands.')
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handlePageContent = useCallback((_content: string, _title: string) => {
    // Content stored in browserStore automatically
  }, [])

  return (
    <div className="h-screen flex flex-col">
      {/* Top Accessibility Bar */}
      <AccessibilityBar
        isVoiceActive={stt.isListening}
        isSpeaking={tts.isSpeaking}
        onToggleVoice={stt.toggleListening}
        onStopSpeaking={tts.stop}
        onToggleSignLanguage={() => {
          if (signLanguage.isActive) {
            signLanguage.stop()
            setMode('browser')
          } else {
            signLanguage.start()
            setMode('camera')
            setCameraMode('sign-language')
          }
        }}
        onToggleEyeTracking={() => {
          if (eyeTracking.isActive) {
            eyeTracking.stop()
            setMode('browser')
          } else {
            eyeTracking.start()
            setMode('camera')
            setCameraMode('eye-tracking')
          }
        }}
        isSignLanguageActive={signLanguage.isActive}
        isEyeTrackingActive={eyeTracking.isActive}
      />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Chat + Navigation */}
        <div className="w-80 border-r flex flex-col bg-card/30">
          {/* Mode Switcher */}
          <div className="flex border-b">
            <Button
              variant={mode === 'browser' ? 'default' : 'ghost'}
              className="flex-1 rounded-none"
              onClick={() => setMode('browser')}
              aria-label="Browser mode"
            >
              <Globe className="w-4 h-4 mr-1" />
              Browse
            </Button>
            <Button
              variant={mode === 'camera' ? 'default' : 'ghost'}
              className="flex-1 rounded-none"
              onClick={() => setMode('camera')}
              aria-label="Camera mode"
            >
              {cameraMode === 'sign-language' ? <Hand className="w-4 h-4 mr-1" /> : <Eye className="w-4 h-4 mr-1" />}
              Camera
            </Button>
            <Button
              variant="ghost"
              className="rounded-none px-3"
              onClick={() => setShowSettings(!showSettings)}
              aria-label="Settings"
            >
              <Settings className="w-4 h-4" />
            </Button>
          </div>

          {/* Settings Panel */}
          {showSettings && (
            <div className="p-3 border-b bg-card">
              <h3 className="text-sm font-semibold mb-2">Settings</h3>
              <div className="space-y-2">
                <div>
                  <label className="text-xs text-muted-foreground">Groq API Key</label>
                  <div className="flex gap-1 mt-1">
                    <input
                      type="password"
                      value={apiKeyInput}
                      onChange={(e) => setApiKeyInput(e.target.value)}
                      placeholder="gsk_..."
                      className="flex-1 bg-secondary rounded px-2 py-1 text-xs outline-none"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-7"
                      onClick={() => {
                        setApiKey(apiKeyInput)
                        tts.speak('API key saved')
                        setShowSettings(false)
                      }}
                    >
                      Save
                    </Button>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Camera Mode</label>
                  <div className="flex gap-1 mt-1">
                    <Button
                      size="sm"
                      variant={cameraMode === 'sign-language' ? 'default' : 'outline'}
                      className="text-xs h-7 flex-1"
                      onClick={() => setCameraMode('sign-language')}
                    >
                      Sign Language
                    </Button>
                    <Button
                      size="sm"
                      variant={cameraMode === 'eye-tracking' ? 'default' : 'outline'}
                      className="text-xs h-7 flex-1"
                      onClick={() => setCameraMode('eye-tracking')}
                    >
                      Eye Tracking
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Chat */}
          <div className="flex-1 overflow-hidden">
            <ChatPanel
              onSendMessage={(msg) => {
                // Try parsing as a command first
                const command = parseCommand(msg)
                if (command && command.type !== 'chat') {
                  // Show the command in chat as user message + confirmation
                  useChatStore.getState().addMessage({ role: 'user', content: msg })
                  useChatStore.getState().addMessage({ role: 'assistant', content: `Executing command: ${command.type}${command.payload ? ` → ${command.payload}` : ''}` })
                  // Execute it via the same handler as voice
                  handleVoiceResult(msg)
                } else {
                  // Not a command — send to AI
                  sendMessage(msg, (response) => {
                    tts.speak(response)
                  })
                }
              }}
              onSpeakMessage={(text) => tts.speak(text)}
              isStreaming={isStreaming}
            />
          </div>
        </div>

        {/* Main Area */}
        <div className="flex-1 overflow-hidden">
          {mode === 'browser' ? (
            <BrowserPanel onPageContent={handlePageContent} />
          ) : (
            <CameraPanel
              mode={cameraMode === 'eye-tracking' ? 'eye-tracking' : 'sign-language'}
              signVideoRef={signLanguage.videoRef}
              signCanvasRef={signLanguage.canvasRef}
              isSignActive={signLanguage.isActive}
              detectedSign={signLanguage.detectedSign}
              onStartSign={signLanguage.start}
              onStopSign={signLanguage.stop}
              eyeVideoRef={eyeTracking.videoRef}
              eyeCanvasRef={eyeTracking.canvasRef}
              isEyeActive={eyeTracking.isActive}
              isFaceDetected={eyeTracking.isFaceDetected}
              gazeDirection={eyeTracking.gazeDirection}
              isBlinking={eyeTracking.isBlinking}
              onStartEye={eyeTracking.start}
              onStopEye={eyeTracking.stop}
            />
          )}
        </div>
      </div>
    </div>
  )
}
