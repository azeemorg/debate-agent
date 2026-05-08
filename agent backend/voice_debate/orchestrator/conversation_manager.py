"""
Conversation Manager
Orchestrates the full voice debate pipeline:
Audio → STT → Debate Agent → TTS → Audio playback

Handles the real-time flow between all services and manages
interruptions, turn-taking, and evaluation triggers.
"""
import asyncio
import base64
import json
import logging
import time
from typing import Optional, Callable

from voice_debate.agents.debate_agent import VoiceDebateAgent
from voice_debate.agents.evaluation_agent import EvaluationAgent
from voice_debate.voice.deepgram_stt import DeepgramSTTService
from voice_debate.voice.elevenlabs_tts import ElevenLabsTTSService
from voice_debate.models.schemas import (
    DebateSessionState,
    DebateMessage,
    ParticipantRole,
    WSMessageType,
    EvaluationResult,
)

logger = logging.getLogger("voice_debate.conversation_manager")


class ConversationManager:
    """
    Manages the full conversation flow for a single debate session.
    
    Pipeline:
    1. Receives audio from client
    2. Streams to Deepgram for STT
    3. On final transcript → sends to Debate Agent
    4. Streams AI response text
    5. Sends text chunks to ElevenLabs for TTS
    6. Streams audio back to client
    7. Triggers Evaluation Agent after each exchange
    """

    def __init__(
        self,
        session: DebateSessionState,
        debate_agent: VoiceDebateAgent,
        eval_agent: EvaluationAgent,
        send_ws_message: Callable,  # async function to send messages to client
    ):
        self.session = session
        self.debate_agent = debate_agent
        self.eval_agent = eval_agent
        self.send_ws_message = send_ws_message

        # STT Service
        self.stt_service = DeepgramSTTService(
            on_transcript=self._on_partial_transcript,
            on_final_transcript=self._on_final_transcript,
            on_utterance_end=self._on_utterance_end,
        )

        # TTS Service
        self.tts_service = ElevenLabsTTSService(
            voice_id=session.voice_id,
        )

        # State tracking
        self._is_ai_speaking = False
        self._pending_transcript = ""
        self._utterance_buffer = ""
        self._processing_lock = asyncio.Lock()
        self._eval_task: Optional[asyncio.Task] = None

        logger.info(f"ConversationManager created for session {session.session_id}")

    async def start(self):
        """Initialize services and start the conversation pipeline."""
        try:
            await self.stt_service.connect()
            logger.info(f"Conversation pipeline started for {self.session.session_id}")
        except Exception as e:
            logger.error(f"Failed to start conversation pipeline: {e}")
            await self.send_ws_message(
                WSMessageType.ERROR,
                {"message": f"Failed to connect to speech services: {str(e)}"}
            )
            raise

    async def process_audio(self, audio_data: bytes):
        """
        Process incoming audio from the client.
        Always forward to Deepgram; interruptions are handled when Deepgram detects speech.
        """
        # Forward audio to Deepgram
        await self.stt_service.send_audio(audio_data)

    async def _on_partial_transcript(self, text: str, confidence: float):
        """Handle partial (interim) transcript from Deepgram."""
        if not text.strip():
            return
            
        if self._is_ai_speaking:
            # User is speaking while AI is responding -> interrupt AI
            await self._handle_interruption()

        self._pending_transcript = text
        # Send partial transcript to frontend for live display
        await self.send_ws_message(
            WSMessageType.AI_RESPONSE_CHUNK,
            {
                "type": "partial_transcript",
                "text": text,
                "confidence": confidence,
            }
        )

    async def _on_final_transcript(self, text: str, confidence: float):
        """Handle finalized transcript from Deepgram."""
        self._utterance_buffer += " " + text
        self._pending_transcript = ""

        # Send final transcript to frontend
        await self.send_ws_message(
            WSMessageType.TRANSCRIPT,
            {
                "text": text,
                "is_final": True,
                "confidence": confidence,
            }
        )

    async def _on_utterance_end(self):
        """
        Called when Deepgram detects end of utterance (silence).
        This triggers the AI response pipeline.
        """
        transcript = self._utterance_buffer.strip()
        self._utterance_buffer = ""

        if not transcript or len(transcript) < 3:
            return  # Ignore very short/empty utterances

        logger.info(f"Utterance complete: '{transcript[:80]}...'")

        # Process in background to not block audio pipeline
        asyncio.create_task(self._process_user_turn(transcript))

    async def _process_user_turn(self, user_text: str):
        """Process a complete user turn: generate AI response + evaluation."""
        async with self._processing_lock:
            # Hidden system prompts (e.g. opening statement trigger) are NOT stored
            # as user messages and don't count as a debate round
            is_system_prompt = user_text.startswith("[Opening:")

            # 1. Store user message (only for real human turns)
            if not is_system_prompt:
                self.session.messages.append(
                    DebateMessage(role=ParticipantRole.HUMAN, content=user_text)
                )
                self.session.current_round += 1

            # 2. Signal AI response start
            await self.send_ws_message(
                WSMessageType.AI_RESPONSE_START,
                {"round": self.session.current_round}
            )

            # 3. Stream AI response + TTS
            self._is_ai_speaking = True
            full_response = ""

            try:
                # Collect text in sentence-sized chunks for TTS
                sentence_buffer = ""

                async for chunk in self.debate_agent.astream_response(user_text):
                    if not self._is_ai_speaking:
                        break  # Interrupted

                    full_response += chunk
                    sentence_buffer += chunk

                    # Send text chunk to frontend
                    await self.send_ws_message(
                        WSMessageType.AI_RESPONSE_CHUNK,
                        {"text": chunk, "type": "ai_text"}
                    )

                    # When we have a complete sentence, generate TTS
                    if self._is_sentence_complete(sentence_buffer):
                        await self._generate_and_send_audio(sentence_buffer.strip())
                        sentence_buffer = ""

                # Handle any remaining text
                if sentence_buffer.strip() and self._is_ai_speaking:
                    await self._generate_and_send_audio(sentence_buffer.strip())

            except Exception as e:
                logger.error(f"Error in AI response pipeline: {e}", exc_info=True)
                await self.send_ws_message(
                    WSMessageType.ERROR,
                    {"message": "AI response error"}
                )

            self._is_ai_speaking = False

            # 4. Signal AI response end
            await self.send_ws_message(
                WSMessageType.AI_RESPONSE_END,
                {"full_response": full_response}
            )

            # 5. Store AI message
            if full_response:
                self.session.messages.append(
                    DebateMessage(role=ParticipantRole.AI, content=full_response)
                )

            # 6. Trigger evaluation (async, non-blocking)
            if len(self.session.messages) >= 2:
                self._eval_task = asyncio.create_task(
                    self._run_evaluation()
                )

    async def _generate_and_send_audio(self, text: str):
        """
        Generate TTS audio and send to the client as a complete sentence audio file.
        (DISABLED: Frontend currently uses Browser TTS, so backend TTS is skipped to save quota and prevent 402 errors)
        """
        pass

    async def _handle_interruption(self):
        """Handle when user interrupts the AI mid-response."""
        logger.info("User interrupted AI response")
        self._is_ai_speaking = False
        self.debate_agent.interrupt()

        await self.send_ws_message(
            WSMessageType.STATUS_UPDATE,
            {"status": "interrupted", "message": "AI response interrupted"}
        )

    async def _run_evaluation(self):
        """Run the evaluation agent on the current conversation."""
        try:
            history = self.debate_agent.get_history_as_dicts()
            result = await self.eval_agent.evaluate(
                conversation_history=history,
                round_number=self.session.current_round,
            )

            self.session.evaluations.append(result)

            # Send evaluation to frontend
            await self.send_ws_message(
                WSMessageType.EVALUATION_UPDATE,
                result.model_dump()
            )

            logger.info(
                f"Evaluation sent | Round {result.round_number} | "
                f"Human: {result.human_score} | AI: {result.ai_score}"
            )

        except Exception as e:
            logger.error(f"Evaluation error: {e}", exc_info=True)

    @staticmethod
    def _is_sentence_complete(text: str) -> bool:
        """Check if the text buffer contains a complete sentence."""
        text = text.strip()
        if not text:
            return False
        # Check for sentence-ending punctuation
        return text[-1] in '.!?' or len(text) > 150

    async def handle_text_input(self, text: str):
        """
        Handle text input directly (for fallback when mic isn't available).
        Bypasses STT and goes straight to debate agent.
        """
        if text.strip():
            await self._process_user_turn(text.strip())

    async def stop(self):
        """Stop all services and clean up."""
        self._is_ai_speaking = False

        if self._eval_task and not self._eval_task.done():
            self._eval_task.cancel()

        await self.stt_service.close()
        await self.tts_service.close()

        logger.info(f"Conversation pipeline stopped for {self.session.session_id}")
