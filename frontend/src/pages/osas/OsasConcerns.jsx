// src/pages/osas/OsasConcerns.jsx
//
// Concerns ARE attributed (unlike reviews) -- OSAS needs the student's
// name and email to actually act on a safety/landlord/maintenance issue.

import { useEffect, useState } from "react";
import { api } from "../../api/client";

const STATUS_OPTIONS = ["open", "in_progress", "resolved"];

export default function OsasConcerns() {
  const [concerns, setConcerns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    load();
  }, []);

  function load() {
    setLoading(true);
    api.osas
      .allConcerns()
      .then(setConcerns)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  async function handleStatusChange(concernId, newStatus) {
    try {
      await api.osas.updateConcernStatus(concernId, newStatus);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <>
      <div className="osas-main-head">
        <div>
          <div className="osas-main-title">Reported concerns</div>
          <div className="osas-main-sub">Safety, landlord, and maintenance issues reported by students.</div>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="card">
        {loading ? (
          <div className="loading-text">Loading...</div>
        ) : concerns.length === 0 ? (
          <div className="review-empty">No concerns reported yet.</div>
        ) : (
          <table>
            <tbody>
              <tr>
                <th>Student</th>
                <th>Category</th>
                <th>Details</th>
                <th>Status</th>
              </tr>
              {concerns.map((c) => (
                <tr key={c.id}>
                  <td>
                    {c.student_name}
                    <div style={{ fontSize: 11, color: "#a39c8a" }}>{c.student_email}</div>
                  </td>
                  <td style={{ textTransform: "capitalize" }}>{c.category}</td>
                  <td style={{ maxWidth: 260, fontSize: 12, color: "#544f43" }}>{c.details}</td>
                  <td>
                    <select
                      value={c.status}
                      onChange={(e) => handleStatusChange(c.id, e.target.value)}
                      style={{ padding: "6px 8px", fontSize: 12 }}
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>{s.replace("_", " ")}</option>
                      ))}
                    </select>
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
