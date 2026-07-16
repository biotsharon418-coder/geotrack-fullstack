// src/pages/student/ForgotPassword.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../api/client";
import "./student.css";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [demoToken, setDemoToken] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.forgotPassword(email);
      setDemoToken(res.demo_token);
      setSubmitted(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="student-login-wrap">
      <div className="student-login-card">
        <div className="brand-mark" style={{ color: "var(--moss)", marginBottom: 24 }}>
          <span className="pin-dot"></span> GEOTRACK
        </div>

        <div className="form-eyebrow">Password reset</div>
        <h1 className="form-title">Forgot your password?</h1>

        {!submitted ? (
          <>
            <p className="form-hint">
              Enter your institutional email (Student ID format, e.g. 0323-4198@lspu.edu.ph).
              A reset link will be sent to that address.
            </p>
            {error && <div className="error-banner">{error}</div>}
            <form onSubmit={handleSubmit}>
              <div className="field">
                <label>Institutional email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="0323-4198@lspu.edu.ph"
                  required
                />
              </div>
              <button className="btn primary" style={{ width: "100%", padding: 13 }} disabled={loading}>
                {loading ? "Sending…" : "Send reset link"}
              </button>
            </form>
          </>
        ) : (
          <>
            <div style={{
              padding: "14px 16px", background: "#e1f0e6", borderRadius: 10,
              marginBottom: 16, fontSize: 13, color: "var(--ok)", lineHeight: 1.6,
            }}>
              <strong>Check your email.</strong> If <em>{email}</em> is registered,
              a password reset link has been sent.
            </div>

            {demoToken && (
              <div style={{
                padding: "12px 14px", background: "#faf4e4", borderRadius: 10,
                border: "1px solid #e0cc88", marginBottom: 16, fontSize: 12, lineHeight: 1.7,
              }}>
                <div style={{ fontWeight: 700, color: "#7a6010", marginBottom: 4 }}>
                  📋 School demo — reset token (copy this):
                </div>
                <div style={{
                  fontFamily: "var(--font-mono)", fontSize: 11, background: "#fff",
                  padding: "6px 10px", borderRadius: 6, wordBreak: "break-all",
                  border: "1px solid #ddd", color: "#333",
                }}>
                  {demoToken}
                </div>
                <div style={{ color: "#8a7020", marginTop: 6, fontSize: 11 }}>
                  In production this token would only be sent to the email.
                  Paste it into the reset form below.
                </div>
              </div>
            )}

            <button
              className="btn primary"
              style={{ width: "100%", padding: 13, marginBottom: 10 }}
              onClick={() => navigate(`/student/reset-password${demoToken ? `?token=${demoToken}` : ""}`)}
            >
              Enter reset token →
            </button>
          </>
        )}

        <div style={{ textAlign: "center", marginTop: 14 }}>
          <button
            type="button"
            onClick={() => navigate("/student/login")}
            style={{ background: "none", border: "none", color: "var(--moss)", fontWeight: 700, cursor: "pointer", fontSize: 12.5, fontFamily: "inherit" }}
          >
            ← Back to sign in
          </button>
        </div>
      </div>
    </div>
  );
}
