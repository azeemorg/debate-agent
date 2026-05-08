"""
Deepgram Speech-to-Text Service
Provides real-time streaming transcription of audio data.
Handles partial/final transcripts, silence detection, and noise filtering.
"""
import asyncio
import json
import logging
import websockets
from typing import Callable, Optional
from voice_debate.config import config

logger = logging.getLogger("voice_debate.deepgram_stt")


class DeepgramSTTService:
    """
    Real-time streaming Speech-to-Text using Deepgram's WebSocket API.
    
    Features:
    - Streaming audio → text transcription
    - Partial (interim) and final transcript events
    - Endpointing (silence detection) for turn-taking
    - Optimized for conversational speech
    """

    DEEPGRAM_WS_URL = "wss://api.deepgram.com/v1/listen"

    def __init__(
        self,
        on_transcript: Optional[Callable] = None,
        on_final_transcript: Optional[Callable] = None,
        on_utterance_end: Optional[Callable] = None,
        language: str = "multi",
    ):
        """
        Args:
            on_transcript: Callback for partial transcripts: (text, confidence)
            on_final_transcript: Callback for finalized transcripts: (text, confidence)
            on_utterance_end: Callback when speaker stops (silence detected)
            language: Language code for transcription
        """
        self.on_transcript = on_transcript
        self.on_final_transcript = on_final_transcript
        self.on_utterance_end = on_utterance_end
        self.language = language
        self._ws: Optional[websockets.WebSocketClientProtocol] = None
        self._running = False
        self._receive_task: Optional[asyncio.Task] = None

    def _build_url(self) -> str:
        """Build the Deepgram WebSocket URL with query parameters."""
        params = {
            "model": "nova-2",
            "language": self.language,
            "encoding": config.DEEPGRAM_ENCODING,
            "sample_rate": str(config.DEEPGRAM_SAMPLE_RATE),
            "channels": str(config.DEEPGRAM_CHANNELS),
            "punctuate": "true",
            "interim_results": "true",       # Enable partial transcripts
            "endpointing": "300",             # 300ms silence = end of utterance
            "utterance_end_ms": "1000",       # 1s silence = utterance definitely ended
            "vad_events": "true",             # Voice Activity Detection
            "smart_format": "true",           # Smart formatting (numbers, dates, etc.)
            "keepalive": "true",              # Prevent connection dropping on silence
        }
        query_string = "&".join(f"{k}={v}" for k, v in params.items())
        return f"{self.DEEPGRAM_WS_URL}?{query_string}"

    async def connect(self):
        """Establish WebSocket connection to Deepgram."""
        url = self._build_url()
        headers = {"Authorization": f"Token {config.DEEPGRAM_API_KEY}"}

        try:
            self._ws = await websockets.connect(
                url,
                additional_headers=headers,
                ping_interval=20,
                ping_timeout=10,
            )
            self._running = True
            self._receive_task = asyncio.create_task(self._receive_loop())
            logger.info("Connected to Deepgram STT WebSocket")
        except Exception as e:
            logger.error(f"Failed to connect to Deepgram: {e}")
            raise

    async def _receive_loop(self):
        """Continuously receive and process Deepgram responses."""
        try:
            async for message in self._ws:
                if not self._running:
                    break

                try:
                    data = json.loads(message)
                    await self._process_response(data)
                except json.JSONDecodeError:
                    logger.warning(f"Non-JSON message from Deepgram: {message[:100]}")
                except Exception as e:
                    logger.error(f"Error processing Deepgram response: {e}")

        except websockets.exceptions.ConnectionClosedOK:
            logger.info("Deepgram connection closed normally")
        except websockets.exceptions.ConnectionClosed as e:
            logger.warning(f"Deepgram connection closed: {e}")
        except Exception as e:
            logger.error(f"Deepgram receive loop error: {e}")
        finally:
            self._running = False

    async def _process_response(self, data: dict):
        """Process a single Deepgram response message."""
        msg_type = data.get("type", "")

        if msg_type == "Results":
            channel = data.get("channel", {})
            alternatives = channel.get("alternatives", [])

            if alternatives:
                transcript = alternatives[0].get("transcript", "").strip()
                confidence = alternatives[0].get("confidence", 0.0)
                is_final = data.get("is_final", False)

                if transcript:
                    if is_final and self.on_final_transcript:
                        await self.on_final_transcript(transcript, confidence)
                        logger.debug(f"Final transcript: '{transcript}' (conf: {confidence:.2f})")
                    elif not is_final and self.on_transcript:
                        await self.on_transcript(transcript, confidence)

        elif msg_type == "UtteranceEnd":
            if self.on_utterance_end:
                await self.on_utterance_end()
                logger.debug("Utterance end detected")

    async def send_audio(self, audio_data: bytes):
        """
        Send raw audio data to Deepgram for transcription.
        
        Args:
            audio_data: Raw PCM audio bytes (16-bit, 16kHz, mono)
        """
        if self._ws and self._running:
            try:
                await self._ws.send(audio_data)
            except Exception as e:
                logger.error(f"Error sending audio to Deepgram: {e}")

    async def close(self):
        """Gracefully close the Deepgram connection."""
        self._running = False

        if self._ws:
            try:
                # Send close message per Deepgram protocol
                await self._ws.send(json.dumps({"type": "CloseStream"}))
                await self._ws.close()
            except Exception as e:
                logger.warning(f"Error closing Deepgram connection: {e}")

        if self._receive_task and not self._receive_task.done():
            self._receive_task.cancel()
            try:
                await self._receive_task
            except asyncio.CancelledError:
                pass

        logger.info("Deepgram STT service closed")

    @property
    def is_connected(self) -> bool:
        return self._running and self._ws is not None
