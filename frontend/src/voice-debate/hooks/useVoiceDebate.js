/**
 * useVoiceDebate — Main orchestration hook for the voice debate system.
 * Fixes:
 * 1. Mutes mic→backend while AI is speaking (prevents self-debating feedback loop)
 * 2. Cancels browser TTS immediately when user starts speaking (stop on interrupt)
 * 3. Better voice selection for AI
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import { voiceDebateApi } from '../services/voiceDebateApi';
import { VoiceDebateWebSocket } from '../services/websocketService';
import { AudioRecorder, AudioPlaybackQueue } from '../utils/audioUtils';

// Pre-load voices and pick the best voice based on the response text's language
function getBestVoice(text = '') {
  const voices = window.speechSynthesis?.getVoices() || [];
  
  // Basic language detection: if text contains Hindi characters, use a Hindi voice
  const isHindi = /[\u0900-\u097F]/.test(text);
  if (isHindi) {
    const hindiVoice = voices.find(v => v.lang.startsWith('hi') || v.name.toLowerCase().includes('hindi'));
    if (hindiVoice) return hindiVoice;
  }

  const names = ['Google UK English Male', 'Microsoft George', 'Microsoft David', 'Daniel', 'Alex'];
  for (const n of names) {
    const v = voices.find(v => v.name.includes(n));
    if (v) return v;
  }
  return (
    voices.find(v => v.lang.startsWith('en') && v.name.toLowerCase().includes('male')) ||
    voices.find(v => v.lang.startsWith('en-GB')) ||
    voices.find(v => v.lang.startsWith('en')) ||
    voices[0] ||
    null
  );
}

export function useVoiceDebate() {
  // Session state
  const [sessionId, setSessionId] = useState(null);
  const [status, setStatus] = useState('idle');
  const [topic, setTopic] = useState('');
  const [round, setRound] = useState(0);
  const [error, setError] = useState(null);

  // Conversation state
  const [messages, setMessages] = useState([]);
  const [partialTranscript, setPartialTranscript] = useState('');
  const [aiTyping, setAiTyping] = useState(false);
  const [currentAiText, setCurrentAiText] = useState('');

  // Evaluation state
  const [evaluation, setEvaluation] = useState(null);
  const [evaluationHistory, setEvaluationHistory] = useState([]);

  // Audio state
  const [isMicActive, setIsMicActive] = useState(false);
  const [isAISpeaking, setIsAISpeaking] = useState(false);

  // Refs
  const wsRef = useRef(null);
  const recorderRef = useRef(null);
  const playbackRef = useRef(new AudioPlaybackQueue());
  const aiTextBufferRef = useRef('');
  // Ref so the audio callback always sees the latest value without stale closures
  const isAISpeakingRef = useRef(false);
  // Track status via ref so WS callbacks (captured at creation) always see current value
  const statusRef = useRef('idle');
  const intentionalDisconnectRef = useRef(false);

  // Helper: sync both ref and state
  const setAISpeakingBoth = (val) => {
    isAISpeakingRef.current = val;
    setIsAISpeaking(val);
  };

  // ── Reset Session (for "Debate Again") ──────────────────────────────────
  const resetSession = useCallback(() => {
    intentionalDisconnectRef.current = true;
    window.speechSynthesis?.cancel();
    isAISpeakingRef.current = false;
    statusRef.current = 'idle';
    recorderRef.current?.stop();
    recorderRef.current = null;
    wsRef.current?.disconnect();
    wsRef.current = null;
    setSessionId(null);
    setStatus('idle');
    setTopic('');
    setRound(0);
    setError(null);
    setMessages([]);
    setPartialTranscript('');
    setAiTyping(false);
    setCurrentAiText('');
    setEvaluation(null);
    setEvaluationHistory([]);
    setIsMicActive(false);
    setIsAISpeaking(false);
    intentionalDisconnectRef.current = false;
  }, []);

  // ── Create Session ────────────────────────────────────────────────────────
  const createSession = useCallback(async (params) => {
    try {
      intentionalDisconnectRef.current = false;
      setStatus('connecting');
      statusRef.current = 'connecting';
      setError(null);

      // Kick off voice loading early (Chrome loads async)
      if (window.speechSynthesis) {
        window.speechSynthesis.getVoices();
        window.speechSynthesis.onvoiceschanged = () => { window.speechSynthesis.getVoices(); };
      }

      const response = await voiceDebateApi.createSession(params);
      setSessionId(response.session_id);
      setTopic(response.topic);

      // ── WebSocket handlers ─────────────────────────────────────────────
      const ws = new VoiceDebateWebSocket(response.session_id, {
        onOpen: () => console.log('[VD] WS connected'),

        onSessionInfo: (data) => {
          setTopic(data.topic);
          setRound(data.round);
        },

        onAIResponseStart: () => {
          setAiTyping(true);
          setCurrentAiText('');
          aiTextBufferRef.current = '';
          // Stop any ongoing speech when new AI response starts
          if (window.speechSynthesis) window.speechSynthesis.cancel();
          isAISpeakingRef.current = false;
        },

        onAIResponseChunk: (data) => {
          if (data.type === 'ai_text') {
            aiTextBufferRef.current += data.text;
            setCurrentAiText(aiTextBufferRef.current);
          } else if (data.type === 'partial_transcript') {
            // User started talking while AI speaks → interrupt
            if (data.text && isAISpeakingRef.current) {
              window.speechSynthesis?.cancel();
              isAISpeakingRef.current = false;
              setIsAISpeaking(false);
              wsRef.current?.interrupt();
            }
            setPartialTranscript(data.text);
          }
        },

        onAIResponseEnd: (data) => {
          setAiTyping(false);
          const fullText = data.full_response || aiTextBufferRef.current;
          if (fullText) {
            setMessages((prev) => [...prev, { role: 'ai', content: fullText, timestamp: Date.now() }]);

            // ── Browser TTS (inline — avoids stale closure issues) ──────
            if (window.speechSynthesis) {
              window.speechSynthesis.cancel();
              const utter = new SpeechSynthesisUtterance(fullText);
              utter.rate = 1.08;   // slightly faster = more aggressive
              utter.pitch = 0.88;  // slightly deeper
              utter.volume = 1.0;
              const voice = getBestVoice(fullText);
              if (voice) {
                utter.voice = voice;
                utter.lang = voice.lang;
              }
              utter.onstart = () => { isAISpeakingRef.current = true; setIsAISpeaking(true); };
              utter.onend   = () => { isAISpeakingRef.current = false; setIsAISpeaking(false); };
              utter.onerror = () => { isAISpeakingRef.current = false; setIsAISpeaking(false); };
              window.speechSynthesis.speak(utter);
            }
          }
          setCurrentAiText('');
          aiTextBufferRef.current = '';
        },

        onAIAudioChunk: () => { /* backend audio ignored — using browser TTS */ },
        onAIAudioEnd: () => { /* no-op */ },

        onTranscript: (data) => {
          if (data.is_final && data.text) {
            setMessages((prev) => [...prev, { role: 'human', content: data.text, timestamp: Date.now() }]);
            setPartialTranscript('');
          }
        },

        onEvaluationUpdate: (data) => {
          setEvaluation(data);
          setEvaluationHistory((prev) => [...prev, data]);
          setRound(data.round_number || 0);
        },

        onStatusUpdate: (data) => {
          if (data.status === 'active') { setStatus('active'); statusRef.current = 'active'; }
          else if (data.status === 'finished') { setStatus('finished'); statusRef.current = 'finished'; }
          else if (data.status === 'paused') { setStatus('paused'); statusRef.current = 'paused'; }
          else if (data.status === 'interrupted') {
            window.speechSynthesis?.cancel();
            isAISpeakingRef.current = false;
            setIsAISpeaking(false);
          }
        },

        onError: (data) => {
          console.error('[VD] Error:', data);
          setError(data.message || 'An error occurred');
        },

        onClose: () => {
          // Only show error if we didn't disconnect intentionally
          if (!intentionalDisconnectRef.current && statusRef.current === 'active') {
            setError('Connection lost — please restart the debate');
          }
        },
      });

      ws.connect();
      wsRef.current = ws;
      setStatus('connected');
      statusRef.current = 'connected';
      return response;
    } catch (err) {
      setStatus('idle');
      setError(err.message);
      throw err;
    }
  }, []); // No deps — all mutable state accessed via refs

  // ── Start Debate ──────────────────────────────────────────────────────────
  const startDebate = useCallback(() => {
    wsRef.current?.startDebate();
    setStatus('active');
  }, []);

  // ── Start Microphone ──────────────────────────────────────────────────────
  const startMic = useCallback(async () => {
    try {
      const recorder = new AudioRecorder((audioBuffer) => {
        // KEY FIX: Block audio to backend while AI is speaking.
        // This prevents Deepgram from hearing the browser TTS output
        // and making the AI respond to its own voice (self-debating loop).
        if (!isAISpeakingRef.current) {
          wsRef.current?.sendAudio(audioBuffer);
        }
      });
      await recorder.start();
      recorderRef.current = recorder;
      setIsMicActive(true);
    } catch (err) {
      setError('Microphone access denied');
    }
  }, []);

  // ── Stop Microphone ───────────────────────────────────────────────────────
  const stopMic = useCallback(() => {
    recorderRef.current?.stop();
    recorderRef.current = null;
    setIsMicActive(false);
  }, []);

  // ── Toggle Mic ────────────────────────────────────────────────────────────
  const toggleMic = useCallback(() => {
    if (isMicActive) stopMic();
    else startMic();
  }, [isMicActive, startMic, stopMic]);

  // ── Send Text (fallback) ──────────────────────────────────────────────────
  const sendText = useCallback((text) => {
    if (!text.trim()) return;
    window.speechSynthesis?.cancel();
    isAISpeakingRef.current = false;
    setMessages((prev) => [...prev, { role: 'human', content: text, timestamp: Date.now() }]);
    wsRef.current?.sendText(text);
  }, []);

  // ── Interrupt AI ──────────────────────────────────────────────────────────
  const interruptAI = useCallback(() => {
    window.speechSynthesis?.cancel();
    isAISpeakingRef.current = false;
    setIsAISpeaking(false);
    wsRef.current?.interrupt();
    playbackRef.current.stop();
    setAiTyping(false);
  }, []);

  // ── End Debate ────────────────────────────────────────────────────────────
  const endDebate = useCallback(async () => {
    intentionalDisconnectRef.current = true;
    stopMic();
    window.speechSynthesis?.cancel();
    isAISpeakingRef.current = false;
    playbackRef.current.stop();
    wsRef.current?.endDebate();
    setStatus('finished');
    statusRef.current = 'finished';

    if (sessionId) {
      try {
        return await voiceDebateApi.endSession(sessionId);
      } catch (err) {
        console.error('End session error:', err);
      }
    }
  }, [sessionId, stopMic]);

  // ── Cleanup ───────────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      recorderRef.current?.stop();
      playbackRef.current.stop();
      wsRef.current?.disconnect();
      window.speechSynthesis?.cancel();
    };
  }, []);

  return {
    sessionId, status, topic, round, error, messages, partialTranscript,
    aiTyping, currentAiText, evaluation, evaluationHistory,
    isMicActive, isAISpeaking,
    createSession, startDebate, startMic, stopMic, toggleMic,
    sendText, interruptAI, endDebate, resetSession,
  };
}
