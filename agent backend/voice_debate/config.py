"""
Voice Debate Configuration
All API keys and service configuration loaded from environment variables.
"""
import os
import pathlib
from dotenv import load_dotenv

# Explicitly load .env from this file's parent directory (Agent Chatbot/)
_env_path = pathlib.Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=_env_path, override=True)


class VoiceDebateConfig:
    """Centralized configuration for all voice debate services."""

    # --- Deepgram STT ---
    DEEPGRAM_API_KEY: str = os.getenv("DEEPGRAM_API_KEY", "")

    # --- ElevenLabs TTS ---
    ELEVENLABS_API_KEY: str = os.getenv("ELEVENLABS_API_KEY", "")
    ELEVENLABS_VOICE_ID: str = os.getenv("ELEVENLABS_VOICE_ID", "EXAVITQu4vr4xnSDxMaL")  # Default: Bella (free tier)
    ELEVENLABS_MODEL_ID: str = os.getenv("ELEVENLABS_MODEL_ID", "eleven_turbo_v2_5")

    # --- LiveKit ---
    LIVEKIT_API_KEY: str = os.getenv("LIVEKIT_API_KEY", "")
    LIVEKIT_API_SECRET: str = os.getenv("LIVEKIT_API_SECRET", "")
    LIVEKIT_URL: str = os.getenv("LIVEKIT_URL", "wss://debate-platform-wnhwc8iv.livekit.cloud")

    # --- LLM (reuse existing keys) ---
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    TAVILY_API_KEY: str = os.getenv("TAVILY_API_KEY", "")

    # --- Debate Settings ---
    DEFAULT_PROVIDER: str = os.getenv("DEFAULT_LLM_PROVIDER", "Groq")
    DEFAULT_MODEL: str = os.getenv("DEFAULT_LLM_MODEL", "llama-3.3-70b-versatile")
    MAX_DEBATE_DURATION_SECONDS: int = int(os.getenv("MAX_DEBATE_DURATION_SECONDS", "1800"))
    MAX_CONVERSATION_HISTORY: int = int(os.getenv("MAX_CONVERSATION_HISTORY", "50"))

    # --- Audio Settings ---
    DEEPGRAM_SAMPLE_RATE: int = 16000
    DEEPGRAM_CHANNELS: int = 1
    DEEPGRAM_ENCODING: str = "linear16"

    @classmethod
    def validate(cls) -> list[str]:
        """Check for missing required configuration. Returns list of warnings."""
        warnings = []
        if not cls.DEEPGRAM_API_KEY:
            warnings.append("DEEPGRAM_API_KEY is not set")
        if not cls.ELEVENLABS_API_KEY:
            warnings.append("ELEVENLABS_API_KEY is not set")
        if not cls.LIVEKIT_API_KEY:
            warnings.append("LIVEKIT_API_KEY is not set")
        if not cls.LIVEKIT_API_SECRET:
            warnings.append("LIVEKIT_API_SECRET is not set")
        if not cls.GROQ_API_KEY and not cls.GEMINI_API_KEY:
            warnings.append("Neither GROQ_API_KEY nor GEMINI_API_KEY is set")
        return warnings


config = VoiceDebateConfig()
