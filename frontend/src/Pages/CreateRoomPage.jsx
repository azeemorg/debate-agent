import { useState } from "react";
import { api } from "../API/axios";
import { useNavigate } from "react-router-dom";
import "../CSS/CreateAndJoinPage.css";

export default function CreateRoomPage() {
  const [roomName, setRoomName] = useState("");
  const [teamSize, setTeamSize] = useState(4);
  const [endTime, setEndTime] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const navigate = useNavigate();

  // Get minimum datetime (now + 5 minutes)
  const getMinEndTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 5);
    return now.toISOString().slice(0, 16);
  };

  const createRoom = async () => {
    if (!roomName.trim()) {
      setError("Room name is required");
      return;
    }
    if (teamSize < 1 || teamSize > 50) {
      setError("Team size must be between 1 and 50");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await api.post("/room/createRoom", {
        roomName: roomName.trim(),
        teamSize: teamSize,
        debateType: "VIDEO",
        endTime: endTime ? new Date(endTime).toISOString() : null,
      });

      navigate("/host-rooms");
    } catch (err) {
      console.error("Room creation failed", err);
      setError(err.response?.data || "Failed to create room. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="caj-page">
      <div className="caj-card">
        {/* Header */}
        <div className="caj-header">
          <div className="caj-icon">🎭</div>
          <h1 className="caj-title">Create Debate Room</h1>
          <p className="caj-subtitle">
            Set up a new room — you can activate it later from My Rooms
          </p>
        </div>

        {/* Form */}
        <div className="caj-form">
          {/* Room Name */}
          <div className="caj-field">
            <label htmlFor="create-room-name">Room Name</label>
            <input
              id="create-room-name"
              type="text"
              placeholder="e.g. AI vs Humanity"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              maxLength={100}
              autoFocus
            />
          </div>

          {/* Team Size */}
          <div className="caj-field">
            <label htmlFor="create-team-size">Team Size</label>
            <div className="caj-stepper">
              <button
                type="button"
                className="stepper-btn"
                onClick={() => setTeamSize(Math.max(1, teamSize - 1))}
                disabled={teamSize <= 1}
              >
                −
              </button>
              <input
                id="create-team-size"
                type="number"
                min="1"
                max="50"
                value={teamSize}
                onChange={(e) => setTeamSize(Math.max(1, Number(e.target.value)))}
              />
              <button
                type="button"
                className="stepper-btn"
                onClick={() => setTeamSize(Math.min(50, teamSize + 1))}
                disabled={teamSize >= 50}
              >
                +
              </button>
            </div>
            <span className="caj-hint">
              {teamSize} per side · {teamSize * 2 + 1} total (including host)
            </span>
          </div>

          {/* End Time */}
          <div className="caj-field">
            <label htmlFor="create-end-time">Debate Ends At</label>
            <input
              id="create-end-time"
              type="datetime-local"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              min={getMinEndTime()}
            />
          </div>

          {/* Error */}
          {error && <div className="caj-error">{error}</div>}

          {/* Actions */}
          <div className="caj-actions">
            <button
              className="caj-btn-secondary"
              onClick={() => navigate("/host-rooms")}
              type="button"
            >
              Cancel
            </button>
            <button
              className="caj-btn-primary"
              onClick={createRoom}
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="caj-spinner" />
                  Creating…
                </>
              ) : (
                <>🎭 Create Room</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}