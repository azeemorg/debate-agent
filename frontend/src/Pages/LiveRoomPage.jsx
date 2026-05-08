import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { api } from '../API/axios';
import { motion } from 'framer-motion';
import { LiveKitRoom, RoomAudioRenderer, useLocalParticipant } from '@livekit/components-react';
import { Swords, Eye, Shield, ArrowLeft, LogOut, Loader2, Mic, MicOff, Video, VideoOff } from 'lucide-react';
import DebateRoomLayout from '../Components/DebateRoomLayout';
import '../CSS/LiveRoom.css';

const ALL_ROLE_OPTIONS = [
  {
    id: 'RED',
    label: 'Join PRO Side',
    icon: Swords,
    variant: 'role-option--pro',
  },
  {
    id: 'BLUE',
    label: 'Join CON Side',
    icon: Swords,
    variant: 'role-option--con',
  },
  {
    id: 'HOST',
    label: 'Join as HOST',
    icon: Shield,
    variant: 'role-option--host',
    span: true,
  },
  {
    id: 'AUDIENCE',
    label: 'Watch as Audience',
    icon: Eye,
    variant: 'role-option--watch',
    span: true,
  },
];

// Host-only option shown when the room creator enters
const HOST_ONLY_OPTIONS = [
  {
    id: 'HOST',
    label: 'Enter as Host',
    icon: Shield,
    variant: 'role-option--host',
    span: true,
  },
];

export default function LiveRoomPage() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  // Check if we received a token + role from navigation state (e.g. HostRoomsPage activate)
  const stateToken = location.state?.token;
  const stateRole  = location.state?.role;
  // isHost is true if explicitly flagged OR if the role passed is HOST
  const isHost = location.state?.isHost || stateRole === 'HOST';

  const [token, setToken] = useState(stateToken || '');
  const [roleSelection, setRoleSelection] = useState(!stateToken);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [voteCasted, setVoteCasted] = useState(null);

  // Track which role the user actually joined as — drives camera/mic permission
  const [joinedRole, setJoinedRole] = useState(
    stateRole || (isHost ? 'HOST' : null)
  );

  // ── Fullscreen debate mode: hide global nav, remove top padding ──
  useEffect(() => {
    document.body.classList.add('debate-mode');
    return () => document.body.classList.remove('debate-mode');
  }, []);

  // Audience members: no camera / no mic
  const isAudience = joinedRole === 'AUDIENCE';

  // Determine which role cards to show
  const ROLE_OPTIONS = isHost ? HOST_ONLY_OPTIONS : ALL_ROLE_OPTIONS;

  const LIVEKIT_URL = import.meta.env.VITE_LIVEKIT_URL || 'wss://your-livekit-server-url.com';

  const fetchToken = async (role) => {
    setLoading(true);
    setError('');
    try {
      let res;
      if (role === 'AUDIENCE') {
        res = await api.post(`/room/${roomId}/tokenForAuidence`);
      } else {
        res = await api.post(`/room/${roomId}/token`, null, { params: { team: role } });
      }

      const tokenStr = res.data?.token || res.data;
      if (tokenStr && typeof tokenStr === 'string') {
        setJoinedRole(role);   // ← remember the role BEFORE showing the room
        setToken(tokenStr);
        setRoleSelection(false);
      } else {
        setError('Did not receive a valid token from server.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to join room.');
    } finally {
      setLoading(false);
    }
  };

  const castVote = async (team) => {
    try {
      await api.post(`/vote/${roomId}/vote`, null, { params: { team } });
      setVoteCasted(team);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to cast vote.');
    }
  };

  const leaveRoom = async () => {
    try {
      await api.post(`/room/${roomId}/leave`);
    } catch (err) {
      console.error(err);
    }
    navigate('/dashboard');
  };

  // ── Role Selection Screen ──
  if (roleSelection) {
    return (
      <div className="role-selection-page">
        <div className="role-bg-glow" aria-hidden="true" />

        <div style={{ width: '100%', maxWidth: '560px', position: 'relative', zIndex: 1 }}>
          <button
            onClick={() => navigate('/dashboard')}
            className="back-link"
            aria-label="Go back to dashboard"
          >
            <ArrowLeft size={18} aria-hidden="true" />
            Back to Dashboard
          </button>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', bounce: 0.3, duration: 0.5 }}
            className="role-card"
          >
            <h1>{isHost ? 'Your Room is Ready!' : 'Choose Your Role'}</h1>
            <p className="role-subtitle">
              {isHost
                ? 'You created this room — enter as the Host to manage the debate.'
                : 'Pick a side or watch the action unfold.'}
            </p>

            {/* Error */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="role-error"
                role="alert"
              >
                {error}
              </motion.div>
            )}

            {/* Role grid */}
            <div className="role-grid">
              {ROLE_OPTIONS.map((role) => {
                const Icon = role.icon;
                return (
                  <motion.button
                    key={role.id}
                    whileHover={{ y: -4 }}
                    whileTap={{ scale: 0.97 }}
                    disabled={loading}
                    onClick={() => fetchToken(role.id)}
                    className={`role-option ${role.variant} ${role.span ? 'span-full' : ''}`}
                    aria-label={role.label}
                  >
                    <Icon
                      className="role-icon"
                      size={28}
                      aria-hidden="true"
                    />
                    <span className="role-label">{role.label}</span>
                  </motion.button>
                );
              })}
            </div>

            {/* Loading */}
            {loading && (
              <div className="role-loading" role="status" aria-label="Joining room">
                <Loader2 size={28} className="role-icon" style={{ animation: 'spin 0.8s linear infinite', color: 'var(--cta)' }} />
              </div>
            )}
          </motion.div>
        </div>
      </div>
    );
  }

  // ── Active Debate Room ──
  return (
    <div className="live-room-container">
      {/* Top Bar */}
      <div className="live-topbar">
        <div className="topbar-left">
          <div className="live-dot" aria-hidden="true" />
          <span className="arena-title">
            {/* Audience sees generic title — never the room code */}
            {isAudience ? 'Live Debate' : `Arena #${roomId}`}
          </span>
          {isAudience && (
            <span className="audience-badge"><Eye size={11} /> Watching</span>
          )}
        </div>

        <div className="topbar-right">
          <button
            onClick={leaveRoom}
            className="leave-btn"
            aria-label="Leave the debate room"
          >
            <LogOut size={16} aria-hidden="true" />
            <span>Leave</span>
          </button>
        </div>
      </div>

      {/* Debate Room — 3-column dynamic layout */}
      <div className="livekit-area">
        <LiveKitRoom
          video={!isAudience}
          audio={!isAudience}
          token={token}
          serverUrl={LIVEKIT_URL}
          style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column' }}
          onDisconnected={leaveRoom}
        >
          <DebateRoomLayout
            isHost={isHost}
            isAudience={isAudience}
            canRemove={isHost}
            onRemove={async (identity) => {
              try {
                // Backend: POST /{roomId}/{participantId}/removeParticipant
                await api.post(`/room/${roomId}/${identity}/removeParticipant`);
              } catch (err) {
                console.error('Remove participant failed', err);
              }
            }}
          />
          <RoomAudioRenderer />
          {!isAudience && <DebateControlBar />}
          {isAudience && (
            <AudienceVotePanel
              voteCasted={voteCasted}
              onVote={castVote}
              error={error}
            />
          )}
        </LiveKitRoom>
      </div>
    </div>
  );
}

