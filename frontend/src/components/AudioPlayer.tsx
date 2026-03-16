import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface Props {
  audio_base64: string   // base64-encoded audio, empty = no-op
  onEnded?:     () => void
  label?:       string
}

export default function AudioPlayer({ audio_base64, onEnded, label }: Props) {
  const audioRef  = useRef<HTMLAudioElement | null>(null)
  const blobRef   = useRef<string | null>(null)
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    if (!audio_base64) return

    // Revoke old blob URL
    if (blobRef.current) URL.revokeObjectURL(blobRef.current)

    try {
      const bytes  = atob(audio_base64)
      const arr    = new Uint8Array(bytes.length)
      for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i)
      const blob   = new Blob([arr], { type: 'audio/webm' })
      const url    = URL.createObjectURL(blob)
      blobRef.current = url

      const audio  = new Audio(url)
      audioRef.current = audio
      audio.onplay  = () => setPlaying(true)
      audio.onended = () => {
        setPlaying(false)
        onEnded?.()
      }
      audio.onerror = () => setPlaying(false)
      audio.play().catch(console.error)
    } catch (err) {
      // mock mode returns empty string — silently ignore
    }

    return () => {
      audioRef.current?.pause()
      if (blobRef.current) {
        URL.revokeObjectURL(blobRef.current)
        blobRef.current = null
      }
    }
  }, [audio_base64])

  if (!audio_base64) return null

  return (
    <AnimatePresence>
      {(playing || audio_base64) && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-surface-2 border border-surface-3"
        >
          {/* Waveform animation */}
          <div className="flex items-center gap-0.5 h-5">
            {[1, 2, 3, 4, 5].map(i => (
              <div
                key={i}
                className={`w-1 rounded-full bg-gold waveform-bar ${!playing ? 'opacity-30' : ''}`}
                style={{ height: '100%' }}
              />
            ))}
          </div>

          {/* Label */}
          <p className="text-sm text-gray-400 flex-1 leading-snug">
            {label ?? (playing ? 'Speaking…' : 'Ready')}
          </p>

          {/* Play / pause toggle */}
          <button
            onClick={() => {
              if (!audioRef.current) return
              if (playing) {
                audioRef.current.pause()
                setPlaying(false)
              } else {
                audioRef.current.play()
                setPlaying(true)
              }
            }}
            className="w-7 h-7 rounded-full bg-surface-3 hover:bg-navy-light flex items-center justify-center transition-colors"
          >
            {playing ? (
              <svg width="10" height="10" viewBox="0 0 10 10" fill="#c9a84c">
                <rect x="1" y="1" width="3" height="8" rx="1" />
                <rect x="6" y="1" width="3" height="8" rx="1" />
              </svg>
            ) : (
              <svg width="10" height="10" viewBox="0 0 10 10" fill="#c9a84c">
                <path d="M2 1.5l7 3.5-7 3.5V1.5z" />
              </svg>
            )}
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
