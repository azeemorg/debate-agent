/**
 * VoiceDebateRoom — Main room container composing transcript, evaluation, and controls.
 */
import TranscriptPanel from './TranscriptPanel.jsx';
import EvaluationPanel from './EvaluationPanel.jsx';
import DebateControls from './DebateControls.jsx';

export default function VoiceDebateRoom({
  topic, status, round, messages, partialTranscript,
  aiTyping, currentAiText, evaluation, evaluationHistory,
  isMicActive, isAISpeaking,
  onToggleMic, onSendText, onInterrupt, onEndDebate, onStartDebate,
}) {
  return (
    <div className="vd-room">
      {/* Header */}
      <div className="vd-room-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
          <span className={`vd-status-dot ${status}`} />
          <h2>Voice Debate Arena</h2>
          <span className="vd-topic-badge">{topic}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--vd-text-dim)' }}>
            Round {round}
          </span>
          {isAISpeaking && (
            <span style={{ fontSize: '0.75rem', color: 'var(--vd-ai)' }}>
              🔊 AI Speaking...
            </span>
          )}
          {isMicActive && (
            <span style={{ fontSize: '0.75rem', color: 'var(--vd-human)' }}>
              🎙️ Listening...
            </span>
          )}
        </div>
      </div>

      {/* Transcript */}
      <TranscriptPanel
        messages={messages}
        partialTranscript={partialTranscript}
        aiTyping={aiTyping}
        currentAiText={currentAiText}
      />

      {/* Evaluation */}
      <EvaluationPanel
        evaluation={evaluation}
        evaluationHistory={evaluationHistory}
      />

      {/* Controls */}
      <DebateControls
        isMicActive={isMicActive}
        isAISpeaking={isAISpeaking}
        aiTyping={aiTyping}
        status={status}
        onToggleMic={onToggleMic}
        onSendText={onSendText}
        onInterrupt={onInterrupt}
        onEndDebate={onEndDebate}
        onStartDebate={onStartDebate}
      />
    </div>
  );
}
