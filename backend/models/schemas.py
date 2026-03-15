from pydantic import BaseModel, Field
from typing import Optional
from enum import Enum


# ── Enums ────────────────────────────────────────────────────────────────────

class TripBudgetTier(str, Enum):
    budget  = "budget"
    premium = "premium"

class FeedbackType(str, Enum):
    preference_update = "preference_update"   # "I don't like seafood"
    schedule_change   = "schedule_change"     # "I want to fly at night"
    budget_shift      = "budget_shift"        # "Can we go cheaper?"
    swap_request      = "swap_request"        # "Replace Day 2 dinner"
    full_restart      = "full_restart"        # "Let's go to New York instead"

class MealPeriod(str, Enum):
    breakfast = "breakfast"
    lunch     = "lunch"
    dinner    = "dinner"


# ── Session ──────────────────────────────────────────────────────────────────

class SessionStartResponse(BaseModel):
    session_id: str
    message:    str = "Session started. Ready for voice input."


# ── User preferences (stored in memory) ─────────────────────────────────────

class UserPreferences(BaseModel):
    dietary_restrictions: list[str]  = Field(default_factory=list)   # ["no seafood", "vegetarian"]
    disliked_cuisines:    list[str]  = Field(default_factory=list)   # ["Thai", "Indian"]
    preferred_cuisines:   list[str]  = Field(default_factory=list)
    flight_time:          Optional[str] = None                        # "morning" | "afternoon" | "night"
    hotel_preferences:    list[str]  = Field(default_factory=list)   # ["pool", "beachfront"]
    accessibility_needs:  list[str]  = Field(default_factory=list)


# ── Trip intent (extracted by orchestrator) ──────────────────────────────────

class TripIntent(BaseModel):
    destination:    str
    origin:         Optional[str]      = None
    departure_date: Optional[str]      = None   # ISO 8601 e.g. "2026-04-24"
    return_date:    Optional[str]      = None
    duration_days:  Optional[int]      = None
    budget_usd:     Optional[float]    = None
    num_travelers:  int                = 1
    preferences:    UserPreferences    = Field(default_factory=UserPreferences)


# ── Flight ───────────────────────────────────────────────────────────────────

class FlightOption(BaseModel):
    airline:        str
    flight_number:  str
    origin:         str
    destination:    str
    departure_time: str
    arrival_time:   str
    duration:       str
    price_usd:      float
    booking_url:    str


# ── Hotel ────────────────────────────────────────────────────────────────────

class HotelOption(BaseModel):
    name:           str
    address:        str
    star_rating:    float
    price_per_night_usd: float
    total_price_usd: float
    amenities:      list[str] = Field(default_factory=list)
    image_url:      Optional[str] = None
    booking_url:    str


# ── Events ───────────────────────────────────────────────────────────────────

class EventOption(BaseModel):
    name:           str
    category:       str                   # "concert" | "festival" | "sports" etc.
    date:           str
    time:           Optional[str]         = None
    venue:          str
    address:        str
    price_usd:      Optional[float]       = None   # None = free
    is_free:        bool                  = False
    booking_url:    Optional[str]         = None   # None for free/no booking needed
    image_url:      Optional[str]         = None


# ── Food ─────────────────────────────────────────────────────────────────────

class RestaurantOption(BaseModel):
    name:           str
    cuisine:        str
    address:        str
    rating:         float
    price_range:    str                   # "$" | "$$" | "$$$"
    meal_period:    MealPeriod
    avg_cost_usd:   Optional[float]       = None
    yelp_url:       Optional[str]         = None
    image_url:      Optional[str]         = None


# ── Free places (parks, beaches, landmarks) ──────────────────────────────────

class FreePlace(BaseModel):
    name:           str
    category:       str                   # "beach" | "park" | "landmark"
    address:        str
    rating:         Optional[float]       = None
    description:    Optional[str]         = None
    maps_url:       Optional[str]         = None
    image_url:      Optional[str]         = None


# ── Day plan ─────────────────────────────────────────────────────────────────

class DaySlot(BaseModel):
    time_of_day:    str                   # "morning" | "afternoon" | "evening"
    activity_type:  str                   # "meal" | "event" | "free_place" | "travel"
    title:          str
    description:    Optional[str]         = None
    location:       Optional[str]         = None
    cost_usd:       float                 = 0.0
    reference_id:   Optional[str]         = None   # links back to event/restaurant/place id
    booking_url:    Optional[str]         = None

class DayPlan(BaseModel):
    day_number:     int
    date:           str
    slots:          list[DaySlot]         = Field(default_factory=list)
    day_total_usd:  float                 = 0.0


# ── Itinerary ─────────────────────────────────────────────────────────────────

class Itinerary(BaseModel):
    tier:               TripBudgetTier
    title:              str               # e.g. "Miami Getaway · Apr 24–27"
    flight:             FlightOption
    hotel:              HotelOption
    days:               list[DayPlan]     = Field(default_factory=list)
    events:             list[EventOption] = Field(default_factory=list)
    free_places:        list[FreePlace]   = Field(default_factory=list)
    estimated_total_usd: float            = 0.0
    budget_usd:         float             = 0.0


# ── Plan request / response ───────────────────────────────────────────────────

class PlanRequest(BaseModel):
    session_id: str
    intent:     TripIntent

class PlanResponse(BaseModel):
    session_id:   str
    itineraries:  list[Itinerary]         # 1 (tight budget) or 2 (budget + premium)
    voice_summary: str                    # Short string for Nova 2 Sonic to read aloud


# ── Feedback ─────────────────────────────────────────────────────────────────

class FeedbackRequest(BaseModel):
    session_id:     str
    raw_text:       str                   # exactly what the user said
    feedback_type:  FeedbackType
    affected_agents: list[str]            = Field(default_factory=list)  # ["food_agent"]
    updated_preferences: Optional[UserPreferences] = None

class FeedbackResponse(BaseModel):
    session_id:     str
    itineraries:    list[Itinerary]
    voice_summary:  str
    changes_made:   list[str]             = Field(default_factory=list)  # ["Removed seafood restaurants"]


# ── Booking ───────────────────────────────────────────────────────────────────

class BookingRequest(BaseModel):
    session_id:     str
    itinerary_tier: TripBudgetTier
    flight:         FlightOption
    hotel:          HotelOption

class BookingResult(BaseModel):
    success:                bool
    flight_confirmation:    Optional[str] = None
    hotel_confirmation:     Optional[str] = None
    error_message:          Optional[str] = None

class BookingResponse(BaseModel):
    session_id:     str
    result:         BookingResult
    voice_summary:  str


# ── Voice ─────────────────────────────────────────────────────────────────────

class VoiceInputRequest(BaseModel):
    session_id:     str
    audio_base64:   str                   # base64-encoded audio from frontend

class VoiceInputResponse(BaseModel):
    session_id:     str
    transcript:     str
    intent:         Optional[TripIntent]  = None   # populated if this is a fresh trip request
    feedback:       Optional[FeedbackRequest] = None  # populated if this is a feedback turn