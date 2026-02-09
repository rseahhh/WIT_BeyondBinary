import { useCallback, useEffect, useRef, useState } from 'react'

interface EyeTrackingState {
  isActive: boolean
  isBlinking: boolean
  gazeDirection: 'left' | 'center' | 'right' | 'unknown'
  isFaceDetected: boolean
  blinkCount: number
}

interface UseEyeTrackingReturn extends EyeTrackingState {
  videoRef: React.RefObject<HTMLVideoElement | null>
  canvasRef: React.RefObject<HTMLCanvasElement | null>
  start: () => void
  stop: () => void
}

// Eye Aspect Ratio calculation for blink detection
function calculateEAR(landmarks: any[], eyeIndices: number[]): number {
  const p1 = landmarks[eyeIndices[0]]
  const p2 = landmarks[eyeIndices[1]]
  const p3 = landmarks[eyeIndices[2]]
  const p4 = landmarks[eyeIndices[3]]
  const p5 = landmarks[eyeIndices[4]]
  const p6 = landmarks[eyeIndices[5]]

  const vertical1 = Math.sqrt((p2.x - p6.x) ** 2 + (p2.y - p6.y) ** 2)
  const vertical2 = Math.sqrt((p3.x - p5.x) ** 2 + (p3.y - p5.y) ** 2)
  const horizontal = Math.sqrt((p1.x - p4.x) ** 2 + (p1.y - p4.y) ** 2)

  return (vertical1 + vertical2) / (2.0 * horizontal)
}

