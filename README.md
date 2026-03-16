# Nova Travel 🌎
### From conversation to confirmation in seconds — Nova Travel is a voice-first AI travel planner that finds flights, hotels, events, and restaurants, then books it all for you.

> Built for the **Amazon Nova AI Hackathon** — Category: **Agentic AI + Voice AI**
> Uses Amazon Nova 2 Lite, Nova 2 Sonic, and Nova Act on AWS Bedrock

---

## Live Demo

- **Frontend:** https://your-frontend.up.railway.app
- **Backend API:** https://amazonnovaaichallenge-production.up.railway.app
- **API Docs:** https://amazonnovaaichallenge-production.up.railway.app/docs
- **Video Demo:** https://youtube.com/your-demo-link #AmazonNova

---

## What it does

Nova Travel is a voice-first AI travel planner powered entirely by Amazon Nova. You speak your destination, dates, and budget — and within seconds the app generates a complete, personalized day-by-day itinerary including flights, hotels, real local events, restaurants, and free attractions like parks and beaches.

The experience is fully conversational. Say "I don't like seafood" or "I want to fly at night" and Nova Travel instantly updates only the affected parts of your plan, remembers your preferences for the rest of the session, and reads the updated itinerary back via voice. When you're ready, it books your flight and hotel automatically using Nova Act.

---

## Amazon Nova Integration

| Nova Model | Usage |
|---|---|
| **Nova 2 Lite** | Orchestrator agent — extracts trip intent from voice, classifies feedback, builds itineraries |
| **Nova 2 Sonic** | Voice transcription (speech → text) and itinerary readback (text → speech) |
| **Nova Act** | UI automation — navigates airline and hotel booking sites to complete reservations |

---

## Architecture

```
User (voice)
     ↓ Nova 2 Sonic (transcribe)
Orchestrator Agent — Nova 2 Lite
     ↓ fires 4 agents in parallel
┌─────────────┬──────────────┬──────────────┬─────────────┐
│ Flight Agent│  Hotel Agent │  Events Agent│  Food Agent │
│ (Amadeus)   │(Google Places│(Ticketmaster │(Google      │
│             │             │+ Google      │ Places)     │
│             │             │  Places)     │             │
└─────────────┴──────────────┴──────────────┴─────────────┘
     ↓ all results
Itinerary Generator — Nova 2 Lite
     ↓ budget + premium plans
Voice Confirmation — Nova 2 Sonic (reads itinerary aloud)
     ↓ user confirms
Booking Engine — Nova Act (automates flight + hotel booking)
     ↓
Confirmation numbers returned
```

**Key design patterns:**
- All 4 specialist agents run in **parallel** using `asyncio.gather`
- **Preference memory store** persists dietary restrictions, flight preferences, and hotel preferences across the full session
- **Dirty agent flags** — feedback only re-runs affected agents, not the full pipeline
- **USE_MOCK toggle** on every agent for local development without API keys

---

## Tech Stack

**Backend**
- Python 3.11+
- FastAPI + Uvicorn
- Pydantic v2
- boto3 (AWS Bedrock)
- asyncio (parallel agent execution)

**Frontend**
- React 19
- Vite
- TypeScript
- Tailwind CSS
- Framer Motion

**Amazon Nova**
- amazon.nova-lite-v1:0 (via AWS Bedrock)
- amazon.nova-sonic-v1:0 (via AWS Bedrock)
- Nova Act (UI automation)

**External APIs**
- Ticketmaster Discovery API (live events)
- Google Places API (hotels, restaurants, parks, beaches)
- Amadeus API (flights)

**Infrastructure**
- Railway (backend + frontend deployment)
- GitHub (source control + CI/CD)

---

## Project Structure

```
AmazonNovaAIChallenge/
├── backend/
│   ├── main.py                  # FastAPI app, all endpoints
│   ├── config.py                # sys.path setup
│   ├── requirements.txt
│   ├── Procfile                 # Railway deployment
│   ├── agents/
│   │   ├── orchestrator.py      # Intent extraction + feedback classification
│   │   ├── flight_agent.py      # Flight search (Amadeus API)
│   │   ├── hotel_agent.py       # Hotel search (Google Places)
│   │   ├── events_agent.py      # Events + free places (Ticketmaster + Google Places)
│   │   ├── food_agent.py        # Restaurant search (Google Places)
│   │   └── itinerary_agent.py   # Day-by-day plan generation (Nova 2 Lite)
│   ├── memory/
│   │   └── session_store.py     # Thread-safe preference memory store
│   ├── voice/
│   │   └── sonic_handler.py     # Nova 2 Sonic transcription + synthesis
│   ├── booking/
│   │   └── nova_act_runner.py   # Nova Act UI automation
│   └── models/
│       └── schemas.py           # Pydantic data models
└── frontend/
    ├── src/
    │   ├── App.tsx
    │   └── components/
    │       └── ItineraryCard.tsx
    ├── package.json
    └── vite.config.ts
```

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | Health check + active session count |
| POST | `/session/start` | Create a new session |
| POST | `/voice/input` | Transcribe audio + extract intent or feedback |
| POST | `/plan` | Run full agent pipeline, return itineraries |
| POST | `/feedback` | Process user feedback, selective agent re-run |
| POST | `/book` | Trigger Nova Act booking |
| GET | `/session/{id}/memory` | Debug: inspect session preferences |
| POST | `/session/{id}/synthesize` | Convert text to speech via Nova 2 Sonic |

---

## Running Locally

### Prerequisites
- Python 3.11+
- Node.js 22.12+
- AWS account with Bedrock access (Nova 2 Lite + Sonic enabled in us-east-1)

### Backend setup

```bash
cd backend
pip install -r requirements.txt
```

Create a `.env` file in `backend/`:
```env
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_DEFAULT_REGION=us-east-1
TICKETMASTER_API_KEY=your_key
GOOGLE_PLACES_API_KEY=your_key
AMADEUS_API_KEY=your_key
AMADEUS_API_SECRET=your_secret
```

Start the server:
```bash
python main.py
```

API docs available at: `http://localhost:8000/docs`

### Frontend setup

```bash
cd frontend
npm install
```

Create a `.env.local` file in `frontend/`:
```env
VITE_API_URL=http://localhost:8000
```

Start the dev server:
```bash
npm run dev
```

### Mock mode

All agents default to `USE_MOCK = True` for local development without API keys. To enable real API calls, set `USE_MOCK = False` in the relevant agent file once your keys are configured.

---

## Judging Criteria Alignment

| Criteria | Weight | How Nova Travel addresses it |
|---|---|---|
| **Technical Implementation** | 60% | Multi-agent parallel architecture, Nova 2 Lite orchestration, Nova 2 Sonic voice I/O, Nova Act UI automation, thread-safe session memory, selective feedback re-runs |
| **Enterprise / Community Impact** | 20% | Democratizes travel planning for users who lack time or expertise; reduces planning time from hours to seconds; accessible via voice for users with limited mobility |
| **Creativity & Innovation** | 20% | Voice-first end-to-end travel booking using all four Nova product lines simultaneously; persistent preference memory across conversational turns; parallel specialist agent architecture |

---

## Team

| Name | Role |
|---|---|
| Akash Vasan | Backend — FastAPI, agent architecture, session memory, API integrations |
| Sai | Frontend — React, Vite, UI/UX, Tailwind CSS |

---

## Hackathon Submission

- **Event:** Amazon Nova AI Hackathon
- **Category:** Agentic AI (also eligible: Voice AI)
- **Hashtag:** #AmazonNova
- **Devpost:** [https://devpost.com/your-submission-link](https://devpost.com/software/nova-travel)
