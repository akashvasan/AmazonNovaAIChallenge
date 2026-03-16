import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import asyncio
import os
from datetime import datetime, timedelta

import requests
from models.schemas import EventOption, FreePlace, TripIntent

# ── Mock flag ─────────────────────────────────────────────────────────────────
USE_MOCK = False

# ── API keys ──────────────────────────────────────────────────────────────────
TICKETMASTER_API_KEY   = os.getenv("TICKETMASTER_API_KEY", "")
GOOGLE_PLACES_API_KEY  = os.getenv("GOOGLE_PLACES_API_KEY", "")

TICKETMASTER_URL  = "https://app.ticketmaster.com/discovery/v2/events.json"
GOOGLE_PLACES_URL = "https://maps.googleapis.com/maps/api/place/textsearch/json"

# City → lat/lng for Google Places
CITY_COORDS = {
    "miami":       (25.7617, -80.1918),
    "new york":    (40.7128, -74.0060),
    "los angeles": (34.0522, -118.2437),
    "chicago":     (41.8781, -87.6298),
    "dallas":      (32.7767, -96.7970),
}


# ── Mock data ─────────────────────────────────────────────────────────────────

def _mock_events(intent: TripIntent) -> list[EventOption]:
    base_date = intent.departure_date or "2026-04-24"
    try:
        d = datetime.strptime(base_date, "%Y-%m-%d")
    except ValueError:
        d = datetime(2026, 4, 24)

    return [
        EventOption(
            name        = "Ultra Music Festival",
            category    = "festival",
            date        = (d + timedelta(days=1)).strftime("%Y-%m-%d"),
            time        = "18:00",
            venue       = "Bayfront Park",
            address     = "301 Biscayne Blvd, Miami, FL 33132",
            price_usd   = 125.00,
            is_free     = False,
            booking_url = "https://ticketmaster.com/ultra-music-festival",
            image_url   = None,
        ),
        EventOption(
            name        = "Miami Heat vs Bulls",
            category    = "sports",
            date        = (d + timedelta(days=2)).strftime("%Y-%m-%d"),
            time        = "19:30",
            venue       = "Kaseya Center",
            address     = "601 Biscayne Blvd, Miami, FL 33132",
            price_usd   = 85.00,
            is_free     = False,
            booking_url = "https://ticketmaster.com/heat-vs-bulls",
            image_url   = None,
        ),
        EventOption(
            name        = "Little Havana Food & Art Walk",
            category    = "cultural",
            date        = (d + timedelta(days=1)).strftime("%Y-%m-%d"),
            time        = "11:00",
            venue       = "Calle Ocho",
            address     = "SW 8th St, Miami, FL 33135",
            price_usd   = 15.00,
            is_free     = False,
            booking_url = "https://eventbrite.com/little-havana-walk",
            image_url   = None,
        ),
    ]


def _mock_free_places(intent: TripIntent) -> list[FreePlace]:
    return [
        FreePlace(
            name        = "South Beach",
            category    = "beach",
            address     = "Ocean Dr, Miami Beach, FL 33139",
            rating      = 4.7,
            description = "Iconic white sand beach with Art Deco architecture.",
            maps_url    = "https://maps.google.com/?q=South+Beach+Miami",
            image_url   = None,
        ),
        FreePlace(
            name        = "Wynwood Walls",
            category    = "landmark",
            address     = "2516 NW 2nd Ave, Miami, FL 33127",
            rating      = 4.6,
            description = "World-famous outdoor street art museum — free to walk.",
            maps_url    = "https://maps.google.com/?q=Wynwood+Walls+Miami",
            image_url   = None,
        ),
        FreePlace(
            name        = "Everglades National Park",
            category    = "park",
            address     = "40001 State Road 9336, Homestead, FL 33034",
            rating      = 4.8,
            description = "UNESCO World Heritage site. Free with America the Beautiful pass.",
            maps_url    = "https://maps.google.com/?q=Everglades+National+Park",
            image_url   = None,
        ),
        FreePlace(
            name        = "Bayside Marketplace",
            category    = "landmark",
            address     = "401 Biscayne Blvd, Miami, FL 33132",
            rating      = 4.3,
            description = "Waterfront marketplace with free live music on weekends.",
            maps_url    = "https://maps.google.com/?q=Bayside+Marketplace+Miami",
            image_url   = None,
        ),
    ]


# ── Real API calls ────────────────────────────────────────────────────────────

def _search_ticketmaster(intent: TripIntent) -> list[EventOption]:
    params = {
        "apikey":  TICKETMASTER_API_KEY,
        "city":    intent.destination,
        "startDateTime": f"{intent.departure_date}T00:00:00Z",
        "endDateTime":   f"{intent.return_date or intent.departure_date}T23:59:59Z",
        "size":    10,
        "sort":    "relevance,desc",
    }
    resp = requests.get(TICKETMASTER_URL, params=params)
    resp.raise_for_status()
    raw_events = resp.json().get("_embedded", {}).get("events", [])

    results = []
    for e in raw_events:
        venue    = e.get("_embedded", {}).get("venues", [{}])[0]
        price    = e.get("priceRanges", [{}])[0].get("min")
        results.append(EventOption(
            name        = e.get("name", ""),
            category    = e.get("classifications", [{}])[0].get("segment", {}).get("name", "event"),
            date        = e.get("dates", {}).get("start", {}).get("localDate", ""),
            time        = e.get("dates", {}).get("start", {}).get("localTime"),
            venue       = venue.get("name", ""),
            address     = venue.get("address", {}).get("line1", ""),
            price_usd   = float(price) if price else None,
            is_free     = price is None and not e.get("url"),
            booking_url = e.get("url"),
            image_url   = e.get("images", [{}])[0].get("url"),
        ))
    return results


def _search_free_places(intent: TripIntent) -> list[FreePlace]:
    dest   = intent.destination.lower()
    coords = CITY_COORDS.get(dest, CITY_COORDS["miami"])

    results = []
    for category, query in [
        ("beach", f"beaches near {intent.destination}"),
        ("park",  f"parks near {intent.destination}"),
        ("landmark", f"free attractions {intent.destination}"),
    ]:
        params = {
            "query":    query,
            "location": f"{coords[0]},{coords[1]}",
            "radius":   20000,
            "key":      GOOGLE_PLACES_API_KEY,
        }
        resp = requests.get(GOOGLE_PLACES_URL, params=params)
        resp.raise_for_status()
        places = resp.json().get("results", [])[:3]

        for p in places:
            results.append(FreePlace(
                name        = p.get("name", ""),
                category    = category,
                address     = p.get("formatted_address", ""),
                rating      = p.get("rating"),
                description = None,
                maps_url    = f"https://maps.google.com/?q={p.get('name', '').replace(' ', '+')}",
                image_url   = None,
            ))
    return results


# ── Public API ────────────────────────────────────────────────────────────────

async def run(intent: TripIntent) -> tuple[list[EventOption], list[FreePlace]]:
    """
    Search for both ticketed events and free places in parallel.
    Returns (events, free_places) tuple.
    """
    try:
        if USE_MOCK:
            events, free_places = await asyncio.gather(
                asyncio.to_thread(_mock_events, intent),
                asyncio.to_thread(_mock_free_places, intent),
            )
        else:
            events, free_places = await asyncio.gather(
                asyncio.to_thread(_search_ticketmaster, intent),
                asyncio.to_thread(_search_free_places, intent),
            )
    except Exception as e:
        print(f"[events_agent] Error: {e} — falling back to mock")
        events      = _mock_events(intent)
        free_places = _mock_free_places(intent)

    return events, free_places
