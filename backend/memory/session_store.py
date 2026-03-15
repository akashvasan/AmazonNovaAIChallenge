import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import uuid
import config
from datetime import datetime, timedelta
from threading import Lock
from typing import Optional

from models.schemas import UserPreferences, TripIntent, Itinerary, TripBudgetTier


# ── Session data container ────────────────────────────────────────────────────

class Session:
    def __init__(self, session_id: str):
        self.session_id:        str                    = session_id
        self.created_at:        datetime               = datetime.utcnow()
        self.last_active:       datetime               = datetime.utcnow()

        # Core trip state
        self.intent:            Optional[TripIntent]   = None
        self.preferences:       UserPreferences        = UserPreferences()

        # Latest generated itineraries (up to 2)
        self.itineraries:       list[Itinerary]        = []
        self.chosen_tier:       Optional[TripBudgetTier] = None

        # Conversation history (raw utterances for context)
        self.conversation:      list[dict]             = []

        # Track which agents need re-running on next feedback turn
        self.dirty_agents:      set[str]               = set()

    def touch(self):
        """Update last active timestamp."""
        self.last_active = datetime.utcnow()

    def add_utterance(self, role: str, text: str):
        """Append a turn to conversation history."""
        self.conversation.append({
            "role":      role,   # "user" | "assistant"
            "text":      text,
            "timestamp": datetime.utcnow().isoformat(),
        })

    def update_preferences(self, updated: UserPreferences):
        """
        Merge new preferences into the session.
        Lists are unioned; scalar fields are overwritten only if provided.
        """
        self.preferences.dietary_restrictions = list(set(
            self.preferences.dietary_restrictions + updated.dietary_restrictions
        ))
        self.preferences.disliked_cuisines = list(set(
            self.preferences.disliked_cuisines + updated.disliked_cuisines
        ))
        self.preferences.preferred_cuisines = list(set(
            self.preferences.preferred_cuisines + updated.preferred_cuisines
        ))
        self.preferences.accessibility_needs = list(set(
            self.preferences.accessibility_needs + updated.accessibility_needs
        ))
        self.preferences.hotel_preferences = list(set(
            self.preferences.hotel_preferences + updated.hotel_preferences
        ))
        if updated.flight_time is not None:
            self.preferences.flight_time = updated.flight_time

        # Sync back into intent so agents always read fresh preferences
        if self.intent:
            self.intent.preferences = self.preferences

    def mark_dirty(self, *agent_names: str):
        """Flag agents that need to re-run on next feedback turn."""
        self.dirty_agents.update(agent_names)

    def clear_dirty(self):
        """Clear dirty flags after a successful re-run."""
        self.dirty_agents.clear()

    def is_expired(self, ttl_minutes: int = 120) -> bool:
        return datetime.utcnow() > self.last_active + timedelta(minutes=ttl_minutes)

    def summary(self) -> dict:
        """Lightweight dict for debugging / GET /session/{id}/memory."""
        return {
            "session_id":      self.session_id,
            "created_at":      self.created_at.isoformat(),
            "last_active":     self.last_active.isoformat(),
            "destination":     self.intent.destination if self.intent else None,
            "budget_usd":      self.intent.budget_usd  if self.intent else None,
            "preferences":     self.preferences.model_dump(),
            "itinerary_tiers": [i.tier for i in self.itineraries],
            "chosen_tier":     self.chosen_tier,
            "dirty_agents":    list(self.dirty_agents),
            "turns":           len(self.conversation),
        }


# ── Session store ─────────────────────────────────────────────────────────────

class SessionStore:
    """
    Thread-safe in-memory session store.
    For production, swap the _store dict for Redis or DynamoDB.
    """

    def __init__(self, ttl_minutes: int = 120):
        self._store:       dict[str, Session] = {}
        self._lock:        Lock               = Lock()
        self._ttl_minutes: int                = ttl_minutes

    # ── CRUD ─────────────────────────────────────────────────────────────────

    def create(self) -> Session:
        """Create a new session and return it."""
        session_id = str(uuid.uuid4())
        session    = Session(session_id)
        with self._lock:
            self._store[session_id] = session
        return session

    def get(self, session_id: str) -> Session:
        """
        Retrieve a session by ID.
        Raises KeyError if not found or expired.
        """
        with self._lock:
            session = self._store.get(session_id)
        if session is None:
            raise KeyError(f"Session '{session_id}' not found.")
        if session.is_expired(self._ttl_minutes):
            self.delete(session_id)
            raise KeyError(f"Session '{session_id}' has expired.")
        session.touch()
        return session

    def delete(self, session_id: str):
        with self._lock:
            self._store.pop(session_id, None)

    def purge_expired(self):
        """Remove all expired sessions. Call periodically (e.g. via background task)."""
        with self._lock:
            expired = [
                sid for sid, s in self._store.items()
                if s.is_expired(self._ttl_minutes)
            ]
            for sid in expired:
                del self._store[sid]
        return len(expired)

    # ── Preference helpers ────────────────────────────────────────────────────

    def update_preferences(self, session_id: str, updated: UserPreferences) -> Session:
        session = self.get(session_id)
        session.update_preferences(updated)
        return session

    def get_preferences(self, session_id: str) -> UserPreferences:
        return self.get(session_id).preferences

    # ── Itinerary helpers ─────────────────────────────────────────────────────

    def store_itineraries(self, session_id: str, itineraries: list[Itinerary]) -> Session:
        session = self.get(session_id)
        session.itineraries = itineraries
        return session

    def get_itineraries(self, session_id: str) -> list[Itinerary]:
        return self.get(session_id).itineraries

    def set_chosen_tier(self, session_id: str, tier: TripBudgetTier) -> Session:
        session = self.get(session_id)
        session.chosen_tier = tier
        return session

    # ── Dirty agent tracking ──────────────────────────────────────────────────

    def mark_dirty(self, session_id: str, *agent_names: str) -> Session:
        session = self.get(session_id)
        session.mark_dirty(*agent_names)
        return session

    def get_dirty_agents(self, session_id: str) -> set[str]:
        return self.get(session_id).dirty_agents

    def clear_dirty(self, session_id: str) -> Session:
        session = self.get(session_id)
        session.clear_dirty()
        return session

    # ── Conversation history ──────────────────────────────────────────────────

    def add_utterance(self, session_id: str, role: str, text: str) -> Session:
        session = self.get(session_id)
        session.add_utterance(role, text)
        return session

    def get_conversation(self, session_id: str) -> list[dict]:
        return self.get(session_id).conversation

    # ── Debug ─────────────────────────────────────────────────────────────────

    def summary(self, session_id: str) -> dict:
        return self.get(session_id).summary()

    def active_count(self) -> int:
        with self._lock:
            return sum(
                1 for s in self._store.values()
                if not s.is_expired(self._ttl_minutes)
            )


# ── Singleton ─────────────────────────────────────────────────────────────────
# Import this instance everywhere — one store for the whole app lifetime.

store = SessionStore(ttl_minutes=120)
