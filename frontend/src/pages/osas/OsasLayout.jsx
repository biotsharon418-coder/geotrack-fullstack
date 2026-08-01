// src/pages/osas/OsasLayout.jsx - with 15-min session timeout
import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useSessionTimeout } from "../../hooks/useSessionTimeout";
import "./osas.css";

export default function OsasLayout() {
  const { fullName, logout } = useAuth();
  const navigate = useNavigate();
  const [showTimeoutWarning, setShowTimeoutWarning] = useState(false);

  function handleLogout(ask = true) {
    if (ask && !window.confirm("Are you sure you want to sign out?")) return;
    logout(); navigate("/osas/login");
  }

  useSessionTimeout(
    () => { logout(); navigate("/osas/login?timeout=1"); },
    () => setShowTimeoutWarning(true),
    true
  );

  return (
    <div className="osas-shell">
      {showTimeoutWarning && (
        <div style={{
          position:"fixed",bottom:24,right:24,zIndex:9999,
          background:"#fff",border:"1px solid var(--line)",borderRadius:14,
          padding:"16px 20px",boxShadow:"0 8px 32px rgba(28,43,36,.2)",maxWidth:300,
        }}>
          <div style={{fontWeight:700,marginBottom:6,color:"var(--moss-dark)"}}>Session expiring soon</div>
          <div style={{fontSize:13,color:"#6b6457",marginBottom:12}}>
            You'll be signed out in 1 minute due to inactivity.
          </div>
          <button className="btn primary" style={{width:"100%",padding:10}}
            onClick={() => setShowTimeoutWarning(false)}>
            Keep me signed in
          </button>
        </div>
      )}

      <aside className="osas-sidebar">
        <div className="brand-mark"><span className="pin-dot"></span> GEOTRACK</div>
        <div className="role-pill">OSAS administrator</div>
        <nav style={{marginTop:18}}>
          {[
            ["/osas/dashboard",      "Geo-map overview"],
            ["/osas/status-updates", "Student status monitor"],
            ["/osas/verification",   "Boarding house verification"],
            ["/osas/reviews",        "Student reviews"],
            ["/osas/concerns",       "Reported concerns"],
            ["/osas/reports",        "Reports"],
            ["/osas/audit-logs",     "Activity logs"],
            ["/osas/accounts",       "Account management"],
          ].map(([to, label]) => (
            <NavLink key={to} to={to}
              className={({isActive}) => `osas-nav-item ${isActive?"active":""}`}>
              <span className="dot"></span> {label}
            </NavLink>
          ))}
        </nav>
        <div className="osas-sidebar-spacer"></div>
        <button className="osas-logout-btn" onClick={() => handleLogout(true)}>
          Sign out ({fullName})
        </button>
      </aside>
      <main className="osas-main"><Outlet /></main>
    </div>
  );
}
