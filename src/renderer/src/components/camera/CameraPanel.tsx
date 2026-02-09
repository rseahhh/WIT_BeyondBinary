import { useEffect, useRef } from 'react'
import { Hand, Eye, Camera } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { DetectedSign } from '@/utils/signClassifier'

interface CameraPanelProps {
  mode: 'sign-language' | 'eye-tracking'
  // Sign language props
  signVideoRef: React.RefObject<HTMLVideoElement | null>
  signCanvasRef: React.RefObject<HTMLCanvasElement | null>
  isSignActive: boolean
  detectedSign: DetectedSign | null
  onStartSign: () => void
  onStopSign: () => void
  // Eye tracking props
  eyeVideoRef: React.RefObject<HTMLVideoElement | null>
  eyeCanvasRef: React.RefObject<HTMLCanvasElement | null>
  isEyeActive: boolean
  isFaceDetected: boolean
  gazeDirection: string
  isBlinking: boolean
  onStartEye: () => void
  onStopEye: () => void
}

export function CameraPanel({
  mode,
  signVideoRef,
  signCanvasRef,
  isSignActive,
  detectedSign,
  onStartSign,
  onStopSign,
  eyeVideoRef,
  eyeCanvasRef,
  isEyeActive,
  isFaceDetected,
  gazeDirection,
  isBlinking,
  onStartEye,
  onStopEye
}: CameraPanelProps) {
  const isActive = mode === 'sign-language' ? isSignActive : isEyeActive

  return (
    <div className="flex flex-col h-full p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          {mode === 'sign-language' ? (
            <><Hand className="w-5 h-5" /> Sign Language Recognition</>
          ) : (
            <><Eye className="w-5 h-5" /> Eye Tracking</>
          )}
        </h2>
        <Button
          variant={isActive ? 'destructive' : 'default'}
          size="sm"
          onClick={() => {
            if (mode === 'sign-language') {
              isSignActive ? onStopSign() : onStartSign()
            } else {
              isEyeActive ? onStopEye() : onStartEye()
            }
          }}
        >
          <Camera className="w-4 h-4 mr-1" />
          {isActive ? 'Stop Camera' : 'Start Camera'}
        </Button>
      </div>

      {/* Camera View */}
      <div className="flex-1 relative bg-black rounded-lg overflow-hidden">
        {!isActive && (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <Camera className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">Camera is off</p>
              <p className="text-xs mt-1">Click "Start Camera" or say "show camera"</p>
            </div>
          </div>
        )}

        {mode === 'sign-language' ? (
          <>
            <video ref={signVideoRef as any} className="hidden" playsInline />
            <canvas ref={signCanvasRef as any} className="w-full h-full object-contain" />
          </>
        ) : (
          <>
            <video ref={eyeVideoRef as any} className="hidden" playsInline />
            <canvas ref={eyeCanvasRef as any} className="w-full h-full object-contain" />
          </>
        )}
      </div>

      {/* Status Cards */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        {mode === 'sign-language' ? (
          <>
            <Card>
              <CardHeader className="p-3">
                <CardTitle className="text-sm">Detected Sign</CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                <p className="text-2xl font-bold text-primary">
                  {detectedSign?.sign || '--'}
                </p>
                {detectedSign && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {detectedSign.dialect} | {Math.round(detectedSign.confidence * 100)}% confidence
                  </p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="p-3">
                <CardTitle className="text-sm">Dialect</CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                <p className="text-lg font-semibold">
                  {detectedSign?.dialect || 'ASL / ISL'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Multi-dialect support
                </p>
              </CardContent>
            </Card>
          </>
        ) : (
          <>
            <Card>
              <CardHeader className="p-3">
                <CardTitle className="text-sm">Gaze Direction</CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                <p className="text-2xl font-bold text-primary capitalize">
                  {isFaceDetected ? gazeDirection : '--'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {isFaceDetected ? 'Face detected' : 'No face detected'}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="p-3">
                <CardTitle className="text-sm">Blink Status</CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                <p className={`text-2xl font-bold ${isBlinking ? 'text-primary' : 'text-muted-foreground'}`}>
                  {isBlinking ? 'BLINK!' : 'Open'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Double-blink to click
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  )
}
