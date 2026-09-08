import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  collection,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";

import { db, auth } from "../firebase";
import "./Navbar.css";

function Navbar() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // ==================================================
  // DARK MODE
  // ==================================================
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem("agrobaz-theme") === "dark";
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark-mode");
      localStorage.setItem("agrobaz-theme", "dark");
    } else {
      document.documentElement.classList.remove("dark-mode");
      localStorage.setItem("agrobaz-theme", "light");
    }
  }, [darkMode]);

  // ==================================================
  // AUTH + NOTIFICATION LISTENER
  // ==================================================
  useEffect(() => {
    let unsubscribeNotifications = null;

    const setupNotificationListener = (user) => {
      if (unsubscribeNotifications) {
        unsubscribeNotifications();
        unsubscribeNotifications = null;
      }

      if (!user) {
        setIsLoggedIn(false);
        setUnreadCount(0);
        return;
      }

      setIsLoggedIn(true);

      const notificationsRef = collection(db, "notifications");

      const notificationsQuery = query(
        notificationsRef,
        where("userId", "==", user.uid),
        where("read", "==", false)
      );

      unsubscribeNotifications = onSnapshot(
        notificationsQuery,
        (snapshot) => {
          setUnreadCount(snapshot.size);
        },
        (error) => {
          console.error("Notification listener error:", error);
          setUnreadCount(0);
        }
      );
    };

    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      setupNotificationListener(user);
    });

    return () => {
      if (unsubscribeNotifications) {
        unsubscribeNotifications();
      }

      unsubscribeAuth();
    };
  }, []);

  return (
    <nav className="navbar">
      <div className="navbar-inner">

        {/* ==========================================
            LOGO
        ========================================== */}
        <Link to="/" className="navbar-logo">
          <span className="logo-icon">🌾</span>

          <span className="logo-text">
            Agro<span>Baz</span>
          </span>
        </Link>

        {/* ==========================================
            NAVIGATION
        ========================================== */}
        <div className="nav-links">
          <Link to="/" className="nav-link">
            Home
          </Link>

          <Link to="/marketplace" className="nav-link">
            Marketplace
          </Link>

          <Link to="/suppliers" className="nav-link">
            Suppliers
          </Link>

          <Link to="/commission" className="nav-link">
            Commission
          </Link>

          <Link to="/contact" className="nav-link">
            Contact
          </Link>
        </div>

        {/* ==========================================
            RIGHT SIDE
        ========================================== */}
        <div className="nav-actions">

          {/* ========================================
              THEME TOGGLE
          ======================================== */}
          <button
            className={`theme-toggle ${
              darkMode ? "theme-dark" : "theme-light"
            }`}
            onClick={() => setDarkMode(!darkMode)}
            aria-label={
              darkMode
                ? "Switch to light mode"
                : "Switch to dark mode"
            }
            title={
              darkMode
                ? "Switch to light mode"
                : "Switch to dark mode"
            }
          >
            <span className="theme-icon">
              {darkMode ? "☀️" : "🌙"}
            </span>

            <span className="theme-text">
              {darkMode ? "Light" : "Dark"}
            </span>
          </button>

          {/* ========================================
              NOTIFICATIONS
          ======================================== */}
          {isLoggedIn && (
            <Link
              to="/notifications"
              className="notification-link"
              aria-label="Notifications"
              title="Notifications"
            >
              <span className="notification-bell">
                🔔
              </span>

              {unreadCount > 0 && (
                <span className="notification-badge">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </Link>
          )}

          {/* ========================================
              PROFILE
          ======================================== */}
          {isLoggedIn && (
            <Link
              to="/profile"
              className="profile-nav-link"
              title="My Profile"
            >
              <span className="profile-icon">
                👤
              </span>

              <span className="profile-label">
                Profile
              </span>
            </Link>
          )}

          {/* ========================================
              LOGIN
          ======================================== */}
          {!isLoggedIn && (
            <Link to="/login" className="login-btn">
              Login
            </Link>
          )}

          {/* ========================================
              REGISTER
          ======================================== */}
          {!isLoggedIn && (
            <Link to="/register" className="register-btn">
              Get Started
            </Link>
          )}

          {/* ========================================
              DASHBOARD
          ======================================== */}
          {isLoggedIn && (
            <Link
              to="/dashboard"
              className="dashboard-btn"
            >
              Dashboard
            </Link>
          )}
        </div>

      </div>
    </nav>
  );
}

export default Navbar;
