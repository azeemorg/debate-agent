import {useAuth} from "../context/AuthContext.jsx";
import {Navigate, Route, Routes} from "react-router-dom";
import {Suspense} from "react";
import AuthPage from "../Pages/Auth.jsx";
import Nav from "../Pages/Nav.jsx";
import LandingPage from "../Pages/LandingPage.jsx";
import DashboardPage from "../Pages/DashboardPage.jsx";
import CreateRoomPage from "../Pages/CreateRoomPage.jsx";
import HostRoomsPage from "../Pages/HostRoomsPage.jsx";
import JoinPage from "../Pages/JoinPage.jsx";
import LiveRoomPage from "../Pages/LiveRoomPage.jsx";
import ActivateRoom from "../Components/ActivateRoom.jsx";
import CreateAndJoinPage from "../Pages/CreateAndJoinPage.jsx";
import VoiceDebatePage from "../voice-debate/index.jsx";

const NavigationWrapper = Nav;

function PrivateRoute({ children }) {
    const { user } = useAuth();
    return user ? children : <Navigate to="/login" replace />;
}

function PublicRoute({ children }) {
    const { user } = useAuth();
    return !user ? children : <Navigate to="/dashboard" replace />;
}

function AppContent() {
    const { loading, user } = useAuth();

    if (loading) {
        return <div className="page-loader">Checking auth...</div>;
    }

    const userStats = {
        wins: user?.wins || 0,
        losses: user?.losses || 0
    };

    return (
        <>
            <NavigationWrapper isLoggedIn={!!user} userStats={userStats} />

            <main className="app-main">
                <Suspense fallback={<div className="page-loader">Loading...</div>}>
                    <Routes>

                        {/* Default — Landing for guests, Dashboard for users */}
                        <Route path="/" element={
                            user ? <Navigate to="/dashboard" replace /> : <LandingPage />
                        } />

                        {/* Landing page (public) */}
                        <Route path="/homepage" element={
                            user ? <Navigate to="/dashboard" replace /> : <LandingPage />
                        } />

                        {/* Public Auth */}
                        <Route
                            path="/auth"
                            element={
                                <PublicRoute>
                                    <AuthPage />
                                </PublicRoute>
                            }
                        />
                        <Route
                            path="/login"
                            element={
                                <PublicRoute>
                                    <AuthPage />
                                </PublicRoute>
                            }
                        />
                        <Route
                            path="/register"
                            element={
                                <PublicRoute>
                                    <AuthPage />
                                </PublicRoute>
                            }
                        />

                        {/* Core Protected Pages */}
                        <Route
                            path="/dashboard"
                            element={
                                <PrivateRoute>
                                    <DashboardPage />
                                </PrivateRoute>
                            }
                        />

                        <Route
                            path="/create-and-join"
                            element={
                                <PrivateRoute>
                                    <CreateAndJoinPage />
                                </PrivateRoute>
                            }
                        />

                        <Route
                            path="/create-room"
                            element={
                                <PrivateRoute>
                                    <CreateRoomPage />
                                </PrivateRoute>
                            }
                        />

                        <Route
                            path="/join"
                            element={
                                <PrivateRoute>
                                    <JoinPage />
                                </PrivateRoute>
                            }
                        />

                        <Route
                            path="/activate-room"
                            element={
                                <PrivateRoute>
                                    <ActivateRoom />
                                </PrivateRoute>
                            }
                        />

                        <Route
                            path="/room/:roomId"
                            element={
                                <PrivateRoute>
                                    <LiveRoomPage />
                                </PrivateRoute>
                            }
                        />

                        <Route
                            path="/host-rooms"
                            element={
                                <PrivateRoute>
                                    <HostRoomsPage />
                                </PrivateRoute>
                            }
                        />

                        <Route
                            path="/ai-battle"
                            element={<VoiceDebatePage />}
                        />

                        <Route
                            path="/profile"
                            element={
                                <PrivateRoute>
                                    <div className="page-loader">Profile — Coming Soon</div>
                                </PrivateRoute>
                            }
                        />

                        {/* Catch-all */}
                        <Route path="*" element={<Navigate to="/" replace />} />

                    </Routes>
                </Suspense>
            </main>
        </>
    );
}

export default AppContent;