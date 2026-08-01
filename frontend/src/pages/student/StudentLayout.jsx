// src/pages/student/StudentLayout.jsx
//
// Shared phone-shell + bottom nav wrapper used by every student page.
// React Router's <Outlet /> renders whichever child page is active.

import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import "./student.css";

export default function StudentLayout() {
  const navigate = useNavigate();
  const { logout, fullName } = useAuth();

  function handleLogout() {
    if (!window.confirm("Are you sure you want to sign out?")) return;
    logout();
    navigate("/student/login");
  } 
   return (
    <div className="student-shell">
      <div className="student-phone">
        <div className="student-main">
          <Outlet />
        </div>

        <div className="bottom-nav">

  <div className="student-sidebar-brand">
    <div className="brand-mark">
      <span className="pin-dot"></span> GEOTRACK
    </div>

    <div className="student-role-pill">
      Student Portal
    </div>
  </div>
  <NavLink
    to="/student/home"
    className={({ isActive }) => `nav-btn ${isActive ? "active" : ""}`}
  >
    <div className="ic"></div>Home
  </NavLink>

  <NavLink
    to="/student/status"
    className={({ isActive }) => `nav-btn ${isActive ? "active" : ""}`}
  >
    <div className="ic"></div>Status
  </NavLink>

  <NavLink
    to="/student/directory"
    className={({ isActive }) => `nav-btn ${isActive ? "active" : ""}`}
  >
    <div className="ic"></div>Directory
  </NavLink>

  <NavLink
    to="/student/concern"
    className={({ isActive }) => `nav-btn ${isActive ? "active" : ""}`}
  >
    <div className="ic"></div>Concerns
  </NavLink>

  <NavLink
    to="/student/profile"
    className={({ isActive }) => `nav-btn ${isActive ? "active" : ""}`}
  >
    <div className="ic"></div>Profile
  </NavLink>

  {/* Spacer para itulak ang Sign Out sa pinakababa */}
  <div style={{ flex: 1 }}></div>

  <button
    className="student-signout-btn"
    onClick={handleLogout}
  >
    Sign out ({fullName})
  </button>
</div>
      </div>
    </div>
  );
}
