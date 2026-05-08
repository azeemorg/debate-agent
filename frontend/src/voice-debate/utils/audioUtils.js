/**
 * Voice Debate — Audio Utilities
 * Handles audio recording, playback queue, and audio context management.
 */

/**
 * AudioRecorder — captures microphone audio and streams PCM chunks.
 */
export class AudioRecorder {
  constructor(onAudioChunk, sampleRate = 16000) {
    this.onAudioChunk = onAudioChunk;
    this.sampleRate = sampleRate;
    this.mediaStream = null;
    this.audioContext = null;
    this.processor = null;
    this.isRecording = false;
  }

  async start() {
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: { sampleRate: this.sampleRate, channelCount: 1, echoCancellation: true, noiseSuppression: true },
      });

      this.audioContext = new AudioContext({ sampleRate: this.sampleRate });
      const source = this.audioContext.createMediaStreamSource(this.mediaStream);

      // Use ScriptProcessorNode for wide compatibility
      this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);
      this.processor.onaudioprocess = (e) => {
        if (!this.isRecording) return;
        const float32 = e.inputBuffer.getChannelData(0);
        // Convert Float32 → Int16 PCM
        const int16 = new Int16Array(float32.length);
        for (let i = 0; i < float32.length; i++) {
          const s = Math.max(-1, Math.min(1, float32[i]));
          int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
        }
        this.onAudioChunk(int16.buffer);
      };

      source.connect(this.processor);
      this.processor.connect(this.audioContext.destination);
      this.isRecording = true;
      console.log('[AudioRecorder] Started');
    } catch (err) {
      console.error('[AudioRecorder] Start failed:', err);
      throw err;
    }
  }

  stop() {
    this.isRecording = false;
    this.processor?.disconnect();
    this.mediaStream?.getTracks().forEach((t) => t.stop());
    this.audioContext?.close();
    this.processor = null;
    this.mediaStream = null;
    this.audioContext = null;
    console.log('[AudioRecorder] Stopped');
  }

  get active() {
    return this.isRecording;
  }
}

/**
 * AudioPlaybackQueue — queues and plays base64-encoded audio chunks sequentially.
 */
export class AudioPlaybackQueue {
  constructor() {
    this.queue = [];
    this.isPlaying = false;
    this.currentAudio = null;
  }

  enqueue(base64Audio, format = 'mp3') {
    const blob = this._b64ToBlob(base64Audio, `audio/${format}`);
    const url = URL.createObjectURL(blob);
    this.queue.push(url);
    if (!this.isPlaying) this._playNext();
  }

  _playNext() {
    if (this.queue.length === 0) {
      this.isPlaying = false;
      return;
    }
    this.isPlaying = true;
    const url = this.queue.shift();
    this.currentAudio = new Audio(url);
    this.currentAudio.onended = () => {
      URL.revokeObjectURL(url);
      this._playNext();
    };
    this.currentAudio.onerror = () => {
      URL.revokeObjectURL(url);
      this._playNext();
    };
    this.currentAudio.play().catch(() => this._playNext());
  }

  stop() {
    this.queue = [];
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio = null;
    }
    this.isPlaying = false;
  }

  _b64ToBlob(b64, mime) {
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: mime });
  }
}

/**
 * Get audio level from an AnalyserNode (0-1 range).
 */
export function getAudioLevel(analyser) {
  if (!analyser) return 0;
  const data = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteFrequencyData(data);
  const sum = data.reduce((a, b) => a + b, 0);
  return sum / (data.length * 255);
}
