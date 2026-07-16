// src/pages/osas/OsasDashboard.jsx

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import OsasGeoMap from "../../components/OsasGeoMap";

export default function OsasDashboard() {
  const { fullName } = useAuth();
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [flaggedUpdates, setFlaggedUpdates] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api.osas
      .dashboardSummary()
      .then(setSummary)
      .catch((err) => setError(err.message));

    api.osas
      .allStatusUpdates()
      .then((updates) => setFlaggedUpdates(updates.filter((u) => u.is_flagged)))
      .catch((err) => setError(err.message));
  }, []);

  return (
    <>
      <div className="osas-main-head">
        <div>
          <div className="osas-main-title">OSAS Dashboard</div>
          <div className="osas-main-sub">Real-time view of all off-campus students, San Pablo City and nearby barangays.</div>
        </div>
        <div className="osas-user-chip">
          <div className="osas-avatar">{(fullName || "OS").slice(0, 2).toUpperCase()}</div> {fullName}
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {summary && (
        <div className="osas-grid osas-stat-row">
          <div className="card osas-stat-card">
            <div className="stat-label">Total off-campus students</div>
            <div className="stat-num">{summary.total_students}</div>
            <div className="stat-tag">registered accounts</div>
          </div>
          <div className="card osas-stat-card">
            <div className="stat-label">Updates submitted</div>
            <div className="stat-num">{summary.updates_submitted}</div>
            <div className="stat-tag">all-time total</div>
          </div>
          <div className="card osas-stat-card">
            <div className="stat-label">Flagged students</div>
            <div className="stat-num" style={{ color: "var(--pin)" }}>{summary.flagged_students}</div>
            <div className="stat-tag warn">needs follow-up</div>
          </div>
          <div className="card osas-stat-card">
            <div className="stat-label">Pending verifications</div>
            <div className="stat-num">{summary.pending_verifications}</div>
            <div className="stat-tag warn">boarding houses</div>
          </div>
        </div>
      )}

      <div className="osas-grid osas-two-col" style={{ marginBottom: 18 }}>
        <div className="card">
          <div className="panel-title">Geo-tagged student locations</div>
          <OsasGeoMap height={340} />
          <div className="btn-row" style={{ marginTop: 14, display: "flex", gap: 10 }}>
            <button className="btn primary" onClick={() => navigate("/osas/status-updates")}>
              Open full map
            </button>
            <button className="btn" onClick={() => navigate("/osas/verification")}>
              Manage boarding houses
            </button>
          </div>
        </div>

        <div className="card">
          <div className="panel-title">Flagged students</div>
          {flaggedUpdates.length === 0 ? (
            <div className="review-empty">No flagged students right now.</div>
          ) : (
            <table>
              <tbody>
                <tr>
                  <th>Student</th>
                  <th>Reason</th>
                  <th></th>
                </tr>
                {flaggedUpdates.map((u) => (
                  <tr key={u.id}>
                    <td>{u.student_name}</td>
                    <td style={{ fontSize: 12, color: "#6b6457" }}>{u.flag_reason || "—"}</td>
                    <td><span className="badge warn">Flagged</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="card">
        <div className="panel-title">Getting started</div>
        <p style={{ fontSize: 13, color: "#544f43", lineHeight: 1.6 }}>
          Use the sidebar to review student status updates, verify newly submitted boarding
          houses, read anonymous student reviews, generate tally reports, and manage accounts.
        </p>
      </div>
    </>
  );
}
