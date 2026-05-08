"""
Debate Session Manager
Manages the lifecycle of voice debate sessions.
Stores session state, handles creation/deletion, and tracks active sessions.
"""
import time
import logging
from typing import Optional
from voice_debate.models.schemas import (
    DebateSessionState,
    DebateStatus,
    DebateMessage,
    ParticipantRole,
    CreateDebateRequest,
)
from voice_debate.agents.debate_agent import VoiceDebateAgent
from voice_debate.agents.evaluation_agent import EvaluationAgent

logger = logging.getLogger("voice_debate.session_manager")


class SessionManager:
    """
    Manages active debate sessions in memory.
    
    Each session contains:
    - Session state (topic, status, messages, scores)
    - Debate Agent instance
    - Evaluation Agent instance
    """

    def __init__(self):
        self._sessions: dict[str, DebateSessionState] = {}
        self._debate_agents: dict[str, VoiceDebateAgent] = {}
        self._evaluation_agents: dict[str, EvaluationAgent] = {}
        logger.info("SessionManager initialized")

    def create_session(self, request: CreateDebateRequest) -> DebateSessionState:
        """
        Create a new debate session with all agents.
        
        Args:
            request: Session creation parameters
            
        Returns:
            The new DebateSessionState
        """
        session = DebateSessionState(
            topic=request.topic,
            user_name=request.user_name,
            ai_stance=request.ai_stance,
            provider=request.provider,
            model_name=request.model_name,
            allow_search=request.allow_search,
            voice_id=request.voice_id,
            max_duration_seconds=request.max_duration_seconds,
        )

        # Create Debate Agent
        debate_agent = VoiceDebateAgent(
            topic=request.topic,
            stance=request.ai_stance,
            provider=request.provider,
            model_name=request.model_name,
            allow_search=request.allow_search,
        )

        # Create Evaluation Agent (independent)
        eval_agent = EvaluationAgent(
            topic=request.topic,
            provider=request.provider,
            model_name=request.model_name,
        )

        # Store everything
        self._sessions[session.session_id] = session
        self._debate_agents[session.session_id] = debate_agent
        self._evaluation_agents[session.session_id] = eval_agent

        logger.info(
            f"Session created: {session.session_id} | "
            f"topic='{request.topic}' | provider={request.provider}"
        )
        return session

    def get_session(self, session_id: str) -> Optional[DebateSessionState]:
        """Get session state by ID."""
        return self._sessions.get(session_id)

    def get_debate_agent(self, session_id: str) -> Optional[VoiceDebateAgent]:
        """Get the debate agent for a session."""
        return self._debate_agents.get(session_id)

    def get_evaluation_agent(self, session_id: str) -> Optional[EvaluationAgent]:
        """Get the evaluation agent for a session."""
        return self._evaluation_agents.get(session_id)

    def start_session(self, session_id: str) -> bool:
        """Mark a session as active (debate has begun)."""
        session = self._sessions.get(session_id)
        if session:
            session.status = DebateStatus.ACTIVE
            session.started_at = time.time()
            logger.info(f"Session started: {session_id}")
            return True
        return False

    def add_message(
        self,
        session_id: str,
        role: ParticipantRole,
        content: str,
        is_interruption: bool = False,
    ) -> Optional[DebateMessage]:
        """Add a message to the session's conversation history."""
        session = self._sessions.get(session_id)
        if not session:
            return None

        message = DebateMessage(
            role=role,
            content=content,
            is_interruption=is_interruption,
        )
        session.messages.append(message)

        if role == ParticipantRole.HUMAN:
            session.current_round += 1

        logger.debug(f"Message added to {session_id}: [{role.value}] {content[:50]}...")
        return message

    def end_session(self, session_id: str) -> Optional[DebateSessionState]:
        """End a debate session and clean up agents."""
        session = self._sessions.get(session_id)
        if session:
            session.status = DebateStatus.FINISHED
            session.ended_at = time.time()

            # Clean up agents
            agent = self._debate_agents.pop(session_id, None)
            if agent:
                agent.reset()

            eval_agent = self._evaluation_agents.pop(session_id, None)
            if eval_agent:
                eval_agent.reset()

            logger.info(f"Session ended: {session_id}")
            return session
        return None

    def remove_session(self, session_id: str):
        """Fully remove a session from memory."""
        self._sessions.pop(session_id, None)
        self._debate_agents.pop(session_id, None)
        self._evaluation_agents.pop(session_id, None)
        logger.info(f"Session removed: {session_id}")

    def get_active_sessions(self) -> list[str]:
        """Get IDs of all active sessions."""
        return [
            sid for sid, s in self._sessions.items()
            if s.status == DebateStatus.ACTIVE
        ]

    def get_session_summary(self, session_id: str) -> Optional[dict]:
        """Get a summary of a session for API responses."""
        session = self._sessions.get(session_id)
        if not session:
            return None

        eval_agent = self._evaluation_agents.get(session_id)
        cumulative = eval_agent.get_cumulative_scores() if eval_agent else {}

        return {
            "session_id": session.session_id,
            "topic": session.topic,
            "status": session.status.value,
            "rounds": session.current_round,
            "message_count": len(session.messages),
            "duration": (
                (session.ended_at or time.time()) - session.started_at
                if session.started_at
                else 0
            ),
            "scores": cumulative,
        }


# Singleton instance
session_manager = SessionManager()
