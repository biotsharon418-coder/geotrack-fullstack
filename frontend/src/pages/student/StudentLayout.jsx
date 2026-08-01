// src/pages/student/StudentLayout.jsx
//
// Shared phone-shell + bottom nav wrapper used by every student page.
// React Router's <Outlet /> renders whichever child page is active.

import { NavLink, Outlet } from "react-router-dom";
import "./student.css";

export default function StudentLayout() {
  return (
    <div className="student-shell">
      <div className="student-phone">
        <div className="student-main">
          <Outlet />
        </div>

        <div className="bottom-nav">
          <NavLink to="/student/home" className={({ isActive }) => `nav-btn ${isActive ? "active" : ""}`}>
            <div className="ic"></div>Home
          </NavLink>
          <NavLink to="/student/status" className={({ isActive }) => `nav-btn ${isActive ? "active" : ""}`}>
            <div className="ic"></div>Status
          </NavLink>
          <NavLink to="/student/directory" className={({ isActive }) => `nav-btn ${isActive ? "active" : ""}`}>
            <div className="ic"></div>Directory
          </NavLink>
          <NavLink to="/student/concern" className={({ isActive }) => `nav-btn ${isActive ? "active" : ""}`}>
            <div className="ic"></div>Concerns
          </NavLink>
          <NavLink to="/student/profile" className={({ isActive }) => `nav-btn ${isActive ? "active" : ""}`}>
            <div className="ic"></div>Profile
          </NavLink>
        </div>
      </div>
    </div>
  );
}
