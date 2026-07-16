// src/pages/osas/OsasStatusUpdates.jsx
//
// Unlike the student-facing review list, this DOES show identity
// (student_name / student_email) -- the backend's StatusUpdateAdminOut
// schema includes it deliberately, since OSAS needs to know which
// student to follow up with.

import { useEffect, useState } from "react";
import { api } from "../../api/client";

export default function OsasStatusUpdates() {
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    load();
  }, []);

  function load() {
    setLoading(true);
    api.osas
      .allStatusUpdates()
      .then(setUpdates)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  async function handleFlag(updateId) {
    const reason = window.prompt("Reason for flagging this student?");
    if (!reason) return;
    try {
      await api.osas.flagStatusUpdate(updateId, reason);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <>
      <div className="osas-main-head">
        <div>
          <div className="osas-main-title">Student status monitor</div>
          <div className="osas-main-sub">Every monthly check-in submitted so far, most recent first.</div>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="card">
        {loading ? (
          <div className="loading-text">Loading...</div>
        ) : updates.length === 0 ? (
          <div className="review-empty">No status updates submitted yet.</div>
        ) : (
          <table>
            <tbody>
              <tr>
                <th>Student</th>
                <th>Month</th>
                <th>Status</th>
                <th>Note</th>
                <th></th>
              </tr>
              {updates.map((u) => (
                <tr key={u.id}>
                  <td>
                    {u.student_name}
                    <div style={{ fontSize: 11, color: "#a39c8a" }}>{u.student_email}</div>
                  </td>
                  <td>{u.month_label}</td>
                  <td>
                    {u.status_type === "same" && "Same boarding house"}
                    {u.status_type === "transferred" && (
                      <>Transferred → {u.new_boarding_house_name} ({u.new_barangay})</>
                    )}
                    {u.status_type === "moved_home" && "Moved back home"}
                  </td>
                  <td style={{ maxWidth: 220, fontSize: 12, color: "#6b6457" }}>{u.note || "—"}</td>
                  <td>
                    {u.is_flagged ? (
                      <span className="badge warn">Flagged</span>
                    ) : (
                      <button className="btn" style={{ padding: "5px 12px", fontSize: 12 }} onClick={() => handleFlag(u.id)}>
                        Flag
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
