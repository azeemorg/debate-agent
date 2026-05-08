import { useState } from "react";
import { api } from "../API/axios";
import { useNavigate } from "react-router-dom";
import "../CSS/CreateAndJoinPage.css";

export default function CreateAndJoinPage() {
  const [roomName, setRoomName] = useState("");
  const [teamSize, setTeamSize] = useState(4);
  const [endTime, setEndTime] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  // Step 2 state
  const [step, setStep] = useState(1); // 1 = form, 2 = role pick
  const [createdRoomId, setCreatedRoomId] = useState(null);

  // Get minimum datetime (now + 5 minutes)
  const getMinEndTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 5);
    return now.toISOString().slice(0, 16);
  };

  // ── Step 1: Create the room ──
  const handleCreateRoom = async () => {
    if (!roomName.trim()) {
      setError("Room name is required");
      return;
    }
    if (teamSize < 1 || teamSize > 50) {
      setError("Team size must be between 1 and 50");
      return;
    }
    if (!endTime) {
      setError("End time is required");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const roomBody = {
        roomName: roomName.trim(),
        teamSize: teamSize,
        debateType: "VIDEO",
        endTime: new Date(endTime).toISOString(),
      };

      const createRes = await api.post("/room/createRoom", roomBody);
      const roomId = createRes.data;

      // Auto-fetch HOST token — creator always joins as host
      const tokenRes = await api.post(`/room/${roomId}/token?team=HOST`);
      const token = tokenRes.data?.token || tokenRes.data;

      // Go straight into the live room as HOST (no role selection)
      navigate(`/room/${roomId}`, {
        state: { token, role: "HOST" },
      });
    } catch (err) {
      console.error("Room creation failed:", err);
      setError(err.response?.data || "Failed to create room. Try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: Join with chosen role ──
  const handleJoinAs = async (role) => {
    if (!createdRoomId) return;

    setLoading(true);
    setError("");

    try {
      let res;
      if (role === "AUDIENCE") {
        res = await api.post(`/room/${createdRoomId}/tokenForAuidence`);
      } else {
        res = await api.post(`/room/${createdRoomId}/token?team=${role}`);
      }

      const token = res.data?.token || res.data;

      navigate(`/room/${createdRoomId}`, {
        state: { token, role },
      });
    } catch (err) {
      console.error("Join failed:", err);
      setError(err.response?.data || "Failed to join. Try again.");
    } finally {
      setLoading(false);
    }
  };

  // ═══════════════════════════════════════
  //  STEP 2 — Role Selection
  // ═══════════════════════════════════════
  if (step === 2) {
    return (
      <div className="caj-page">
        <div className="caj-card caj-card--wide">
          {/* Header */}
          <div className="caj-header">
            <div className="caj-icon">🎯</div>
            <h1 className="caj-title">Room Created!</h1>
            <p className="caj-subtitle">
              <strong>"{roomName}"</strong> is ready. How do you want to join?
            </p>
            <span className="caj-room-id">Room&nbsp;ID:&nbsp;{createdRoomId}</span>
          </div>

          {error && <div className="caj-error">{error}</div>}

          {/* Role Grid */}
          <div className="caj-role-grid">
            {/* HOST */}
            <button
              className="caj-role-card caj-role--host"
              onClick={() => handleJoinAs("HOST")}
              disabled={loading}
            >
              <span className="caj-role-icon">🛡️</span>
              <span className="caj-role-label">Join as Host</span>
              <span className="caj-role-desc">
                Moderate the debate, manage participants &amp; control the room.
              </span>
            </button>

            {/* RED */}
            <button
              className="caj-role-card caj-role--red"
              onClick={() => handleJoinAs("RED")}
              disabled={loading}
            >
              <span className="caj-role-icon">⚔️</span>
              <span className="caj-role-label">Join RED Team</span>
              <span className="caj-role-desc">
                Argue for the proposition. Convince the audience you're right!
              </span>
            </button>

            {/* BLUE */}
            <button
              className="caj-role-card caj-role--blue"
              onClick={() => handleJoinAs("BLUE")}
              disabled={loading}
            >
              <span className="caj-role-icon">⚔️</span>
              <span className="caj-role-label">Join BLUE Team</span>
              <span className="caj-role-desc">
                Argue for the opposition. Tear down every argument!
              </span>
            </button>
          </div>

          {/* Loading indicator */}
          {loading && (
            <div className="caj-joining">
              <span className="caj-spinner" />
              Joining room…
            </div>
          )}

          {/* Back / cancel */}
          <div className="caj-actions" style={{ marginTop: 12 }}>
            <button
              className="caj-btn-secondary"
              onClick={() => navigate("/host-rooms")}
              type="button"
            >
              Skip — go to My Rooms
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════
  //  STEP 1 — Room Details Form
  // ═══════════════════════════════════════
  return (
    <div className="caj-page">
      <div className="caj-card">
        {/* Header */}
        <div className="caj-header">
          <div className="caj-icon">⚡</div>
          <h1 className="caj-title">Create & Go Live</h1>
          <p className="caj-subtitle">
            Set up your debate room — then choose how you want to enter
          </p>
        </div>

        {/* Form */}
        <div className="caj-form">
          {/* Room Name */}
          <div className="caj-field">
            <label htmlFor="caj-room-name">Room Name</label>
            <input
              id="caj-room-name"
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
            <label htmlFor="caj-team-size">Team Size</label>
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
                id="caj-team-size"
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
            <label htmlFor="caj-end-time">Debate Ends At</label>
            <input
              id="caj-end-time"
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
              onClick={handleCreateRoom}
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="caj-spinner" />
                  Creating…
                </>
              ) : (
                <>🚀 Create Room</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
