/**
 * DebateSetup — Configuration screen before starting a voice debate.
 * User picks topic, stance, voice, and model before entering the room.
 */
import { useState } from 'react';

export default function DebateSetup({ onStart, loading }) {
  const [topic, setTopic] = useState('');
  const [stance, setStance] = useState('against');
  const [provider, setProvider] = useState('Groq');
  const [modelName, setModelName] = useState('llama-3.3-70b-versatile');
  const [userName, setUserName] = useState('Debater');
  const [allowSearch, setAllowSearch] = useState(true);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!topic.trim()) return;
    onStart({
      topic: topic.trim(),
      ai_stance: stance,
      provider,
      model_name: modelName,
      user_name: userName,
      allow_search: allowSearch,
      voice_id: '21m00Tcm4TlvDq8ikWAM',
      max_duration_seconds: 600,
    });
  };

  return (
    <div className="vd-setup">
      <form className="vd-setup-card" onSubmit={handleSubmit}>
        <h1>⚡ AI Voice Battle</h1>
        <p className="vd-subtitle">
          Challenge the AI to a real-time voice debate. Speak your arguments, hear the AI fight back.
        </p>

        <div className="vd-field">
          <label htmlFor="vd-topic">Debate Topic</label>
          <textarea
            id="vd-topic"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g., Social media does more harm than good..."
            required
          />
        </div>

        <div className="vd-field">
          <label htmlFor="vd-name">Your Name</label>
          <input
            id="vd-name"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            placeholder="Enter your name"
          />
        </div>

        <div className="vd-row">
          <div className="vd-field">
            <label htmlFor="vd-stance">AI Argues</label>
            <select id="vd-stance" value={stance} onChange={(e) => setStance(e.target.value)}>
              <option value="against">Against the Topic</option>
              <option value="for">For the Topic</option>
            </select>
          </div>

          <div className="vd-field">
            <label htmlFor="vd-provider">AI Model</label>
            <select id="vd-provider" value={provider} onChange={(e) => setProvider(e.target.value)}>
              <option value="Groq">Groq (Llama 3.3)</option>
              <option value="Gemini">Gemini Flash</option>
            </select>
          </div>
        </div>

        <div className="vd-field" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <input
            type="checkbox"
            id="vd-search"
            checked={allowSearch}
            onChange={(e) => setAllowSearch(e.target.checked)}
            style={{ width: 'auto' }}
          />
          <label htmlFor="vd-search" style={{ margin: 0 }}>
            Enable fact-checking (Tavily Search)
          </label>
        </div>

        <button
          type="submit"
          className="vd-btn vd-btn-primary"
          disabled={!topic.trim() || loading}
        >
          {loading ? (
            <><span className="vd-spinner" style={{ width: 18, height: 18 }} /> Preparing Arena...</>
          ) : (
            <>🎙️ Enter Voice Arena</>
          )}
        </button>
      </form>
    </div>
  );
}
