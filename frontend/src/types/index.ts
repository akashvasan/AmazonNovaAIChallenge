// ── Enums ────────────────────────────────────────────────────────────────────

export type TripBudgetTier = 'budget' | 'premium'

export type FeedbackType =
  | 'preference_update'
  | 'schedule_change'
  | 'budget_shift'
  | 'swap_request'
  | 'full_restart'

export type MealPeriod = 'breakfast' | 'lunch' | 'dinner'

// ── Session ──────────────────────────────────────────────────────────────────

export interface SessionStartResponse {
  session_id: string
  message: string
}

// ── User preferences ─────────────────────────────────────────────────────────

export interface UserPreferences {
  dietary_restrictions: string[]
  disliked_cuisines:    string[]
  preferred_cuisines:   string[]
  flight_time:          string | null    // "morning" | "afternoon" | "night"
  hotel_preferences:    string[]
  accessibility_needs:  string[]
}

// ── Trip intent ───────────────────────────────────────────────────────────────

export interface TripIntent {
  destination:     string
  origin?:         string
  departure_date?: string          // ISO 8601 "2026-04-24"
  return_date?:    string
  duration_days?:  number
  budget_usd?:     number
  num_travelers:   number
  preferences:     UserPreferences
}

// ── Flight ────────────────────────────────────────────────────────────────────

export interface FlightOption {
  airline:        string
  flight_number:  string
  origin:         string
  destination:    string
  departure_time: string
  arrival_time:   string
  duration:       string
  price_usd:      number
  booking_url:    string
}

// ── Hotel ─────────────────────────────────────────────────────────────────────

export interface HotelOption {
  name:                string
  address:             string
  star_rating:         number
  price_per_night_usd: number
  total_price_usd:     number
  amenities:           string[]
  image_url?:          string
  booking_url:         string
}

// ── Events ────────────────────────────────────────────────────────────────────

export interface EventOption {
  name:        string
  category:    string
  date:        string
  time?:       string
  venue:       string
  address:     string
  price_usd?:  number
  is_free:     boolean
  booking_url?: string
  image_url?:  string
}

// ── Food ──────────────────────────────────────────────────────────────────────

export interface RestaurantOption {
  name:          string
  cuisine:       string
  address:       string
  rating:        number
  price_range:   string           // "$" | "$$" | "$$$"
  meal_period:   MealPeriod
  avg_cost_usd?: number
  yelp_url?:     string
  image_url?:    string
}

// ── Free places ───────────────────────────────────────────────────────────────

export interface FreePlace {
  name:         string
  category:     string            // "beach" | "park" | "landmark"
  address:      string
  rating?:      number
  description?: string
  maps_url?:    string
  image_url?:   string
}

// ── Day plan ──────────────────────────────────────────────────────────────────

export interface DaySlot {
  time_of_day:   'morning' | 'afternoon' | 'evening'
  activity_type: 'meal' | 'event' | 'free_place' | 'travel'
  title:         string
  description?:  string
  location?:     string
  cost_usd:      number
  reference_id?: string
  booking_url?:  string
}

export interface DayPlan {
  day_number:    number
  date:          string
  slots:         DaySlot[]
  day_total_usd: number
}

// ── Itinerary ─────────────────────────────────────────────────────────────────

export interface Itinerary {
  tier:                 TripBudgetTier
  title:                string
  flight:               FlightOption
  hotel:                HotelOption
  days:                 DayPlan[]
  events:               EventOption[]
  free_places:          FreePlace[]
  estimated_total_usd:  number
  budget_usd:           number
}

// ── API Request / Response types ──────────────────────────────────────────────

export interface VoiceInputRequest {
  session_id:   string
  audio_base64: string
}

export interface VoiceInputResponse {
  session_id:  string
  transcript:  string
  intent?:     TripIntent
  feedback?:   FeedbackRequest
}

export interface PlanRequest {
  session_id: string
  intent:     TripIntent
}

export interface PlanResponse {
  session_id:    string
  itineraries:   Itinerary[]
  voice_summary: string
}

export interface FeedbackRequest {
  session_id:          string
  raw_text:            string
  feedback_type:       FeedbackType
  affected_agents:     string[]
  updated_preferences?: UserPreferences
}

export interface FeedbackResponse {
  session_id:    string
  itineraries:   Itinerary[]
  voice_summary: string
  changes_made:  string[]
}

export interface BookingRequest {
  session_id:     string
  itinerary_tier: TripBudgetTier
  flight:         FlightOption
  hotel:          HotelOption
}

export interface BookingResult {
  success:              boolean
  flight_confirmation?: string
  hotel_confirmation?:  string
  error_message?:       string
}

export interface BookingResponse {
  session_id:    string
  result:        BookingResult
  voice_summary: string
}

// ── App state types ────────────────────────────────────────────────────────────

export type AppStage =
  | 'idle'
  | 'listening'
  | 'planning'
  | 'itinerary'
  | 'booking'
  | 'done'

export type AgentName = 'flight_agent' | 'hotel_agent' | 'events_agent' | 'food_agent'
export type AgentStatus = 'idle' | 'running' | 'done' | 'error'
