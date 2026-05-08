import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { Mail, Lock, User, ArrowRight, Zap, AlertCircle } from "lucide-react";
import "../CSS/auth.css";

export default function AuthPage() {
    const location = useLocation();
    const [isLogin, setIsLogin] = useState(location.pathname !== "/register");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [username, setUsername] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const { login, register } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            if (isLogin) {
                await login(email, password);
            } else {
                await register(username, email, password);
            }
            navigate("/homepage");
        } catch (err) {
            setError(
                err.response?.data?.message ||
                err.message ||
                "Authentication failed. Check credentials."
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-bg-glow" aria-hidden="true" />

            <motion.div
                className="auth-card"
                initial={{ opacity: 0, y: 30, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: "spring", bounce: 0.35, duration: 0.6 }}
            >
                {/* HEADER */}
                <div className="auth-header">
                    <h1 className="auth-title" style={{ fontSize: '1.3rem', marginBottom: '16px' }}>
                        The Counterpoint<span style={{ color: 'var(--cta)' }}>.</span>
                    </h1>

                    <h2 className="auth-title">
                        {isLogin ? "Welcome Back" : "Join the Debate"}
                    </h2>

                    <p className="auth-sub">
                        {isLogin
                            ? "Continue where you left off."
                            : "Create an account and start winning."}
                    </p>
                </div>

                {/* FORM */}
                <form onSubmit={handleSubmit} className="auth-form">
                    <AnimatePresence mode="wait">
                        {!isLogin && (
                            <motion.div
                                key="username"
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                            >
                                <div className="auth-field">
                                    <User className="auth-icon" />
                                    <input
                                        type="text"
                                        placeholder="Username"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        required={!isLogin}
                                        className="auth-input"
                                        id="auth-username"
                                        autoComplete="username"
                                    />
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div className="auth-field">
                        <Mail className="auth-icon" />
                        <input
                            type="email"
                            placeholder="Email address"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="auth-input"
                            id="auth-email"
                            autoComplete="email"
                        />
                    </div>

                    <div className="auth-field">
                        <Lock className="auth-icon" />
                        <input
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="auth-input"
                            id="auth-password"
                            autoComplete={isLogin ? "current-password" : "new-password"}
                        />
                    </div>

                    {/* ERROR */}
                    <AnimatePresence>
                        {error && (
                            <motion.div
                                className="auth-error"
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                role="alert"
                            >
                                <AlertCircle size={16} />
                                <span>{error}</span>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* BUTTON */}
                    <motion.button
                        type="submit"
                        className="auth-btn"
                        disabled={loading}
                        whileTap={{ scale: 0.97 }}
                    >
                        {loading ? (
                            <div className="loader" />
                        ) : (
                            <>
                                {isLogin ? "Sign In" : "Register"}
                                {isLogin ? <ArrowRight size={18} /> : <Zap size={18} />}
                            </>
                        )}
                    </motion.button>
                </form>

                {/* TOGGLE */}
                <div className="auth-toggle">
                    {isLogin ? (
                        <>
                            Don't have an account?{" "}
                            <button
                                onClick={() => {
                                    setIsLogin(false);
                                    setError("");
                                }}
                            >
                                Sign up
                            </button>
                        </>
                    ) : (
                        <>
                            Already have an account?{" "}
                            <button
                                onClick={() => {
                                    setIsLogin(true);
                                    setError("");
                                }}
                            >
                                Sign in
                            </button>
                        </>
                    )}
                </div>
            </motion.div>
        </div>
    );
}