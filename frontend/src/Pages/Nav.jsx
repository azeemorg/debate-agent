import { Link, NavLink } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { Trophy, Menu, X, Plus } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import "../CSS/nav.css";

export default function Nav({ isLoggedIn, userStats = { wins: 0, losses: 0 } }) {
  const [statusText, setStatusText] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const dropdownRef = useRef();
  const { user, logout } = useAuth();

  const dynamicStatuses = [
    "3 debates live right now",
    "A new argument is brewing...",
    "You haven't won today",
    "The counterpoint is waiting...",
    "Top rooms are heating up",
  ];

  useEffect(() => {
    const randomStatus =
      dynamicStatuses[Math.floor(Math.random() * dynamicStatuses.length)];
    setStatusText(randomStatus);
  }, []);

  /* Close dropdown on outside click */
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleNavClick = () => {
    setMobileOpen(false);
    setProfileOpen(false);
  };

  return (
    <nav className="site-nav" role="navigation" aria-label="Main navigation">
      <div className="nav-container">

        {/* LEFT — Brand */}
        <div className="nav-left">
          <Link className="brand" to="/homepage" aria-label="The Counterpoint — Home">
            <span className="brand-text">
              The Counterpoint<span className="brand-dot">.</span>
            </span>
          </Link>
        </div>

        {/* MOBILE TOGGLE */}
        <button
          className="mobile-toggle"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>

        {/* CENTER — Nav Links */}
        <div className={`nav-center${mobileOpen ? " open" : ""}`}>
          <NavLink to="/dashboard" className="nav-link" onClick={handleNavClick}>
            Debates
          </NavLink>
          <NavLink to="/ai-battle" className="nav-link" onClick={handleNavClick}>
            AI Battle
          </NavLink>
          <NavLink to="/host-rooms" className="nav-link" onClick={handleNavClick}>
            My Rooms
          </NavLink>
        </div>

        {/* STATUS */}
        <div className="nav-status" aria-live="polite">
          <span className="status-fade">&ldquo;{statusText}&rdquo;</span>
        </div>

        {/* RIGHT — Auth / Profile */}
        <div className="nav-right">
          {isLoggedIn ? (
            <div className="user-profile-nav">

              {/* New Debate CTA */}
              <Link to="/create-and-join" className="start-debating" aria-label="Create a new debate">
                <Plus size={16} />
                New Debate
              </Link>

              {/* STATS */}
              <div className="nav-stats" aria-label="Your debate record">
                <Trophy className="stats-icon" aria-hidden="true" />
                <span className="win">{userStats.wins}W</span>
                <span aria-hidden="true">·</span>
                <span className="lose">{userStats.losses}L</span>
              </div>

              {/* PROFILE */}
              <div className="profile-wrapper" ref={dropdownRef}>
                <button
                  className="profile-btn"
                  onClick={() => setProfileOpen(!profileOpen)}
                  aria-label="Profile menu"
                  aria-expanded={profileOpen}
                  aria-haspopup="true"
                >
                  <div className="profile-avatar">
                    {user?.username?.[0]?.toUpperCase() || "U"}
                  </div>
                </button>

                <div className={`profile-dropdown ${profileOpen ? "open" : ""}`} role="menu">
                  <div className="dropdown-header">
                    <span>{user?.username || "User"}</span>
                  </div>

                  <Link to="/profile" className="dropdown-item" role="menuitem" onClick={handleNavClick}>
                    Profile
                  </Link>

                  <Link to="/activate-room" className="dropdown-item" role="menuitem" onClick={handleNavClick}>
                    Activate Room
                  </Link>

                  <button className="dropdown-item logout-btn" onClick={logout} role="menuitem">
                    Logout
                  </button>
                </div>
              </div>

            </div>
          ) : (
            <div className="auth-group">
              <Link to="/login" className="nav-link login-text">Login</Link>
              <Link to="/register" className="start-debating">
                Start Debating
              </Link>
            </div>
          )}
        </div>

      </div>
    </nav>
  );
}