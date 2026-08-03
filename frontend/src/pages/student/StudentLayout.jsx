// src/pages/student/StudentLayout.jsx
//
// Shared phone-shell + bottom nav wrapper used by every student page.
// React Router's <Outlet /> renders whichever child page is active.
//
// On phones/tablets the nav collapses into a small bottom bar with a
// hamburger button; tapping it opens a menu listing all the pages. On
// desktop (900px+) it stays the always-visible sidebar, same as before.

import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import "./student.css";

export default function StudentLayout() {
  const navigate = useNavigate();
  const { logout, fullName } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  function handleLogout() {
    if (!window.confirm("Are you sure you want to sign out?")) return;
    logout();
    navigate("/student/login");
  }

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <div className="student-shell">
      <div className="student-phone">
        <div className="student-main">
          <Outlet />
        </div>

        <div className={`bottom-nav ${menuOpen ? "menu-open" : ""}`}>

          {/* backdrop: tapping outside the open menu closes it (mobile only) */}
          {menuOpen && <div className="nav-backdrop" onClick={closeMenu}></div>}

          <div className="nav-bar-row">
            <div className="student-sidebar-brand">
              <div className="brand-mark">
                <span className="pin-dot"></span> GEOTRACK
              </div>

              <div className="student-role-pill">
                Student Portal
              </div>
            </div>

            <button
              type="button"
              className="nav-hamburger"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
            >
              <span></span><span></span><span></span>
            </button>
          </div>

          <div className="nav-links">
            <NavLink
              to="/student/home"
              onClick={closeMenu}
              className={({ isActive }) => `nav-btn ${isActive ? "active" : ""}`}
            >
              <div className="ic"></div>Home
            </NavLink>

            <NavLink
              to="/student/status"
              onClick={closeMenu}
              className={({ isActive }) => `nav-btn ${isActive ? "active" : ""}`}
            >
              <div className="ic"></div>Status
            </NavLink>

            <NavLink
              to="/student/directory"
              onClick={closeMenu}
              className={({ isActive }) => `nav-btn ${isActive ? "active" : ""}`}
            >
              <div className="ic"></div>Directory
            </NavLink>

            <NavLink
              to="/student/concern"
              onClick={closeMenu}
              className={({ isActive }) => `nav-btn ${isActive ? "active" : ""}`}
            >
              <div className="ic"></div>Concerns
            </NavLink>

            <NavLink
              to="/student/sos"
              onClick={closeMenu}
              className={({ isActive }) => `nav-btn ${isActive ? "active" : ""}`}
            >
              <div className="ic"></div>SOS
            </NavLink>

            <NavLink
              to="/student/notifications"
              onClick={closeMenu}
              className={({ isActive }) => `nav-btn ${isActive ? "active" : ""}`}
            >
              <div className="ic"></div>Alerts
            </NavLink>

            <NavLink
              to="/student/profile"
              onClick={closeMenu}
              className={({ isActive }) => `nav-btn ${isActive ? "active" : ""}`}
            >
              <div className="ic"></div>Profile
            </NavLink>

            {/* Spacer para itulak ang Sign Out sa pinakababa (desktop sidebar lang) */}
            <div className="nav-spacer"></div>

            <button
              className="student-signout-btn"
              onClick={() => {
                closeMenu();
                handleLogout();
              }}
            >
              <span className="signout-label">Sign out</span>
              <span className="signout-name">&nbsp;({fullName})</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
