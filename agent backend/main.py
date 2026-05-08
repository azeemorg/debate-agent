import uvicorn
import sqlite3
import json
import logging
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
from ai_Agent import BackendDebateAgent

# --- Logging Setup ---
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
)

app = FastAPI(title="ArgueMind Backend with Memory")

# --- CORS Middleware (needed for frontend WebSocket + API calls) ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict to your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Mount Voice Debate Router ---
try:
    from voice_debate.router import router as voice_debate_router
    app.include_router(voice_debate_router)
    logging.getLogger(__name__).info("Voice Debate router mounted at /api/voice-debate")
except ImportError as e:
    logging.getLogger(__name__).warning(f"Voice Debate module not available: {e}")

DB_NAME = "debate_history.db"

# --- DB Helper Functions ---
def init_db():
    conn = sqlite3.connect(DB_NAME)
    conn.execute("CREATE TABLE IF NOT EXISTS history (session_id TEXT PRIMARY KEY, messages TEXT)")
    conn.commit()
    conn.close()

def get_history(session_id: str):
    conn = sqlite3.connect(DB_NAME)
    row = conn.execute("SELECT messages FROM history WHERE session_id = ?", (session_id,)).fetchone()
    conn.close()
    return json.loads(row[0]) if row else []

def save_history(session_id: str, messages: list):
    conn = sqlite3.connect(DB_NAME)
    conn.execute("INSERT OR REPLACE INTO history VALUES (?, ?)", (session_id, json.dumps(messages)))
    conn.commit()
    conn.close()

init_db()

class RequestState(BaseModel):
    session_id: str
    model_name: str
    model_provider: str
    current_message: str
    allow_search: bool

@app.post("/chat/stream")
async def chat_stream(request: RequestState):
    history_list = get_history(request.session_id)
    # Convert flat list to LangChain format [(role, content)]
    formatted_history = []
    for i, msg in enumerate(history_list):
        role = "user" if i % 2 == 0 else "assistant"
        formatted_history.append((role, msg))

    agent_service = BackendDebateAgent(request.model_provider, request.model_name, request.allow_search)

    def generate():
        full_rebuttal = ""
        for chunk in agent_service.stream_debate_response(request.current_message, formatted_history):
            full_rebuttal += chunk
            yield chunk
        
        # Save updated history
        updated_history = history_list + [request.current_message, full_rebuttal]
        save_history(request.session_id, updated_history)

    return StreamingResponse(generate(), media_type="text/plain")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)