export function useEyeTracking(onDoubleBlink?: () => void): UseEyeTrackingReturn {
  const [state, setState] = useState<EyeTrackingState>({
    isActive: false,
    isBlinking: false,
    gazeDirection: 'unknown',
    isFaceDetected: false,
    blinkCount: 0
  })

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const faceMeshRef = useRef<any>(null)
  const animFrameRef = useRef<number>(0)
  const streamRef = useRef<MediaStream | null>(null)
  const blinkTimerRef = useRef<number>(0)
  const blinkCountRef = useRef(0)
  const onDoubleBlinkRef = useRef(onDoubleBlink)
  onDoubleBlinkRef.current = onDoubleBlink

  // Right eye landmark indices for EAR
  const RIGHT_EYE = [33, 160, 158, 133, 153, 144]
  // Left eye landmark indices for EAR
  const LEFT_EYE = [362, 385, 387, 263, 373, 380]
  // Iris landmarks for gaze
  const LEFT_IRIS = [468, 469, 470, 471, 472]
  const RIGHT_IRIS = [473, 474, 475, 476, 477]

  const EAR_THRESHOLD = 0.2
  const DOUBLE_BLINK_WINDOW = 800 // ms

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

      const faceMeshModule = await import('@mediapipe/face_mesh')
      const { FaceMesh } = faceMeshModule
      const FACEMESH_TESSELATION = (faceMeshModule as any).FACEMESH_TESSELATION
      const FACEMESH_RIGHT_EYE = (faceMeshModule as any).FACEMESH_RIGHT_EYE
      const FACEMESH_LEFT_EYE = (faceMeshModule as any).FACEMESH_LEFT_EYE
      const FACEMESH_RIGHT_IRIS = (faceMeshModule as any).FACEMESH_RIGHT_IRIS
      const FACEMESH_LEFT_IRIS = (faceMeshModule as any).FACEMESH_LEFT_IRIS
      const { drawConnectors } = await import('@mediapipe/drawing_utils')

      const faceMesh = new FaceMesh({
        locateFile: (file: string) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
      })

      faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
      })

      let wasBlinking = false

      faceMesh.onResults((results: any) => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        canvas.width = videoRef.current?.videoWidth || 640
        canvas.height = videoRef.current?.videoHeight || 480
        ctx.clearRect(0, 0, canvas.width, canvas.height)

        if (videoRef.current) {
          ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height)
        }

        if (results.multiFaceLandmarks?.length > 0) {
          const landmarks = results.multiFaceLandmarks[0]

          // Draw face mesh (subtle)
          drawConnectors(ctx, landmarks, FACEMESH_TESSELATION, {
            color: 'rgba(0, 255, 0, 0.1)', lineWidth: 1
          })

          // Draw eye contours
          drawConnectors(ctx, landmarks, FACEMESH_RIGHT_EYE, {
            color: '#00FFFF', lineWidth: 2
          })
          drawConnectors(ctx, landmarks, FACEMESH_LEFT_EYE, {
            color: '#00FFFF', lineWidth: 2
          })

          // Draw iris
          if (landmarks.length > 475) {
            drawConnectors(ctx, landmarks, FACEMESH_RIGHT_IRIS, {
              color: '#FF00FF', lineWidth: 2
            })
            drawConnectors(ctx, landmarks, FACEMESH_LEFT_IRIS, {
              color: '#FF00FF', lineWidth: 2
            })
          }

          // Calculate EAR for blink detection
          const leftEAR = calculateEAR(landmarks, LEFT_EYE)
          const rightEAR = calculateEAR(landmarks, RIGHT_EYE)
          const avgEAR = (leftEAR + rightEAR) / 2
          const isBlinking = avgEAR < EAR_THRESHOLD

          // Detect blink events (transition from not-blinking to blinking)
          if (isBlinking && !wasBlinking) {
            const now = Date.now()
            blinkCountRef.current++

            if (now - blinkTimerRef.current < DOUBLE_BLINK_WINDOW && blinkCountRef.current >= 2) {
              // Double blink detected!
              onDoubleBlinkRef.current?.()
              blinkCountRef.current = 0
            }
            blinkTimerRef.current = now
          }
          wasBlinking = isBlinking

          // Reset blink counter after timeout
          if (Date.now() - blinkTimerRef.current > DOUBLE_BLINK_WINDOW) {
            blinkCountRef.current = 0
          }

          // Gaze direction from iris position
          let gazeDirection: 'left' | 'center' | 'right' = 'center'
          if (landmarks.length > 475) {
            const leftIrisCenter = landmarks[LEFT_IRIS[0]]
            const leftEyeLeft = landmarks[LEFT_EYE[0]]
            const leftEyeRight = landmarks[LEFT_EYE[3]]
            const eyeWidth = Math.abs(leftEyeRight.x - leftEyeLeft.x)
            const irisPos = (leftIrisCenter.x - leftEyeLeft.x) / eyeWidth

            if (irisPos < 0.35) gazeDirection = 'right' // mirrored
            else if (irisPos > 0.65) gazeDirection = 'left' // mirrored
          }

          // Draw status overlay
          ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
          ctx.fillRect(10, 10, 250, 80)
          ctx.fillStyle = '#00FF00'
          ctx.font = '16px Arial'
          ctx.fillText(`EAR: ${avgEAR.toFixed(3)}`, 20, 35)
          ctx.fillText(`Blink: ${isBlinking ? 'YES' : 'No'}`, 20, 55)
          ctx.fillText(`Gaze: ${gazeDirection}`, 20, 75)

          setState({
            isActive: true,
            isBlinking,
            gazeDirection,
            isFaceDetected: true,
            blinkCount: blinkCountRef.current
          })
        } else {
          setState(s => ({ ...s, isFaceDetected: false, gazeDirection: 'unknown' }))
        }
      })

      faceMeshRef.current = faceMesh
      setState(s => ({ ...s, isActive: true }))

      const processLoop = async () => {
        if (videoRef.current && videoRef.current.readyState >= 2) {
          await faceMesh.send({ image: videoRef.current })
        }
        animFrameRef.current = requestAnimationFrame(processLoop)
      }
      processLoop()

    } catch (error) {
      console.error('Failed to start eye tracking:', error)
    }
  }, [])

  const stop = useCallback(() => {
    cancelAnimationFrame(animFrameRef.current)
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    faceMeshRef.current?.close()
    faceMeshRef.current = null
    setState({
      isActive: false,
      isBlinking: false,
      gazeDirection: 'unknown',
      isFaceDetected: false,
      blinkCount: 0
    })
  }, [])

  useEffect(() => () => { stop() }, [stop])

  return { ...state, videoRef, canvasRef, start, stop }
}
