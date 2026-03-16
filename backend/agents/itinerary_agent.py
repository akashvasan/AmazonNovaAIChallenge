import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import json
import asyncio
from datetime import datetime, timedelta

import boto3
from botocore.exceptions import BotoCoreError, ClientError

from models.schemas import (
    TripIntent, TripBudgetTier,
    FlightOption, HotelOption, EventOption, FreePlace, RestaurantOption,
    Itinerary, DayPlan, DaySlot, MealPeriod
)

# ── Mock flag ─────────────────────────────────────────────────────────────────
USE_MOCK = True


# ── Nova 2 Lite client ────────────────────────────────────────────────────────

def _get_bedrock_client():
    return boto3.client("bedrock-runtime", region_name="us-east-1")


# ── Prompt ────────────────────────────────────────────────────────────────────

ITINERARY_PROMPT = """
You are a travel planner building a day-by-day itinerary.

Given the trip details and available options below, build a {tier} itinerary.
For budget tier: prioritize free activities, cheaper restaurants ($, $$), and value picks.
For premium tier: prioritize top-rated restaurants ($$, $$$), paid events, and upscale options.

Rules:
- Each day must have: breakfast, a morning activity, lunch, an afternoon activity, dinner, an evening activity
- Spread restaurants evenly across meal periods — no repeat cuisines on the same day
- Mix free places and paid events — don't put all paid events on the same day
- Stay within the total budget of ${budget_usd}
- Return ONLY valid JSON — no preamble, no markdown fences

Trip:
{trip_summary}

Available flights: {flights}
Available hotels: {hotels}
Available events: {events}
Free places: {free_places}
Restaurants: {restaurants}

Return this exact JSON structure:
{{
  "days": [
    {{
      "day_number": 1,
      "date": "YYYY-MM-DD",
      "slots": [
        {{
          "time_of_day": "morning | afternoon | evening",
          "activity_type": "meal | event | free_place | travel",
          "title": "string",
          "description": "string or null",
          "location": "string or null",
          "cost_usd": 0.0,
          "booking_url": "string or null"
        }}
      ]
    }}
  ],
  "chosen_flight_index": 0,
  "chosen_hotel_index": 0,
  "estimated_total_usd": 0.0
}}
""".strip()


# ── Nova 2 Lite call ──────────────────────────────────────────────────────────

async def _call_nova_lite(prompt: str) -> str:
    if USE_MOCK:
        return _mock_itinerary_response(prompt)

    try:
        client = _get_bedrock_client()
        response = await asyncio.to_thread(
            client.invoke_model,
            modelId="amazon.nova-lite-v1:0",
            body=json.dumps({
                "messages": [{"role": "user", "content": prompt}],
                "inferenceConfig": {"max_new_tokens": 2048, "temperature": 0.2}
            }),
            contentType="application/json",
            accept="application/json",
        )
        body = json.loads(response["body"].read())
        return body["output"]["message"]["content"][0]["text"]

    except (BotoCoreError, ClientError) as e:
        print(f"[itinerary_agent] Bedrock error: {e} — falling back to mock")
        return _mock_itinerary_response(prompt)


# ── Mock ──────────────────────────────────────────────────────────────────────

