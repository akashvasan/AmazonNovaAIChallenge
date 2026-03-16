import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export type VoiceButtonState = 'idle' | 'recording' | 'processing'

interface Props {
  onAudioReady: (base64: string) => void
  disabled?:    boolean
  size?:        'sm' | 'md' | 'lg'
}

export default function VoiceButton({ onAudioReady, disabled = false, size = 'lg' }: Props) {
  const [state,       setState]       = useState<VoiceButtonState>('idle')
  const mediaRef      = useRef<MediaRecorder | null>(null)
  const chunksRef     = useRef<Blob[]>([])

  const sizeMap = {
    sm: { outer: 'w-14 h-14', icon: 28 },
    md: { outer: 'w-20 h-20', icon: 36 },
    lg: { outer: 'w-28 h-28', icon: 48 },
  }
  const { outer, icon: iconSize } = sizeMap[size]

  const startRecording = useCallback(async () => {
    if (disabled || state !== 'idle') return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      chunksRef.current = []
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      mr.onstop = () => {
        stream.getTracks().forEach(t => t.stop())
        const blob   = new Blob(chunksRef.current, { type: 'audio/webm' })
        const reader = new FileReader()
        reader.onloadend = () => {
          const b64 = (reader.result as string).split(',')[1]
          onAudioReady(b64)
        }
        reader.readAsDataURL(blob)
      }
      mr.start()
      mediaRef.current = mr
      setState('recording')
    } catch (err) {
      console.error('Microphone access denied:', err)
    }
  }, [disabled, state, onAudioReady])

  const stopRecording = useCallback(() => {
    if (state !== 'recording') return
    mediaRef.current?.stop()
    mediaRef.current = null
    setState('processing')
    // processing state is cleared by parent when response arrives
  }, [state])

  // Allow parent to reset to idle
  const handleClick = () => {
    if (state === 'idle')      startRecording()
    else if (state === 'recording') stopRecording()
  }

  const isRecording   = state === 'recording'
  const isProcessing  = state === 'processing'
  const isIdle        = state === 'idle'

  return (
    <div className="relative flex items-center justify-center select-none">
      {/* Outer pulse ring — visible when recording */}
      <AnimatePresence>
        {isRecording && (
          <motion.span
            key="ring"
            className="absolute rounded-full border-2 border-red-400 opacity-60"
            initial={{ scale: 1, opacity: 0.6 }}
            animate={{ scale: 1.7, opacity: 0 }}
            exit={{}}
            transition={{ duration: 1.2, repeat: Infinity, ease: 'easeOut' }}
            style={{ width: '100%', height: '100%' }}
          />
        )}
      </AnimatePresence>

      {/* Second ring for double-pulse effect */}
      <AnimatePresence>
        {isRecording && (
          <motion.span
            key="ring2"
            className="absolute rounded-full border border-red-500 opacity-40"
            initial={{ scale: 1, opacity: 0.4 }}
            animate={{ scale: 2.2, opacity: 0 }}
            exit={{}}
            transition={{ duration: 1.2, repeat: Infinity, ease: 'easeOut', delay: 0.4 }}
            style={{ width: '100%', height: '100%' }}
          />
        )}
      </AnimatePresence>

      {/* Main button */}
      <motion.button
        className={`
          ${outer} rounded-full flex items-center justify-center
          relative z-10 cursor-pointer transition-colors duration-200
          focus:outline-none focus-visible:ring-2 focus-visible:ring-gold
          ${disabled || isProcessing
            ? 'opacity-50 cursor-not-allowed bg-surface-3'
            : isRecording
              ? 'bg-red-600 shadow-[0_0_30px_rgba(239,68,68,0.5)]'
              : 'bg-gradient-to-br from-gold to-amber-600 shadow-[0_0_30px_rgba(201,168,76,0.4)] hover:shadow-[0_0_40px_rgba(201,168,76,0.6)]'
          }
        `}
        onClick={handleClick}
        disabled={disabled || isProcessing}
        whileTap={!disabled && !isProcessing ? { scale: 0.93 } : {}}
        whileHover={!disabled && !isProcessing ? { scale: 1.05 } : {}}
      >
        {isProcessing ? (
          /* Spinner */
          <svg
            className="animate-spin text-white"
            width={iconSize} height={iconSize}
            viewBox="0 0 24 24" fill="none"
          >
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="60" strokeDashoffset="20" />
          </svg>
        ) : isRecording ? (
          /* Stop square */
          <svg width={iconSize * 0.55} height={iconSize * 0.55} viewBox="0 0 24 24" fill="white">
            <rect x="4" y="4" width="16" height="16" rx="2" />
          </svg>
        ) : (
          /* Mic icon */
          <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="white">
            <path d="M12 1a4 4 0 0 0-4 4v6a4 4 0 0 0 8 0V5a4 4 0 0 0-4-4z" />
            <path d="M19 10a1 1 0 0 0-2 0 5 5 0 0 1-10 0 1 1 0 0 0-2 0 7 7 0 0 0 6 6.93V19H9a1 1 0 0 0 0 2h6a1 1 0 0 0 0-2h-2v-2.07A7 7 0 0 0 19 10z" />
          </svg>
        )}
      </motion.button>

      {/* Label */}
      <motion.p
        key={state}
        className="absolute -bottom-8 text-xs font-medium tracking-wide"
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ color: isRecording ? '#f87171' : isProcessing ? '#9ca3af' : '#c9a84c' }}
      >
        {isIdle ? 'tap to speak' : isRecording ? 'recording… tap to stop' : 'processing…'}
      </motion.p>
    </div>
  )
}

/** Expose a way for the parent to reset state after processing */
export function useVoiceButtonReset() {
  // Parents can use this to listen for when processing is done
}
