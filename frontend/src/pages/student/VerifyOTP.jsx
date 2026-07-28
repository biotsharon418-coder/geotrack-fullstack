// src/pages/student/VerifyOTP.jsx
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { api } from "../../api/client";
import "./student.css";

export default function VerifyOTP() {
  const navigate = useNavigate();
  const location = useLocation();
  const { email, demoOtp } = location.state || {};
  const [otp, setOtp] = useState(demoOtp || "");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resent, setResent] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      await api.verifyOTP(email, otp.trim());
      navigate("/student/home");
    } catch(err) { setError(err.message); }
    finally { setLoading(false); }
  }

  async function handleResend() {
    try { await api.resendOTP(email); setResent(true); setError(""); }
    catch(err) { setError(err.message); }
  }

  return (
    <div className="student-login-wrap">
      <div className="student-login-card">
        <div className="brand-mark" style={{color:"var(--moss)",marginBottom:24}}>
          <span className="pin-dot"></span> GEOTRACK
        </div>
        <div className="form-eyebrow">Email verification</div>
        <h1 className="form-title">Verify your email</h1>
        <p className="form-hint">
          A 6-digit verification code was sent to <strong>{email}</strong>.
          Enter it below to activate your account.
        </p>

        {demoOtp && (
          <div style={{padding:"10px 12px",background:"#faf4e4",borderRadius:8,border:"1px solid #e0cc88",marginBottom:14,fontSize:12,color:"#7a6010"}}>
            📋 <strong>Demo code:</strong> <span style={{fontFamily:"var(--font-mono)",fontWeight:700}}>{demoOtp}</span>
            <div style={{fontSize:11,marginTop:3,color:"#8a7020"}}>In production this is sent to the email only.</div>
          </div>
        )}

        {error && <div className="error-banner">{error}</div>}
        {resent && <div className="error-banner" style={{background:"#e1f0e6",color:"var(--ok)"}}>New code sent!</div>}

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>6-digit code</label>
            <input value={otp} onChange={e=>setOtp(e.target.value)} maxLength={6}
              placeholder="000000" required
              style={{fontFamily:"var(--font-mono)",fontSize:22,letterSpacing:6,textAlign:"center",padding:"14px"}} />
          </div>
          <button className="btn primary" style={{width:"100%",padding:13}} disabled={loading||otp.length!==6}>
            {loading ? "Verifying…" : "Verify email"}
          </button>
        </form>

        <div style={{textAlign:"center",marginTop:14,fontSize:12.5,color:"#857d6c"}}>
          Didn't receive it?{" "}
          <button type="button" onClick={handleResend}
            style={{background:"none",border:"none",color:"var(--moss)",fontWeight:700,cursor:"pointer",fontSize:12.5,fontFamily:"inherit"}}>
            Resend code
          </button>
        </div>
      </div>
    </div>
  );
}
