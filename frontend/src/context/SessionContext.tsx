import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react'
import type {
  AppStage,
  TripBudgetTier,
  UserPreferences,
  Itinerary,
  TripIntent,
  AgentName,
  AgentStatus,
} from '../types'
import { startSession } from '../api/client'

// ── Types ─────────────────────────────────────────────────────────────────────

interface AgentStatuses {
  flight_agent: AgentStatus
  hotel_agent:  AgentStatus
  events_agent: AgentStatus
  food_agent:   AgentStatus
}

interface SessionContextValue {
  // Core state
  sessionId:          string | null
  sessionLoading:     boolean
  sessionError:       boolean
  retrySession:       () => void
  appStage:           AppStage
  setAppStage:        (s: AppStage) => void

  // Trip data
  currentItineraries: Itinerary[]
  setItineraries:     (i: Itinerary[]) => void
  selectedTier:       TripBudgetTier
  setSelectedTier:    (t: TripBudgetTier) => void
  currentIntent:      TripIntent | null
  setCurrentIntent:   (i: TripIntent | null) => void

  // Preferences (live-updated on feedback)
  preferences:       UserPreferences
  setPreferences:    (p: UserPreferences) => void

  // Agent status board
  agentStatuses:     AgentStatuses
  setAgentStatus:    (agent: AgentName, status: AgentStatus) => void
  resetAgentStatuses: () => void

  // Voice summary
  voiceSummary:      string
  setVoiceSummary:   (s: string) => void
}

// ── Default values ────────────────────────────────────────────────────────────

const defaultPrefs: UserPreferences = {
  dietary_restrictions: [],
  disliked_cuisines:    [],
  preferred_cuisines:   [],
  flight_time:          null,
  hotel_preferences:    [],
  accessibility_needs:  [],
}

const defaultAgentStatuses: AgentStatuses = {
  flight_agent: 'idle',
  hotel_agent:  'idle',
  events_agent: 'idle',
  food_agent:   'idle',
}

// ── Context ───────────────────────────────────────────────────────────────────

const SessionContext = createContext<SessionContextValue | null>(null)

export function SessionProvider({ children }: { children: ReactNode }) {
  const [sessionId,          setSessionId]          = useState<string | null>(null)
  const [sessionLoading,     setSessionLoading]     = useState(true)
  const [sessionError,       setSessionError]       = useState(false)
  const [appStage,           setAppStage]           = useState<AppStage>('idle')
  const [currentItineraries, setItineraries]        = useState<Itinerary[]>([])
  const [selectedTier,       setSelectedTier]       = useState<TripBudgetTier>('budget')
  const [currentIntent,      setCurrentIntent]      = useState<TripIntent | null>(null)
  const [preferences,        setPreferences]        = useState<UserPreferences>(defaultPrefs)
  const [agentStatuses,      setAgentStatuses]      = useState<AgentStatuses>(defaultAgentStatuses)
  const [voiceSummary,       setVoiceSummary]       = useState('')

  const doStartSession = useCallback(() => {
    setSessionLoading(true)
    setSessionError(false)
    startSession()
      .then(res => {
        setSessionId(res.session_id)
        setSessionLoading(false)
      })
      .catch(err => {
        console.error('Failed to start session:', err)
        setSessionError(true)
        setSessionLoading(false)
      })
  }, [])

  // Start session on mount
  useEffect(() => { doStartSession() }, [])

  const setAgentStatus = useCallback((agent: AgentName, status: AgentStatus) => {
    setAgentStatuses(prev => ({ ...prev, [agent]: status }))
  }, [])

  const resetAgentStatuses = useCallback(() => {
    setAgentStatuses(defaultAgentStatuses)
  }, [])

  return (
    <SessionContext.Provider
      value={{
        sessionId,
        sessionLoading,
        sessionError,
        retrySession: doStartSession,
        appStage,
        setAppStage,
        currentItineraries,
        setItineraries,
        selectedTier,
        setSelectedTier,
        currentIntent,
        setCurrentIntent,
        preferences,
        setPreferences,
        agentStatuses,
        setAgentStatus,
        resetAgentStatuses,
        voiceSummary,
        setVoiceSummary,
      }}
    >
      {children}
    </SessionContext.Provider>
  )
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSession must be used within SessionProvider')
  return ctx
}
