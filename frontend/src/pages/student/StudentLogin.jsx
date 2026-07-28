// src/pages/student/StudentLogin.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import "./student.css";

function getStrength(pw) {
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/[a-z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[!@#$%^&*()\-_=+\[\]{};:,.<>/?]/.test(pw)) s++;
  if (s <= 1) return { label:"Too weak",  color:"#c1502e", pct:20 };
  if (s === 2) return { label:"Weak",     color:"#e07b39", pct:40 };
  if (s === 3) return { label:"Fair",     color:"#d4a017", pct:60 };
  if (s === 4) return { label:"Good",     color:"#5a8a3c", pct:80 };
  return       { label:"Strong",  color:"#3c7a5c", pct:100 };
}

// ─── Email validation ────────────────────────────────────────────────────────
// Format: STUDENTID@lspu.edu.ph where student ID is digits and hyphens
// e.g. 0323-4198@lspu.edu.ph
function isLspu(email) {
  const lower = email.toLowerCase().trim();
  if (!lower.endsWith("@lspu.edu.ph")) return false;
  const local = lower.split("@")[0];
  // Must be student-ID format: starts and ends with digit, hyphens in between allowed
  return /^[\d][\d\-]+[\d]$/.test(local);
}

function emailHint(email) {
  if (email === "") return null;
  const lower = email.toLowerCase().trim();
  if (!lower.endsWith("@lspu.edu.ph")) return { ok: false, msg: "Must end with @lspu.edu.ph (e.g. 0323-4198@lspu.edu.ph)" };
  const local = lower.split("@")[0];
  if (!/^[\d][\d\-]+[\d]$/.test(local)) return { ok: false, msg: "Username must be your Student ID (e.g. 0323-4198), not your name." };
  return { ok: true, msg: "✓ LSPU student ID email accepted" };
}

async function geocode(address) {
  const q = `${address}, San Pablo City, Laguna, Philippines`;
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`,
    { headers: { "Accept-Language": "en" } }
  );
  if (!res.ok) throw new Error("Address lookup failed.");
  const data = await res.json();
  return data.length ? { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), displayName: data[0].display_name } : null;
}

const TERMS = `GEOTRACK — STUDENT DATA PRIVACY TERMS

By creating a GeoTrack account, you agree to the following:

1. INFORMATION COLLECTED
   GeoTrack collects your full name, institutional email, course & section, gender (optional), and your off-campus boarding house location for student welfare monitoring by LSPU-SPCC OSAS.

2. HOW YOUR INFORMATION IS USED
   Your data is used solely for:
   • Monitoring off-campus living conditions
   • Generating aggregated statistical reports for OSAS
   • Following up on welfare concerns you report
   Your data will NOT be sold or shared with third parties.

3. REVIEWS ARE ANONYMOUS
   Reviews you post about boarding houses are fully anonymous. Your identity is never shown to other users or OSAS.

4. LOCATION DATA
   Your boarding house location is stored to place you on the OSAS monitoring map. Only OSAS administrators can see the student-to-location mapping.

5. DATA RETENTION
   Accounts inactive for 3 years are automatically archived. Accounts archived for 5 years are permanently deleted from the system.

6. YOUR RIGHTS
   You may update your profile at any time. To request early deletion, contact your OSAS office directly.

7. CONSENT
   By checking "I agree," you consent to the collection and use of your data as described above in accordance with Republic Act 10173 (Data Privacy Act of 2012) of the Philippines.`;

export default function StudentLogin() {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [fullName, setFullName] = useState("");
  const [courseSection, setCourseSection] = useState("");
  const [gender, setGender] = useState("");
  const [bhName, setBhName] = useState("");
  const [bhBarangay, setBhBarangay] = useState("");
  const [bhAddress, setBhAddress] = useState("");
  const [geocoding, setGeocoding] = useState(false);
  const [pinnedLocation, setPinnedLocation] = useState(null);
  const [geocodeError, setGeocodeError] = useState("");
  const [termsOpen, setTermsOpen] = useState(false);
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const strength = getStrength(password);
  const emailOk = isLspu(email);
  const hint = emailHint(email);

  async function handleFindLocation() {
    if (!bhBarangay.trim()) { setGeocodeError("Enter at least a barangay."); return; }
    setGeocoding(true); setGeocodeError(""); setPinnedLocation(null);
    try {
      const addr = bhAddress.trim() ? `${bhAddress}, ${bhBarangay}` : bhBarangay;
      const res = await geocode(addr);
      if (!res) setGeocodeError("Address not found. Try a more specific location.");
      else setPinnedLocation(res);
    } catch (e) { setGeocodeError(e.message); }
    finally { setGeocoding(false); }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!isLspu(email)) { setError("Only LSPU institutional emails (@lspu.edu.ph) are accepted."); return; }
    if (mode === "register" && !termsAgreed) { setError("Please agree to the Terms & Conditions first."); return; }
    setLoading(true);
    try {
      let session;
      if (mode === "login") {
        session = await api.loginRequest(email, password);
      } else {
        session = await api.registerStudent({
          full_name: fullName, email, password,
          course_section: courseSection || null,
          gender: gender || null,
          boarding_house_name: bhName || null,
          boarding_house_barangay: bhBarangay || null,
          boarding_house_latitude: pinnedLocation?.lat ?? null,
          boarding_house_longitude: pinnedLocation?.lng ?? null,
        });
      }
      if (session.role !== "student") { setError("This account is not registered as a student."); setLoading(false); return; }

      // 2FA required — go to TOTP verification (no session stored yet)
      if (session.requires_2fa) {
        navigate("/student/2fa-verify", { state: { pendingToken: session.pending_token, role: session.role } });
        return;
      }

      // OTP email verification required for new registrations
      if (session.requires_otp) {
        // Store token so protected routes work after verification
        api.setSession({ access_token: session.access_token, role: session.role, full_name: session.full_name });
        navigate("/student/verify-otp", { state: { email, demoOtp: session.pending_token } });
        return;
      }

      login(session);
      navigate("/student/home");
    } catch (err) {
      const msg = err.message || "";
      if (mode === "login" && (msg.includes("Incorrect") || msg.includes("401"))) {
        setError("No account found with these credentials. Please check your details, or create an account first.");
      } else { setError(msg); }
    } finally { setLoading(false); }
  }

  return (
    <div className="student-login-wrap">
      <div className="student-login-card">
        <div className="brand-mark" style={{ color:"var(--moss)", marginBottom:24 }}>
          <span className="pin-dot"></span> GEOTRACK
        </div>
        <div className="form-eyebrow">Student {mode === "login" ? "sign in" : "registration"}</div>
        <h1 className="form-title">{mode === "login" ? "Welcome back" : "Create your account"}</h1>

        {error && <div className="error-banner">{error}</div>}

        <form onSubmit={handleSubmit}>
          {mode === "register" && (
            <div className="field">
              <label>Full name</label>
              <input value={fullName} onChange={e => setFullName(e.target.value)} required />
            </div>
          )}

          <div className="field">
            <label>Institutional email</label>
            <input type="email" value={email}
              onChange={e => { setEmail(e.target.value); setError(""); }}
              placeholder="0323-4198@lspu.edu.ph" required />
            {hint && !hint.ok && (
              <div style={{ fontSize:11, color:"var(--pin)", marginTop:5 }}>⚠ {hint.msg}</div>
            )}
            {hint && hint.ok && (
              <div style={{ fontSize:11, color:"var(--ok)", marginTop:5 }}>{hint.msg}</div>
            )}
            {!hint && (
              <div style={{ fontSize:11, color:"#857d6c", marginTop:5 }}>
                Use your Student ID as the email (e.g. 0323-4198@lspu.edu.ph)
              </div>
            )}
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
            {mode === "register" && password.length > 0 && (
              <div style={{ marginTop:8 }}>
                <div style={{ height:4, borderRadius:4, background:"#e2dccc", overflow:"hidden" }}>
                  <div style={{ height:"100%", width:`${strength.pct}%`, background:strength.color, transition:"all .25s" }} />
                </div>
                <div style={{ fontSize:11, color:strength.color, marginTop:3 }}>
                  {strength.label} — needs 8+ chars, upper, lower, number, special character.
                </div>
              </div>
            )}
            {mode === "register" && password.length === 0 && (
              <div style={{ fontSize:11, color:"#857d6c", marginTop:5 }}>
                8+ chars, uppercase, lowercase, number, and special character (e.g. !@#$%).
              </div>
            )}
          </div>

          {mode === "register" && <>
            <div className="field">
              <label>Course &amp; section</label>
              <input value={courseSection} onChange={e => setCourseSection(e.target.value)} placeholder="e.g. BSIT-3A" />
            </div>
            <div className="field">
              <label>Gender <span style={{ color:"#a39c8a" }}>(optional)</span></label>
              <select value={gender} onChange={e => setGender(e.target.value)}>
                <option value="">Prefer not to say</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>

            <div style={{ margin:"4px 0 14px", padding:"12px 14px", background:"#eef1e9", borderRadius:10, border:"1px solid var(--line)" }}>
              <div style={{ fontSize:12.5, fontWeight:700, color:"var(--moss-dark)", marginBottom:6 }}>
                Your boarding house <span style={{ fontWeight:400, color:"#6b6457" }}>(optional but recommended)</span>
              </div>
              <p style={{ fontSize:11.5, color:"#6b6457", lineHeight:1.55, marginBottom:10 }}>
                Adding it now lets OSAS see your location right away. You can add or update it later too.
              </p>
              <div className="field">
                <label>Boarding house name</label>
                <input value={bhName} onChange={e => { setBhName(e.target.value); setPinnedLocation(null); }} placeholder="e.g. Sto. Niño Lodge" />
              </div>
              <div className="field">
                <label>Barangay</label>
                <input value={bhBarangay} onChange={e => { setBhBarangay(e.target.value); setPinnedLocation(null); }} placeholder="e.g. Brgy. Del Remedio" />
              </div>
              <div className="field">
                <label>Street / landmark <span style={{ color:"#a39c8a" }}>(optional)</span></label>
                <input value={bhAddress} onChange={e => { setBhAddress(e.target.value); setPinnedLocation(null); }} placeholder="e.g. near SPC public market" />
              </div>
              <button type="button" className="btn" style={{ width:"100%", padding:10 }}
                onClick={handleFindLocation} disabled={geocoding || !bhBarangay.trim()}>
                {geocoding ? "Finding location…" : "Find location on map"}
              </button>
              {geocodeError && <div style={{ fontSize:11, color:"var(--pin)", marginTop:6 }}>{geocodeError}</div>}
              {pinnedLocation && (
                <div style={{ marginTop:8, padding:"7px 10px", background:"#e1f0e6", borderRadius:8, fontSize:11.5, color:"var(--ok)" }}>
                  📍 Pinned: {pinnedLocation.displayName}
                </div>
              )}
            </div>

            <div style={{ marginBottom:14 }}>
              <button type="button" onClick={() => setTermsOpen(true)} style={{
                background:"none", border:"none", color:"var(--moss)", fontWeight:700,
                fontSize:12.5, cursor:"pointer", padding:0, fontFamily:"inherit", textDecoration:"underline",
              }}>Read Terms &amp; Conditions (Data Privacy)</button>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:8, cursor:"pointer" }}
                onClick={() => setTermsAgreed(!termsAgreed)}>
                <div style={{
                  width:18, height:18, borderRadius:4, flexShrink:0,
                  border:`2px solid ${termsAgreed ? "var(--moss)" : "var(--line)"}`,
                  background: termsAgreed ? "var(--moss)" : "#fff",
                  display:"flex", alignItems:"center", justifyContent:"center",
                }}>
                  {termsAgreed && <span style={{ color:"#fff", fontSize:12, lineHeight:1 }}>✓</span>}
                </div>
                <span style={{ fontSize:12.5, color:"#544f43" }}>I have read and agree to the Terms &amp; Conditions.</span>
              </div>
            </div>
          </>}

          <button className="btn primary" style={{ width:"100%", padding:13 }}
            disabled={loading || (email.length > 0 && !emailOk)}>
            {loading ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
          </button>
        </form>

        <div className="student-login-toggle">
          {mode === "login"
            ? <>
                <span>No account yet? <button type="button" onClick={() => { setMode("register"); setError(""); }}>Create an account</button></span>
                <div style={{ textAlign: "center", marginTop: 10 }}>
                  <button type="button" onClick={() => navigate("/student/forgot-password")} style={{
                    background: "none", border: "none", color: "#857d6c", fontSize: 12,
                    cursor: "pointer", fontFamily: "inherit", textDecoration: "underline",
                  }}>Forgot password?</button>
                </div>
              </>
            : <span>Already have an account? <button type="button" onClick={() => { setMode("login"); setError(""); }}>Sign in</button></span>}
        </div>

        <div className="scope-note">This app is for LSPU-SPCC students only.</div>
      </div>

      {termsOpen && (
        <div style={{ position:"fixed", inset:0, background:"rgba(28,43,36,.6)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:999, padding:24 }}>
          <div style={{ background:"#fff", borderRadius:16, padding:28, maxWidth:520, width:"100%", maxHeight:"80vh", display:"flex", flexDirection:"column" }}>
            <div style={{ fontFamily:"var(--font-display)", fontSize:18, fontWeight:600, marginBottom:14 }}>Terms &amp; Conditions</div>
            <pre style={{ flex:1, overflowY:"auto", fontSize:11.5, lineHeight:1.65, whiteSpace:"pre-wrap", color:"#544f43", fontFamily:"var(--font-body)", marginBottom:16, padding:"0 4px" }}>
              {TERMS}
            </pre>
            <div style={{ display:"flex", gap:10 }}>
              <button className="btn primary" style={{ flex:1, padding:12 }} onClick={() => { setTermsAgreed(true); setTermsOpen(false); }}>I agree</button>
              <button className="btn" style={{ flex:1, padding:12 }} onClick={() => setTermsOpen(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
