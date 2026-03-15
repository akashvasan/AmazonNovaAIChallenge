import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import json
import asyncio
from typing import Optional

import boto3
from botocore.exceptions import BotoCoreError, ClientError

from models.schemas import (
    TripIntent, UserPreferences, FeedbackRequest, FeedbackType,
    VoiceInputResponse
)
from memory.session_store import store

USE_MOCK = True

def _get_bedrock_client():
    return boto3.client("bedrock-runtime", region_name="us-east-1")

INTENT_EXTRACTION_PROMPT = """
You are the orchestrator of a travel planning AI. 
Given the user utterance, extract a structured trip intent.

Return ONLY a valid JSON object with these fields (omit fields you cannot determine):
{{
  "destination": "string",
  "origin": "string or null",
  "departure_date": "YYYY-MM-DD or null",
  "return_date": "YYYY-MM-DD or null",
  "duration_days": "integer or null",
  "budget_usd": "float or null",
  "num_travelers": "integer, default 1",
  "preferences": {{
    "dietary_restrictions": ["list of strings"],
    "disliked_cuisines": ["list of strings"],
    "preferred_cuisines": ["list of strings"],
    "flight_time": "morning | afternoon | night | null",
    "hotel_preferences": ["list of strings"],
    "accessibility_needs": ["list of strings"]
  }}
}}

User utterance: {utterance}
""".strip()

FEEDBACK_CLASSIFICATION_PROMPT = """
You are classifying user feedback during a travel planning conversation.

Feedback types:
- preference_update: food/dietary preferences e.g. "I don't like seafood"
- schedule_change: flight or timing changes e.g. "I want to fly at night"
- budget_shift: budget changes e.g. "can we go cheaper?"
- swap_request: replace a specific item e.g. "swap Day 2 dinner"
- full_restart: change destination e.g. "let's go to New York instead"

Return ONLY a valid JSON object:
{{
  "feedback_type": "one of the types above",
  "affected_agents": ["flight_agent", "hotel_agent", "events_agent", "food_agent", "itinerary_agent"],
  "updated_preferences": {{
    "dietary_restrictions": [],
    "disliked_cuisines": [],
    "preferred_cuisines": [],
    "flight_time": null,
    "hotel_preferences": [],
    "accessibility_needs": []
  }},
  "summary": "one sentence describing what changed"
}}

Conversation so far:
{conversation}

Latest user utterance: {utterance}
""".strip()

async def _call_nova_lite(prompt: str) -> str:
    if USE_MOCK:
        return _mock_nova_response(prompt)
    try:
        client = _get_bedrock_client()
        response = await asyncio.to_thread(
            client.invoke_model,
            modelId="amazon.nova-lite-v1:0",
            body=json.dumps({
                "messages": [{"role": "user", "content": prompt}],
                "inferenceConfig": {"max_new_tokens": 1024, "temperature": 0.1}
            }),
            contentType="application/json",
            accept="application/json"
        )
        body = json.loads(response["body"].read())
        return body["output"]["message"]["content"][0]["text"]
    except (BotoCoreError, ClientError) as e:
        print(f"[orchestrator] Bedrock error: {e} — falling back to mock")
        return _mock_nova_response(prompt)

def _mock_nova_response(prompt: str) -> str:
    if "extract a structured trip intent" in prompt:
        return json.dumps({
            "destination": "Miami", "origin": "Dallas",
            "departure_date": "2026-04-24", "return_date": "2026-04-27",
            "duration_days": 3, "budget_usd": 1500.0, "num_travelers": 1,
            "preferences": {
                "dietary_restrictions": [], "disliked_cuisines": [],
                "preferred_cuisines": [], "flight_time": "morning",
                "hotel_preferences": [], "accessibility_needs": []
            }
        })
    if "classifying user feedback" in prompt:
        u = prompt.lower()
        if any(w in u for w in ["seafood", "vegetarian", "vegan", "gluten", "nut"]):
            return json.dumps({
                "feedback_type": "preference_update",
                "affected_agents": ["food_agent", "itinerary_agent"],
                "updated_preferences": {"dietary_restrictions": ["no seafood"], "disliked_cuisines": [], "preferred_cuisines": [], "flight_time": None, "hotel_preferences": [], "accessibility_needs": []},
                "summary": "Removed seafood from restaurant recommendations."
            })
        if any(w in u for w in ["night", "morning", "afternoon", "evening", "flight"]):
            return json.dumps({
                "feedback_type": "schedule_change",
                "affected_agents": ["flight_agent", "itinerary_agent"],
                "updated_preferences": {"dietary_restrictions": [], "disliked_cuisines": [], "preferred_cuisines": [], "flight_time": "night", "hotel_preferences": [], "accessibility_needs": []},
                "summary": "Updated flight preference to night departure."
            })
        if any(w in u for w in ["cheaper", "budget", "expensive", "more money", "spend more"]):
            return json.dumps({
                "feedback_type": "budget_shift",
                "affected_agents": ["flight_agent", "hotel_agent", "itinerary_agent"],
                "updated_preferences": {"dietary_restrictions": [], "disliked_cuisines": [], "preferred_cuisines": [], "flight_time": None, "hotel_preferences": [], "accessibility_needs": []},
                "summary": "Adjusted budget constraints."
            })
        return json.dumps({
            "feedback_type": "swap_request",
            "affected_agents": ["itinerary_agent"],
            "updated_preferences": {"dietary_restrictions": [], "disliked_cuisines": [], "preferred_cuisines": [], "flight_time": None, "hotel_preferences": [], "accessibility_needs": []},
            "summary": "Swapped the requested item in the itinerary."
        })
    return json.dumps({"error": "unrecognised prompt"})

