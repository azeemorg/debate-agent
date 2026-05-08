/**
 * Voice Debate — REST API Service
 * Handles HTTP API calls to the voice debate backend.
 */

const API_BASE = 'http://localhost:8000/api/voice-debate';

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`API Error ${res.status}: ${err}`);
  }
  return res.json();
}

export const voiceDebateApi = {
  healthCheck: () => request('/health'),

  createSession: (params) =>
    request('/sessions', {
      method: 'POST',
      body: JSON.stringify(params),
    }),

  getSession: (sessionId) => request(`/sessions/${sessionId}`),

  endSession: (sessionId) =>
    request(`/sessions/${sessionId}/end`, { method: 'POST' }),

  deleteSession: (sessionId) =>
    request(`/sessions/${sessionId}`, { method: 'DELETE' }),

  sendTextMessage: (sessionId, text) =>
    request(`/sessions/${sessionId}/message`, {
      method: 'POST',
      body: JSON.stringify({ text }),
    }),

  getVoices: () => request('/voices'),
};
