import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

from models.schemas import (
    SessionStartResponse,
    VoiceInputRequest, VoiceInputResponse,
    PlanRequest, PlanResponse,
    FeedbackRequest, FeedbackResponse,
    BookingRequest, BookingResponse,
    TripBudgetTier,
)
from memory.session_store import store
from agents import orchestrator, flight_agent, hotel_agent, events_agent, food_agent, itinerary_agent
from voice.sonic_handler import transcribe, synthesize
from booking.nova_act_runner import book


# ── Lifespan ──────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown logic."""
    print("🚀 Travel planner backend starting up...")
    yield
    # Purge expired sessions on shutdown
    purged = store.purge_expired()
    print(f"🛑 Shutting down — purged {purged} expired sessions.")


# ── App ───────────────────────────────────────────────────────────────────────

app = FastAPI(
    title       = "AI Travel Planner API",
    description = "Powered by Amazon Nova — voice-driven travel planning and booking.",
    version     = "1.0.0",
    lifespan    = lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",                     # local dev (Vite default)
        "https://amazonnovaaichallenge-production.up.railway.app",     # deployed frontend
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Helper ────────────────────────────────────────────────────────────────────

def _get_session_or_404(session_id: str):
    try:
        return store.get(session_id)
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Session '{session_id}' not found or expired.")


# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {
        "status":          "ok",
        "active_sessions": store.active_count(),
    }


@app.post("/session/start", response_model=SessionStartResponse)
async def session_start():
    """
    Create a new session.
    Call this when the user opens the app — returns a session_id
    that must be passed to every subsequent request.
    """
    session = store.create()
    return SessionStartResponse(session_id=session.session_id)


@app.post("/voice/input", response_model=VoiceInputResponse)
async def voice_input(body: VoiceInputRequest):
    """
    Receive base64 audio from the frontend.
    Transcribes it via Nova 2 Sonic, then routes to either:
      - intent extraction (fresh trip request)
      - feedback classification (mid-session correction)
    """
    _get_session_or_404(body.session_id)

    # Transcribe audio → text
    transcript = await transcribe(body.audio_base64)

    # Orchestrator decides: fresh intent or feedback
    response = await orchestrator.process_utterance(transcript, body.session_id)
    return response


@app.post("/plan", response_model=PlanResponse)
async def plan(body: PlanRequest):
    """
    Run the full agent pipeline to generate 1-2 itineraries.
    Calls all 4 specialist agents in parallel, then passes
    their outputs to the itinerary generator.
    """
    _get_session_or_404(body.session_id)

    # Persist intent to session
    session        = store.get(body.session_id)
    session.intent = body.intent

    # Run all 4 specialist agents in parallel
    (flights, hotels, (events, free_places), restaurants) = await asyncio.gather(
        flight_agent.run(body.intent),
        hotel_agent.run(body.intent),
        events_agent.run(body.intent),
        food_agent.run(body.intent),
    )

    # Build itineraries
    itineraries, voice_summaries = await itinerary_agent.run(
        intent      = body.intent,
        flights     = flights,
        hotels      = hotels,
        events      = events,
        free_places = free_places,
        restaurants = restaurants,
    )

    # Store itineraries in session
    store.store_itineraries(body.session_id, itineraries)
    store.clear_dirty(body.session_id)

    # Add assistant turn to conversation history
    store.add_utterance(body.session_id, "assistant", voice_summaries[0])

    return PlanResponse(
        session_id    = body.session_id,
        itineraries   = itineraries,
        voice_summary = " | ".join(voice_summaries),
    )


