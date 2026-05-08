"""
Voice Debate API Router
FastAPI router providing REST endpoints and WebSocket connections
for the voice debate system.
"""
import logging
from fastapi import APIRouter, WebSocket, HTTPException
from voice_debate.config import config
from voice_debate.models.schemas import (
    CreateDebateRequest,
    CreateDebateResponse,
)
from voice_debate.voice.livekit_service import LiveKitService
from voice_debate.orchestrator.session_manager import session_manager
from voice_debate.orchestrator.websocket_handler import ws_handler

logger = logging.getLogger("voice_debate.router")

# Create the router — will be mounted on /api/voice-debate
router = APIRouter(prefix="/api/voice-debate", tags=["Voice Debate"])

# Services
livekit_service = LiveKitService()


# ──────────────────────────────────────────
# REST Endpoints
# ──────────────────────────────────────────

@router.get("/health")
async def health_check():
    """Health check endpoint for the voice debate system."""
    warnings = config.validate()
    return {
        "status": "ok" if not warnings else "degraded",
        "service": "voice-debate",
        "warnings": warnings,
        "active_sessions": len(session_manager.get_active_sessions()),
    }


@router.post("/sessions", response_model=CreateDebateResponse)
async def create_debate_session(request: CreateDebateRequest):
    """
    Create a new voice debate session.
    
    Returns session ID, LiveKit token, and connection details.
    The client should:
    1. Connect to LiveKit using the provided token
    2. Open a WebSocket to /api/voice-debate/ws/{session_id}
    3. Start streaming audio
    """
    try:
        # Create session with agents
        session = session_manager.create_session(request)

        # Generate LiveKit tokens
        livekit_data = livekit_service.generate_debate_tokens(
            session_id=session.session_id,
            user_name=request.user_name,
        )

        # Store room name in session
        session.livekit_room_name = livekit_data["room_name"]

        logger.info(f"Debate session created: {session.session_id}")

        return CreateDebateResponse(
            session_id=session.session_id,
            livekit_token=livekit_data["user_token"],
            livekit_url=livekit_data["livekit_url"],
            topic=session.topic,
            status=session.status.value,
        )

    except Exception as e:
        logger.error(f"Failed to create debate session: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sessions/{session_id}")
async def get_session(session_id: str):
    """Get the current state of a debate session."""
    summary = session_manager.get_session_summary(session_id)
    if not summary:
        raise HTTPException(status_code=404, detail="Session not found")
    return summary


@router.post("/sessions/{session_id}/end")
async def end_debate_session(session_id: str):
    """End a debate session and get final results."""
    # Get evaluation data BEFORE ending (end_session removes agents)
    eval_agent = session_manager.get_evaluation_agent(session_id)
    cumulative = eval_agent.get_cumulative_scores() if eval_agent else {}

    session = session_manager.end_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    return {
        "status": "finished",
        "summary": session_manager.get_session_summary(session_id),
        "scores": cumulative,
        "messages": [
            {"role": m.role.value, "content": m.content, "timestamp": m.timestamp}
            for m in session.messages
        ],
        "evaluations": [e.model_dump() for e in session.evaluations],
    }


@router.delete("/sessions/{session_id}")
async def delete_session(session_id: str):
    """Delete a session and free all resources."""
    session_manager.remove_session(session_id)
    return {"status": "deleted", "session_id": session_id}


@router.get("/voices")
async def get_available_voices():
    """Get available ElevenLabs voices for the debate."""
    from voice_debate.voice.elevenlabs_tts import ElevenLabsTTSService
    tts = ElevenLabsTTSService()
    try:
        voices = await tts.get_available_voices()
        return {"voices": voices}
    finally:
        await tts.close()


# ──────────────────────────────────────────
# WebSocket Endpoint
# ──────────────────────────────────────────

@router.websocket("/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    """
    WebSocket endpoint for real-time voice debate communication.
    
    Protocol:
    - Send binary frames for raw audio data
    - Send JSON text frames for control messages
    - Receive JSON text frames for transcripts, AI responses, evaluations
    - Receive JSON with base64 audio for AI speech
    
    Message types (client → server):
    - { type: "start_debate", data: {} }
    - { type: "transcript", data: { text: "..." } }  (text fallback)
    - { type: "interrupt", data: {} }
    - { type: "end_debate", data: {} }
    - { type: "audio_data", data: { audio: "<base64>" } }
    - Binary frames: raw audio bytes
    
    Message types (server → client):
    - { type: "session_info", data: { ... } }
    - { type: "ai_response_start", data: { round: N } }
    - { type: "ai_response_chunk", data: { text: "...", type: "ai_text" } }
    - { type: "ai_response_end", data: { full_response: "..." } }
    - { type: "ai_audio_chunk", data: { audio: "<base64>", format: "mp3" } }
    - { type: "evaluation_update", data: { ... } }
    - { type: "status_update", data: { status: "..." } }
    - { type: "error", data: { message: "..." } }
    """
    await ws_handler.handle_connection(websocket, session_id)


# ──────────────────────────────────────────
# Text-based fallback endpoint (for testing without mic)
# ──────────────────────────────────────────

@router.post("/sessions/{session_id}/message")
async def send_text_message(session_id: str, body: dict):
    """
    Send a text message to the debate agent (fallback for non-voice input).
    Returns the AI response as text.
    """
    text = body.get("text", "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="Text is required")

    debate_agent = session_manager.get_debate_agent(session_id)
    if not debate_agent:
        raise HTTPException(status_code=404, detail="Session not found")

    session = session_manager.get_session(session_id)

    # Generate response
    full_response = ""
    for chunk in debate_agent.stream_response(text):
        full_response += chunk

    # Store messages
    from voice_debate.models.schemas import DebateMessage, ParticipantRole
    session.messages.append(DebateMessage(role=ParticipantRole.HUMAN, content=text))
    session.messages.append(DebateMessage(role=ParticipantRole.AI, content=full_response))
    session.current_round += 1

    # Trigger evaluation
    eval_agent = session_manager.get_evaluation_agent(session_id)
    evaluation = None
    if eval_agent:
        history = debate_agent.get_history_as_dicts()
        evaluation = eval_agent.evaluate_sync(history, session.current_round)

    return {
        "response": full_response,
        "round": session.current_round,
        "evaluation": evaluation.model_dump() if evaluation else None,
    }
