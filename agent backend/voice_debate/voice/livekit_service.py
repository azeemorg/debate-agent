"""
LiveKit Room Management Service
Handles room creation, token generation, and participant management.
"""
import time
import datetime
import logging
from typing import Optional
from livekit import api

from voice_debate.config import config

logger = logging.getLogger("voice_debate.livekit_service")


class LiveKitService:
    """
    Manages LiveKit rooms and access tokens for voice debate sessions.
    
    Responsibilities:
    - Create/delete debate rooms
    - Generate participant tokens with appropriate permissions
    - Room lifecycle management
    """

    def __init__(self):
        self.api_key = config.LIVEKIT_API_KEY
        self.api_secret = config.LIVEKIT_API_SECRET
        self.livekit_url = config.LIVEKIT_URL
        logger.info(f"LiveKitService initialized | url={self.livekit_url}")

    def generate_token(
        self,
        room_name: str,
        participant_name: str,
        participant_identity: Optional[str] = None,
        can_publish: bool = True,
        can_subscribe: bool = True,
        ttl_seconds: int = 3600,
    ) -> str:
        """
        Generate a LiveKit access token for a participant.
        
        Args:
            room_name: Name of the LiveKit room
            participant_name: Display name for the participant
            participant_identity: Unique identity (defaults to participant_name)
            can_publish: Whether the participant can publish audio/video
            can_subscribe: Whether the participant can subscribe to others' tracks
            ttl_seconds: Token time-to-live in seconds
            
        Returns:
            JWT token string
        """
        identity = participant_identity or participant_name

        token = api.AccessToken(self.api_key, self.api_secret)
        token.with_identity(identity)
        token.with_name(participant_name)
        token.with_ttl(datetime.timedelta(seconds=ttl_seconds))

        # Grant permissions for the specific room
        grant = api.VideoGrants(
            room_join=True,
            room=room_name,
            can_publish=can_publish,
            can_subscribe=can_subscribe,
            can_publish_data=True,
        )
        token.with_grants(grant)

        jwt_token = token.to_jwt()
        logger.info(
            f"Generated token for '{participant_name}' in room '{room_name}' "
            f"(publish={can_publish}, subscribe={can_subscribe})"
        )
        return jwt_token

    def create_room_name(self, session_id: str) -> str:
        """Generate a unique room name from session ID."""
        return f"voice-debate-{session_id}"

    def generate_debate_tokens(self, session_id: str, user_name: str) -> dict:
        """
        Generate tokens for a debate session (human participant + AI bot).
        
        Returns:
            Dict with 'user_token', 'bot_token', 'room_name', 'livekit_url'
        """
        room_name = self.create_room_name(session_id)

        user_token = self.generate_token(
            room_name=room_name,
            participant_name=user_name,
            participant_identity=f"human-{session_id}",
            can_publish=True,
            can_subscribe=True,
        )

        bot_token = self.generate_token(
            room_name=room_name,
            participant_name="AI Debater",
            participant_identity=f"ai-{session_id}",
            can_publish=True,
            can_subscribe=True,
        )

        logger.info(f"Generated debate tokens for room '{room_name}'")

        return {
            "user_token": user_token,
            "bot_token": bot_token,
            "room_name": room_name,
            "livekit_url": self.livekit_url,
        }