def _parse_json_response(raw: str) -> dict:
    cleaned = raw.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
    return json.loads(cleaned)

def _is_feedback(utterance: str, session_id: str) -> bool:
    try:
        itineraries = store.get_itineraries(session_id)
        if not itineraries:
            return False
        fresh_trip_keywords = ["plan a trip", "i want to go", "book a trip", "travel to"]
        return not any(kw in utterance.lower() for kw in fresh_trip_keywords)
    except KeyError:
        return False

async def extract_intent(utterance: str, session_id: str) -> TripIntent:
    prompt = INTENT_EXTRACTION_PROMPT.format(utterance=utterance)
    raw    = await _call_nova_lite(prompt)
    data   = _parse_json_response(raw)
    try:
        existing_prefs = store.get_preferences(session_id)
        prefs_data     = data.get("preferences", {})
        merged_prefs   = UserPreferences(
            dietary_restrictions = list(set(existing_prefs.dietary_restrictions + prefs_data.get("dietary_restrictions", []))),
            disliked_cuisines    = list(set(existing_prefs.disliked_cuisines    + prefs_data.get("disliked_cuisines", []))),
            preferred_cuisines   = list(set(existing_prefs.preferred_cuisines   + prefs_data.get("preferred_cuisines", []))),
            flight_time          = prefs_data.get("flight_time") or existing_prefs.flight_time,
            hotel_preferences    = list(set(existing_prefs.hotel_preferences    + prefs_data.get("hotel_preferences", []))),
            accessibility_needs  = list(set(existing_prefs.accessibility_needs  + prefs_data.get("accessibility_needs", []))),
        )
    except KeyError:
        merged_prefs = UserPreferences(**data.get("preferences", {}))
    intent = TripIntent(
        destination    = data.get("destination", "Unknown"),
        origin         = data.get("origin"),
        departure_date = data.get("departure_date"),
        return_date    = data.get("return_date"),
        duration_days  = data.get("duration_days"),
        budget_usd     = data.get("budget_usd"),
        num_travelers  = data.get("num_travelers", 1),
        preferences    = merged_prefs,
    )
    session             = store.get(session_id)
    session.intent      = intent
    session.preferences = merged_prefs
    store.add_utterance(session_id, "user", utterance)
    return intent

async def classify_feedback(utterance: str, session_id: str) -> FeedbackRequest:
    conversation = store.get_conversation(session_id)
    convo_text   = "\n".join(f"{t['role'].upper()}: {t['text']}" for t in conversation[-6:])
    prompt = FEEDBACK_CLASSIFICATION_PROMPT.format(conversation=convo_text, utterance=utterance)
    raw    = await _call_nova_lite(prompt)
    data   = _parse_json_response(raw)
    updated_prefs = UserPreferences(**data.get("updated_preferences", {}))
    if any([updated_prefs.dietary_restrictions, updated_prefs.disliked_cuisines,
            updated_prefs.preferred_cuisines, updated_prefs.flight_time,
            updated_prefs.hotel_preferences, updated_prefs.accessibility_needs]):
        store.update_preferences(session_id, updated_prefs)
    affected = data.get("affected_agents", [])
    store.mark_dirty(session_id, *affected)
    store.add_utterance(session_id, "user", utterance)
    return FeedbackRequest(
        session_id          = session_id,
        raw_text            = utterance,
        feedback_type       = FeedbackType(data.get("feedback_type", "swap_request")),
        affected_agents     = affected,
        updated_preferences = updated_prefs,
    )

async def process_utterance(utterance: str, session_id: str) -> VoiceInputResponse:
    if _is_feedback(utterance, session_id):
        feedback = await classify_feedback(utterance, session_id)
        return VoiceInputResponse(session_id=session_id, transcript=utterance, feedback=feedback)
    else:
        intent = await extract_intent(utterance, session_id)
        return VoiceInputResponse(session_id=session_id, transcript=utterance, intent=intent)
