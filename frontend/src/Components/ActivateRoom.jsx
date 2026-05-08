import { useState, useEffect } from "react";
import { api } from "../API/axios";
import { useNavigate } from "react-router-dom";
import "../CSS/activateRoom.css";

export default function ActivateRoom() {
    const [roomCode, setRoomCode] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [initializedRooms, setInitializedRooms] = useState([]);
    const [roomsLoading, setRoomsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("list"); // "list" or "code"
    const navigate = useNavigate();

    useEffect(() => {
        fetchInitializedRooms();
    }, []);

    const fetchInitializedRooms = async () => {
        try {
            setRoomsLoading(true);
            const res = await api.get("/room/userInitlizedRoom");
            setInitializedRooms(res.data || []);
        } catch (err) {
            console.error("Failed to fetch initialized rooms:", err);
            setError("Failed to load initialized rooms");
        } finally {
            setRoomsLoading(false);
        }
    };

    const handleActivateRoom = async (roomId) => {
        setLoading(true);
        setError("");
        setSuccess("");

        try {
            // activateRoom returns the HOST token directly — use it, don't fetch again
            const res = await api.post(`/room/${roomId}/activateRoom`);
            const token = res.data;   // ← backend returns token string

            setSuccess("Room activated! Joining as host...");

            setTimeout(() => {
                navigate(`/room/${roomId}`, {
                    state: { token, role: 'HOST', isHost: true },
                });
            }, 800);
        } catch (err) {
            setError(err.response?.data || "Failed to activate room");
        } finally {
            setLoading(false);
        }
    };

    const handleActivate = async (e) => {
        e.preventDefault();
        
        if (!roomCode.trim()) {
            setError("Please enter a room code");
            return;
        }

        setLoading(true);
        setError("");
        setSuccess("");

        try {
            const res = await api.post("/room/activate", { roomCode: roomCode.trim() });
            setSuccess(`Room activated successfully: ${res.data.message || ""}`);
            setRoomCode("");
            
            // Redirect to the room after activation
            setTimeout(() => {
                navigate(`/room/${res.data.roomId || ""}`);
            }, 1500);
        } catch (err) {
            setError(err.response?.data?.message || "Failed to activate room");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="activate-room-container">
            <div className="activate-room-card">
                <h1>Activate Room</h1>
                <p className="description">Select an initialized room or enter a room code to join the debate</p>

                {/* TABS */}
                <div className="activate-tabs">
                    <button
                        className={`tab-btn ${activeTab === "list" ? "active" : ""}`}
                        onClick={() => setActiveTab("list")}
                    >
                        Your Rooms ({initializedRooms.length})
                    </button>
                    <button
                        className={`tab-btn ${activeTab === "code" ? "active" : ""}`}
                        onClick={() => setActiveTab("code")}
                    >
                        Enter Code
                    </button>
                </div>

                {/* TAB CONTENT - YOUR ROOMS */}
                {activeTab === "list" && (
                    <div className="tab-content">
                        {roomsLoading ? (
                            <div className="loading-state">Loading your rooms...</div>
                        ) : initializedRooms.length === 0 ? (
                            <div className="empty-rooms">
                                <p>No initialized rooms yet</p>
                                <small>Create a room to get started</small>
                            </div>
                        ) : (
                            <div className="rooms-list">
                                {initializedRooms.map((room) => (
                                    <div key={room.id} className="room-item">
                                        <div className="room-info">
                                            <h4>{room.roomName}</h4>
                                            <p className="room-details">
                                                Status: <span className="status-badge">{room.roomStatus}</span>
                                            </p>
                                            {room.topic && (
                                                <p className="room-topic">Topic: {room.topic}</p>
                                            )}
                                        </div>
                                        <button
                                            className="room-activate-btn"
                                            onClick={() => handleActivateRoom(room.id)}
                                            disabled={loading}
                                        >
                                            {loading ? "Activating..." : "Join"}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                        {error && <div className="error-message">{error}</div>}
                        {success && <div className="success-message">{success}</div>}
                    </div>
                )}

                {/* TAB CONTENT - ENTER CODE */}
                {activeTab === "code" && (
                    <div className="tab-content">
                        <form onSubmit={handleActivate}>
                            <div className="form-group">
                                <label htmlFor="roomCode">Room Code</label>
                                <input
                                    id="roomCode"
                                    type="text"
                                    placeholder="Enter room code..."
                                    value={roomCode}
                                    onChange={(e) => setRoomCode(e.target.value)}
                                    disabled={loading}
                                    className="room-code-input"
                                    maxLength="50"
                                />
                            </div>

                            {error && <div className="error-message">{error}</div>}
                            {success && <div className="success-message">{success}</div>}

                            <button type="submit" disabled={loading} className="activate-btn">
                                {loading ? "Activating..." : "Activate Room"}
                            </button>
                        </form>

                        <div className="info-section">
                            <h3>How it works:</h3>
                            <ul>
                                <li>Get a room code from the room host</li>
                                <li>Enter the code above</li>
                                <li>You'll be redirected to the active debate room</li>
                            </ul>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
