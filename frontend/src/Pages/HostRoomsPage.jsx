import { useEffect, useState } from "react";
import { api } from "../API/axios";
import { useNavigate } from "react-router-dom";
import RoomCard from "../Components/RoomCard";
import { generateRoomThumbnail } from "../utils/imageGenerator";
import "../CSS/HostRoomsPage.css";

export default function HostRoomsPage() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    try {
      setError(null);
      const res = await api.get("/room/userInitlizedRoom");
      setRooms(res.data || []);
    } catch (err) {
      console.error(err);
      setError("Failed to load rooms. Try refreshing.");
    } finally {
      setLoading(false);
    }
  };

  const activateRoom = async (roomId) => {
    try {
      // activateRoom already returns the HOST token directly
      const res = await api.post(`/room/${roomId}/activateRoom`);
      const token = res.data;   // ← backend returns token string directly

      // Navigate into the live room as HOST
      navigate(`/room/${roomId}`, {
        state: { token, role: 'HOST', isHost: true },
      });
    } catch (err) {
      console.error('Activation failed', err);
      setError(err.response?.data || 'Failed to activate room. Try again.');
    }
  };

  if (loading) {
    return (
      <div className="host-page">
        <div className="loading-skeleton">
          <div className="skeleton-header"></div>
          <div className="skeleton-grid">
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton-card"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="host-page">
      <header className="host-header">
        <div className="header-content">
          <h1>Your Debate Rooms</h1>
          <p className="header-subtitle">
            {rooms.length} draft room{rooms.length !== 1 ? "s" : ""} ready to activate
          </p>
        </div>
        <button className="btn-new-room" onClick={() => {/* navigate to create */ }}>
          + Create New Room
        </button>
      </header>

      {rooms.length === 0 && !error && (
        <div className="empty-state">
          <div className="empty-icon">📌</div>
          <h2>No rooms yet</h2>
          <p>Create your first debate room to get started</p>
          <button className="btn-primary">Create Room</button>
        </div>
      )}

      {error && (
        <div className="error-banner">
          <span>⚠️ {error}</span>
          <button onClick={fetchRooms}>Retry</button>
        </div>
      )}

      <div className="host-grid">
        {rooms.map((room) => (
          <RoomCardModern
            key={room.id}
            room={room}
            thumbnail={generateRoomThumbnail(room.roomName, "debate", "loremflickr")}
            onActivate={activateRoom}
          />
        ))}
      </div>
    </div>
  );
}

// Modern card component
function RoomCardModern({ room, thumbnail, onActivate }) {
  const [activating, setActivating] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  const handleActivate = async () => {
    setActivating(true);
    try {
      await onActivate(room.id);
    } finally {
      setActivating(false);
    }
  };

  const handleImageError = () => {
    console.error(`Failed to load image for room: ${room.roomName}`);
    setImageError(true);
    setImageLoading(false);
  };

  const handleImageLoad = () => {
    setImageLoading(false);
    setImageError(false);
  };

  return (
    <div className="room-card">
      <div className="card-thumbnail">
        {!imageError ? (
          <>
            {imageLoading && <div className="room-thumb-skeleton" />}
            <img
              src={thumbnail}
              alt={room.roomName}
              onLoad={handleImageLoad}
              onError={handleImageError}
              style={{ opacity: imageLoading ? 0 : 1, transition: 'opacity 0.3s' }}
            />
          </>
        ) : (
          <div className="room-thumb-fallback">
            <div className="fallback-icon">🎭</div>
            <span>{room.roomName || "Debate"}</span>
          </div>
        )}
        <div className="card-status">
          <span className="status-badge draft">Draft</span>
        </div>
      </div>

      <div className="card-content">
        <h3 className="card-title">{room.roomName}</h3>

        {room.description && (
          <p className="card-description">{room.description}</p>
        )}

        <div className="card-meta">
          {room.participantCount && (
            <div className="meta-item">
              <span className="meta-label">Participants</span>
              <span className="meta-value">{room.participantCount}</span>
            </div>
          )}
          {room.createdAt && (
            <div className="meta-item">
              <span className="meta-label">Created</span>
              <span className="meta-value">{new Date(room.createdAt).toLocaleDateString()}</span>
            </div>
          )}
        </div>

        <button
          className="btn-activate"
          onClick={handleActivate}
          disabled={activating}
        >
          {activating ? "Activating..." : "Activate Room"}
        </button>
      </div>
    </div>
  );
}