import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import json
import asyncio
from typing import Optional

import requests
from models.schemas import FlightOption, TripIntent

# ── Mock flag ─────────────────────────────────────────────────────────────────
USE_MOCK = True

# ── Amadeus auth ──────────────────────────────────────────────────────────────
AMADEUS_AUTH_URL = "https://test.api.amadeus.com/v1/security/oauth2/token"
AMADEUS_SEARCH_URL = "https://test.api.amadeus.com/v2/shopping/flight-offers"

import os
AMADEUS_API_KEY    = os.getenv("AMADEUS_API_KEY", "")
AMADEUS_API_SECRET = os.getenv("AMADEUS_API_SECRET", "")


def _get_amadeus_token() -> str:
    resp = requests.post(AMADEUS_AUTH_URL, data={
        "grant_type":    "client_credentials",
        "client_id":     AMADEUS_API_KEY,
        "client_secret": AMADEUS_API_SECRET,
    })
    resp.raise_for_status()
    return resp.json()["access_token"]


# ── Mock data ─────────────────────────────────────────────────────────────────

def _mock_flights(intent: TripIntent) -> list[FlightOption]:
    flight_time = intent.preferences.flight_time or "morning"
    times = {
        "morning":   ("07:30", "10:45"),
        "afternoon": ("13:15", "16:30"),
        "night":     ("21:00", "00:15+1"),
    }
    dep, arr = times.get(flight_time, times["morning"])

    return [
        FlightOption(
            airline        = "American Airlines",
            flight_number  = "AA1423",
            origin         = intent.origin or "DFW",
            destination    = intent.destination,
            departure_time = f"{intent.departure_date}T{dep}",
            arrival_time   = f"{intent.departure_date}T{arr}",
            duration       = "3h 15m",
            price_usd      = 189.00,
            booking_url    = "https://aa.com/booking/AA1423",
        ),
        FlightOption(
            airline        = "Southwest",
            flight_number  = "WN882",
            origin         = intent.origin or "DFW",
            destination    = intent.destination,
            departure_time = f"{intent.departure_date}T{dep}",
            arrival_time   = f"{intent.departure_date}T{arr}",
            duration       = "3h 30m",
            price_usd      = 149.00,
            booking_url    = "https://southwest.com/booking/WN882",
        ),
    ]


# ── Real Amadeus search ───────────────────────────────────────────────────────

def _search_flights(intent: TripIntent) -> list[FlightOption]:
    token = _get_amadeus_token()
    headers = {"Authorization": f"Bearer {token}"}
    params = {
        "originLocationCode":      intent.origin or "DFW",
        "destinationLocationCode": intent.destination[:3].upper(),
        "departureDate":           intent.departure_date,
        "adults":                  intent.num_travelers,
        "max":                     5,
        "currencyCode":            "USD",
    }
    if intent.preferences.flight_time == "night":
        params["departureDate"] = intent.departure_date

    resp = requests.get(AMADEUS_SEARCH_URL, headers=headers, params=params)
    resp.raise_for_status()
    offers = resp.json().get("data", [])

    results = []
    for offer in offers:
        seg      = offer["itineraries"][0]["segments"][0]
        price    = float(offer["price"]["total"])
        results.append(FlightOption(
            airline        = seg["carrierCode"],
            flight_number  = f"{seg['carrierCode']}{seg['number']}",
            origin         = seg["departure"]["iataCode"],
            destination    = seg["arrival"]["iataCode"],
            departure_time = seg["departure"]["at"],
            arrival_time   = seg["arrival"]["at"],
            duration       = offer["itineraries"][0]["duration"],
            price_usd      = price,
            booking_url    = f"https://www.google.com/flights?q={seg['carrierCode']}{seg['number']}",
        ))
    return results


# ── Filter by preference ──────────────────────────────────────────────────────

def _filter_by_time(flights: list[FlightOption], preferred_time: Optional[str]) -> list[FlightOption]:
    """Sort flights by how closely they match the preferred departure time."""
    if not preferred_time:
        return sorted(flights, key=lambda f: f.price_usd)

    time_ranges = {
        "morning":   (5,  12),
        "afternoon": (12, 18),
        "night":     (18, 24),
    }
    lo, hi = time_ranges.get(preferred_time, (0, 24))

    def score(f: FlightOption) -> int:
        try:
            hour = int(f.departure_time.split("T")[1][:2])
            return 0 if lo <= hour < hi else 1
        except Exception:
            return 1

    return sorted(flights, key=lambda f: (score(f), f.price_usd))


# ── Public API ────────────────────────────────────────────────────────────────

async def run(intent: TripIntent) -> list[FlightOption]:
    """
    Search for flights matching the trip intent.
    Returns a sorted list of FlightOption objects.
    Swap USE_MOCK to False once Amadeus credentials are set.
    """
    try:
        if USE_MOCK:
            flights = await asyncio.to_thread(_mock_flights, intent)
        else:
            flights = await asyncio.to_thread(_search_flights, intent)
    except Exception as e:
        print(f"[flight_agent] Error: {e} — falling back to mock")
        flights = _mock_flights(intent)

    return _filter_by_time(flights, intent.preferences.flight_time)
