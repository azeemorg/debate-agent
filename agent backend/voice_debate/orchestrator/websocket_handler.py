"""
WebSocket Handler for Voice Debate
Manages WebSocket connections from the frontend client.
Routes messages to the appropriate handlers in the conversation pipeline.
"""
import asyncio
import base64
import json
import logging
import time
from typing import Optional

from fastapi import WebSocket, WebSocketDisconnect
from voice_debate.models.schemas import (
    WSMessageType,
    WSMessage,
    DebateStatus,
    ParticipantRole,
)
from voice_debate.orchestrator.session_manager import session_manager
from voice_debate.orchestrator.conversation_manager import ConversationManager

logger = logging.getLogger("voice_debate.websocket_handler")


class WebSocketHandler:
    """
    Handles WebSocket connections for voice debate sessions.
    
    Message Protocol:
    - Client sends JSON messages with { type, data, session_id }
    - Server responds with JSON messages in the same format
    - Audio data is sent as binary WebSocket frames or base64-encoded JSON
    """

    def __init__(self):
        self._active_connections: dict[str, WebSocket] = {}
        self._conversation_managers: dict[str, ConversationManager] = {}

    async def handle_connection(self, websocket: WebSocket, session_id: str):
        """
        Main WebSocket connection handler.
        Called when a client connects for a debate session.
        """
        await websocket.accept()
        self._active_connections[session_id] = websocket
        logger.info(f"WebSocket connected for session {session_id}")

        # Validate session exists
        session = session_manager.get_session(session_id)
        if not session:
            await self._send_error(websocket, "Invalid session ID")
            await websocket.close()
            return

        # Send session info to client
        await self._send_json(websocket, WSMessageType.SESSION_INFO, {
            "session_id": session.session_id,
            "topic": session.topic,
            "status": session.status.value,
            "ai_stance": session.ai_stance,
            "round": session.current_round,
        })

        # Create conversation manager with WebSocket send callback
        async def send_ws_msg(msg_type: WSMessageType, data: dict):
            await self._send_json(websocket, msg_type, data)

        debate_agent = session_manager.get_debate_agent(session_id)
        eval_agent = session_manager.get_evaluation_agent(session_id)

        conv_manager = ConversationManager(
            session=session,
            debate_agent=debate_agent,
            eval_agent=eval_agent,
            send_ws_message=send_ws_msg,
        )
        self._conversation_managers[session_id] = conv_manager

        try:
            # Start the conversation pipeline (connects to Deepgram)
            await conv_manager.start()

            # Message loop
            while True:
                message = await websocket.receive()

                if message.get("type") == "websocket.disconnect":
                    break

                # Handle binary audio data
                if "bytes" in message and message["bytes"]:
                    await conv_manager.process_audio(message["bytes"])
                    continue

                # Handle text (JSON) messages
                if "text" in message and message["text"]:
                    await self._handle_text_message(
                        websocket, session_id, message["text"], conv_manager
                    )

        except WebSocketDisconnect:
            logger.info(f"WebSocket disconnected for session {session_id}")
        except Exception as e:
            logger.error(f"WebSocket error for session {session_id}: {e}", exc_info=True)
        finally:
            # Clean up
            await conv_manager.stop()
            self._active_connections.pop(session_id, None)
            self._conversation_managers.pop(session_id, None)
            logger.info(f"WebSocket handler cleaned up for session {session_id}")

    async def _handle_text_message(
        self,
        websocket: WebSocket,
        session_id: str,
        raw_text: str,
        conv_manager: ConversationManager,
    ):
        """Route incoming JSON messages to appropriate handlers."""
        try:
            data = json.loads(raw_text)
            msg_type = data.get("type", "")
            msg_data = data.get("data", {})

            if msg_type == WSMessageType.START_DEBATE:
                session_manager.start_session(session_id)
                await self._send_json(websocket, WSMessageType.STATUS_UPDATE, {
                    "status": "active",
                    "message": "Debate started!"
                })
                # AI delivers an unprompted opening statement to kick off the debate
                asyncio.create_task(
                    conv_manager.handle_text_input(
                        "[Opening: Start the debate. Give a sharp, confident opening argument in 2-3 sentences. Set the tone.]"
                    )
                )

            elif msg_type == WSMessageType.TRANSCRIPT:
                # Text-based input (fallback when mic not available)
                text = msg_data.get("text", "")
                if text:
                    await conv_manager.handle_text_input(text)

            elif msg_type == WSMessageType.INTERRUPT:
                conv_manager._is_ai_speaking = False
                conv_manager.debate_agent.interrupt()
                await self._send_json(websocket, WSMessageType.STATUS_UPDATE, {
                    "status": "interrupted"
                })

            elif msg_type == WSMessageType.END_DEBATE:
                session = session_manager.end_session(session_id)
                if session:
                    # Run final evaluation
                    eval_agent = session_manager.get_evaluation_agent(session_id)
                    if eval_agent:
                        cumulative = eval_agent.get_cumulative_scores()
                    else:
                        cumulative = {}

                    await self._send_json(websocket, WSMessageType.STATUS_UPDATE, {
                        "status": "finished",
                        "summary": session_manager.get_session_summary(session_id),
                        "scores": cumulative,
                    })

            elif msg_type == WSMessageType.PAUSE:
                session = session_manager.get_session(session_id)
                if session:
                    session.status = DebateStatus.PAUSED
                    await self._send_json(websocket, WSMessageType.STATUS_UPDATE, {
                        "status": "paused"
                    })

            elif msg_type == WSMessageType.RESUME:
                session = session_manager.get_session(session_id)
                if session:
                    session.status = DebateStatus.ACTIVE
                    await self._send_json(websocket, WSMessageType.STATUS_UPDATE, {
                        "status": "active"
                    })

            elif msg_type == "audio_data":
                # Base64-encoded audio in JSON (alternative to binary frames)
                audio_b64 = msg_data.get("audio", "")
                if audio_b64:
                    audio_bytes = base64.b64decode(audio_b64)
                    await conv_manager.process_audio(audio_bytes)

            else:
                logger.warning(f"Unknown message type: {msg_type}")

        except json.JSONDecodeError:
            logger.warning(f"Invalid JSON from client: {raw_text[:100]}")
        except Exception as e:
            logger.error(f"Error handling message: {e}", exc_info=True)
            await self._send_error(websocket, str(e))

    async def _send_json(self, websocket: WebSocket, msg_type: WSMessageType, data: dict):
        """Send a JSON message to the client."""
        try:
            message = {
                "type": msg_type.value if isinstance(msg_type, WSMessageType) else msg_type,
                "data": data,
                "timestamp": time.time(),
            }
            await websocket.send_json(message)
        except Exception as e:
            logger.error(f"Error sending WebSocket message: {e}")

    async def _send_error(self, websocket: WebSocket, message: str):
        """Send an error message to the client."""
        await self._send_json(websocket, WSMessageType.ERROR, {"message": message})

    def get_active_session_ids(self) -> list[str]:
        """Get IDs of sessions with active WebSocket connections."""
        return list(self._active_connections.keys())


# Singleton
ws_handler = WebSocketHandler()
