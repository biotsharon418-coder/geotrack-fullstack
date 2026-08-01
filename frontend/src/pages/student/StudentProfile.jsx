// src/pages/student/StudentProfile.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../api/client";
import { useAuth } from "../../context/AuthContext";

export default function StudentProfile() {
  const { logout, updateFullName } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState("");
  const [courseSection, setCourseSection] = useState("");
  const [gender, setGender] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  function load() {
    setLoading(true);
    api.student.myProfile()
      .then(d => { setProfile(d); setFullName(d.full_name); setCourseSection(d.course_section||""); setGender(d.gender||""); })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true); setError(""); setSuccess("");
    try {
      const updated = await api.student.updateMyProfile({ full_name:fullName, course_section:courseSection, gender:gender||null });
      setProfile(updated);
      updateFullName(updated.full_name);   // update nav/home immediately
      setEditing(false); setSuccess("Profile updated.");
    } catch(err) { setError(err.message); }
    finally { setSaving(false); }
  }

  function handleLogout() {
    if (!window.confirm("Are you sure you want to sign out?")) return;
    logout();
    navigate("/student/login");
  }

  return (
    <>
      <div className="student-header">
        <div className="greet">Account</div>
        <h2>My profile</h2>
      </div>
      <div className="student-body">
        {error && <div className="error-banner">{error}</div>}
        {success && <div className="error-banner" style={{background:"#e1f0e6",color:"var(--ok)"}}>{success}</div>}

        {loading ? <div className="loading-text">Loading...</div>
        : !editing ? (
          <div className="card">
            <div className="card-title">Profile details</div>
            {[
              ["Full name", profile.full_name],
              ["Institutional email", profile.email],
              ["Course & section", profile.course_section || "Not set"],
              ["Gender", profile.gender ? profile.gender.replace("_"," ") : "Prefer not to say"],
              ["Member since", new Date(profile.created_at).toLocaleDateString()],
            ].map(([lbl, val]) => (
              <div key={lbl} style={{marginBottom:14}}>
                <div style={{fontSize:11,color:"#857d6c",fontWeight:600,textTransform:"capitalize"}}>{lbl}</div>
                <div style={{fontSize:14}}>{val}</div>
              </div>
            ))}
            <button className="btn primary" style={{width:"100%",padding:13}} onClick={() => setEditing(true)}>Edit profile</button>
          </div>
        ) : (
          <div className="card">
            <div className="card-title">Edit profile</div>
            <form onSubmit={handleSave}>
              <div className="field"><label>Full name</label><input value={fullName} onChange={e=>setFullName(e.target.value)} required /></div>
              <div className="field"><label>Course &amp; section</label><input value={courseSection} onChange={e=>setCourseSection(e.target.value)} placeholder="e.g. BSIT-3A" /></div>
              <div className="field">
                <label>Gender</label>
                <select value={gender} onChange={e=>setGender(e.target.value)}>
                  <option value="">Prefer not to say</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>
              <div className="pill-row">
                <button className="btn primary" disabled={saving}>{saving?"Saving...":"Save changes"}</button>
                <button type="button" className="btn" onClick={() => setEditing(false)}>Cancel</button>
              </div>
            </form>
          </div>
        )}

        <div className="card student-signout-card" style={{marginTop:20}}>
  <div className="card-title">Account</div>

  <p style={{
    fontSize:12,
    color:"#857d6c",
    marginBottom:14
  }}>
    Manage your account session.
  </p>

  <button
    className="btn student-signout-btn"
    onClick={handleLogout}
  >
    Sign out
  </button>
</div>
      </div>
    </>
  );
}
