// src/pages/osas/OsasLayout.jsx
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import "./osas.css";

export default function OsasLayout() {
  const { fullName, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    if (!window.confirm("Are you sure you want to sign out?")) return;
    logout();
    navigate("/osas/login");
  }

  return (
    <div className="osas-shell">
      <aside className="osas-sidebar">
        <div className="brand-mark"><span className="pin-dot"></span> GEOTRACK</div>
        <div className="role-pill">OSAS administrator</div>
        <nav style={{ marginTop:18 }}>
          <NavLink to="/osas/dashboard"       className={({isActive}) => `osas-nav-item ${isActive?"active":""}`}><span className="dot"></span> Geo-map overview</NavLink>
          <NavLink to="/osas/status-updates"  className={({isActive}) => `osas-nav-item ${isActive?"active":""}`}><span className="dot"></span> Student status monitor</NavLink>
          <NavLink to="/osas/verification"    className={({isActive}) => `osas-nav-item ${isActive?"active":""}`}><span className="dot"></span> Boarding house verification</NavLink>
          <NavLink to="/osas/reviews"         className={({isActive}) => `osas-nav-item ${isActive?"active":""}`}><span className="dot"></span> Student reviews</NavLink>
          <NavLink to="/osas/concerns"        className={({isActive}) => `osas-nav-item ${isActive?"active":""}`}><span className="dot"></span> Reported concerns</NavLink>
          <NavLink to="/osas/reports"         className={({isActive}) => `osas-nav-item ${isActive?"active":""}`}><span className="dot"></span> Reports</NavLink>
          <NavLink to="/osas/accounts"        className={({isActive}) => `osas-nav-item ${isActive?"active":""}`}><span className="dot"></span> Account management</NavLink>
        </nav>
        <div className="osas-sidebar-spacer"></div>
        <button className="osas-logout-btn" onClick={handleLogout}>Sign out ({fullName})</button>
      </aside>
      <main className="osas-main"><Outlet /></main>
    </div>
  );
}
