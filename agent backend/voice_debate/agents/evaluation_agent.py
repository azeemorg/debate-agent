"""
Evaluation Agent
Independent judge that silently analyzes debate quality in real-time.
Evaluates both human and AI performance across multiple dimensions.
Runs completely independently from the Debate Agent.
"""
import json
import logging
from typing import Optional
from langchain_groq import ChatGroq
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage, SystemMessage
from voice_debate.config import config
from voice_debate.models.schemas import EvaluationResult

logger = logging.getLogger("voice_debate.evaluation_agent")


class EvaluationAgent:
    """
    Independent evaluation agent that judges debate quality.
    
    Analyzes:
    - Argument strength & logic
    - Logical fallacies & contradictions
    - Persuasiveness & communication quality
    - Confidence, clarity, relevance
    - Overall scores for both participants
    """

    SYSTEM_PROMPT = """You are an expert debate judge and evaluator. You silently analyze debates between a human and an AI.

YOUR ROLE:
- Objectively evaluate BOTH the human's and AI's arguments
- Detect logical fallacies, contradictions, and unsupported claims
- Score each participant on multiple dimensions
- Provide constructive, specific feedback
- Be fair and unbiased — judge the quality of arguments, not who you agree with

You must ALWAYS respond with valid JSON in this exact structure:
{{
    "round_number": {round},
    "human_score": <0-100>,
    "ai_score": <0-100>,
    "human_strengths": ["strength1", "strength2"],
    "human_weaknesses": ["weakness1"],
    "ai_strengths": ["strength1", "strength2"],
    "ai_weaknesses": ["weakness1"],
    "logical_fallacies": ["fallacy1 (by whom)"],
    "debate_summary": "Brief 1-2 sentence summary of this exchange",
    "human_metrics": {{
        "confidence": <0-100>,
        "clarity": <0-100>,
        "relevance": <0-100>,
        "persuasiveness": <0-100>,
        "critical_thinking": <0-100>,
        "communication": <0-100>
    }},
    "ai_metrics": {{
        "confidence": <0-100>,
        "clarity": <0-100>,
        "relevance": <0-100>,
        "persuasiveness": <0-100>,
        "critical_thinking": <0-100>,
        "communication": <0-100>
    }},
    "feedback": "One specific actionable tip for the human debater"
}}

DEBATE TOPIC: "{topic}"
IMPORTANT: Respond with ONLY the JSON object. No markdown, no explanation, no code fences."""

    def __init__(
        self,
        topic: str,
        provider: str = "Groq",
        model_name: str = "llama-3.3-70b-versatile",
    ):
        self.topic = topic
        self.provider = provider
        self.model_name = model_name
        self.evaluation_history: list[EvaluationResult] = []
        self.llm = self._create_llm()
        logger.info(f"EvaluationAgent initialized | topic='{topic}' | provider={provider}")

    def _create_llm(self):
        """Create LLM instance for evaluation."""
        if self.provider == "Groq":
            return ChatGroq(
                model=self.model_name,
                groq_api_key=config.GROQ_API_KEY,
                temperature=0.3,  # Lower temp for consistent evaluation
                max_tokens=800,
            )
        else:
            return ChatGoogleGenerativeAI(
                model=self.model_name,
                google_api_key=config.GEMINI_API_KEY,
                temperature=0.3,
                max_output_tokens=800,
            )

    def _build_evaluation_prompt(self, conversation_history: list[dict], round_number: int) -> str:
        """Build the evaluation prompt from conversation history."""
        # Format conversation for evaluation
        conversation_text = ""
        for msg in conversation_history:
            role = "HUMAN" if msg.get("role") == "human" else "AI"
            conversation_text += f"\n{role}: {msg.get('content', '')}"

        return f"""Evaluate the following debate exchange (Round {round_number}):

TOPIC: {self.topic}

CONVERSATION:
{conversation_text}

Provide your evaluation as a JSON object."""

    async def evaluate(
        self,
        conversation_history: list[dict],
        round_number: int = 1,
    ) -> EvaluationResult:
        """
        Evaluate the current state of the debate asynchronously.
        
        Args:
            conversation_history: List of {"role": "human"|"ai", "content": "..."} dicts
            round_number: Current round number
            
        Returns:
            EvaluationResult with scores and analysis
        """
        if len(conversation_history) < 2:
            logger.info("Not enough conversation history to evaluate")
            return EvaluationResult(round_number=round_number)

        system_msg = SystemMessage(
            content=self.SYSTEM_PROMPT.format(topic=self.topic, round=round_number)
        )
        eval_prompt = self._build_evaluation_prompt(conversation_history, round_number)
        human_msg = HumanMessage(content=eval_prompt)

        try:
            response = await self.llm.ainvoke([system_msg, human_msg])
            raw_text = response.content.strip()

            # Parse JSON from response (handle potential markdown wrapping)
            json_text = raw_text
            if "```" in json_text:
                # Extract JSON from code fences
                import re
                match = re.search(r'```(?:json)?\s*([\s\S]*?)```', json_text)
                if match:
                    json_text = match.group(1).strip()

            evaluation_data = json.loads(json_text)
            evaluation_data["round_number"] = round_number
            result = EvaluationResult(**evaluation_data)

            self.evaluation_history.append(result)
            logger.info(
                f"Evaluation complete | Round {round_number} | "
                f"Human: {result.human_score} | AI: {result.ai_score}"
            )
            return result

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse evaluation JSON: {e}\nRaw: {raw_text[:500]}")
            return EvaluationResult(
                round_number=round_number,
                debate_summary="Evaluation parsing error — scores unavailable",
                feedback="Unable to evaluate this round",
            )
        except Exception as e:
            logger.error(f"Evaluation error: {e}", exc_info=True)
            return EvaluationResult(
                round_number=round_number,
                debate_summary="Evaluation error",
                feedback="An error occurred during evaluation",
            )

    def evaluate_sync(
        self,
        conversation_history: list[dict],
        round_number: int = 1,
    ) -> EvaluationResult:
        """Synchronous evaluation variant."""
        if len(conversation_history) < 2:
            return EvaluationResult(round_number=round_number)

        system_msg = SystemMessage(
            content=self.SYSTEM_PROMPT.format(topic=self.topic, round=round_number)
        )
        eval_prompt = self._build_evaluation_prompt(conversation_history, round_number)
        human_msg = HumanMessage(content=eval_prompt)

        try:
            response = self.llm.invoke([system_msg, human_msg])
            raw_text = response.content.strip()

            json_text = raw_text
            if "```" in json_text:
                import re
                match = re.search(r'```(?:json)?\s*([\s\S]*?)```', json_text)
                if match:
                    json_text = match.group(1).strip()

            evaluation_data = json.loads(json_text)
            evaluation_data["round_number"] = round_number
            result = EvaluationResult(**evaluation_data)
            self.evaluation_history.append(result)
            return result

        except Exception as e:
            logger.error(f"Sync evaluation error: {e}", exc_info=True)
            return EvaluationResult(round_number=round_number)

    def get_cumulative_scores(self) -> dict:
        """Calculate average scores across all evaluations."""
        if not self.evaluation_history:
            return {"human_average": 0, "ai_average": 0, "rounds_evaluated": 0}

        human_total = sum(e.human_score for e in self.evaluation_history)
        ai_total = sum(e.ai_score for e in self.evaluation_history)
        count = len(self.evaluation_history)

        return {
            "human_average": round(human_total / count, 1),
            "ai_average": round(ai_total / count, 1),
            "rounds_evaluated": count,
            "all_fallacies": [
                f for e in self.evaluation_history for f in e.logical_fallacies
            ],
        }

    def reset(self):
        """Clear evaluation history."""
        self.evaluation_history.clear()
        logger.info("Evaluation agent reset")
