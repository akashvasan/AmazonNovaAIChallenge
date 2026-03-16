import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSession } from '../context/SessionContext'
import { sendVoiceInput, planTrip, bookTrip, synthesizeVoice } from '../api/client'
import type { Itinerary, TripBudgetTier } from '../types'

import VoiceButton        from '../components/VoiceButton'
import AgentStatusBoard   from '../components/AgentStatusBoard'
import FlightCard         from '../components/FlightCard'
import HotelCard          from '../components/HotelCard'
import ItineraryCard      from '../components/ItineraryCard'
import PreferenceMemoryDrawer from '../components/PreferenceMemoryDrawer'
import FeedbackBar        from '../components/FeedbackBar'
import AudioPlayer        from '../components/AudioPlayer'
import BookingResultRow   from '../components/BookingResultRow'
import type { BookingResult } from '../types'

// ─── Stage: IDLE / LISTENING ─────────────────────────────────────────────────

function IdleScreen() {
  const {
    sessionId, setAppStage,
    setCurrentIntent, setItineraries,
    setAgentStatus, resetAgentStatuses,
    setVoiceSummary, setPreferences, preferences,
  } = useSession()

  const [transcript, setTranscript] = useState('')
  const [error,      setError]      = useState('')

  const handleAudioReady = async (base64: string) => {
    if (!sessionId) return
    setError('')

    try {
      // Step 1: transcribe + route
      const voiceRes = await sendVoiceInput(sessionId, base64)
      setTranscript(voiceRes.transcript)

      if (voiceRes.intent) {
        // Step 2a: intent flow → run /plan
        setCurrentIntent(voiceRes.intent)
        if (voiceRes.intent.preferences) {
          setPreferences({ ...preferences, ...voiceRes.intent.preferences })
        }
        setAppStage('planning')
        resetAgentStatuses()

        // Animate agents as running
        const agents = ['flight_agent', 'hotel_agent', 'events_agent', 'food_agent'] as const
        agents.forEach(a => setAgentStatus(a, 'running'))

        const planRes = await planTrip(sessionId, voiceRes.intent)

        // Mark all done sequentially for visual effect
        for (const a of agents) {
          setAgentStatus(a, 'done')
          await new Promise(r => setTimeout(r, 150))
        }

        setItineraries(planRes.itineraries)
        setVoiceSummary(planRes.voice_summary)

        // Synthesize voice summary
        try {
          await synthesizeVoice(sessionId, planRes.voice_summary)
        } catch (_) {}

        setAppStage('itinerary')
      } else {
        setError('Could not understand the trip. Try again: "I want to go to Paris for 5 days in June."')
        setAppStage('idle')
      }
    } catch (err: any) {
      console.error(err)
      setError(err?.message || 'Something went wrong. Please try again.')
      setAppStage('idle')
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-12"
      >
        <div className="flex items-center justify-center gap-3 mb-4">
          <span className="text-4xl">✈️</span>
          <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-tight">
            Nova <span className="text-gold">Travel</span>
          </h1>
        </div>
        <p className="text-gray-400 text-lg max-w-md leading-relaxed">
          Your AI-powered travel planner. Just speak your destination and I'll handle the rest.
        </p>
      </motion.div>

      {/* Voice button */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
        className="mb-16"
      >
        <VoiceButton onAudioReady={handleAudioReady} size="lg" />
      </motion.div>

      {/* Transcript */}
      <AnimatePresence>
        {transcript && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="max-w-md bg-surface-2 border border-surface-3 rounded-xl px-5 py-3 mb-4"
          >
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">You said</p>
            <p className="text-white text-sm leading-relaxed">"{transcript}"</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="max-w-md bg-red-900/20 border border-red-800 rounded-xl px-5 py-3"
          >
            <p className="text-red-300 text-sm">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Example prompts */}
      {!transcript && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-8 flex flex-wrap justify-center gap-2"
        >
          {[
            '"Plan a 3-day Miami trip in April"',
            '"Weekend in Paris, budget $2000"',
            '"5 days in Tokyo for two people"',
          ].map(hint => (
            <span
              key={hint}
              className="text-xs text-gray-600 bg-surface-2 border border-surface-3 rounded-full px-3 py-1.5"
            >
              {hint}
            </span>
          ))}
        </motion.div>
      )}
    </div>
  )
}

// ─── Stage: PLANNING ──────────────────────────────────────────────────────────

function PlanningScreen() {
  const { agentStatuses } = useSession()

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl"
      >
        <div className="text-center mb-8">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
            className="w-12 h-12 mx-auto mb-4 border-2 border-surface-3 border-t-gold rounded-full"
          />
          <h2 className="text-xl font-bold text-white mb-2">Building your itinerary</h2>
          <p className="text-gray-500 text-sm">Running 4 AI agents in parallel…</p>
        </div>

        <AgentStatusBoard statuses={agentStatuses} />
      </motion.div>
    </div>
  )
}

