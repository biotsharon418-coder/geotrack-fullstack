// src/pages/osas/OsasLogin.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import "./osas.css";

export default function OsasLogin() {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [position, setPosition] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      let session;
      if (mode === "login") {
        session = await api.loginRequest(email, password);
      } else {
        session = await api.registerOsasAdmin({ full_name: fullName, email, password, position });
      }
      if (session.role !== "osas_admin") {
        setError("This account is not registered as OSAS personnel.");
        setLoading(false);
        return;
      }
      login(session);
      navigate("/osas/dashboard");
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="osas-login-wrap">
      <div className="osas-login-card">
        <div className="osas-login-brand">
          <div className="brand-mark" style={{ color:"#d9e6df" }}>
            <span className="pin-dot"></span> GEOTRACK
          </div>
          <div>
            <div className="osas-brand-title">All off-campus students, one map.</div>
            <div className="osas-brand-sub">
              Monitor monthly status updates, verify boarding houses, and generate reports â€” built for OSAS personnel.
            </div>
          </div>
          <div className="osas-brand-coords">14.0683Â° N, 121.3250Â° E â€” SAN PABLO CITY Â· LSPU-SPCC</div>
        </div>

        <div className="osas-login-form">
          <div className="form-eyebrow">OSAS staff {mode === "login" ? "sign in" : "registration"}</div>
          <h1 className="form-title">{mode === "login" ? "Welcome back" : "Create OSAS account"}</h1>
          <p className="form-hint">This dashboard is restricted to OSAS administrators.</p>

          {error && <div className="error-banner">{error}</div>}

          <form onSubmit={handleSubmit}>
            {mode === "register" && (
              <>
                <div className="field">
                  <label>Full name</label>
                  <input value={fullName} onChange={e => setFullName(e.target.value)} required />
                </div>
                <div className="field">
                  <label>Position</label>
                  <input value={position} onChange={e => setPosition(e.target.value)} placeholder="e.g. OSAS Staff" />
                </div>
              </>
            )}
            <div className="field">
              <label>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="lastname.osas@lspu.edu.ph" required />
            </div>
            <div className="field">
              <label>Password</label>
              <div style={{ position:"relative" }}>
                <input type={showPass ? "text" : "password"} value={password}
                  onChange={e => setPassword(e.target.value)} required minLength={8}
                  style={{ paddingRight:48 }} />
                <button type="button" onClick={() => setShowPass(!showPass)} style={{
                  position:"absolute", right:10, top:"50%", transform:"translateY(-50%)",
                  background:"none", border:"none", cursor:"pointer", fontSize:12, color:"#857d6c",
                }}>{showPass ? "Hide" : "Show"}</button>
              </div>
              {mode === "register" && (
                <div style={{ fontSize:11, color:"#857d6c", marginTop:5 }}>
                  8+ chars, uppercase, lowercase, number, and special character.
                </div>
              )}
            </div>
            <button className="btn primary" style={{ width:"100%", padding:13 }} disabled={loading}>
              {loading ? "Please waitâ€¦" : mode === "login" ? "Sign in" : "Create account"}
            </button>
          </form>

          <div className="osas-login-toggle">
            {mode === "login"
              ? <span>New OSAS staff? <button type="button" onClick={() => { setMode("register"); setError(""); }}>Create an account</button></span>
              : <span>Already registered? <button type="button" onClick={() => { setMode("login"); setError(""); }}>Sign in</button></span>}
          </div>

          <div className="scope-note">This web portal is for OSAS personnel only.</div>
        </div>
      </div>
    </div>
  );
}