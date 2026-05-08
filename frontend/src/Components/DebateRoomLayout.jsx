import { useEffect, useRef, useMemo, useState } from 'react';
import {
  useParticipants,
  useLocalParticipant,
  useSpeakingParticipants,
} from '@livekit/components-react';
import { Track } from 'livekit-client';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { MicOff, VideoOff, Crown, Swords, Shield, Eye, Mic } from 'lucide-react';
import '../CSS/DebateRoomLayout.css';

/* ─── Parse participant metadata ─── */
function parseMeta(participant) {
  try { return JSON.parse(participant?.metadata || '{}'); }
  catch { return {}; }
}

/* ─── Single participant video tile ─── */
/* Uses direct track.attach() — same pattern as the working VideoCard.jsx */
function ParticipantVideoTile({ participant, large = false, isHostTile = false, canRemove, onRemove }) {
  const videoRef = useRef(null);
  const audioRef = useRef(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [hasVideo, setHasVideo]     = useState(false);
  const [isMuted, setIsMuted]       = useState(false);

  useEffect(() => {
    if (!participant) return;

    // ── Attach existing tracks ──
    const attachAll = () => {
      const pubs = participant.getTrackPublications
        ? participant.getTrackPublications()
        : [];

      let hasVideoTrack = false;
      let micMuted = true;

      pubs.forEach((pub) => {
        if (!pub.track) return;

        if (pub.track.kind === Track.Kind.Video && pub.track.source === Track.Source.Camera) {
          if (videoRef.current) pub.track.attach(videoRef.current);
          hasVideoTrack = !pub.isMuted;
        }
        if (pub.track.kind === Track.Kind.Audio && !participant.isLocal && audioRef.current) {
          pub.track.attach(audioRef.current);
          micMuted = pub.isMuted;
        }
      });

      setHasVideo(hasVideoTrack);
      setIsMuted(micMuted);
    };

    attachAll();

    // ── Listen for track changes ──
    const onTrackSubscribed = (track, pub) => {
      if (track.kind === Track.Kind.Video && track.source === Track.Source.Camera) {
        if (videoRef.current) track.attach(videoRef.current);
        setHasVideo(!pub?.isMuted);
      }
      if (track.kind === Track.Kind.Audio && !participant.isLocal && audioRef.current) {
        track.attach(audioRef.current);
      }
    };

    const onTrackUnsubscribed = (track) => {
      try { track.detach(); } catch (_) {}
      if (track.kind === Track.Kind.Video) setHasVideo(false);
    };

    const onTrackMuted   = (pub) => {
      if (pub.kind === Track.Kind.Video) setHasVideo(false);
      if (pub.kind === Track.Kind.Audio) setIsMuted(true);
    };
    const onTrackUnmuted = (pub) => {
      if (pub.kind === Track.Kind.Video) setHasVideo(true);
      if (pub.kind === Track.Kind.Audio) setIsMuted(false);
    };

    const onSpeakingChanged = (speaking) => setIsSpeaking(speaking);

    participant.on('trackSubscribed',   onTrackSubscribed);
    participant.on('trackUnsubscribed', onTrackUnsubscribed);
    participant.on('trackMuted',        onTrackMuted);
    participant.on('trackUnmuted',      onTrackUnmuted);
    participant.on('isSpeakingChanged', onSpeakingChanged);

    return () => {
      participant.off('trackSubscribed',   onTrackSubscribed);
      participant.off('trackUnsubscribed', onTrackUnsubscribed);
      participant.off('trackMuted',        onTrackMuted);
      participant.off('trackUnmuted',      onTrackUnmuted);
      participant.off('isSpeakingChanged', onSpeakingChanged);

      // Detach on unmount
      try {
        const pubs = participant.getTrackPublications?.() || [];
        pubs.forEach((pub) => { try { pub.track?.detach(); } catch (_) {} });
      } catch (_) {}
    };
  }, [participant]);

  const name = participant?.identity || 'Unknown';

  return (
    <motion.div
      layout
      layoutId={`pvt-${participant?.identity}`}
      className={[
        'pvt',
        large ? 'pvt--large' : 'pvt--small',
        isSpeaking ? 'pvt--speaking' : '',
        isHostTile ? 'pvt--host' : '',
      ].filter(Boolean).join(' ')}
      initial={{ opacity: 0, scale: 0.88 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.88 }}
      transition={{ type: 'spring', bounce: 0.22, duration: 0.4 }}
    >
      <div className="pvt__video">
        {/* Video element always present — hidden when no stream */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={participant?.isLocal}
          className="pvt__feed"
          style={{ display: hasVideo ? 'block' : 'none' }}
        />
        <audio ref={audioRef} autoPlay />

        {/* Avatar when camera is off */}
        {!hasVideo && (
          <div className="pvt__avatar">
            <span>{name.slice(0, 2).toUpperCase()}</span>
          </div>
        )}

        {/* Speaking ring */}
        {isSpeaking && <div className="pvt__ring" aria-hidden="true" />}

        {/* Status badges */}
        <div className="pvt__badges">
          {isMuted  && <span className="pvt__badge" title="Muted"><MicOff size={9} /></span>}
          {!hasVideo && <span className="pvt__badge" title="Camera off"><VideoOff size={9} /></span>}
        </div>

        {/* Host crown */}
        {isHostTile && <div className="pvt__crown"><Crown size={12} /></div>}

        {/* Remove button (host-only power) */}
        {canRemove && !participant?.isLocal && (
          <button
            className="pvt__remove"
            onClick={() => onRemove?.(participant.identity)}
            aria-label={`Remove ${name}`}
          >✕</button>
        )}
      </div>

      {/* Nameplate */}
      <div className="pvt__nameplate">
        <span className="pvt__name">{name}</span>
        {isSpeaking && <span className="pvt__speaking-dot" aria-hidden="true" />}
      </div>
    </motion.div>
  );
}

/* ─── Team panel — staggered 2-column ─── */
function TeamPanel({ participants, side, label, canRemove, onRemove }) {
  const colA = participants.filter((_, i) => i % 2 === 0);
  const colB = participants.filter((_, i) => i % 2 !== 0);

  return (
    <div className={`team-panel team-panel--${side}`}>
      <div className={`team-label team-label--${side}`}>
        <Swords size={11} aria-hidden="true" />
        <span>{label}</span>
        <span className="team-count">{participants.length}</span>
      </div>

      {participants.length === 0 ? (
        <div className="team-empty">Waiting for {label} debaters…</div>
      ) : (
        <div className="team-tiles">
          <div className="tile-col">
            <AnimatePresence>
              {colA.map(p => (
                <ParticipantVideoTile
                  key={p.identity}
                  participant={p}
                  canRemove={canRemove}
                  onRemove={onRemove}
                />
              ))}
            </AnimatePresence>
          </div>
          <div className="tile-col tile-col--stagger">
            <AnimatePresence>
              {colB.map(p => (
                <ParticipantVideoTile
                  key={p.identity}
                  participant={p}
                  canRemove={canRemove}
                  onRemove={onRemove}
                />
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Center panel: Host top + Active speaker bottom ─── */
function CenterPanel({ host, spotlight, canRemove, onRemove }) {
  return (
    <div className="center-panel">
      {/* Host slot */}
      <div className="center-slot">
        <div className="center-slot__label center-slot__label--host">
          <Crown size={11} /> HOST
        </div>
        <div className="center-slot__body">
          <AnimatePresence mode="wait">
            {host ? (
              <ParticipantVideoTile
                key={host.identity}
                participant={host}
                large
                isHostTile
                canRemove={canRemove}
                onRemove={onRemove}
              />
            ) : (
              <motion.div
                key="no-host"
                className="center-waiting"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              >
                <Shield size={28} opacity={0.3} />
                <span>Host connecting…</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Active speaker spotlight */}
      <div className="center-slot center-slot--speaker">
        <div className="center-slot__label center-slot__label--speaker">
          <Mic size={11} /> SPEAKING
        </div>
        <div className="center-slot__body">
          <AnimatePresence mode="wait">
            {spotlight ? (
              <ParticipantVideoTile
                key={`spotlight-${spotlight.identity}`}
                participant={spotlight}
                large
              />
            ) : (
              <motion.div
                key="no-speaker"
                className="center-waiting"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              >
                <div className="idle-dots" aria-hidden="true">
                  <span /><span /><span />
                </div>
                <span>No active speaker</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

/* ─── Main layout ─── */
export default function DebateRoomLayout({ isHost = false, isAudience = false, canRemove = false, onRemove }) {
  const participants       = useParticipants();
  const { localParticipant } = useLocalParticipant();
  const speakingParticipants = useSpeakingParticipants();

  const { pro, con, host } = useMemo(() => {
    const pro = [], con = [], hosts = [];

    participants.forEach(p => {
      // Local user + isHost flag → force into hosts regardless of metadata
      if (isHost && p.identity === localParticipant?.identity) {
        hosts.push(p); return;
      }

      const meta = parseMeta(p);
      const role = (meta.Role || meta.role || '').toUpperCase();
      const team = (meta.Team || meta.team || '').toUpperCase();

      if      (role === 'HOST' || team === 'HOST')        hosts.push(p);
      else if (team === 'RED'  || team === 'PRO')         pro.push(p);
      else if (team === 'BLUE' || team === 'CON')         con.push(p);
      else if (p.identity?.toLowerCase().includes('host')) hosts.push(p);
      // audience: intentionally excluded from main grid
    });

    return { pro, con, host: hosts[0] || null };
  }, [participants, isHost, localParticipant]);

  // Active speaker spotlight — exclude host (they're already in center top)
  const spotlight = speakingParticipants.find(p => p.identity !== host?.identity) || null;

  return (
    <LayoutGroup>
      {/* Audience info banner */}
      {isAudience && (
        <div className="audience-banner" role="status">
          <Eye size={13} />
          <span>You're watching live — camera &amp; mic are off</span>
        </div>
      )}

      <div className="debate-arena">
        <TeamPanel participants={pro} side="left"  label="PRO" canRemove={canRemove} onRemove={onRemove} />
        <CenterPanel host={host} spotlight={spotlight} canRemove={canRemove} onRemove={onRemove} />
        <TeamPanel participants={con} side="right" label="CON" canRemove={canRemove} onRemove={onRemove} />
      </div>
    </LayoutGroup>
  );
}