// ─── Stage: ITINERARY ─────────────────────────────────────────────────────────

function ItineraryScreen() {
  const {
    sessionId,
    currentItineraries,
    setItineraries,
    selectedTier,
    setSelectedTier,
    agentStatuses,
    preferences,
    voiceSummary,
    setVoiceSummary,
    setAppStage,
  } = useSession()

  const [audioBase64,  setAudioBase64]  = useState('')
  const [bookingLoading, setBookingLoading] = useState(false)

  const itinerary: Itinerary | undefined = currentItineraries.find(i => i.tier === selectedTier)
    ?? currentItineraries[0]

  const hasBothTiers = currentItineraries.length > 1

  const handleBook = async () => {
    if (!sessionId || !itinerary) return
    setBookingLoading(true)
    setAppStage('booking')
  }

  const handleFeedbackUpdate = (newItineraries: Itinerary[], summary: string) => {
    setItineraries(newItineraries)
    setVoiceSummary(summary)
    // Try to get audio
    if (sessionId && summary) {
      synthesizeVoice(sessionId, summary)
        .then(r => setAudioBase64(r.audio_base64))
        .catch(() => {})
    }
  }

  const handleSpeakSummary = async () => {
    if (!sessionId || !voiceSummary) return
    try {
      const r = await synthesizeVoice(sessionId, voiceSummary)
      setAudioBase64(r.audio_base64)
    } catch (_) {}
  }

  if (!itinerary) return null

  const nights = itinerary.days.length

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-surface/95 border-b border-surface-3 backdrop-blur-sm px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <h2 className="font-bold text-white text-sm">{itinerary.title}</h2>
            <p className="text-xs text-gray-500">
              Est. total: <span className="text-gold font-semibold">${itinerary.estimated_total_usd.toLocaleString()}</span>
              <span className="mx-1">·</span>
              Budget: ${itinerary.budget_usd.toLocaleString()}
            </p>
          </div>

          {/* Tier toggle */}
          {hasBothTiers && (
            <div className="flex rounded-lg overflow-hidden border border-surface-3">
              {(['budget', 'premium'] as TripBudgetTier[]).map(tier => (
                <button
                  key={tier}
                  onClick={() => setSelectedTier(tier)}
                  className={`px-3 py-1.5 text-xs font-medium capitalize transition-colors
                    ${selectedTier === tier
                      ? 'bg-gold text-navy'
                      : 'bg-surface-2 text-gray-400 hover:text-white'
                    }
                  `}
                >
                  {tier}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Voice summary + audio */}
        {voiceSummary && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-surface-2 border border-surface-3 rounded-xl p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-gray-300 text-sm leading-relaxed flex-1">"{voiceSummary}"</p>
              <button
                onClick={handleSpeakSummary}
                className="flex-shrink-0 w-8 h-8 rounded-full bg-surface-3 hover:bg-navy-light flex items-center justify-center transition-colors"
                title="Play voice summary"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#c9a84c" strokeWidth="2">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>
                </svg>
              </button>
            </div>
            {audioBase64 && (
              <div className="mt-3">
                <AudioPlayer audio_base64={audioBase64} onEnded={() => setAudioBase64('')} />
              </div>
            )}
          </motion.div>
        )}

        {/* Agent status (shows re-runs on feedback) */}
        {Object.values(agentStatuses).some(s => s === 'running') && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <AgentStatusBoard
              statuses={agentStatuses}
              activeAgents={
                (Object.entries(agentStatuses) as [any, string][])
                  .filter(([, s]) => s === 'running')
                  .map(([k]) => k)
              }
            />
          </motion.div>
        )}

        {/* Flight + Hotel */}
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">✈️ Your Flight</p>
          <FlightCard flight={itinerary.flight} />
        </div>

        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">🏨 Your Hotel</p>
          <HotelCard hotel={itinerary.hotel} nights={nights} />
        </div>

        {/* Day-by-day */}
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">📅 Day-by-Day</p>
          <div className="space-y-2">
            {itinerary.days.map((day, i) => (
              <ItineraryCard key={day.day_number} day={day} defaultOpen={i === 0} />
            ))}
          </div>
        </div>

        {/* Events snapshot */}
        {itinerary.events.length > 0 && (
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">🎟️ Events</p>
            <div className="space-y-2">
              {itinerary.events.map(evt => (
                <div
                  key={evt.name}
                  className="flex items-center justify-between bg-surface-2 border border-surface-3 rounded-xl px-4 py-3"
                >
                  <div>
                    <p className="text-white text-sm font-medium">{evt.name}</p>
                    <p className="text-xs text-gray-500">{evt.venue} · {evt.date}</p>
                  </div>
                  <div className="text-right flex-shrink-0 ml-3">
                    {evt.is_free ? (
                      <span className="text-xs text-emerald-400 font-medium">Free</span>
                    ) : (
                      <span className="text-sm text-gold font-semibold">${evt.price_usd}</span>
                    )}
                    {evt.booking_url && (
                      <a href={evt.booking_url} target="_blank" rel="noopener noreferrer"
                         className="block text-xs text-gold/70 hover:text-gold mt-0.5 transition-colors">
                        Tickets ↗
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Book Now CTA */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleBook}
          disabled={bookingLoading}
          className="
            w-full py-4 rounded-xl font-bold text-navy text-lg
            bg-gradient-to-r from-gold to-amber-500
            shadow-[0_4px_24px_rgba(201,168,76,0.4)]
            hover:shadow-[0_6px_32px_rgba(201,168,76,0.6)]
            transition-all duration-200
            disabled:opacity-60 disabled:cursor-not-allowed
          "
        >
          {bookingLoading ? 'Starting booking…' : `Book Now · $${itinerary.estimated_total_usd.toLocaleString()}`}
        </motion.button>
      </div>

      {/* Preference drawer */}
      <PreferenceMemoryDrawer preferences={preferences} />

      {/* Feedback bar */}
      <FeedbackBar onItinerariesUpdated={(its, summary) => handleFeedbackUpdate(its, summary)} />
    </div>
  )
}

// ─── Stage: BOOKING ───────────────────────────────────────────────────────────

function BookingScreen() {
  const {
    sessionId,
    currentItineraries,
    selectedTier,
    setAppStage,
    setVoiceSummary,
  } = useSession()

  const [bookingResult, setBookingResult] = useState<BookingResult | null>(null)
  const [audioBase64,   setAudioBase64]   = useState('')
  const [loading,       setLoading]       = useState(true)
  const [hasStarted,    setHasStarted]    = useState(false)

  const itinerary = currentItineraries.find(i => i.tier === selectedTier) ?? currentItineraries[0]

  // Trigger booking once on mount
  if (!hasStarted && sessionId && itinerary) {
    setHasStarted(true)
    bookTrip(sessionId, selectedTier, itinerary.flight, itinerary.hotel)
      .then(async res => {
        setBookingResult(res.result)
        setVoiceSummary(res.voice_summary)
        setLoading(false)
        setAppStage('done')

        // Auto-play confirmation audio
        try {
          const audio = await synthesizeVoice(sessionId, res.voice_summary)
          setAudioBase64(audio.audio_base64)
        } catch (_) {}
      })
      .catch(err => {
        console.error(err)
        setBookingResult({ success: false, error_message: 'Booking failed. Please try again.' })
        setLoading(false)
      })
  }

  if (!itinerary) return null

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6">
      <div className="w-full max-w-2xl">
        {loading ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              className="w-16 h-16 mx-auto mb-6 border-4 border-surface-3 border-t-gold rounded-full"
            />
            <h2 className="text-xl font-bold text-white mb-2">Nova Act is booking your trip</h2>
            <p className="text-gray-500 text-sm">Automating flight and hotel reservations…</p>
            <div className="mt-4 flex justify-center gap-1">
              {[0, 0.2, 0.4].map((delay, i) => (
                <motion.div
                  key={i}
                  className="w-2 h-2 bg-gold rounded-full"
                  animate={{ scale: [1, 1.4, 1], opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1, repeat: Infinity, delay }}
                />
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-white mb-2">
                {bookingResult?.success ? '🎉 You\'re all set!' : '⚠️ Booking Issue'}
              </h2>
            </div>

            {audioBase64 && (
              <div className="mb-6">
                <AudioPlayer
                  audio_base64={audioBase64}
                  label="Booking confirmation"
                  onEnded={() => setAudioBase64('')}
                />
              </div>
            )}

            {bookingResult && (
              <BookingResultRow result={bookingResult} itinerary={itinerary} />
            )}

            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              onClick={() => {
                setAppStage('itinerary')
                setBookingResult(null)
              }}
              className="mt-8 w-full py-3 rounded-xl border border-surface-3 text-gray-400 hover:text-white hover:border-gold/40 transition-all text-sm"
            >
              ← Back to itinerary
            </motion.button>
          </motion.div>
        )}
      </div>
    </div>
  )
}

// ─── PlannerPage ──────────────────────────────────────────────────────────────

export default function PlannerPage() {
  const { appStage } = useSession()

  return (
    <AnimatePresence mode="wait">
      {(appStage === 'idle' || appStage === 'listening') && (
        <motion.div key="idle" exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }}>
          <IdleScreen />
        </motion.div>
      )}

      {appStage === 'planning' && (
        <motion.div
          key="planning"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <PlanningScreen />
        </motion.div>
      )}

      {(appStage === 'itinerary') && (
        <motion.div
          key="itinerary"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
        >
          <ItineraryScreen />
        </motion.div>
      )}

      {(appStage === 'booking' || appStage === 'done') && (
        <motion.div
          key="booking"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <BookingScreen />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
