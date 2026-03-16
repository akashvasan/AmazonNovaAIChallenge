import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import asyncio
import base64
import json
import os
import tempfile

import boto3
from botocore.exceptions import BotoCoreError, ClientError

# ── Mock flag ─────────────────────────────────────────────────────────────────
USE_MOCK = True

# ── Bedrock client ────────────────────────────────────────────────────────────

def _get_bedrock_client():
    return boto3.client("bedrock-runtime", region_name="us-east-1")


# ── Mock responses ────────────────────────────────────────────────────────────

# Simulated transcripts for demo — cycles through a realistic conversation
MOCK_TRANSCRIPTS = [
    "I want to plan a trip to Miami for 3 days in late April, my budget is around 1500 dollars.",
    "I don't like seafood, can you remove any seafood restaurants?",
    "Actually I want to fly at night instead.",
    "Let's go with the budget option.",
    "Yes, go ahead and book it!",
]
_mock_transcript_index = 0


def _mock_transcribe(audio_base64: str) -> str:
    """Return the next mock transcript in the sequence."""
    global _mock_transcript_index
    transcript = MOCK_TRANSCRIPTS[_mock_transcript_index % len(MOCK_TRANSCRIPTS)]
    _mock_transcript_index += 1
    return transcript


def _mock_synthesize(text: str) -> str:
    """Return a placeholder base64 string representing audio."""
    # In a real demo this would be actual audio bytes
    placeholder = f"[MOCK AUDIO]: {text}"
    return base64.b64encode(placeholder.encode()).decode()


# ── Real Nova 2 Sonic calls ───────────────────────────────────────────────────

def _transcribe_audio(audio_base64: str) -> str:
    """
    Send audio to Nova 2 Sonic for speech-to-text transcription.
    Audio should be base64-encoded WAV or MP3.
    """
    client = _get_bedrock_client()

    payload = {
        "audio": {
            "type":      "base64",
            "mediaType": "audio/wav",
            "data":      audio_base64,
        },
        "inferenceConfig": {
            "maxTokens":   512,
            "temperature": 0.0,
        }
    }

    response = client.invoke_model(
        modelId      = "amazon.nova-sonic-v1:0",
        body         = json.dumps(payload),
        contentType  = "application/json",
        accept       = "application/json",
    )

    body = json.loads(response["body"].read())
    return body["output"]["message"]["content"][0]["text"].strip()


def _synthesize_speech(text: str) -> str:
    """
    Send text to Nova 2 Sonic for text-to-speech synthesis.
    Returns base64-encoded audio bytes (WAV format).
    """
    client = _get_bedrock_client()

    payload = {
        "messages": [
            {
                "role":    "user",
                "content": [{"type": "text", "text": text}]
            }
        ],
        "inferenceConfig": {
            "maxTokens": 1024,
            "voice":     "tiffany",   # Nova Sonic voice options: tiffany, matthew
        }
    }

    response = client.invoke_model(
        modelId     = "amazon.nova-sonic-v1:0",
        body        = json.dumps(payload),
        contentType = "application/json",
        accept      = "application/json",
    )

    body       = json.loads(response["body"].read())
    audio_data = body["output"]["audio"]["data"]   # already base64
    return audio_data


# ── Audio validation ──────────────────────────────────────────────────────────

def _validate_audio(audio_base64: str) -> bool:
    """
    Basic validation — check the base64 payload is non-empty
    and decodes to a reasonable size (> 1KB).
    """
    try:
        decoded = base64.b64decode(audio_base64)
        return len(decoded) > 1024
    except Exception:
        return False


# ── Public API ────────────────────────────────────────────────────────────────

async def transcribe(audio_base64: str) -> str:
    """
    Convert base64 audio to transcript text.
    Returns the transcribed string.
    """
    if USE_MOCK:
        return await asyncio.to_thread(_mock_transcribe, audio_base64)

    if not _validate_audio(audio_base64):
        raise ValueError("Invalid or empty audio payload.")

    try:
        return await asyncio.to_thread(_transcribe_audio, audio_base64)
    except (BotoCoreError, ClientError) as e:
        print(f"[sonic_handler] Transcription error: {e} — using mock")
        return _mock_transcribe(audio_base64)


async def synthesize(text: str) -> str:
    """
    Convert text to base64-encoded audio for playback in the frontend.
    Returns a base64 string the frontend can play directly.
    """
    if USE_MOCK:
        return await asyncio.to_thread(_mock_synthesize, text)

    try:
        return await asyncio.to_thread(_synthesize_speech, text)
    except (BotoCoreError, ClientError) as e:
        print(f"[sonic_handler] Synthesis error: {e} — using mock")
        return _mock_synthesize(text)


async def transcribe_and_respond(audio_base64: str, response_text: str) -> tuple[str, str]:
    """
    Convenience function — transcribe incoming audio and synthesize
    the response audio in one call.
    Returns (transcript, response_audio_base64).
    """
    transcript, response_audio = await asyncio.gather(
        transcribe(audio_base64),
        synthesize(response_text),
    )
    return transcript, response_audio