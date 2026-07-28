// src/pages/student/TwoFAVerify.jsx — enter TOTP code after password check
import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { api } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import "./student.css";

export default function TwoFAVerify() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { pendingToken, role } = location.state || {};
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const session = await api.verify2FA(pendingToken, code.trim());
      login(session);
      navigate(role === "osas_admin" ? "/osas/dashboard" : "/student/home");
    } catch(err) { setError(err.message); }
    finally { setLoading(false); }
  }

  return (
    <div className="student-login-wrap">
      <div className="student-login-card">
        <div className="brand-mark" style={{color:"var(--moss)",marginBottom:24}}>
          <span className="pin-dot"></span> GEOTRACK
        </div>
        <div className="form-eyebrow">Two-factor authentication</div>
        <h1 className="form-title">Enter your 2FA code</h1>
        <p className="form-hint">Open your authenticator app and enter the 6-digit code for GeoTrack.</p>

        {error && <div className="error-banner">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>6-digit code</label>
            <input value={code} onChange={e=>setCode(e.target.value)} maxLength={6}
              placeholder="000000" required
              style={{fontFamily:"var(--font-mono)",fontSize:22,letterSpacing:6,textAlign:"center",padding:"14px"}} />
          </div>
          <button className="btn primary" style={{width:"100%",padding:13}} disabled={loading||code.length!==6}>
            {loading ? "Verifying…" : "Verify"}
          </button>
        </form>
        <div style={{textAlign:"center",marginTop:14}}>
          <button type="button" onClick={() => navigate("/student/login")}
            style={{background:"none",border:"none",color:"var(--moss)",fontWeight:700,cursor:"pointer",fontSize:12.5,fontFamily:"inherit"}}>
            ← Back to sign in
          </button>
        </div>
      </div>
    </div>
  );
}
