/**
 * VoiceDebatePage — Entry point for the AI Battle / Voice Debate feature.
 * Manages the setup → room → results lifecycle.
 */
import { useState } from 'react';
import { useVoiceDebate } from './hooks/useVoiceDebate.js';
import DebateSetup from './components/DebateSetup.jsx';
import VoiceDebateRoom from './components/VoiceDebateRoom.jsx';
import DebateResults from './components/DebateResults.jsx';
import './styles/voiceDebate.css';

export default function VoiceDebatePage() {
  const debate = useVoiceDebate();
  const [finalHistory, setFinalHistory] = useState(null);
  const [finalTopic, setFinalTopic] = useState('');

  const isSetup = debate.status === 'idle' && !finalHistory;
  const isInRoom = ['connected', 'active', 'paused'].includes(debate.status);

  const handleEndDebate = async () => {
    setFinalHistory(debate.evaluationHistory);
    setFinalTopic(debate.topic);
    await debate.endDebate();
  };

  // Reset everything and go back to setup screen
  const handlePlayAgain = () => {
    debate.resetSession();   // resets hook status → 'idle'
    setFinalHistory(null);
    setFinalTopic('');
  };

  return (
    <div className="vd-root">
      {/* ── Setup Screen ── */}
      {isSetup && (
        <DebateSetup
          onStart={debate.createSession}
          loading={debate.status === 'connecting'}
        />
      )}

      {/* ── Active Room ── */}
      {isInRoom && (
        <VoiceDebateRoom
          topic={debate.topic}
          status={debate.status}
          round={debate.round}
          messages={debate.messages}
          partialTranscript={debate.partialTranscript}
          aiTyping={debate.aiTyping}
          currentAiText={debate.currentAiText}
          evaluation={debate.evaluation}
          evaluationHistory={debate.evaluationHistory}
          isMicActive={debate.isMicActive}
          isAISpeaking={debate.isAISpeaking}
          onToggleMic={debate.toggleMic}
          onSendText={debate.sendText}
          onInterrupt={debate.interruptAI}
          onEndDebate={handleEndDebate}
          onStartDebate={debate.startDebate}
        />
      )}

      {/* ── Results Screen ── */}
      {!isSetup && !isInRoom && (finalHistory || debate.evaluationHistory.length > 0) && (
        <DebateResults
          topic={finalTopic || debate.topic}
          evaluationHistory={finalHistory || debate.evaluationHistory}
          onPlayAgain={handlePlayAgain}
        />
      )}

      {/* Error Toast */}
      {debate.error && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: '#ef4444', color: '#fff', padding: '0.7rem 1.4rem',
          borderRadius: 10, fontSize: '0.85rem', zIndex: 1000,
          boxShadow: '0 4px 20px rgba(239,68,68,0.4)',
        }}>
          ⚠️ {debate.error}
        </div>
      )}
    </div>
  );
}
