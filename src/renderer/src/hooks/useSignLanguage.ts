import { useCallback, useEffect, useRef, useState } from 'react'
import { classifyBothDialects, DetectedSign, HandLandmark } from '@/utils/signClassifier'

interface UseSignLanguageReturn {
  isActive: boolean
  detectedSign: DetectedSign | null
  landmarks: HandLandmark[] | null
  videoRef: React.RefObject<HTMLVideoElement | null>
  canvasRef: React.RefObject<HTMLCanvasElement | null>
  start: () => void
  stop: () => void
}

export function useSignLanguage(onSignDetected?: (sign: DetectedSign) => void): UseSignLanguageReturn {
  const [isActive, setIsActive] = useState(false)
  const [detectedSign, setDetectedSign] = useState<DetectedSign | null>(null)
  const [landmarks, setLandmarks] = useState<HandLandmark[] | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const handsRef = useRef<any>(null)
  const animFrameRef = useRef<number>(0)
  const streamRef = useRef<MediaStream | null>(null)
  const onSignRef = useRef(onSignDetected)
  onSignRef.current = onSignDetected
  const lastSignRef = useRef<string>('')
  const lastSignTimeRef = useRef<number>(0)

  const processFrame = useCallback(async () => {
    if (!videoRef.current || !handsRef.current || !isActive) return

    if (videoRef.current.readyState >= 2) {
      await handsRef.current.send({ image: videoRef.current })
    }

    animFrameRef.current = requestAnimationFrame(processFrame)
  }, [isActive])

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' }
      })
      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }

      // Load MediaPipe Hands
      const handsModule = await import('@mediapipe/hands')
      const { Hands } = handsModule
      const HAND_CONNECTIONS = (handsModule as any).HAND_CONNECTIONS
      const drawingModule = await import('@mediapipe/drawing_utils')
      const { drawConnectors, drawLandmarks } = drawingModule

      const hands = new Hands({
        locateFile: (file: string) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
      })

      hands.setOptions({
        maxNumHands: 2,
        modelComplexity: 1,
        minDetectionConfidence: 0.7,
        minTrackingConfidence: 0.5
      })

      hands.onResults((results: any) => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        canvas.width = videoRef.current?.videoWidth || 640
        canvas.height = videoRef.current?.videoHeight || 480

        ctx.save()
        ctx.clearRect(0, 0, canvas.width, canvas.height)

        // Draw video frame
        if (videoRef.current) {
          ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height)
        }

        if (results.multiHandLandmarks?.length > 0) {
          for (const handLandmarks of results.multiHandLandmarks) {
            // Draw hand skeleton
            drawConnectors(ctx, handLandmarks, HAND_CONNECTIONS, {
              color: '#00FF00', lineWidth: 3
            })
            drawLandmarks(ctx, handLandmarks, {
              color: '#FF0000', lineWidth: 1, radius: 4
            })

            // Classify gesture
            const lm: HandLandmark[] = handLandmarks.map((l: any) => ({
              x: l.x, y: l.y, z: l.z
            }))
            setLandmarks(lm)

            const results2 = classifyBothDialects(lm)
            const sign = results2.asl || results2.isl

            if (sign) {
              const now = Date.now()
              // Debounce: only fire if sign changed or 2 seconds passed
              if (sign.sign !== lastSignRef.current || now - lastSignTimeRef.current > 2000) {
                lastSignRef.current = sign.sign
                lastSignTimeRef.current = now
                setDetectedSign(sign)
                onSignRef.current?.(sign)
              }

              // Draw sign label
              ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
              ctx.fillRect(10, canvas.height - 60, 300, 50)
              ctx.fillStyle = '#00FF00'
              ctx.font = 'bold 24px Arial'
              ctx.fillText(`${sign.sign} (${sign.dialect})`, 20, canvas.height - 25)
            }
          }
        } else {
          setDetectedSign(null)
          setLandmarks(null)
        }

        ctx.restore()
      })

      handsRef.current = hands
      setIsActive(true)

      // Start processing
      const processLoop = async () => {
        if (videoRef.current && videoRef.current.readyState >= 2) {
          await hands.send({ image: videoRef.current })
        }
        animFrameRef.current = requestAnimationFrame(processLoop)
      }
      processLoop()

    } catch (error) {
      console.error('Failed to start sign language detection:', error)
    }
  }, [])

  const stop = useCallback(() => {
    setIsActive(false)
    cancelAnimationFrame(animFrameRef.current)

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }

    handsRef.current?.close()
    handsRef.current = null
    setDetectedSign(null)
    setLandmarks(null)
  }, [])

  useEffect(() => {
    return () => {
      stop()
    }
  }, [stop])

  return { isActive, detectedSign, landmarks, videoRef, canvasRef, start, stop }
}
