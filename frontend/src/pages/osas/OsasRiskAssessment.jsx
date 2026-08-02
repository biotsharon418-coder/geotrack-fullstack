// src/pages/osas/OsasRiskAssessment.jsx
// Student Risk Assessment Module — scores each student from compliance
// history, emergency incidents, and open complaints, so OSAS can see who
// needs attention first.

import { useEffect, useMemo, useState } from "react";
import { api } from "../../api/client";

const LEVEL_BADGE = {
  Low: "ok",
  Medium: "pending",
  High: "warn",
  Critical: "warn",
};

export default function OsasRiskAssessment() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [levelFilter, setLevelFilter] = useState("all");

  useEffect(() => { load(); }, []);

  function load() {
    setLoading(true);
    api.osas.riskAssessment()
      .then(setRows)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  const filtered = useMemo(
    () => (levelFilter === "all" ? rows : rows.filter((r) => r.risk_level === levelFilter)),
    [rows, levelFilter]
  );

  const counts = useMemo(() => {
    const c = { Low: 0, Medium: 0, High: 0, Critical: 0 };
    rows.forEach((r) => { c[r.risk_level] = (c[r.risk_level] || 0) + 1; });
    return c;
  }, [rows]);

  return (
    <>
      <div className="osas-main-head">
        <div>
          <div className="osas-main-title">Student risk assessment</div>
          <div className="osas-main-sub">
            Risk score combines missed compliance submissions, emergency incidents, and open complaints.
          </div>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="osas-grid osas-stat-row" style={{ marginBottom: 20 }}>
        {["Low", "Medium", "High", "Critical"].map((lvl) => (
          <div className="card osas-stat-card" key={lvl}>
            <div className="stat-label">{lvl} risk</div>
            <div className="stat-num">{counts[lvl] || 0}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div className="panel-title" style={{ marginBottom: 0 }}>Students by risk score</div>
          <select value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)} style={{ padding: "6px 10px", fontSize: 12 }}>
            <option value="all">All levels</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>

        {loading ? (
          <div className="loading-text">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="review-empty">No students match this filter.</div>
        ) : (
          <table>
            <tbody>
              <tr>
                <th>Student</th>
                <th>Missed</th>
                <th>Emergencies</th>
                <th>Open concerns</th>
                <th>Compliance score</th>
                <th>Risk score</th>
                <th>Level</th>
              </tr>
              {filtered.map((r) => (
                <tr key={r.student_id}>
                  <td>
                    {r.student_name}
                    <div style={{ fontSize: 11, color: "#a39c8a" }}>{r.email}{r.course_section ? ` · ${r.course_section}` : ""}</div>
                  </td>
                  <td>{r.missed_submissions}</td>
                  <td>{r.emergency_count}</td>
                  <td>{r.open_concern_count}</td>
                  <td>{r.compliance_score}/100</td>
                  <td>{r.risk_score}/100</td>
                  <td><span className={`badge ${LEVEL_BADGE[r.risk_level]}`}>{r.risk_level}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