def _mock_itinerary_response(prompt: str) -> str:
    """Realistic 3-day Miami itinerary mock."""
    is_premium = "premium" in prompt.lower()

    days = []
    base_date = datetime(2026, 4, 24)

    day_templates = [
        {
            "slots": [
                {"time_of_day": "morning",   "activity_type": "meal",       "title": "Breakfast at Zak the Baker",           "description": "Start with fresh baked goods and coffee.",         "location": "295 NW 26th St, Miami",          "cost_usd": 14.0,  "booking_url": "https://maps.google.com/?q=zak-the-baker"},
                {"time_of_day": "morning",   "activity_type": "free_place", "title": "South Beach walk",                     "description": "Iconic white sand and Art Deco architecture.",     "location": "Ocean Dr, Miami Beach",          "cost_usd": 0.0,   "booking_url": "https://maps.google.com/?q=South+Beach"},
                {"time_of_day": "afternoon", "activity_type": "meal",       "title": "Lunch at Versailles Restaurant",        "description": "Classic Cuban food in Little Havana.",            "location": "3555 SW 8th St, Miami",          "cost_usd": 18.0,  "booking_url": "https://maps.google.com/?q=versailles-miami"},
                {"time_of_day": "afternoon", "activity_type": "free_place", "title": "Wynwood Walls",                        "description": "World-famous outdoor street art museum.",          "location": "2516 NW 2nd Ave, Miami",         "cost_usd": 0.0,   "booking_url": "https://maps.google.com/?q=Wynwood+Walls"},
                {"time_of_day": "evening",   "activity_type": "meal",       "title": "Dinner at KYU Miami",                  "description": "Wood-fired Asian fusion in Wynwood.",              "location": "251 NW 25th St, Miami",          "cost_usd": 55.0,  "booking_url": "https://maps.google.com/?q=kyu-miami"},
                {"time_of_day": "evening",   "activity_type": "event",      "title": "Little Havana Food & Art Walk",        "description": "Evening cultural stroll along Calle Ocho.",       "location": "SW 8th St, Miami",               "cost_usd": 15.0,  "booking_url": "https://eventbrite.com/little-havana-walk"},
            ]
        },
        {
            "slots": [
                {"time_of_day": "morning",   "activity_type": "meal",       "title": "Breakfast at hotel",                   "description": "Enjoy the hotel breakfast before a big day.",      "location": "Hotel",                          "cost_usd": 0.0,   "booking_url": None},
                {"time_of_day": "morning",   "activity_type": "free_place", "title": "Everglades National Park",             "description": "UNESCO World Heritage site — bring bug spray.",   "location": "40001 State Road 9336, Homestead","cost_usd": 0.0,   "booking_url": "https://maps.google.com/?q=Everglades"},
                {"time_of_day": "afternoon", "activity_type": "meal",       "title": "Lunch at Mandolin Aegean Bistro",      "description": "Fresh Greek and Mediterranean dishes.",           "location": "4312 NE 2nd Ave, Miami",         "cost_usd": 32.0,  "booking_url": "https://maps.google.com/?q=mandolin-miami"},
                {"time_of_day": "afternoon", "activity_type": "free_place", "title": "Bayside Marketplace",                 "description": "Waterfront shopping and free live music.",        "location": "401 Biscayne Blvd, Miami",       "cost_usd": 0.0,   "booking_url": "https://maps.google.com/?q=Bayside+Marketplace"},
                {"time_of_day": "evening",   "activity_type": "meal",       "title": "Dinner at Cvi.che 105",               "description": "Peruvian ceviches and cocktails downtown.",        "location": "105 NE 3rd Ave, Miami",          "cost_usd": 40.0,  "booking_url": "https://maps.google.com/?q=cvi-che-105"},
                {"time_of_day": "evening",   "activity_type": "event",      "title": "Ultra Music Festival",                "description": "World-class DJ sets at Bayfront Park.",            "location": "Bayfront Park, Miami",           "cost_usd": 125.0, "booking_url": "https://ticketmaster.com/ultra-music-festival"},
            ]
        },
        {
            "slots": [
                {"time_of_day": "morning",   "activity_type": "meal",       "title": "Breakfast at Zak the Baker",           "description": "Light breakfast before checkout.",                 "location": "295 NW 26th St, Miami",          "cost_usd": 14.0,  "booking_url": "https://maps.google.com/?q=zak-the-baker"},
                {"time_of_day": "morning",   "activity_type": "event",      "title": "Miami Heat vs Bulls",                  "description": "Catch a live NBA game at Kaseya Center.",          "location": "601 Biscayne Blvd, Miami",       "cost_usd": 85.0,  "booking_url": "https://ticketmaster.com/heat-vs-bulls"},
                {"time_of_day": "afternoon", "activity_type": "meal",       "title": "Lunch at Versailles Restaurant",       "description": "One last Cuban meal before heading home.",        "location": "3555 SW 8th St, Miami",          "cost_usd": 18.0,  "booking_url": "https://maps.google.com/?q=versailles-miami"},
                {"time_of_day": "afternoon", "activity_type": "free_place", "title": "South Beach one last time",            "description": "Soak up the sun before your flight home.",         "location": "Ocean Dr, Miami Beach",          "cost_usd": 0.0,   "booking_url": "https://maps.google.com/?q=South+Beach"},
                {"time_of_day": "evening",   "activity_type": "travel",     "title": "Head to Miami International Airport", "description": "Allow 90 min before departure.",                  "location": "MIA Airport",                    "cost_usd": 0.0,   "booking_url": None},
                {"time_of_day": "evening",   "activity_type": "meal",       "title": "Dinner at airport",                   "description": "Grab a bite before your flight.",                  "location": "MIA Airport",                    "cost_usd": 20.0,  "booking_url": None},
            ]
        },
    ]

    # Premium: bump up restaurant choices and swap in pricier events
    if is_premium:
        day_templates[0]["slots"][4]["title"]    = "Dinner at Joe's Stone Crab"
        day_templates[0]["slots"][4]["cost_usd"] = 85.0
        day_templates[0]["slots"][4]["yelp_url"] = "https://maps.google.com/?q=joes-stone-crab"

    for i, template in enumerate(day_templates):
        date = (base_date + timedelta(days=i)).strftime("%Y-%m-%d")
        day_total = sum(s["cost_usd"] for s in template["slots"])
        days.append({
            "day_number": i + 1,
            "date":       date,
            "slots":      template["slots"],
            "day_total":  day_total,
        })

    flight_index = 0
    hotel_index  = 1 if is_premium else 0
    meals_total  = sum(
        s["cost_usd"]
        for day in days
        for s in day["slots"]
    )

    return json.dumps({
        "days":                  days,
        "chosen_flight_index":   flight_index,
        "chosen_hotel_index":    hotel_index,
        "estimated_total_usd":   round(meals_total, 2),
    })


