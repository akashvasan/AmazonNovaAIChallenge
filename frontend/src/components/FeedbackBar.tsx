import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { FeedbackType, UserPreferences } from '../types'
import { sendVoiceInput, sendFeedback } from '../api/client'
import { useSession } from '../context/SessionContext'

interface Props {
  onItinerariesUpdated: (itineraries: any[], voiceSummary: string, changes: string[]) => void
}

/** Naive client-side feedback type inference from text */
function inferFeedbackType(text: string): FeedbackType {
  const lower = text.toLowerCase()
  if (lower.includes('restart') || lower.includes('different city') || lower.includes('instead'))
    return 'full_restart'
  if (lower.includes('cheaper') || lower.includes('budget') || lower.includes('expensive') || lower.includes('afford'))
    return 'budget_shift'
  if (lower.includes('morning') || lower.includes('afternoon') || lower.includes('night') || lower.includes('evening') || lower.includes('fly'))
    return 'schedule_change'
  if (lower.includes('swap') || lower.includes('replace') || lower.includes('change day'))
    return 'swap_request'
  return 'preference_update'
}

/** Infer which agents are affected from text */
function inferAffectedAgents(text: string): string[] {
  const lower    = text.toLowerCase()
  const agents   = []
  if (lower.includes('flight') || lower.includes('fly') || lower.includes('airline') || lower.includes('morning') || lower.includes('night'))
    agents.push('flight_agent')
  if (lower.includes('hotel') || lower.includes('stay') || lower.includes('room') || lower.includes('accommodation'))
    agents.push('hotel_agent')
  if (lower.includes('event') || lower.includes('concert') || lower.includes('festival') || lower.includes('show') || lower.includes('game'))
    agents.push('events_agent')
  if (lower.includes('food') || lower.includes('eat') || lower.includes('restaurant') || lower.includes('vegetarian') || lower.includes('seafood') || lower.includes('vegan') || lower.includes('cuisine'))
    agents.push('food_agent')
  // if nothing matched, assume all
  return agents.length > 0 ? agents : ['flight_agent', 'hotel_agent', 'events_agent', 'food_agent']
}

/** Infer preference updates from text */
function inferPreferenceUpdate(text: string): Partial<UserPreferences> {
  const lower = text.toLowerCase()
  const upd: Partial<UserPreferences> = {}

  if (lower.includes('vegetarian'))        upd.dietary_restrictions = ['vegetarian']
  else if (lower.includes('vegan'))        upd.dietary_restrictions = ['vegan']
  else if (lower.includes('no seafood') || lower.includes("don't like seafood"))
    upd.dietary_restrictions = ['no seafood']

  if (lower.includes('morning flight'))    upd.flight_time = 'morning'
  else if (lower.includes('night flight') || lower.includes('fly at night'))
    upd.flight_time = 'night'
  else if (lower.includes('afternoon flight'))
    upd.flight_time = 'afternoon'

  return upd
}

