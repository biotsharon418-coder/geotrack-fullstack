// src/pages/student/ResetPassword.jsx
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../../api/client";
import "./student.css";

function getStrength(pw) {
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/[a-z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[!@#$%^&*()\-_=+\[\]{};:,.<>/?]/.test(pw)) s++;
  if (s <= 1) return { label: "Too weak",  color: "#c1502e", pct: 20 };
  if (s === 2) return { label: "Weak",     color: "#e07b39", pct: 40 };
  if (s === 3) return { label: "Fair",     color: "#d4a017", pct: 60 };
  if (s === 4) return { label: "Good",     color: "#5a8a3c", pct: 80 };
  return         { label: "Strong",  color: "#3c7a5c", pct: 100 };
}

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [token, setToken] = useState(searchParams.get("token") || "");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const strength = getStrength(password);
  const mismatch = confirm.length > 0 && confirm !== password;

  async function handleSubmit(e) {
    e.preventDefault();
    if (password !== confirm) { setError("Passwords do not match."); return; }
    setError(""); setLoading(true);
    try {
      await api.resetPassword(token, password);
      setSuccess(true);
      setTimeout(() => navigate("/student/login"), 3000);
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
        <h1 className="form-title">Set a new password</h1>

        {success ? (
          <div style={{ padding: "14px 16px", background: "#e1f0e6", borderRadius: 10, fontSize: 13, color: "var(--ok)", lineHeight: 1.6 }}>
            Password updated! Redirecting to sign in...
          </div>
        ) : (
          <>
            {error && <div className="error-banner">{error}</div>}
            <form onSubmit={handleSubmit}>
              <div className="field">
                <label>Reset token</label>
                <input
                  value={token}
                  onChange={e => setToken(e.target.value)}
                  placeholder="Paste token from your email"
                  required
                  style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}
                />
              </div>

              <div className="field">
                <label>New password</label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showPass ? "text" : "password"}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required minLength={8}
                    style={{ paddingRight: 48 }}
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)} style={{
                    position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                    background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "#857d6c",
                  }}>{showPass ? "Hide" : "Show"}</button>
                </div>
                {password.length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    <div style={{ height: 4, borderRadius: 4, background: "#e2dccc", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${strength.pct}%`, background: strength.color, transition: "all .25s" }} />
                    </div>
                    <div style={{ fontSize: 11, color: strength.color, marginTop: 3 }}>
                      {strength.label} - 8+ chars, upper, lower, number, special character.
                    </div>
                  </div>
                )}
              </div>

              <div className="field">
                <label>Confirm new password</label>
                <input
                  type={showPass ? "text" : "password"}
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  required
                  style={mismatch ? { borderColor: "var(--pin)" } : {}}
                />
                {mismatch && <div style={{ fontSize: 11, color: "var(--pin)", marginTop: 4 }}>Passwords do not match.</div>}
              </div>

              <button className="btn primary" style={{ width: "100%", padding: 13 }}
                disabled={loading || mismatch || !token}>
                {loading ? "Updating..." : "Set new password"}
              </button>
            </form>
          </>
        )}

        <div style={{ textAlign: "center", marginTop: 14 }}>
          <button type="button" onClick={() => navigate("/student/login")} style={{
            background: "none", border: "none", color: "var(--moss)", fontWeight: 700,
            cursor: "pointer", fontSize: 12.5, fontFamily: "inherit",
          }}>Back to sign in</button>
        </div>
      </div>
    </div>
  );
}
