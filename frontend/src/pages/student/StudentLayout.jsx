// src/pages/student/StudentLayout.jsx
//
// Shared phone-shell + bottom nav wrapper used by every student page.
// React Router's <Outlet /> renders whichever child page is active.

import { NavLink, Outlet } from "react-router-dom";
import "./student.css";

export default function StudentLayout() {
  return (
    <div className="student-shell">
      <div className="student-shell-brand">
        <div className="brand-mark" style={{ color:"#d9e6df" }}>
          <span className="pin-dot"></span> GEOTRACK
        </div>
        <div>
          <div className="osas-brand-title">Your off-campus life, in one app.</div>
          <div className="osas-brand-sub">
            Update your monthly status, browse verified boarding houses, and raise concerns with OSAS â€” built for LSPU-SPCC students.
          </div>
        </div>
        <div className="osas-brand-coords">14.0683Â° N, 121.3250Â° E â€” SAN PABLO CITY Â· LSPU-SPCC</div>
      </div>

      <div className="student-phone">
        <Outlet />

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