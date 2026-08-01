// src/pages/student/StudentStatus.jsx
//
// Monthly check-in form. When the student selects "transferred", two
// extra fields appear asking where they moved to -- this mirrors the
// backend's StatusUpdateCreate schema, which requires
// new_boarding_house_name whenever status_type is "transferred".

import { useEffect, useState } from "react";
import { api } from "../../api/client";

const now = new Date();

const CURRENT_MONTH = now.toLocaleString("en-US", {
  month: "long",
  year: "numeric",
});



export default function StudentStatus() {
  const [statusType, setStatusType] = useState("same");
  const [newBoardingHouseName, setNewBoardingHouseName] = useState("");
  const [newBarangay, setNewBarangay] = useState("");
  const [note, setNote] = useState("");

  const [pastUpdates, setPastUpdates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    loadUpdates();
  }, []);

  async function loadUpdates() {
    setLoading(true);
    try {
      const data = await api.student.myStatusUpdates();
      setPastUpdates(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSubmitting(true);
    try {
      await api.student.submitStatusUpdate({
        status_type: statusType,
        new_boarding_house_name: statusType === "transferred" ? newBoardingHouseName : null,
        new_barangay: statusType === "transferred" ? newBarangay : null,
        note: note || null,
        month_label: CURRENT_MONTH,
      });
    setSuccess(`Update for ${CURRENT_MONTH} submitted.`);
      setNote("");
      setNewBoardingHouseName("");
      setNewBarangay("");
      loadUpdates();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteUpdate(updateId) {
    if (!window.confirm("Delete this status update?")) return;
    try {
      await api.student.deleteStatusUpdate(updateId);
      loadUpdates();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <>
      <div className="student-header">
        <div className="greet">Monthly check-in</div>
        <h2>Status update</h2>
      </div>
      <div className="student-body">
        {error && <div className="error-banner">{error}</div>}
        {success && (
          <div className="error-banner" style={{ background: "#e1f0e6", color: "var(--ok)" }}>
            {success}
          </div>
        )}

        <div className="card" style={{ marginBottom: 14 }}>
          <div className="card-title">This month I am...</div>
          <form onSubmit={handleSubmit}>
           <div className="field">
            <label>Current Month</label>
            <input
              type="text"
             value={CURRENT_MONTH}
             readOnly
           />
          </div>  

            <div className="field">
              <select value={statusType} onChange={(e) => setStatusType(e.target.value)}>
                <option value="same">Still at the same boarding house</option>
                <option value="transferred">Transferred to a new boarding house</option>
                <option value="moved_home">Moved back home / no longer off-campus</option>
              </select>
            </div>

            {/* These only appear when "transferred" is selected, exactly
                like the static prototype, but now they're real form
                fields wired into the request body. */}
            {statusType === "transferred" && (
              <>
                <div className="field">
                  <label>New boarding house name</label>
                  <input
                    value={newBoardingHouseName}
                    onChange={(e) => setNewBoardingHouseName(e.target.value)}
                    placeholder="e.g. Green Haven Dorm"
                    required
                  />
                </div>
                <div className="field">
                  <label>Barangay / address</label>
                  <input
                    value={newBarangay}
                    onChange={(e) => setNewBarangay(e.target.value)}
                    placeholder="e.g. Brgy. San Benito"
                    required
                  />
                </div>
              </>
            )}

            <div className="field">
              <label>Anything OSAS should know? (optional)</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. water supply issue, landlord concern..."
              />
            </div>

            <button className="btn primary" style={{ width: "100%", padding: 13 }} disabled={submitting}>
          {submitting ? "Submitting..." : `Submit update for ${CURRENT_MONTH}`}            </button>
          </form>
        </div>

        <div className="card">
          <div className="card-title">Past updates</div>
          {loading ? (
            <div className="loading-text">Loading...</div>
          ) : pastUpdates.length === 0 ? (
            <div className="review-empty">No updates submitted yet.</div>
          ) : (
            pastUpdates.map((u) => (
              <div className="listing-row" key={u.id} style={{ cursor: "default" }}>
                <div>
                  <div className="listing-name">{u.month_label}</div>
                  <div className="listing-meta">
                    {u.status_type === "same" && "Same boarding house"}
                    {u.status_type === "transferred" && `Transferred to ${u.new_boarding_house_name}`}
                    {u.status_type === "moved_home" && "Moved back home"}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span className={`badge ${u.is_flagged ? "warn" : "ok"}`}>
                    {u.is_flagged ? "Flagged" : "Confirmed"}
                  </span>
                  {!u.is_flagged && (
                    <button
                      onClick={() => handleDeleteUpdate(u.id)}
                      style={{
                        background: "none", border: "none", color: "var(--pin)",
                        fontSize: 11, cursor: "pointer", padding: 0,
                      }}
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
