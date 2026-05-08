import { useState, useEffect } from "react";
import "../CSS/roomCard.css";

export default function RoomCard({
  room,
  thumbnail,
  onActivate,
  onJoinAudience,
  onRoomClick,
  type = "public",
}) {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(!!thumbnail);

  useEffect(() => {
    // Set loading timeout - if image doesn't load in 8 seconds, try fallback
    let timeout;
    if (thumbnail && imageLoading) {
      timeout = setTimeout(() => {
        console.warn(`Image loading timeout for room: ${room.roomName}`);
        setImageLoading(false);
      }, 8000);
    }
    return () => clearTimeout(timeout);
  }, [thumbnail, imageLoading, room.roomName]);

  const handleImageError = (e) => {
    console.error(`Failed to load image for room: ${room.roomName}`, e);
    console.log(`Failed URL: ${thumbnail}`);
    setImageError(true);
    setImageLoading(false);
  };

  const handleImageLoad = () => {
    console.log(`✅ Image loaded successfully for room: ${room.roomName}`);
    setImageLoading(false);
    setImageError(false);
  };

  return (
    <div className="room-card">
      {/* Thumbnail - optional, used in public/dashboard view */}
      {thumbnail && (
        <div className="room-thumb-container">
          {!imageError ? (
            <>
              {imageLoading && <div className="room-thumb-skeleton" />}
              <img
                src={thumbnail}
                alt="room thumbnail"
                className="room-thumb"
                onLoad={handleImageLoad}
                onError={handleImageError}
                
              />
            </>
          ) : (
            <div className="room-thumb-fallback">
              <div className="fallback-icon">🎭</div>
              <span>{room.roomName || "Debate"}</span>
            </div>
          )}
        </div>
      )}

      {/* Main Content */}
      <div
        className="room-content"
        onClick={onRoomClick}
        style={{ cursor: onRoomClick ? "pointer" : "default" }}
      >
        <h3>{room.roomName || "Untitled Debate"}</h3>

        <p>{room.currentParticipantsSize ?? 0} participants</p>

        <small>Status: {room.roomStatus}</small>
      </div>

      {/* Actions */}
      <div className="room-actions">
        {type === "host" && onActivate && (
          <button
            className="btn-activate"
            onClick={() => onActivate(room.id)}
          >
            Activate Room
          </button>
        )}

        {type === "public" && onJoinAudience && (
          <button
            className="btn-join"
            onClick={() => onJoinAudience(room.id)}
          >
            Join as Audience
          </button>
        )}
      </div>
    </div>
  );
}