/* ─── Audience Vote Panel (inside LiveKitRoom context) ─── */
function AudienceVotePanel({ voteCasted, onVote, error }) {
  const [voting, setVoting] = useState(false);

  const handleVote = async (team) => {
    if (voting || voteCasted) return;
    setVoting(true);
    await onVote(team);
    setVoting(false);
  };

  if (voteCasted) {
    return (
      <div className="vote-panel vote-panel--done">
        <div className="vote-confirmed">
          <span className={`vote-badge ${voteCasted === 'RED' ? 'vote-badge--pro' : 'vote-badge--con'}`}>
            ✓ Voted {voteCasted === 'RED' ? 'PRO' : 'CON'}
          </span>
          <p>Your vote is locked in. Results revealed when the debate ends.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="vote-panel">
      <span className="vote-panel__prompt">Who's winning? Cast your vote:</span>
      {error && <span className="vote-panel__error">{error}</span>}
      <div className="vote-choices">
        <button
          className="vote-choice vote-choice--pro"
          onClick={() => handleVote('RED')}
          disabled={voting}
        >
          <span className="vote-choice__emoji">👍</span>
          <strong>PRO</strong>
          <span>Making the better case</span>
        </button>
        <div className="vote-choice-vs">VS</div>
        <button
          className="vote-choice vote-choice--con"
          onClick={() => handleVote('BLUE')}
          disabled={voting}
        >
          <span className="vote-choice__emoji">👎</span>
          <strong>CON</strong>
          <span>Making the better case</span>
        </button>
      </div>
    </div>
  );
}

/* ─── Mic & Camera toggle bar (inside LiveKitRoom context) ─── */
function DebateControlBar() {
  const { localParticipant } = useLocalParticipant();
  const [micOn,  setMicOn]  = useState(true);
  const [camOn,  setCamOn]  = useState(true);

  const toggleMic = useCallback(async () => {
    if (!localParticipant) return;
    const next = !micOn;
    await localParticipant.setMicrophoneEnabled(next);
    setMicOn(next);
  }, [localParticipant, micOn]);

  const toggleCam = useCallback(async () => {
    if (!localParticipant) return;
    const next = !camOn;
    await localParticipant.setCameraEnabled(next);
    setCamOn(next);
  }, [localParticipant, camOn]);

  return (
    <div className="debate-controls" role="toolbar" aria-label="Media controls">
      {/* Mic toggle */}
      <button
        onClick={toggleMic}
        className={`ctrl-btn ${micOn ? 'ctrl-btn--on' : 'ctrl-btn--off'}`}
        aria-label={micOn ? 'Mute microphone' : 'Unmute microphone'}
        aria-pressed={!micOn}
      >
        {micOn ? <Mic size={18} /> : <MicOff size={18} />}
        <span>{micOn ? 'Mic On' : 'Muted'}</span>
      </button>

      {/* Camera toggle */}
      <button
        onClick={toggleCam}
        className={`ctrl-btn ${camOn ? 'ctrl-btn--on' : 'ctrl-btn--off'}`}
        aria-label={camOn ? 'Turn off camera' : 'Turn on camera'}
        aria-pressed={!camOn}
      >
        {camOn ? <Video size={18} /> : <VideoOff size={18} />}
        <span>{camOn ? 'Cam On' : 'Cam Off'}</span>
      </button>
    </div>
  );
}
