import { Mic, MicOff, Hand, Eye, Contrast, Volume2, VolumeX, Minus, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAppStore } from '@/store/appStore'

interface AccessibilityBarProps {
  isVoiceActive: boolean
  isSpeaking: boolean
  onToggleVoice: () => void
  onStopSpeaking: () => void
  onToggleSignLanguage: () => void
  onToggleEyeTracking: () => void
  isSignLanguageActive: boolean
  isEyeTrackingActive: boolean
}

export function AccessibilityBar({
  isVoiceActive,
  isSpeaking,
  onToggleVoice,
  onStopSpeaking,
  onToggleSignLanguage,
  onToggleEyeTracking,
  isSignLanguageActive,
  isEyeTrackingActive
}: AccessibilityBarProps) {
  const { isHighContrast, toggleHighContrast, textScale, setTextScale, statusMessage } = useAppStore()

  return (
    <div className="flex items-center justify-between px-4 py-2 border-b bg-card" role="toolbar" aria-label="Accessibility controls">
      <div className="flex items-center gap-2">
        {/* Voice Control */}
        <Button
          variant={isVoiceActive ? 'default' : 'outline'}
          size="sm"
          onClick={onToggleVoice}
          className={isVoiceActive ? 'voice-active' : ''}
          aria-label={isVoiceActive ? 'Turn off voice control' : 'Turn on voice control'}
        >
          {isVoiceActive ? <Mic className="w-4 h-4 mr-1" /> : <MicOff className="w-4 h-4 mr-1" />}
          Voice {isVoiceActive ? 'On' : 'Off'}
        </Button>

        {/* Stop Speaking */}
        {isSpeaking && (
          <Button variant="destructive" size="sm" onClick={onStopSpeaking} aria-label="Stop speaking">
            <VolumeX className="w-4 h-4 mr-1" />
            Stop
          </Button>
        )}

        {/* Sign Language */}
        <Button
          variant={isSignLanguageActive ? 'default' : 'outline'}
          size="sm"
          onClick={onToggleSignLanguage}
          className={isSignLanguageActive ? 'hand-detected' : ''}
          aria-label={isSignLanguageActive ? 'Disable sign language' : 'Enable sign language'}
        >
          <Hand className="w-4 h-4 mr-1" />
          Sign Lang
        </Button>

        {/* Eye Tracking */}
        <Button
          variant={isEyeTrackingActive ? 'default' : 'outline'}
          size="sm"
          onClick={onToggleEyeTracking}
          aria-label={isEyeTrackingActive ? 'Disable eye tracking' : 'Enable eye tracking'}
        >
          <Eye className="w-4 h-4 mr-1" />
          Eye Track
        </Button>

        {/* High Contrast */}
        <Button
          variant={isHighContrast ? 'default' : 'outline'}
          size="sm"
          onClick={toggleHighContrast}
          aria-label={isHighContrast ? 'Disable high contrast' : 'Enable high contrast'}
        >
          <Contrast className="w-4 h-4 mr-1" />
          Contrast
        </Button>

        {/* Text Size */}
        <div className="flex items-center gap-1 ml-2">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setTextScale(Math.max(80, textScale - 10))}
            aria-label="Decrease text size"
          >
            <Minus className="w-3 h-3" />
          </Button>
          <span className="text-xs w-10 text-center" aria-label={`Text scale ${textScale}%`}>
            {textScale}%
          </span>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setTextScale(Math.min(200, textScale + 10))}
            aria-label="Increase text size"
          >
            <Plus className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Status */}
      <div className="flex items-center gap-2">
        {isSpeaking && <Volume2 className="w-4 h-4 text-primary animate-pulse" />}
        <span className="text-xs text-muted-foreground" role="status" aria-live="polite">
          {statusMessage}
        </span>
      </div>
    </div>
  )
}
