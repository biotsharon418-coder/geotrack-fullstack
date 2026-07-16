// src/pages/student/StudentHome.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import StudentMiniMap from "../../components/StudentMiniMap";
import { api } from "../../api/client";

const CURRENT_MONTH = "July 2026";

export default function StudentHome() {
  const { fullName } = useAuth();
  const navigate = useNavigate();
  const firstName = (fullName || "").split(" ")[0] || "Student";
  const [hasSubmittedThisMonth, setHasSubmittedThisMonth] = useState(null);

  useEffect(() => {
    api.student.myStatusUpdates()
      .then(updates => {
        setHasSubmittedThisMonth(updates.some(u => u.month_label === CURRENT_MONTH));
      })
      .catch(() => setHasSubmittedThisMonth(false));
  }, []);

  return (
    <>
      <div className="student-header">
        <div className="greet">Good day</div>
        <h2>Hi, {firstName}</h2>
      </div>
      <div className="student-body">
        {/* Only show pending-update banner — no "already submitted" banner
            that would re-appear every sign-in. Clean home screen once done. */}
        {hasSubmittedThisMonth === false && (
          <div className="status-banner">
            <div>
              <div className="label">Monthly status update</div>
              <div className="sub">Confirm where you're staying this month</div>
            </div>
            <button className="go" onClick={() => navigate("/student/status")}>Update →</button>
          </div>
        )}

        <div className="card" style={{ marginBottom:14 }}>
          <div className="card-title">My boarding house</div>
          <StudentMiniMap height={160} />
        </div>

        <div className="card" style={{ marginBottom:14 }}>
          <div className="card-title">Quick actions</div>
          <div className="pill-row" style={{ marginBottom:8 }}>
            <button className="btn" onClick={() => navigate("/student/status")}>Status update</button>
            <button className="btn" onClick={() => navigate("/student/directory")}>Directory</button>
          </div>
          <div className="pill-row">
            <button className="btn" onClick={() => navigate("/student/concern")}>Report concern</button>
            <button className="btn" onClick={() => navigate("/student/profile")}>My profile</button>
          </div>
        </div>

        <div className="card">
          <div className="card-title">About GeoTrack</div>
          <p style={{ fontSize:12.5, color:"#6b6457", lineHeight:1.6 }}>
            Register your boarding house, send OSAS a quick monthly check-in, and read
            anonymous reviews from other students before deciding where to live next.
          </p>
        </div>
      </div>
    </>
  );
}
