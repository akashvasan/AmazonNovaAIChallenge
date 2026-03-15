import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import asyncio
import os
from typing import Optional

from models.schemas import FlightOption, HotelOption, BookingResult

# ── Mock flag ─────────────────────────────────────────────────────────────────
USE_MOCK = True

# ── Nova Act client ───────────────────────────────────────────────────────────
# Nova Act is still in preview — gracefully degrade if not installed
NOVA_ACT_AVAILABLE = False
NovaAct = None  # type: ignore
try:
    from nova_act import NovaAct  # type: ignore
    NOVA_ACT_AVAILABLE = True
except (ImportError, ModuleNotFoundError):
    pass  # Silently fall back to mock or browser fallback


# ── Mock booking ──────────────────────────────────────────────────────────────

async def _mock_book_flight(flight: FlightOption) -> tuple[bool, Optional[str]]:
    """Simulate a successful flight booking with a fake confirmation number."""
    await asyncio.sleep(1.5)  # Simulate network delay for demo realism
    confirmation = f"AA-{flight.flight_number}-{os.urandom(3).hex().upper()}"
    return True, confirmation


async def _mock_book_hotel(hotel: HotelOption) -> tuple[bool, Optional[str]]:
    """Simulate a successful hotel booking with a fake confirmation number."""
    await asyncio.sleep(1.5)
    confirmation = f"BK-{os.urandom(4).hex().upper()}"
    return True, confirmation


# ── Real Nova Act booking ─────────────────────────────────────────────────────

async def _act_book_flight(flight: FlightOption) -> tuple[bool, Optional[str]]:
    """
    Use Nova Act to navigate to the airline booking page and complete
    the flight booking up to the confirmation screen.
    """
    try:
        async with NovaAct(
            starting_page=flight.booking_url,
            headless=False,
        ) as agent:
            result = await agent.act(
                f"""
                Book the flight with these details:
                - Flight: {flight.flight_number}
                - From: {flight.origin} to {flight.destination}
                - Departure: {flight.departure_time}
                - Price: ${flight.price_usd}

                Steps:
                1. Find and select this specific flight
                2. Fill in 1 adult passenger
                3. Choose the cheapest fare class
                4. Proceed to the checkout/payment page
                5. Stop at the payment page — do NOT enter payment details
                6. Return the booking reference or confirmation number shown on screen

                Return ONLY the confirmation number, nothing else.
                """
            )
            confirmation = str(result).strip() if result else None
            return True, confirmation

    except Exception as e:
        print(f"[nova_act_runner] Flight booking error: {e}")
        return False, None


async def _act_book_hotel(hotel: HotelOption) -> tuple[bool, Optional[str]]:
    """
    Use Nova Act to navigate to the hotel booking page and complete
    the reservation up to the confirmation screen.
    """
    try:
        async with NovaAct(
            starting_page=hotel.booking_url,
            headless=False,
        ) as agent:
            result = await agent.act(
                f"""
                Book this hotel:
                - Hotel: {hotel.name}
                - Address: {hotel.address}
                - Price per night: ${hotel.price_per_night_usd}
                - Total: ${hotel.total_price_usd}

                Steps:
                1. Find and select this specific hotel
                2. Select 1 room for 1 adult
                3. Choose the cheapest available room type
                4. Proceed to the checkout/payment page
                5. Stop at the payment page — do NOT enter payment details
                6. Return the booking reference or confirmation number shown on screen

                Return ONLY the confirmation number, nothing else.
                """
            )
            confirmation = str(result).strip() if result else None
            return True, confirmation

    except Exception as e:
        print(f"[nova_act_runner] Hotel booking error: {e}")
        return False, None


# ── Fallback: open in browser ─────────────────────────────────────────────────

async def _browser_fallback(flight: FlightOption, hotel: HotelOption) -> BookingResult:
    """
    If Nova Act is not available, open booking URLs in the browser.
    """
    import webbrowser
    webbrowser.open(flight.booking_url)
    await asyncio.sleep(0.5)
    webbrowser.open(hotel.booking_url)

    return BookingResult(
        success             = True,
        flight_confirmation = "PENDING — complete in browser",
        hotel_confirmation  = "PENDING — complete in browser",
        error_message       = None,
    )


# ── Public API ────────────────────────────────────────────────────────────────

async def book(flight: FlightOption, hotel: HotelOption) -> BookingResult:
    """
    Book flight and hotel in parallel.
    Priority order:
      1. Mock booking     — if USE_MOCK is True
      2. Nova Act         — if available and USE_MOCK is False
      3. Browser fallback — if Nova Act import failed
    """
    if USE_MOCK:
        (f_ok, f_conf), (h_ok, h_conf) = await asyncio.gather(
            _mock_book_flight(flight),
            _mock_book_hotel(hotel),
        )
        return BookingResult(
            success             = f_ok and h_ok,
            flight_confirmation = f_conf,
            hotel_confirmation  = h_conf,
            error_message       = None,
        )

    if not NOVA_ACT_AVAILABLE:
        print("[nova_act_runner] Nova Act unavailable — opening in browser.")
        return await _browser_fallback(flight, hotel)

    # Real Nova Act — run both bookings in parallel
    (f_ok, f_conf), (h_ok, h_conf) = await asyncio.gather(
        _act_book_flight(flight),
        _act_book_hotel(hotel),
    )

    error = None
    if not f_ok:
        error = "Flight booking failed — please complete manually."
    if not h_ok:
        error = (error or "") + " Hotel booking failed — please complete manually."

    return BookingResult(
        success             = f_ok and h_ok,
        flight_confirmation = f_conf,
        hotel_confirmation  = h_conf,
        error_message       = error,
    )
