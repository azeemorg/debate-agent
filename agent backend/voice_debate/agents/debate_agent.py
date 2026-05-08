"""
Voice Debate Agent
Main AI debater that engages directly with the human user.
Generates arguments, rebuttals, counterpoints, and persuasive responses.
Optimized for voice conversation with shorter, punchier responses.
"""
import os
import re
import logging
from typing import Generator, Optional
from langchain_groq import ChatGroq
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from voice_debate.config import config

logger = logging.getLogger("voice_debate.debate_agent")


class VoiceDebateAgent:
    """
    AI Debate Agent optimized for real-time voice conversations.
    
    Key differences from the text-based agent:
    - Shorter responses suitable for speech (2-4 sentences)
    - Natural conversational pacing
    - Support for interruptions (can truncate mid-response)
    - Maintains full conversation context for coherent debates
    """

    # System prompt tuned for voice debate
    SYSTEM_PROMPT = """You are a fierce, articulate AI debater in a live voice debate.

RULES FOR VOICE DEBATE:
- Respond in 2-4 SHORT, punchy sentences. This is a VOICE conversation — keep it concise.
- Never apologize. Never concede. Find the flaw in every argument.
- Be aggressive but intellectually honest. Use logic, not insults.
- Reference the opponent's exact words to dismantle their points.
- Ask sharp, uncomfortable follow-up questions to corner them.
- Sound natural — use contractions, conversational phrases.
- If interrupted, gracefully incorporate the interruption.
- Stay on topic. Every word must serve your argument.
- DO NOT use markdown, bullet points, or formatting. This will be spoken aloud.
- DO NOT use asterisks, hashtags, or any special characters.
- Vary your response style: sometimes question, sometimes state facts, sometimes challenge directly.

DEBATE STANCE: You are arguing {stance} the topic: "{topic}"

Remember: This is SPOKEN debate. Be conversational, sharp, and devastating."""

    def __init__(
        self,
        topic: str,
        stance: str = "against",
        provider: str = "Groq",
        model_name: str = "llama-3.3-70b-versatile",
        allow_search: bool = False,
    ):
        self.topic = topic
        self.stance = stance
        self.provider = provider
        self.model_name = model_name
        self.allow_search = allow_search
        self.conversation_history: list = []
        self._interrupted = False
        self.llm = self._create_llm()
        self.system_message = SystemMessage(
            content=self.SYSTEM_PROMPT.format(stance=stance, topic=topic)
        )
        logger.info(f"VoiceDebateAgent initialized | topic='{topic}' | stance={stance} | provider={provider}")

    def _create_llm(self):
        """Create the LLM instance based on provider."""
        if self.provider == "Groq":
            return ChatGroq(
                model=self.model_name,
                groq_api_key=config.GROQ_API_KEY,
                temperature=0.8,
                max_tokens=200,  # Keep responses short for voice
                streaming=True,
            )
        else:
            return ChatGoogleGenerativeAI(
                model=self.model_name,
                google_api_key=config.GEMINI_API_KEY,
                temperature=0.8,
                max_output_tokens=200,
            )

    def _build_messages(self, user_input: str) -> list:
        """Build the full message list with system prompt + history + new input."""
        messages = [self.system_message]

        # Add conversation history (capped to prevent context overflow)
        max_history = config.MAX_CONVERSATION_HISTORY
        history_slice = self.conversation_history[-max_history:]
        messages.extend(history_slice)

        # Add current user input
        messages.append(HumanMessage(content=user_input))
        return messages

    @staticmethod
    def clean_for_speech(text: str) -> str:
        """Remove artifacts that shouldn't be spoken aloud."""
        # Remove markdown-style formatting
        text = re.sub(r'[*#_`~]', '', text)
        # Remove XML-like tags
        text = re.sub(r'<[^>]+>', '', text)
        # Remove JSON fragments
        text = re.sub(r'\{[^}]+\}', '', text)
        # Remove function call leaks
        if '"query":' in text or "tavily_search" in text:
            return ""
        # We intentionally DO NOT use .strip() or regex space normalization here,
        # because this function is called on tiny streaming chunks. If we strip
        # spaces, the chunks will stick together like "ThisIsASentence".
        return text

    def stream_response(self, user_input: str) -> Generator[str, None, None]:
        """
        Stream the debate response token by token.
        
        Yields cleaned text chunks suitable for TTS conversion.
        Automatically maintains conversation history.
        """
        self._interrupted = False
        messages = self._build_messages(user_input)
        full_response = ""

        logger.info(f"Generating response for: '{user_input[:80]}...'")

        try:
            for chunk in self.llm.stream(messages):
                # Check if interrupted
                if self._interrupted:
                    logger.info("Response interrupted by user")
                    break

                if hasattr(chunk, 'content') and chunk.content:
                    raw = chunk.content if isinstance(chunk.content, str) else ""
                    cleaned = self.clean_for_speech(raw)
                    if cleaned:
                        full_response += cleaned
                        yield cleaned

        except Exception as e:
            logger.error(f"Error streaming debate response: {e}", exc_info=True)
            error_msg = "I seem to have lost my train of thought. Let me address that differently."
            full_response = error_msg
            yield error_msg

        # Store in conversation history
        self.conversation_history.append(HumanMessage(content=user_input))
        self.conversation_history.append(AIMessage(content=full_response))
        logger.info(f"Response complete: {len(full_response)} chars, history: {len(self.conversation_history)} messages")

    async def astream_response(self, user_input: str):
        """
        Async streaming variant for use with async WebSocket handlers.
        """
        self._interrupted = False
        messages = self._build_messages(user_input)
        full_response = ""

        logger.info(f"[async] Generating response for: '{user_input[:80]}...'")

        try:
            async for chunk in self.llm.astream(messages):
                if self._interrupted:
                    logger.info("[async] Response interrupted by user")
                    break

                if hasattr(chunk, 'content') and chunk.content:
                    raw = chunk.content if isinstance(chunk.content, str) else ""
                    cleaned = self.clean_for_speech(raw)
                    if cleaned:
                        full_response += cleaned
                        yield cleaned

        except Exception as e:
            logger.error(f"[async] Error streaming debate response: {e}", exc_info=True)
            error_msg = "Let me reframe that argument."
            full_response = error_msg
            yield error_msg

        # Store in conversation history
        self.conversation_history.append(HumanMessage(content=user_input))
        self.conversation_history.append(AIMessage(content=full_response))

    def interrupt(self):
        """Signal the agent to stop generating (user interrupted)."""
        self._interrupted = True
        logger.info("Interrupt signal received")

    def get_history_as_dicts(self) -> list[dict]:
        """Return conversation history as serializable dicts."""
        result = []
        for msg in self.conversation_history:
            if isinstance(msg, HumanMessage):
                result.append({"role": "human", "content": msg.content})
            elif isinstance(msg, AIMessage):
                result.append({"role": "ai", "content": msg.content})
        return result

    def reset(self):
        """Clear conversation history for a fresh start."""
        self.conversation_history.clear()
        self._interrupted = False
        logger.info("Debate agent reset")
