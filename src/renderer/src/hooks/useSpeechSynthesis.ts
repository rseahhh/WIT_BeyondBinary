import { useCallback, useRef, useState } from 'react'

interface UseSpeechSynthesisReturn {
  isSpeaking: boolean
  speak: (text: string) => void
  stop: () => void
  setRate: (rate: number) => void
  setVoice: (voiceName: string) => void
  getVoices: () => SpeechSynthesisVoice[]
}

export function useSpeechSynthesis(): UseSpeechSynthesisReturn {
  const [isSpeaking, setIsSpeaking] = useState(false)
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)
  const rateRef = useRef(1.0)
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null)
  const queueRef = useRef<string[]>([])
  const speakingRef = useRef(false)

  const processQueue = useCallback(() => {
    if (speakingRef.current || queueRef.current.length === 0) return

    const text = queueRef.current.shift()!
    speakingRef.current = true
    setIsSpeaking(true)

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = rateRef.current
    utterance.pitch = 1.0
    if (voiceRef.current) utterance.voice = voiceRef.current

    utterance.onend = () => {
      speakingRef.current = false
      if (queueRef.current.length > 0) {
        processQueue()
      } else {
        setIsSpeaking(false)
      }
    }

    utterance.onerror = () => {
      speakingRef.current = false
      if (queueRef.current.length > 0) {
        processQueue()
      } else {
        setIsSpeaking(false)
      }
    }

    utteranceRef.current = utterance
    window.speechSynthesis.speak(utterance)
  }, [])

  const speak = useCallback((text: string) => {
    // Split long text into sentences for better TTS
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text]
    queueRef.current.push(...sentences)
    processQueue()
  }, [processQueue])

  const stop = useCallback(() => {
    window.speechSynthesis.cancel()
    queueRef.current = []
    speakingRef.current = false
    setIsSpeaking(false)
  }, [])

  const setRate = useCallback((rate: number) => {
    rateRef.current = rate
  }, [])

  const setVoice = useCallback((voiceName: string) => {
    const voices = window.speechSynthesis.getVoices()
    const voice = voices.find(v => v.name === voiceName)
    if (voice) voiceRef.current = voice
  }, [])

  const getVoices = useCallback(() => {
    return window.speechSynthesis.getVoices()
  }, [])

  return { isSpeaking, speak, stop, setRate, setVoice, getVoices }
}
