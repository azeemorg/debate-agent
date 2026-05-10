# 🎙️ ArgueMind Backend: Technical Architecture & Implementation

This document provides a comprehensive technical overview of the backend systems developed for the **ArgueMind** real-time AI voice debate platform.

---

## 🏗️ Core Architecture
The backend is built using **FastAPI** with a modular, service-oriented architecture. It is designed to handle high-concurrency, low-latency voice interactions.

### 📁 Project Structure
- `main.py`: Entry point, mounts the routers, and handles basic chat persistence (SQLite).
- `voice_debate/`: The core package for the voice debate system.
    - `router.py`: REST and WebSocket API endpoints.
    - `orchestrator/`: The "brain" of the system.
        - `session_manager.py`: Manages the lifecycle of active debate sessions.
        - `websocket_handler.py`: Routes real-time messages and audio.
        - `conversation_manager.py`: Coordinates the STT → LLM → TTS pipeline.
    - `agents/`: LLM-powered agents.
        - `debate_agent.py`: Specialized for argumentative reasoning.
        - `evaluation_agent.py`: Analyzes logic, rhetoric, and scoring.
    - `voice/`: Third-party voice integrations (Deepgram, ElevenLabs, LiveKit).
    - `models/`: Pydantic schemas for data validation and API consistency.

---

## 🎙️ The Voice Debate Pipeline
The `ConversationManager` orchestrates a sophisticated multi-stage pipeline for every interaction.

### 1. Audio Capture (STT)
- **Service**: Deepgram (WebSocket-based streaming).
- **Process**:
    - Raw audio bytes are streamed from the client via WebSocket to the backend.
    - The backend forwards these bytes to Deepgram in real-time.
    - **Partial Transcripts**: Used to detect interruptions and update the UI instantly.
    - **Final Transcripts**: Buffered until an "utterance end" (silence) is detected.

### 2. Debate Reasoning (LLM)
- **Service**: Supports Groq, OpenAI, and others (configurable).
- **Logic**:
    - The `VoiceDebateAgent` uses specialized system prompts to maintain a consistent debate stance (Aggressive, logical, or persuasive).
    - It supports **streaming responses**, allowing the UI to show text as it's generated.
    - **Interruption Support**: The LLM stream can be aborted instantly if the user starts speaking.

### 3. Speech Synthesis (TTS)
- **Primary**: ElevenLabs (Backend-side).
- **Fallback/Optimized**: Browser-native TTS (Frontend-side).
- **Implementation**: To save quota and reduce latency, the backend currently sends text chunks to the frontend, which handles the actual audio synthesis using the browser's `SpeechSynthesis` API.

### 4. Real-time Orchestration
- **WebSockets**: A single WebSocket connection per session handles:
    - Inbound raw audio.
    - Outbound transcripts (live).
    - Outbound AI text responses.
    - Control signals (Interrupt, Start, End, Pause).
- **LiveKit**: Used for robust audio transport and multi-user room management, ensuring high-quality audio delivery even in challenging network conditions.

---

## 📊 Evaluation & Scoring
After each exchange (User turn + AI turn), the `EvaluationAgent` is triggered asynchronously.

- **Criteria**:
    - **Logic**: Consistency and strength of arguments.
    - **Rhetoric**: Persuasiveness and emotional appeal.
    - **Rebuttal**: How well the opponent's points were addressed.
- **Scoring**: Scores are tracked cumulatively throughout the session and delivered to the frontend via the WebSocket.

---

## 🛠️ Key Features & Guardrails
- **Self-Debating Guardrail**: Prevents the AI from responding to its own audio feedback (essential for open-speaker setups).
- **Interruption Handling**: AI instantly stops processing and speaking when it detects user voice.
- **Persistence**: Debate histories are saved to `debate_history.db` for session recovery and post-debate analysis.
- **Multilingual Support**: Deepgram is configured to handle various languages, which are then mapped to appropriate TTS voices.

---

## 🚀 Future Roadmap
- [ ] **Multi-Agent Debates**: AI vs. AI with the user as the moderator.
- [ ] **Advanced Analytics**: Deeper sentiment and logical fallacy detection.
- [ ] **Voice Cloning**: Custom voices for specific debate personas.
