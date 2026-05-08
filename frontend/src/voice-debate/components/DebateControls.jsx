/**
 * DebateControls — Mic toggle, text input fallback, interrupt, and end buttons.
 */
import { useState } from 'react';

export default function DebateControls({
  isMicActive,
  isAISpeaking,
  aiTyping,
  status,
  onToggleMic,
  onSendText,
  onInterrupt,
  onEndDebate,
  onStartDebate,
}) {
  const [textInput, setTextInput] = useState('');

  const handleTextSubmit = (e) => {
    e.preventDefault();
    if (textInput.trim()) {
      onSendText(textInput.trim());
      setTextInput('');
    }
  };

  // Pre-debate state
  if (status === 'connected') {
    return (
      <div className="vd-controls">
        <button className="vd-btn vd-btn-primary" onClick={onStartDebate} style={{ maxWidth: 300 }}>
          🎙️ Start Debate
        </button>
      </div>
    );
  }

  return (
    <div className="vd-controls">
      {/* Mic Button */}
      <button
        className={`vd-mic-btn ${isMicActive ? 'active' : ''}`}
        onClick={onToggleMic}
        title={isMicActive ? 'Mute microphone' : 'Unmute microphone'}
      >
        {isMicActive ? '🎙️' : '🔇'}
      </button>

      {/* Interrupt Button (when AI is speaking) */}
      {(isAISpeaking || aiTyping) && (
        <button className="vd-btn vd-btn-ghost" onClick={onInterrupt} title="Interrupt AI">
          ✋ Interrupt
        </button>
      )}

      {/* Text Input Fallback */}
      <form className="vd-text-input" onSubmit={handleTextSubmit}>
        <input
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
          placeholder="Type your argument (fallback)..."
          disabled={aiTyping}
        />
        <button type="submit" className="vd-btn vd-btn-ghost" disabled={!textInput.trim() || aiTyping}>
          Send
        </button>
      </form>

      {/* Timer placeholder */}
      <div className="vd-timer">
        Round {status === 'active' ? '●' : '○'}
      </div>

      {/* End Debate */}
      <button className="vd-btn vd-btn-danger" onClick={onEndDebate}>
        End Debate
      </button>
    </div>
  );
}