@app.post("/feedback", response_model=FeedbackResponse)
async def feedback(body: FeedbackRequest):
    """
    Process user feedback and selectively re-run only affected agents.
    e.g. "no seafood" → re-runs food_agent + itinerary_agent only.
    """
    session = _get_session_or_404(body.session_id)

    if not session.intent:
        raise HTTPException(status_code=400, detail="No active trip plan found. Start with /plan first.")

    # Update preferences in session
    if body.updated_preferences:
        store.update_preferences(body.session_id, body.updated_preferences)

    intent          = session.intent
    dirty_agents    = body.affected_agents or list(store.get_dirty_agents(body.session_id))
    changes_made    = []

    # Re-run only the affected agents
    flights     = session.itineraries[0].flight     if session.itineraries else None
    hotels_list = [i.hotel for i in session.itineraries] if session.itineraries else []
    events      = session.itineraries[0].events     if session.itineraries else []
    free_places = session.itineraries[0].free_places if session.itineraries else []
    restaurants = []

    tasks = {}
    if "flight_agent" in dirty_agents:
        tasks["flights"] = flight_agent.run(intent)
    if "hotel_agent" in dirty_agents:
        tasks["hotels"] = hotel_agent.run(intent)
    if "events_agent" in dirty_agents:
        tasks["events"] = events_agent.run(intent)
    if "food_agent" in dirty_agents:
        tasks["restaurants"] = food_agent.run(intent)

    # Run dirty agents in parallel
    if tasks:
        keys    = list(tasks.keys())
        results = await asyncio.gather(*tasks.values())
        result_map = dict(zip(keys, results))

        if "flights" in result_map:
            flights = result_map["flights"]
            changes_made.append("Updated flight options.")
        if "hotels" in result_map:
            hotels_list = result_map["hotels"]
            changes_made.append("Updated hotel options.")
        if "events" in result_map:
            events, free_places = result_map["events"]
            changes_made.append("Updated events and free places.")
        if "restaurants" in result_map:
            restaurants = result_map["restaurants"]
            changes_made.append("Updated restaurant recommendations.")

    # Always re-run itinerary agent with fresh data
    itineraries, voice_summaries = await itinerary_agent.run(
        intent      = intent,
        flights     = flights if isinstance(flights, list) else [flights],
        hotels      = hotels_list if isinstance(hotels_list, list) else [hotels_list],
        events      = events,
        free_places = free_places,
        restaurants = restaurants,
    )

    store.store_itineraries(body.session_id, itineraries)
    store.clear_dirty(body.session_id)
    store.add_utterance(body.session_id, "assistant", voice_summaries[0])

    return FeedbackResponse(
        session_id    = body.session_id,
        itineraries   = itineraries,
        voice_summary = voice_summaries[0],
        changes_made  = changes_made,
    )


@app.post("/book", response_model=BookingResponse)
async def book_trip(body: BookingRequest):
    """
    Trigger Nova Act to book the selected flight and hotel.
    Runs both bookings in parallel and returns confirmation numbers.
    """
    _get_session_or_404(body.session_id)

    # Record chosen tier in session
    store.set_chosen_tier(body.session_id, body.itinerary_tier)

    # Run booking
    result = await book(body.flight, body.hotel)

    # Build voice confirmation
    if result.success:
        voice_summary = (
            f"You're all set! Your flight is confirmed — reference {result.flight_confirmation}. "
            f"Your hotel is confirmed — reference {result.hotel_confirmation}. "
            f"Have an amazing trip!"
        )
    else:
        voice_summary = (
            f"There was an issue completing your booking. {result.error_message or ''} "
            f"Please try again or complete the booking manually."
        )

    store.add_utterance(body.session_id, "assistant", voice_summary)

    return BookingResponse(
        session_id    = body.session_id,
        result        = result,
        voice_summary = voice_summary,
    )


@app.get("/session/{session_id}/memory")
async def session_memory(session_id: str):
    """
    Debug endpoint — inspect the current session state.
    Useful during development to verify preferences are persisting correctly.
    """
    _get_session_or_404(session_id)
    return store.summary(session_id)


@app.post("/session/{session_id}/synthesize")
async def synthesize_text(session_id: str, text: str):
    """
    Convert any text to speech via Nova 2 Sonic.
    Used by the frontend to play back any assistant message.
    """
    _get_session_or_404(session_id)
    audio_base64 = await synthesize(text)
    return {"audio_base64": audio_base64}


# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)