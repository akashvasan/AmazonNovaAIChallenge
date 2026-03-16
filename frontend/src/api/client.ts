import axios from 'axios'
import type {
  SessionStartResponse,
  VoiceInputRequest,
  VoiceInputResponse,
  PlanRequest,
  PlanResponse,
  FeedbackRequest,
  FeedbackResponse,
  BookingRequest,
  BookingResponse,
  TripBudgetTier,
  FlightOption,
  HotelOption,
  TripIntent,
} from '../types'
import { getMockResponse } from './mock'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
const USE_MOCK  = import.meta.env.VITE_USE_MOCK === 'true'

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

// ── Session ───────────────────────────────────────────────────────────────────

export async function startSession(): Promise<SessionStartResponse> {
  if (USE_MOCK) return getMockResponse('startSession')
  const { data } = await api.post<SessionStartResponse>('/session/start')
  return data
}

// ── Voice ─────────────────────────────────────────────────────────────────────

export async function sendVoiceInput(
  session_id: string,
  audio_base64: string,
): Promise<VoiceInputResponse> {
  if (USE_MOCK) return getMockResponse('sendVoiceInput')
  const body: VoiceInputRequest = { session_id, audio_base64 }
  const { data } = await api.post<VoiceInputResponse>('/voice/input', body)
  return data
}

// ── Plan ──────────────────────────────────────────────────────────────────────

export async function planTrip(
  session_id: string,
  intent: TripIntent,
): Promise<PlanResponse> {
  if (USE_MOCK) return getMockResponse('planTrip')
  const body: PlanRequest = { session_id, intent }
  const { data } = await api.post<PlanResponse>('/plan', body)
  return data
}

// ── Feedback ──────────────────────────────────────────────────────────────────

export async function sendFeedback(
  session_id: string,
  feedback: Omit<FeedbackRequest, 'session_id'>,
): Promise<FeedbackResponse> {
  if (USE_MOCK) return getMockResponse('sendFeedback')
  const body: FeedbackRequest = { session_id, ...feedback }
  const { data } = await api.post<FeedbackResponse>('/feedback', body)
  return data
}

// ── Book ──────────────────────────────────────────────────────────────────────

export async function bookTrip(
  session_id: string,
  itinerary_tier: TripBudgetTier,
  flight: FlightOption,
  hotel: HotelOption,
): Promise<BookingResponse> {
  if (USE_MOCK) return getMockResponse('bookTrip')
  const body: BookingRequest = { session_id, itinerary_tier, flight, hotel }
  const { data } = await api.post<BookingResponse>('/book', body)
  return data
}

// ── TTS Synthesis ─────────────────────────────────────────────────────────────

export async function synthesizeVoice(
  session_id: string,
  text: string,
): Promise<{ audio_base64: string }> {
  if (USE_MOCK) return getMockResponse('synthesizeVoice')
  const { data } = await api.post<{ audio_base64: string }>(
    `/session/${session_id}/synthesize`,
    null,
    { params: { text } },
  )
  return data
}

// ── Debug ─────────────────────────────────────────────────────────────────────

export async function getMemory(session_id: string): Promise<unknown> {
  const { data } = await api.get(`/session/${session_id}/memory`)
  return data
}
