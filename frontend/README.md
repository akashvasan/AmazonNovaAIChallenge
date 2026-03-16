# Nova Travel — Frontend

AI-powered voice travel planner UI built with React + TypeScript + Vite + Tailwind CSS.
Connects to the FastAPI backend powered by Amazon Nova.

## Quick Start

```bash
cd frontend
npm install
cp .env.example .env      # edit if your backend runs on a different port
npm run dev
```

Open http://localhost:5173

---

## Connecting to the Live Backend

The backend must be running at `http://localhost:8000` (default).

```bash
# In a separate terminal, from the backend/ directory:
cd ../backend
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### Environment Variables

| Variable | Default | Description |
|---|---|---|
| `VITE_API_BASE_URL` | `http://localhost:8000` | Backend base URL |
| `VITE_USE_MOCK` | `false` | Set to `true` to run with mock data (no backend needed) |

---

## Running with Mock Data (No Backend)

```bash
VITE_USE_MOCK=true npm run dev
```

All API calls are intercepted by `src/api/mock.ts` which returns realistic mock responses
matching the exact backend schemas. The full UI flow works — voice recording still uses
the real MediaRecorder API, but transcription returns a canned Miami trip response.

---

## App Flow

```
1. Splash screen  → POST /session/start          auto-called on load
2. Voice input    → POST /voice/input             speak your trip request
3. Planning       → POST /plan                    4 agents run in parallel
4. Itinerary view → displays budget/premium tabs with flight, hotel, days
5. Feedback       → POST /feedback                voice or text refinements
6. Booking        → POST /book                    Nova Act automates booking
7. Confirmation   → POST /session/{id}/synthesize plays voice confirmation
```

---

## Project Structure

```
src/
├── api/
│   ├── client.ts                  Axios API functions for all endpoints
│   └── mock.ts                    Mock responses (toggle with VITE_USE_MOCK=true)
├── components/
│   ├── VoiceButton.tsx            Mic button: idle / recording / processing states
│   ├── AgentStatusBoard.tsx       4-card grid: flight/hotel/events/food agents
│   ├── FlightCard.tsx             Flight option card
│   ├── HotelCard.tsx              Hotel option card with star rating + amenities
│   ├── ItineraryCard.tsx          Expandable day-plan card with DaySlots
│   ├── PreferenceMemoryDrawer.tsx Right-side drawer — remembered preferences as pills
│   ├── FeedbackBar.tsx            Sticky bottom bar — voice or text feedback
│   ├── AudioPlayer.tsx            Waveform player for Nova Sonic TTS output
│   └── BookingResultRow.tsx       3-card confirmation row (flight / events / hotel)
├── context/
│   └── SessionContext.tsx         Global state: sessionId, itineraries, stage, prefs
├── pages/
│   └── PlannerPage.tsx            Main page — renders screen per appStage
├── types/
│   └── index.ts                   TypeScript types mirroring backend Pydantic schemas
├── App.tsx                        Wraps SessionProvider + SplashGate
└── SplashGate.tsx                 Loading splash until session is ready
```

---

## Key Design Decisions

- **No form tags** — all interactions via `onClick`/`onChange` handlers
- **Base64 audio over HTTP** — no WebSocket needed; backend accepts `audio_base64` strings
- **Selective agent re-running** — FeedbackBar infers which agents are affected and highlights only those on AgentStatusBoard
- **Graceful mock fallback** — backend returns mock data when API keys are missing; frontend handles this transparently
- **Preference persistence** — `UserPreferences` stored in React Context, updated on each feedback turn, visible in PreferenceMemoryDrawer

---

## Available Scripts

```bash
npm run dev      # start dev server with HMR at http://localhost:5173
npm run build    # production build → dist/
npm run preview  # preview production build locally
```
