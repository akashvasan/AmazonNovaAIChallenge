/**
 * Mock responses matching exact backend schemas.
 * Toggle with VITE_USE_MOCK=true
 */
import type {
  SessionStartResponse,
  VoiceInputResponse,
  PlanResponse,
  FeedbackResponse,
  BookingResponse,
  Itinerary,
  FlightOption,
  HotelOption,
  DayPlan,
  EventOption,
  FreePlace,
} from '../types'

// ── Shared mock data ──────────────────────────────────────────────────────────

const mockFlight: FlightOption = {
  airline:        'American Airlines',
  flight_number:  'AA 1247',
  origin:         'JFK',
  destination:    'MIA',
  departure_time: '07:30',
  arrival_time:   '10:45',
  duration:       '3h 15m',
  price_usd:      189,
  booking_url:    'https://aa.com',
}

const mockHotelBudget: HotelOption = {
  name:                'Miami Downtown Inn',
  address:             '200 SE 2nd Ave, Miami, FL',
  star_rating:         3,
  price_per_night_usd: 95,
  total_price_usd:     285,
  amenities:           ['WiFi', 'Pool', 'Gym'],
  image_url:           undefined,
  booking_url:         'https://booking.com',
}

const mockHotelPremium: HotelOption = {
  name:                'The Setai Miami Beach',
  address:             '2001 Collins Ave, Miami Beach, FL',
  star_rating:         5,
  price_per_night_usd: 420,
  total_price_usd:     1260,
  amenities:           ['Beachfront', 'Spa', 'Pool', 'Concierge', 'Fine Dining'],
  image_url:           undefined,
  booking_url:         'https://thesetaihotel.com',
}

const mockEvents: EventOption[] = [
  {
    name:        'Ultra Music Festival',
    category:    'festival',
    date:        '2026-04-26',
    time:        '14:00',
    venue:       'Bayfront Park',
    address:     '301 Biscayne Blvd, Miami, FL',
    price_usd:   125,
    is_free:     false,
    booking_url: 'https://ultramusicfestival.com',
  },
  {
    name:        'Miami Heat vs Celtics',
    category:    'sports',
    date:        '2026-04-25',
    time:        '19:30',
    venue:       'Kaseya Center',
    address:     '601 Biscayne Blvd, Miami, FL',
    price_usd:   85,
    is_free:     false,
    booking_url: 'https://nba.com/heat',
  },
  {
    name:        'Wynwood Walls Art Walk',
    category:    'art',
    date:        '2026-04-24',
    time:        '18:00',
    venue:       'Wynwood Walls',
    address:     '2520 NW 2nd Ave, Miami, FL',
    price_usd:   15,
    is_free:     false,
    booking_url: 'https://thewynwoodwalls.com',
  },
]

const mockFreePlaces: FreePlace[] = [
  {
    name:        'South Beach',
    category:    'beach',
    address:     'Ocean Dr & Collins Ave, Miami Beach, FL',
    rating:      4.7,
    description: 'Iconic white sand beach with art deco backdrop.',
    maps_url:    'https://maps.google.com/?q=South+Beach+Miami',
  },
  {
    name:        'Wynwood Walls',
    category:    'landmark',
    address:     '2520 NW 2nd Ave, Miami, FL',
    rating:      4.6,
    description: 'World-famous outdoor street art museum.',
    maps_url:    'https://maps.google.com/?q=Wynwood+Walls',
  },
  {
    name:        'Everglades National Park',
    category:    'park',
    address:     '40001 SR-9336, Homestead, FL',
    rating:      4.8,
    description: 'UNESCO World Heritage Site — alligators and mangroves.',
    maps_url:    'https://maps.google.com/?q=Everglades+National+Park',
  },
  {
    name:        'Bayside Marketplace',
    category:    'landmark',
    address:     '401 Biscayne Blvd, Miami, FL',
    rating:      4.3,
    description: 'Waterfront marketplace with live music and dining.',
    maps_url:    'https://maps.google.com/?q=Bayside+Marketplace+Miami',
  },
]

