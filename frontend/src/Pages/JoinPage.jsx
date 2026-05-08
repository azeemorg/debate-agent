import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../API/axios";
import { Search, ArrowRight } from "lucide-react";
import "../CSS/Joinpage.css";

export default function JoinPage() {
  const [roomId, setRoomId] = useState("");
  const [room, setRoom] = useState(null);
  const [team, setTeam] = useState("RED");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  // Fetch room details
  const fetchRoom = async () => {
    if (!roomId) return;

    try {
      const res = await api.get(`/room/${roomId}`);
      setRoom(res.data);
      setMessage("");
    } catch (err) {
      setRoom(null);
      setMessage("Room not found");
    }
  };

  // Join room
  const joinRoom = async () => {
    if (!roomId) {
      setMessage("Enter Room ID");
      return;
    }

    try {
      setLoading(true);

      const res = await api.post(
        `/room/${roomId}/token?team=${team}`
      );

      const token = res.data;

      // Redirect to live room with token
      navigate(`/room/${roomId}`, { 
        state: { token, team } 
      });

    } catch (err) {
      setMessage(err.response?.data || "Failed to join room");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="join-page">
      <h2>Join Debate Room</h2>

      {/* Room ID Input */}
      <div className="input-group">
        <input
          type="text"
          placeholder="Enter Room ID"
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
          id="join-room-id"
          aria-label="Room ID"
        />
        <button onClick={fetchRoom} aria-label="Check room availability">
          <Search size={15} style={{ marginRight: 4, verticalAlign: 'middle' }} />
          Check
        </button>
      </div>

      {/* Room Info */}
      {room && (
        <div className="room-info">
          <p><strong>Status:</strong> {room.setLiveAt ? "LIVE" : "NOT STARTED"}</p>
          <p><strong>Participants:</strong> {room.currentParticipantsSize} / {room.totalParticipantsSize}</p>
          <p><strong>Team Size:</strong> {room.teamSize}</p>
        </div>
      )}

      {/* Team Selection — PRO / CON */}
      <div className="team-select">
        <button
          className={team === "RED" ? "active red" : ""}
          onClick={() => setTeam("RED")}
          aria-label="Join PRO side"
          aria-pressed={team === "RED"}
        >
          PRO
        </button>

        <button
          className={team === "BLUE" ? "active blue" : ""}
          onClick={() => setTeam("BLUE")}
          aria-label="Join CON side"
          aria-pressed={team === "BLUE"}
        >
          CON
        </button>
      </div>

      <p className="note">
        * Team preference may change based on availability
      </p>

      {/* Join Button */}
      <button onClick={joinRoom} disabled={loading} aria-label="Join the debate room">
        {loading ? "Joining..." : (
          <>
            Join Room
            <ArrowRight size={16} style={{ marginLeft: 6, verticalAlign: 'middle' }} />
          </>
        )}
      </button>

      {/* Error / Info */}
      {message && <p className="message" role="alert">{message}</p>}
    </div>
  );
}