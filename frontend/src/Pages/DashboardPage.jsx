import { useState, useEffect } from "react";
import { api } from "../API/axios";
import { useNavigate, Link } from "react-router-dom";
import { RefreshCw, Plus, Zap, Users } from "lucide-react";
import RoomCard from "../Components/RoomCard";
import { generateRoomThumbnail } from "../utils/imageGenerator";
import "../CSS/dashboard.css";

export default function DashboardPage() {
    const [rooms, setRooms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const navigate = useNavigate();

    const fetchRooms = async () => {
        try {
            const res = await api.get("/room/allRooms");
            setRooms(res.data || []);
        } catch (err) {
            console.error("Failed to fetch rooms:", err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchRooms();
    };

    useEffect(() => {
        fetchRooms();
        const interval = setInterval(fetchRooms, 5000);
        return () => clearInterval(interval);
    }, []);

    if (loading) return <div className="loading-state">Loading debates...</div>;

    return (
        <div className="dashboard-container">

            {/* Header */}
            <div className="dashboard-header">
                <div className="header-left">
                    <h1>Live Debates</h1>
                    <button 
                        className={`refresh-btn ${refreshing ? "spinning" : ""}`}
                        onClick={handleRefresh}
                        disabled={refreshing}
                        title="Refresh rooms"
                        aria-label="Refresh debate rooms"
                    >
                        <RefreshCw size={18} />
                    </button>
                </div>

                <div className="dashboard-header-buttons">
                    <Link to="/join">
                        <button aria-label="Join an existing room">
                            <Users size={15} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                            Join Room
                        </button>
                    </Link>
                    <Link to="/create-room">
                        <button aria-label="Host a new room">
                            <Plus size={15} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                            Host Room
                        </button>
                    </Link>
                    <Link to="/create-and-join">
                        <button className="btn-go-live" aria-label="Go live now">
                            <Zap size={15} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                            Go Live
                        </button>
                    </Link>
                </div>
            </div>

            {/* Empty State */}
            {rooms.length === 0 && (
                <div className="dashboard-empty">
                    <div style={{ fontSize: '3rem', marginBottom: 8 }}>💬</div>
                    <h2>No Active Debates</h2>
                    <p style={{ color: 'var(--mint)', marginBottom: 8 }}>Be the first to start a conversation</p>
                    <Link to="/create-and-join">
                        <button>Start a Debate</button>
                    </Link>
                </div>
            )}

            {/* Rooms Grid */}
            <div className="dashboard-rooms">
                {rooms.map((room) => (
                    <RoomCard
                        key={room.id}
                        room={room}
                        thumbnail={generateRoomThumbnail(room.roomName, "debate", "loremflickr")}
                        type="public"
                        onRoomClick={() => navigate(`/room/${room.id}`)}
                        onJoinAudience={async (roomId) => {
                            try {
                                const res = await api.post(
                                    `/room/${roomId}/tokenForAuidence`
                                );
                                const token = res.data;
                                navigate(`/room/${roomId}`, {
                                    state: { token, role: "AUDIENCE" },
                                });
                            } catch (err) {
                                console.error("Join failed:", err);
                            }
                        }}
                    />
                ))}
            </div>

        </div>
    );
}