import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

interface Props {
  bookingId: string
}

const CONSENT_TEXT =
  'Your camera stays on your device. MediaPipe analyzes your facial signals locally — no video or landmarks are transmitted. Only three summary values (attention, focus, energy) are shared with your coach during this session and discarded when you leave.'

export default function LiveRead({ bookingId }: Props) {
  const [consented, setConsented] = useState(false)
  const [active, setActive] = useState(false)
  const [showConsent, setShowConsent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const landmarkerRef = useRef<any>(null)
  const animRef = useRef<number | null>(null)
  const channelRef = useRef<any>(null)

  async function start() {
    try {
      const { FaceLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision')
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
      )
      landmarkerRef.current = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
          delegate: 'GPU',
        },
        outputFaceBlendshapes: true,
        runningMode: 'VIDEO',
        numFaces: 1,
      })

      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }

      // Supabase Realtime channel to broadcast signals
      channelRef.current = supabase.channel(`live-read-${bookingId}`)
      await channelRef.current.subscribe()

      setActive(true)
      tick()
    } catch (err: any) {
      setError(err.message ?? 'Camera access failed')
    }
  }

  function tick() {
    const video = videoRef.current
    const lm = landmarkerRef.current
    if (!video || !lm || video.readyState < 2) {
      animRef.current = requestAnimationFrame(tick)
      return
    }

    const result = lm.detectForVideo(video, performance.now())
    const blendshapes = result?.faceBlendshapes?.[0]?.categories ?? []

    function score(name: string) {
      return blendshapes.find((c: any) => c.categoryName === name)?.score ?? 0
    }

    const blinkL = score('eyeBlinkLeft')
    const blinkR = score('eyeBlinkRight')
    const browDownL = score('browDownLeft')
    const browDownR = score('browDownRight')
    const smileL = score('mouthSmileLeft')
    const smileR = score('mouthSmileRight')
    const jawOpen = score('jawOpen')

    // Coarse signals — higher is more of that quality
    const attention = Math.round((1 - (blinkL + blinkR) / 2) * 100)
    const focus = Math.round(((browDownL + browDownR) / 2) * 100)
    const energy = Math.round(((smileL + smileR + jawOpen) / 3) * 100)

    channelRef.current?.send({
      type: 'broadcast',
      event: 'signal',
      payload: { attention, focus, energy },
    })

    // Sample at ~4fps — no need to hammer this
    setTimeout(() => { animRef.current = requestAnimationFrame(tick) }, 250)
  }

  function stop() {
    if (animRef.current) cancelAnimationFrame(animRef.current)
    streamRef.current?.getTracks().forEach((t) => t.stop())
    landmarkerRef.current?.close()
    channelRef.current?.send({
      type: 'broadcast',
      event: 'signal',
      payload: null, // null signals session ended
    })
    channelRef.current?.unsubscribe()
    setActive(false)
  }

  useEffect(() => () => stop(), [])

  return (
    <>
      {/* Hidden video for MediaPipe */}
      <video ref={videoRef} className="hidden" muted playsInline />

      {/* Floating pill in bottom-left of video area */}
      <div className="absolute bottom-4 left-4 z-10">
        {!active ? (
          <button
            onClick={() => setShowConsent(true)}
            className="text-xs px-3 py-2 rounded-full flex items-center gap-2 transition-colors"
            style={{ background: 'rgba(0,0,0,0.55)', border: '1px solid var(--w20)', color: 'var(--w60)' }}
          >
            <span className="w-2 h-2 rounded-full" style={{ background: 'var(--w40)' }} />
            Enable Live Read
          </button>
        ) : (
          <button
            onClick={stop}
            className="text-xs px-3 py-2 rounded-full flex items-center gap-2 transition-colors"
            style={{ background: 'rgba(232,25,44,0.15)', border: '1px solid rgba(232,25,44,0.4)', color: 'var(--red)' }}
          >
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--red)' }} />
            Live Read on — stop
          </button>
        )}
        {error && (
          <p className="text-xs mt-1" style={{ color: 'var(--red)' }}>{error}</p>
        )}
      </div>

      {/* Consent modal */}
      {showConsent && (
        <div className="absolute inset-0 z-20 flex items-center justify-center px-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="card max-w-sm w-full" style={{ background: 'var(--surface)' }}>
            <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--w45)' }}>
              Before you enable Live Read
            </p>
            <p className="text-sm leading-relaxed mb-6" style={{ color: 'var(--w60)' }}>
              {CONSENT_TEXT}
            </p>
            <div className="flex gap-3">
              <button
                className="btn-primary text-sm flex-1"
                onClick={() => { setShowConsent(false); setConsented(true); start() }}
              >
                Enable
              </button>
              <button
                className="btn-secondary text-sm flex-1"
                onClick={() => setShowConsent(false)}
              >
                Not now
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
