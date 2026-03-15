import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import json
import asyncio
import os

import requests
from models.schemas import HotelOption, TripIntent

# ── Mock flag ─────────────────────────────────────────────────────────────────
USE_MOCK = True

# ── RapidAPI / Booking.com ────────────────────────────────────────────────────
RAPIDAPI_KEY      = os.getenv("RAPIDAPI_KEY", "")
BOOKING_SEARCH_URL = "https://booking-com.p.rapidapi.com/v1/hotels/search"
BOOKING_HEADERS   = {
    "X-RapidAPI-Key":  RAPIDAPI_KEY,
    "X-RapidAPI-Host": "booking-com.p.rapidapi.com",
}

# Booking.com destination IDs for common cities (expand as needed)
DEST_IDS = {
    "miami":         "-1217898",
    "new york":      "-1456928",
    "los angeles":   "-1246923",
    "chicago":       "-1268965",
    "dallas":        "-1214977",
}


# ── Mock data ─────────────────────────────────────────────────────────────────

def _mock_hotels(intent: TripIntent) -> list[HotelOption]:
    nights = intent.duration_days or 3
    prefs  = intent.preferences.hotel_preferences

    hotels = [
        HotelOption(
            name                 = "Kimpton Surfcomber Hotel",
            address              = "1717 Collins Ave, Miami Beach, FL 33139",
            star_rating          = 4.0,
            price_per_night_usd  = 189.00,
            total_price_usd      = 189.00 * nights,
            amenities            = ["pool", "beachfront", "free wifi", "bar"],
            image_url            = "https://images.unsplash.com/photo-1566073771259-6a8506099945",
            booking_url          = "https://booking.com/hotel/surfcomber",
        ),
        HotelOption(
            name                 = "The Setai Miami Beach",
            address              = "2001 Collins Ave, Miami Beach, FL 33139",
            star_rating          = 5.0,
            price_per_night_usd  = 420.00,
            total_price_usd      = 420.00 * nights,
            amenities            = ["pool", "beachfront", "spa", "fine dining", "free wifi"],
            image_url            = "https://images.unsplash.com/photo-1582719508461-905c673771fd",
            booking_url          = "https://booking.com/hotel/setai-miami",
        ),
        HotelOption(
            name                 = "Miami Downtown Inn",
            address              = "200 SE 2nd Ave, Miami, FL 33131",
            star_rating          = 3.0,
            price_per_night_usd  = 95.00,
            total_price_usd      = 95.00 * nights,
            amenities            = ["free wifi", "gym", "business center"],
            image_url            = "https://images.unsplash.com/photo-1631049307264-da0ec9d70304",
            booking_url          = "https://booking.com/hotel/miami-downtown-inn",
        ),
    ]

    # Boost hotels that match preferences
    if "beachfront" in prefs or "pool" in prefs:
        hotels = sorted(hotels, key=lambda h: (
            0 if any(p in h.amenities for p in prefs) else 1,
            h.price_per_night_usd
        ))

    return hotels


# ── Real Booking.com search ───────────────────────────────────────────────────

def _search_hotels(intent: TripIntent) -> list[HotelOption]:
    dest    = intent.destination.lower()
    dest_id = DEST_IDS.get(dest, "-1217898")  # default Miami
    nights  = intent.duration_days or 3

    params = {
        "dest_id":       dest_id,
        "dest_type":     "city",
        "checkin_date":  intent.departure_date,
        "checkout_date": intent.return_date or intent.departure_date,
        "adults_number": intent.num_travelers,
        "room_number":   1,
        "order_by":      "price",
        "filter_by_currency": "USD",
        "units":         "metric",
        "locale":        "en-us",
    }

    resp = requests.get(BOOKING_SEARCH_URL, headers=BOOKING_HEADERS, params=params)
    resp.raise_for_status()
    results = resp.json().get("result", [])

    hotels = []
    for h in results[:5]:
        price_per_night = float(h.get("min_total_price", 0)) / max(nights, 1)
        hotels.append(HotelOption(
            name                = h.get("hotel_name", "Unknown Hotel"),
            address             = h.get("address", ""),
            star_rating         = float(h.get("class", 3)),
            price_per_night_usd = round(price_per_night, 2),
            total_price_usd     = float(h.get("min_total_price", 0)),
            amenities           = [],
            image_url           = h.get("max_photo_url"),
            booking_url         = h.get("url", "https://booking.com"),
        ))
    return hotels


# ── Filter by budget ──────────────────────────────────────────────────────────

def _filter_by_budget(
    hotels: list[HotelOption],
    budget_usd: float | None,
    tier: str = "budget"
) -> list[HotelOption]:
    """
    For budget tier: return cheapest options under 30% of total budget.
    For premium tier: return best rated options.
    """
    if not budget_usd:
        return hotels

    hotel_budget = budget_usd * 0.30  # hotels get ~30% of total trip budget

    if tier == "budget":
        affordable = [h for h in hotels if h.total_price_usd <= hotel_budget]
        return affordable or sorted(hotels, key=lambda h: h.total_price_usd)[:2]
    else:
        return sorted(hotels, key=lambda h: -h.star_rating)[:2]


# ── Public API ────────────────────────────────────────────────────────────────

async def run(intent: TripIntent, tier: str = "budget") -> list[HotelOption]:
    """
    Search for hotels matching the trip intent and budget tier.
    Returns a filtered, sorted list of HotelOption objects.
    """
    try:
        if USE_MOCK:
            hotels = await asyncio.to_thread(_mock_hotels, intent)
        else:
            hotels = await asyncio.to_thread(_search_hotels, intent)
    except Exception as e:
        print(f"[hotel_agent] Error: {e} — falling back to mock")
        hotels = _mock_hotels(intent)

    return _filter_by_budget(hotels, intent.budget_usd, tier)
