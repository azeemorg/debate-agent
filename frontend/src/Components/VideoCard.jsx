import { useEffect, useRef } from "react";
import { Track } from "livekit-client";
import "../CSS/VideoCard.css";

export default function VideoCard({
  participant,
  isActive,
  canRemove,
  onRemove,
  teamColor = "default",
  isLarge = false,
}) {
  const videoRef = useRef(null);
  const audioRef = useRef(null);

  useEffect(() => {
    if (!participant) return;

    // Get publications at the effect scope so cleanup can access them
    const publications = participant.getTrackPublications
      ? participant.getTrackPublications()
      : [];

    // Attach existing tracks
    publications.forEach((pub) => {
      if (!pub.track) return;

      if (
        pub.track.kind === Track.Kind.Video &&
        pub.track.source === Track.Source.Camera
      ) {
        if (videoRef.current) pub.track.attach(videoRef.current);
      }

      // Attach audio for remote participants only (local audio causes echo)
      if (
        pub.track.kind === Track.Kind.Audio &&
        !participant.isLocal &&
        audioRef.current
      ) {
        pub.track.attach(audioRef.current);
      }
    });

    // Listen for new tracks being subscribed
    const handleTrackSubscribed = (track) => {
      if (track.kind === Track.Kind.Video && track.source === Track.Source.Camera) {
        if (videoRef.current) track.attach(videoRef.current);
      }
      if (track.kind === Track.Kind.Audio && !participant.isLocal && audioRef.current) {
        track.attach(audioRef.current);
      }
    };

    const handleTrackUnsubscribed = (track) => {
      track.detach();
    };

    participant.on("trackSubscribed", handleTrackSubscribed);
    participant.on("trackUnsubscribed", handleTrackUnsubscribed);

    return () => {
      participant.off("trackSubscribed", handleTrackSubscribed);
      participant.off("trackUnsubscribed", handleTrackUnsubscribed);

      // Detach all tracks on unmount
      publications.forEach((pub) => {
        try {
          if (pub.track) pub.track.detach();
        } catch (_) {
          // Track may already be detached
        }
      });
    };
  }, [participant]);

  const meta = (() => {
    try {
      return JSON.parse(participant?.metadata || "{}");
    } catch {
      return {};
    }
  })();

  return (
    <div
      className={`video-card team-${teamColor} ${isActive ? "speaking" : ""} ${
        isLarge ? "large" : ""
      }`}
    >
      {/* Video element */}
      <div className="video-wrapper">
        <video ref={videoRef} autoPlay playsInline muted={participant?.isLocal} />
        <audio ref={audioRef} autoPlay />

        {/* Active speaker glow overlay */}
        {isActive && <div className="speaking-indicator" />}

        {/* Identity label */}
        <div className="video-label">
          <span className="identity-name">
            {participant?.identity || "Unknown"}
          </span>
          {meta.Team && (
            <span className={`team-tag ${meta.Team.toLowerCase()}`}>
              {meta.Team}
            </span>
          )}
        </div>
      </div>

      {/* Remove button (host only) */}
      {canRemove && !participant?.isLocal && (
        <button
          className="remove-btn"
          onClick={() => onRemove(participant.identity)}
          title={`Remove ${participant.identity}`}
        >
          ✕
        </button>
      )}
    </div>
  );
}