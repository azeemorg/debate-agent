"""
ElevenLabs Text-to-Speech Service
Converts AI response text into natural-sounding speech audio.
Supports streaming for low-latency playback.
"""
import asyncio
import aiohttp
import logging
from typing import AsyncGenerator, Optional
from voice_debate.config import config

logger = logging.getLogger("voice_debate.elevenlabs_tts")


class ElevenLabsTTSService:
    """
    Streaming Text-to-Speech using ElevenLabs API.
    
    Features:
    - Streaming audio generation (chunks returned as they're ready)
    - Configurable voice selection
    - Optimized for low-latency conversational speech
    - Sentence-level chunking for natural pacing
    """

    BASE_URL = "https://api.elevenlabs.io/v1"

    def __init__(
        self,
        voice_id: Optional[str] = None,
        model_id: Optional[str] = None,
    ):
        self.voice_id = voice_id or config.ELEVENLABS_VOICE_ID
        self.model_id = model_id or config.ELEVENLABS_MODEL_ID
        self._session: Optional[aiohttp.ClientSession] = None
        logger.info(f"ElevenLabsTTS initialized | voice={self.voice_id} | model={self.model_id}")

    async def _get_session(self) -> aiohttp.ClientSession:
        """Get or create an aiohttp session."""
        if self._session is None or self._session.closed:
            self._session = aiohttp.ClientSession(
                headers={
                    "xi-api-key": config.ELEVENLABS_API_KEY,
                    "Content-Type": "application/json",
                }
            )
        return self._session

    async def synthesize_stream(self, text: str) -> AsyncGenerator[bytes, None]:
        """
        Stream audio bytes from ElevenLabs for the given text.
        
        Args:
            text: The text to convert to speech
            
        Yields:
            Audio bytes (mp3 format) as they become available
        """
        if not text.strip():
            return

        url = f"{self.BASE_URL}/text-to-speech/{self.voice_id}/stream"
        # output_format must be a query parameter, not a JSON body field
        params = {"output_format": "mp3_44100_128"}

        payload = {
            "text": text,
            "model_id": self.model_id,
            "voice_settings": {
                "stability": 0.5,
                "similarity_boost": 0.8,
                "style": 0.0,
                "use_speaker_boost": False,
            },
        }

        session = await self._get_session()
        logger.info(f"Requesting TTS for: '{text[:60]}...' | voice={self.voice_id}")

        try:
            async with session.post(url, json=payload, params=params) as response:
                if response.status != 200:
                    error_text = await response.text()
                    logger.error(f"ElevenLabs API error {response.status}: {error_text[:200]}")
                    return

                total_bytes = 0
                # Stream audio chunks
                async for chunk in response.content.iter_chunked(4096):
                    if chunk:
                        total_bytes += len(chunk)
                        yield chunk
                logger.info(f"TTS stream complete: {total_bytes} bytes")

        except aiohttp.ClientError as e:
            logger.error(f"ElevenLabs request error: {e}")
        except Exception as e:
            logger.error(f"ElevenLabs TTS error: {e}", exc_info=True)

    async def synthesize_full(self, text: str) -> Optional[bytes]:
        """
        Get complete audio for text (non-streaming).
        Useful for short utterances.
        """
        if not text.strip():
            return None

        url = f"{self.BASE_URL}/text-to-speech/{self.voice_id}"

        payload = {
            "text": text,
            "model_id": self.model_id,
            "voice_settings": {
                "stability": 0.5,
                "similarity_boost": 0.8,
                "style": 0.3,
                "use_speaker_boost": True,
            },
        }

        session = await self._get_session()

        try:
            async with session.post(url, json=payload) as response:
                if response.status == 200:
                    return await response.read()
                else:
                    error = await response.text()
                    logger.error(f"ElevenLabs error {response.status}: {error[:200]}")
                    return None
        except Exception as e:
            logger.error(f"ElevenLabs full synthesis error: {e}")
            return None

    async def get_available_voices(self) -> list[dict]:
        """Fetch the list of available voices from ElevenLabs."""
        url = f"{self.BASE_URL}/voices"
        session = await self._get_session()

        try:
            async with session.get(url) as response:
                if response.status == 200:
                    data = await response.json()
                    voices = data.get("voices", [])
                    return [
                        {
                            "voice_id": v["voice_id"],
                            "name": v["name"],
                            "category": v.get("category", "unknown"),
                            "preview_url": v.get("preview_url", ""),
                        }
                        for v in voices
                    ]
                return []
        except Exception as e:
            logger.error(f"Failed to fetch voices: {e}")
            return []

    async def close(self):
        """Close the HTTP session."""
        if self._session and not self._session.closed:
            await self._session.close()
        logger.info("ElevenLabs TTS service closed")
