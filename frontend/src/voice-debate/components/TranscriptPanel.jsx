/**
 * TranscriptPanel — Displays the live conversation transcript.
 */
import { useEffect, useRef } from 'react';

export default function TranscriptPanel({ messages, partialTranscript, aiTyping, currentAiText }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, partialTranscript, currentAiText]);

  return (
    <div className="vd-transcript">
      <div className="vd-transcript-header">💬 Live Transcript</div>
      <div className="vd-transcript-messages">
        {messages.length === 0 && !aiTyping && (
          <div className="vd-empty">
            <div className="vd-empty-icon">🎙️</div>
            <p>Start speaking to begin the debate</p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`vd-message ${msg.role}`}>
            <div className="vd-message-label">
              {msg.role === 'human' ? '🧑 You' : '🤖 AI Debater'}
            </div>
            {msg.content}
          </div>
        ))}

        {/* AI currently typing */}
        {aiTyping && currentAiText && (
          <div className="vd-message ai" style={{ opacity: 0.8 }}>
            <div className="vd-message-label">🤖 AI Debater</div>
            {currentAiText}
            <span style={{ animation: 'vd-pulse 1s infinite' }}>▌</span>
          </div>
        )}

        {aiTyping && !currentAiText && (
          <div className="vd-typing">
            <span /><span /><span />
          </div>
        )}

        {/* Partial transcript */}
        {partialTranscript && (
          <div className="vd-partial">🎤 {partialTranscript}...</div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