# ── Helpers ───────────────────────────────────────────────────────────────────

def _parse_json(raw: str) -> dict:
    cleaned = raw.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
    return json.loads(cleaned)


def _build_day_plans(raw_days: list[dict]) -> tuple[list[DayPlan], float]:
    """Convert raw JSON days into DayPlan objects and sum the total cost."""
    day_plans   = []
    grand_total = 0.0

    for d in raw_days:
        slots = [DaySlot(**s) for s in d.get("slots", [])]
        day_total = sum(s.cost_usd for s in slots)
        grand_total += day_total
        day_plans.append(DayPlan(
            day_number    = d["day_number"],
            date          = d["date"],
            slots         = slots,
            day_total_usd = round(day_total, 2),
        ))

    return day_plans, round(grand_total, 2)


def _voice_summary(itinerary: Itinerary) -> str:
    """Short string for Nova 2 Sonic to read aloud."""
    nights = len(itinerary.days)
    return (
        f"Here's your {itinerary.tier.value} {itinerary.flight.destination} trip! "
        f"You're flying {itinerary.flight.airline} on {itinerary.flight.departure_time[:10]}, "
        f"staying at {itinerary.hotel.name} for {nights} nights. "
        f"Estimated total: ${itinerary.estimated_total_usd:,.0f}. "
        f"Shall I go ahead and book the flight and hotel?"
    )


# ── Core builder ──────────────────────────────────────────────────────────────

async def _build_itinerary(
    tier:         TripBudgetTier,
    intent:       TripIntent,
    flights:      list[FlightOption],
    hotels:       list[HotelOption],
    events:       list[EventOption],
    free_places:  list[FreePlace],
    restaurants:  list[RestaurantOption],
) -> Itinerary:
    """Build one itinerary for the given tier using Nova 2 Lite."""

    prompt = ITINERARY_PROMPT.format(
        tier       = tier.value,
        budget_usd = intent.budget_usd or 1500,
        trip_summary = json.dumps({
            "destination":    intent.destination,
            "departure_date": intent.departure_date,
            "return_date":    intent.return_date,
            "duration_days":  intent.duration_days or 3,
            "num_travelers":  intent.num_travelers,
        }),
        flights     = json.dumps([f.model_dump() for f in flights[:3]]),
        hotels      = json.dumps([h.model_dump() for h in hotels[:3]]),
        events      = json.dumps([e.model_dump() for e in events[:5]]),
        free_places = json.dumps([p.model_dump() for p in free_places[:5]]),
        restaurants = json.dumps([r.model_dump() for r in restaurants[:8]]),
    )

    raw  = await _call_nova_lite(prompt)
    data = _parse_json(raw)

    day_plans, activities_total = _build_day_plans(data.get("days", []))

    flight_idx = min(data.get("chosen_flight_index", 0), len(flights) - 1)
    hotel_idx  = min(data.get("chosen_hotel_index", 0), len(hotels) - 1)
    flight     = flights[flight_idx]
    hotel      = hotels[hotel_idx]
    total      = round(flight.price_usd + hotel.total_price_usd + activities_total, 2)

    title = (
        f"{intent.destination} · "
        f"{intent.departure_date} – {intent.return_date or 'TBD'}"
    )

    return Itinerary(
        tier                 = tier,
        title                = title,
        flight               = flight,
        hotel                = hotel,
        days                 = day_plans,
        events               = events,
        free_places          = free_places,
        estimated_total_usd  = total,
        budget_usd           = intent.budget_usd or 0.0,
    )


# ── Public API ────────────────────────────────────────────────────────────────

async def run(
    intent:      TripIntent,
    flights:     list[FlightOption],
    hotels:      list[HotelOption],
    events:      list[EventOption],
    free_places: list[FreePlace],
    restaurants: list[RestaurantOption],
) -> tuple[list[Itinerary], list[str]]:
    """
    Build 1 or 2 itineraries depending on budget headroom.
    Returns (itineraries, voice_summaries).

    - Tight budget (< $800): returns 1 budget itinerary
    - Comfortable budget (>= $800): returns [budget, premium] itineraries
    """
    budget = intent.budget_usd or 0.0

    if budget >= 800:
        # Build both tiers in parallel
        budget_plan, premium_plan = await asyncio.gather(
            _build_itinerary(
                TripBudgetTier.budget, intent,
                flights, hotels, events, free_places, restaurants
            ),
            _build_itinerary(
                TripBudgetTier.premium, intent,
                flights, hotels, events, free_places, restaurants
            ),
        )
        itineraries = [budget_plan, premium_plan]
    else:
        budget_plan = await _build_itinerary(
            TripBudgetTier.budget, intent,
            flights, hotels, events, free_places, restaurants
        )
        itineraries = [budget_plan]

    voice_summaries = [_voice_summary(i) for i in itineraries]
    return itineraries, voice_summaries