const mockDays: DayPlan[] = [
  {
    day_number:    1,
    date:          '2026-04-24',
    day_total_usd: 95,
    slots: [
      { time_of_day: 'morning',   activity_type: 'travel',     title: 'Fly JFK → MIA',           cost_usd: 0,   description: 'American Airlines AA 1247, depart 07:30' },
      { time_of_day: 'afternoon', activity_type: 'free_place', title: 'South Beach',              cost_usd: 0,   location: 'Ocean Dr, Miami Beach', description: 'Settle in, take a walk on the iconic beach' },
      { time_of_day: 'afternoon', activity_type: 'meal',       title: 'Lunch at Zak the Baker',   cost_usd: 20,  location: 'Wynwood', description: 'Artisan sandwiches and pastries' },
      { time_of_day: 'evening',   activity_type: 'event',      title: 'Wynwood Art Walk',         cost_usd: 15,  location: 'Wynwood Walls', booking_url: 'https://thewynwoodwalls.com' },
      { time_of_day: 'evening',   activity_type: 'meal',       title: 'Dinner at KYU Miami',      cost_usd: 60,  location: 'Wynwood', description: 'Asian-inspired wood-fired cuisine' },
    ],
  },
  {
    day_number:    2,
    date:          '2026-04-25',
    day_total_usd: 165,
    slots: [
      { time_of_day: 'morning',   activity_type: 'meal',       title: 'Breakfast at hotel',       cost_usd: 0,   description: 'Included with stay' },
      { time_of_day: 'morning',   activity_type: 'free_place', title: 'Everglades Airboat Tour',  cost_usd: 45,  location: 'Everglades NP', description: 'Half-day guided tour through the wetlands' },
      { time_of_day: 'afternoon', activity_type: 'meal',       title: 'Lunch at Mandolin Aegean', cost_usd: 35,  location: 'Miami Design District', description: 'Fresh Greek & Turkish cuisine' },
      { time_of_day: 'afternoon', activity_type: 'free_place', title: 'Bayside Marketplace',      cost_usd: 0,   location: 'Downtown Miami' },
      { time_of_day: 'evening',   activity_type: 'event',      title: 'Miami Heat Game',          cost_usd: 85,  location: 'Kaseya Center', booking_url: 'https://nba.com/heat' },
    ],
  },
  {
    day_number:    3,
    date:          '2026-04-26',
    day_total_usd: 145,
    slots: [
      { time_of_day: 'morning',   activity_type: 'meal',       title: 'Brunch at Versailles',     cost_usd: 30,  location: 'Little Havana', description: 'Classic Cuban cuisine and coffee' },
      { time_of_day: 'afternoon', activity_type: 'event',      title: 'Ultra Music Festival',     cost_usd: 125, location: 'Bayfront Park', booking_url: 'https://ultramusicfestival.com' },
      { time_of_day: 'evening',   activity_type: 'travel',     title: 'Depart MIA → JFK',         cost_usd: 0,   description: 'Check out and head to airport' },
    ],
  },
]

// ── Mock itineraries ──────────────────────────────────────────────────────────

const mockItineraryBudget: Itinerary = {
  tier:                'budget',
  title:               'Miami Getaway · Apr 24–26 (Budget)',
  flight:              mockFlight,
  hotel:               mockHotelBudget,
  days:                mockDays,
  events:              mockEvents,
  free_places:         mockFreePlaces,
  estimated_total_usd: 758,
  budget_usd:          1500,
}

const mockItineraryPremium: Itinerary = {
  tier:                'premium',
  title:               'Miami Getaway · Apr 24–26 (Premium)',
  flight:              { ...mockFlight, airline: 'Delta', flight_number: 'DL 302', price_usd: 320 },
  hotel:               mockHotelPremium,
  days:                mockDays,
  events:              mockEvents,
  free_places:         mockFreePlaces,
  estimated_total_usd: 2100,
  budget_usd:          3000,
}

// ── Mock response map ─────────────────────────────────────────────────────────

type MockKey =
  | 'startSession'
  | 'sendVoiceInput'
  | 'planTrip'
  | 'sendFeedback'
  | 'bookTrip'
  | 'synthesizeVoice'

const delay = (ms: number) => new Promise(r => setTimeout(r, ms))

export async function getMockResponse(key: MockKey): Promise<any> {
  await delay(800 + Math.random() * 600)

  switch (key) {
    case 'startSession':
      return {
        session_id: 'mock-session-' + Math.random().toString(36).slice(2, 8),
        message:    'Session started. Ready for voice input.',
      } satisfies SessionStartResponse

    case 'sendVoiceInput':
      return {
        session_id: 'mock-session',
        transcript: 'I want to plan a 3-day trip to Miami in late April with a $1500 budget.',
        intent: {
          destination:    'Miami',
          origin:         'New York',
          departure_date: '2026-04-24',
          return_date:    '2026-04-26',
          duration_days:  3,
          budget_usd:     1500,
          num_travelers:  1,
          preferences: {
            dietary_restrictions: [],
            disliked_cuisines:    [],
            preferred_cuisines:   [],
            flight_time:          'morning',
            hotel_preferences:    [],
            accessibility_needs:  [],
          },
        },
        feedback: undefined,
      } satisfies VoiceInputResponse

    case 'planTrip':
      await delay(1200) // simulate parallel agents
      return {
        session_id:    'mock-session',
        itineraries:   [mockItineraryBudget, mockItineraryPremium],
        voice_summary: "Great news! I found two itineraries for your Miami trip — a budget option at $758 and a premium option at $2100. Both include flights, hotels, and a packed schedule with the Ultra Music Festival, a Miami Heat game, and the Wynwood Art Walk.",
      } satisfies PlanResponse

    case 'sendFeedback':
      return {
        session_id:    'mock-session',
        itineraries:   [mockItineraryBudget, mockItineraryPremium],
        voice_summary: "Got it! I've updated your itinerary based on your preferences.",
        changes_made:  ['Updated restaurant recommendations.'],
      } satisfies FeedbackResponse

    case 'bookTrip':
      await delay(2000)
      return {
        session_id: 'mock-session',
        result: {
          success:              true,
          flight_confirmation:  'AA-' + Math.random().toString(36).slice(2, 8).toUpperCase(),
          hotel_confirmation:   'HTL-' + Math.random().toString(36).slice(2, 8).toUpperCase(),
          error_message:        undefined,
        },
        voice_summary: "You're all set! Your flights and hotel are confirmed. Have an amazing trip to Miami!",
      } satisfies BookingResponse

    case 'synthesizeVoice':
      return { audio_base64: '' } // no audio in mock

    default:
      throw new Error(`Unknown mock key: ${key}`)
  }
}
