"""
Pydantic schemas for the Voice Debate system.
Defines all request/response models, session state, and evaluation structures.
"""
from pydantic import BaseModel, Field
from typing import Optional
from enum import Enum
import time
import uuid


# ──────────────────────────────────────────
# Enums
# ──────────────────────────────────────────
class DebateStatus(str, Enum):
    WAITING = "waiting"
    ACTIVE = "active"
    PAUSED = "paused"
    FINISHED = "finished"


class ParticipantRole(str, Enum):
    HUMAN = "human"
    AI = "ai"
    EVALUATOR = "evaluator"


# ──────────────────────────────────────────
# Request / Response Models
# ──────────────────────────────────────────
class CreateDebateRequest(BaseModel):
    """Request to create a new voice debate session."""
    model_config = {'protected_namespaces': ()}
    topic: str = Field(..., min_length=3, max_length=500, description="Debate topic")
    user_name: str = Field(default="Debater", max_length=100)
    ai_stance: str = Field(default="against", description="'for' or 'against' the topic")
    provider: str = Field(default="Groq", description="LLM provider: Groq or Gemini")
    model_name: str = Field(default="llama-3.3-70b-versatile")
    allow_search: bool = Field(default=True)
    voice_id: str = Field(default="21m00Tcm4TlvDq8ikWAM", description="ElevenLabs voice ID")
    max_duration_seconds: int = Field(default=600, ge=60, le=3600)


class CreateDebateResponse(BaseModel):
    """Response after creating a debate session."""
    session_id: str
    livekit_token: str
    livekit_url: str
    topic: str
    status: str


class DebateMessage(BaseModel):
    """A single message in the debate conversation."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    role: ParticipantRole
    content: str
    timestamp: float = Field(default_factory=time.time)
    is_interruption: bool = False


class TranscriptEvent(BaseModel):
    """Event from Deepgram STT."""
    text: str
    is_final: bool
    confidence: float = 0.0
    timestamp: float = Field(default_factory=time.time)


class EvaluationResult(BaseModel):
    """Structured evaluation from the Evaluation Agent."""
    round_number: int = 0
    human_score: float = Field(default=0.0, ge=0, le=100)
    ai_score: float = Field(default=0.0, ge=0, le=100)
    human_strengths: list[str] = Field(default_factory=list)
    human_weaknesses: list[str] = Field(default_factory=list)
    ai_strengths: list[str] = Field(default_factory=list)
    ai_weaknesses: list[str] = Field(default_factory=list)
    logical_fallacies: list[str] = Field(default_factory=list)
    debate_summary: str = ""
    human_metrics: dict = Field(default_factory=lambda: {
        "confidence": 0, "clarity": 0, "relevance": 0,
        "persuasiveness": 0, "critical_thinking": 0, "communication": 0
    })
    ai_metrics: dict = Field(default_factory=lambda: {
        "confidence": 0, "clarity": 0, "relevance": 0,
        "persuasiveness": 0, "critical_thinking": 0, "communication": 0
    })
    feedback: str = ""
    timestamp: float = Field(default_factory=time.time)


class DebateSessionState(BaseModel):
    """Full state of a debate session."""
    model_config = {'protected_namespaces': ()}
    session_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    topic: str = ""
    status: DebateStatus = DebateStatus.WAITING
    user_name: str = "Debater"
    ai_stance: str = "against"
    provider: str = "Groq"
    model_name: str = "llama-3.3-70b-versatile"
    allow_search: bool = True
    voice_id: str = "21m00Tcm4TlvDq8ikWAM"
    max_duration_seconds: int = 600
    messages: list[DebateMessage] = Field(default_factory=list)
    evaluations: list[EvaluationResult] = Field(default_factory=list)
    current_round: int = 0
    created_at: float = Field(default_factory=time.time)
    started_at: Optional[float] = None
    ended_at: Optional[float] = None
    livekit_room_name: Optional[str] = None


# ──────────────────────────────────────────
# WebSocket Message Types
# ──────────────────────────────────────────
class WSMessageType(str, Enum):
    # Client → Server
    TRANSCRIPT = "transcript"
    START_DEBATE = "start_debate"
    END_DEBATE = "end_debate"
    INTERRUPT = "interrupt"
    PAUSE = "pause"
    RESUME = "resume"

    # Server → Client
    AI_RESPONSE_START = "ai_response_start"
    AI_RESPONSE_CHUNK = "ai_response_chunk"
    AI_RESPONSE_END = "ai_response_end"
    AI_AUDIO_CHUNK = "ai_audio_chunk"
    AI_AUDIO_END = "ai_audio_end"
    EVALUATION_UPDATE = "evaluation_update"
    STATUS_UPDATE = "status_update"
    ERROR = "error"
    SESSION_INFO = "session_info"


class WSMessage(BaseModel):
    """WebSocket message envelope."""
    type: WSMessageType
    data: dict = Field(default_factory=dict)
    session_id: Optional[str] = None
    timestamp: float = Field(default_factory=time.time)
