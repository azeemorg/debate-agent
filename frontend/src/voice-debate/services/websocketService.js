/**
 * Voice Debate — WebSocket Service
 * Manages WebSocket connection to the voice debate backend.
 */

const BACKEND_WS_URL = 'ws://localhost:8000/api/voice-debate/ws';

export class VoiceDebateWebSocket {
  constructor(sessionId, handlers = {}) {
    this.sessionId = sessionId;
    this.handlers = handlers;
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
  }

  connect() {
    const url = `${BACKEND_WS_URL}/${this.sessionId}`;
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      console.log('[VD-WS] Connected');
      this.reconnectAttempts = 0;
      this.handlers.onOpen?.();
    };

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        this._handleMessage(msg);
      } catch (e) {
        console.warn('[VD-WS] Non-JSON message:', event.data);
      }
    };

    this.ws.onclose = (event) => {
      console.log('[VD-WS] Disconnected:', event.code);
      this.handlers.onClose?.();
      if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
        this._reconnect();
      }
    };

    this.ws.onerror = (error) => {
      console.error('[VD-WS] Error:', error);
      this.handlers.onError?.(error);
    };
  }

  _handleMessage(msg) {
    const { type, data } = msg;
    switch (type) {
      case 'session_info': this.handlers.onSessionInfo?.(data); break;
      case 'ai_response_start': this.handlers.onAIResponseStart?.(data); break;
      case 'ai_response_chunk': this.handlers.onAIResponseChunk?.(data); break;
      case 'ai_response_end': this.handlers.onAIResponseEnd?.(data); break;
      case 'ai_audio_chunk': this.handlers.onAIAudioChunk?.(data); break;
      case 'ai_audio_end': this.handlers.onAIAudioEnd?.(data); break;
      case 'evaluation_update': this.handlers.onEvaluationUpdate?.(data); break;
      case 'status_update': this.handlers.onStatusUpdate?.(data); break;
      case 'transcript': this.handlers.onTranscript?.(data); break;
      case 'error': this.handlers.onError?.(data); break;
      default: console.log('[VD-WS] Unknown type:', type);
    }
  }

  send(type, data = {}) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, data, session_id: this.sessionId }));
    }
  }

  sendAudio(audioData) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(audioData);
    }
  }

  startDebate() { this.send('start_debate'); }
  endDebate() { this.send('end_debate'); }
  interrupt() { this.send('interrupt'); }
  sendText(text) { this.send('transcript', { text }); }

  _reconnect() {
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * this.reconnectAttempts;
    console.log(`[VD-WS] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
    setTimeout(() => this.connect(), delay);
  }

  disconnect() {
    if (this.ws) {
      this.ws.close(1000);
      this.ws = null;
    }
  }

  get isConnected() {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}
