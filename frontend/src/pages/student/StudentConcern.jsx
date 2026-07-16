// src/pages/student/StudentConcern.jsx
//
// Unlike reviews, concerns are NOT anonymous on the backend -- OSAS needs
// to know who to follow up with. The Concern model stores student_id and
// the /api/osas/concerns endpoint returns student_name/student_email.

import { useState } from "react";
import { api } from "../../api/client";

export default function StudentConcern() {
  const [category, setCategory] = useState("safety");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    if (!details.trim()) return;
    setSubmitting(true);
    setError("");
    setSuccess("");
    try {
      await api.student.reportConcern({ category, details });
      setSuccess("Your concern has been sent to OSAS.");
      setDetails("");
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="student-header">
        <div className="greet">Need help?</div>
        <h2>Report a concern</h2>
      </div>
      <div className="student-body">
        {error && <div className="error-banner">{error}</div>}
        {success && (
          <div className="error-banner" style={{ background: "#e1f0e6", color: "var(--ok)" }}>
            {success}
          </div>
        )}
        <div className="card">
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label>What's this about?</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="safety">Safety concern</option>
                <option value="landlord">Landlord issue</option>
                <option value="maintenance">Maintenance / utilities</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="field">
              <label>Details</label>
              <textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Describe the issue..."
                required
              />
            </div>
            <button className="btn primary" style={{ width: "100%", padding: 13 }} disabled={submitting}>
              {submitting ? "Sending..." : "Send to OSAS"}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