export default function FeedbackBar({ onItinerariesUpdated }: Props) {
  const { sessionId, setPreferences, preferences, setAgentStatus, resetAgentStatuses } = useSession()
  const [text,       setText]       = useState('')
  const [recording,  setRecording]  = useState(false)
  const [loading,    setLoading]    = useState(false)
  const [changes,    setChanges]    = useState<string[]>([])
  const mediaRef     = useRef<MediaRecorder | null>(null)
  const chunksRef    = useRef<Blob[]>([])

  const submitText = async (feedbackText: string) => {
    if (!sessionId || !feedbackText.trim() || loading) return
    setLoading(true)

    const feedback_type      = inferFeedbackType(feedbackText)
    const affected_agents    = inferAffectedAgents(feedbackText)
    const prefUpdate         = inferPreferenceUpdate(feedbackText)

    // Optimistically update preferences in context
    if (Object.keys(prefUpdate).length > 0) {
      setPreferences({ ...preferences, ...prefUpdate })
    }

    // Mark affected agents as running
    resetAgentStatuses()
    affected_agents.forEach(a => setAgentStatus(a as any, 'running'))

    try {
      const res = await sendFeedback(sessionId, {
        raw_text:             feedbackText,
        feedback_type,
        affected_agents,
        updated_preferences:  Object.keys(prefUpdate).length > 0
          ? { ...preferences, ...prefUpdate }
          : undefined,
      })

      // Mark done
      affected_agents.forEach(a => setAgentStatus(a as any, 'done'))
      setChanges(res.changes_made)
      onItinerariesUpdated(res.itineraries, res.voice_summary, res.changes_made)
      setText('')

      // Clear changes banner after 4s
      setTimeout(() => setChanges([]), 4000)
    } catch (err) {
      console.error('Feedback failed:', err)
      resetAgentStatuses()
    } finally {
      setLoading(false)
    }
  }

  const startVoice = async () => {
    if (recording) return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      chunksRef.current = []
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        setLoading(true)
        const blob   = new Blob(chunksRef.current, { type: 'audio/webm' })
        const reader = new FileReader()
        reader.onloadend = async () => {
          const b64 = (reader.result as string).split(',')[1]
          if (!sessionId) return
          const voiceRes = await sendVoiceInput(sessionId, b64)
          if (voiceRes.feedback) {
            await submitText(voiceRes.transcript)
          } else {
            setText(voiceRes.transcript)
            setLoading(false)
          }
        }
        reader.readAsDataURL(blob)
      }
      mr.start()
      mediaRef.current = mr
      setRecording(true)
    } catch (err) {
      console.error('Mic error:', err)
    }
  }

  const stopVoice = () => {
    mediaRef.current?.stop()
    mediaRef.current = null
    setRecording(false)
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30">
      {/* Changes banner */}
      <AnimatePresence>
        {changes.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="mx-auto max-w-2xl mb-2 px-4"
          >
            <div className="bg-forest/80 border border-forest-light rounded-lg px-3 py-2 text-xs text-emerald-300 flex items-center gap-2">
              <span>✅</span>
              <span>{changes.join(' · ')}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input bar */}
      <div className="bg-surface/95 border-t border-surface-3 backdrop-blur-sm px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center gap-2">
          {/* Voice button */}
          <button
            onClick={recording ? stopVoice : startVoice}
            disabled={loading}
            className={`
              w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0
              transition-all duration-200 focus:outline-none
              ${recording
                ? 'bg-red-600 animate-pulse shadow-[0_0_12px_rgba(239,68,68,0.5)]'
                : 'bg-surface-3 hover:bg-navy-light border border-surface-3'
              }
            `}
          >
            {recording ? (
              <svg width="14" height="14" viewBox="0 0 14 14" fill="white">
                <rect x="2" y="2" width="10" height="10" rx="1" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill={loading ? '#4b5563' : '#c9a84c'}>
                <path d="M12 1a4 4 0 0 0-4 4v6a4 4 0 0 0 8 0V5a4 4 0 0 0-4-4z" />
                <path d="M19 10a1 1 0 0 0-2 0 5 5 0 0 1-10 0 1 1 0 0 0-2 0 7 7 0 0 0 6 6.93V19H9a1 1 0 0 0 0 2h6a1 1 0 0 0 0-2h-2v-2.07A7 7 0 0 0 19 10z" />
              </svg>
            )}
          </button>

          {/* Text input */}
          <input
            type="text"
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') submitText(text) }}
            disabled={loading}
            placeholder={recording ? 'Listening…' : 'Refine your trip (e.g. "no seafood", "fly at night")'}
            className="
              flex-1 bg-surface-2 border border-surface-3 rounded-lg
              px-3 py-2 text-sm text-white placeholder:text-gray-600
              focus:outline-none focus:border-gold/50
              disabled:opacity-50
            "
          />

          {/* Send button */}
          <button
            onClick={() => submitText(text)}
            disabled={!text.trim() || loading}
            className="
              w-10 h-10 rounded-full bg-gold flex items-center justify-center flex-shrink-0
              hover:bg-gold-light transition-colors focus:outline-none
              disabled:opacity-40 disabled:cursor-not-allowed
            "
          >
            {loading ? (
              <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="9" stroke="white" strokeWidth="2.5" strokeDasharray="40" strokeDashoffset="10" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
