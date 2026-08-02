// src/pages/osas/OsasInspections.jsx
// Boarding House Inspection Management Module — schedule inspections,
// then complete them with a checklist, photo notes, remarks, violations,
// and a safety rating.

import { useEffect, useState } from "react";
import { api } from "../../api/client";

const DEFAULT_CHECKLIST = [
  "Fire exits clear and accessible",
  "Working smoke detectors",
  "Adequate lighting and ventilation",
  "Clean water supply",
  "Secure locks on doors/windows",
  "No exposed wiring hazards",
];

const STATUS_BADGE = { Scheduled: "pending", Completed: "ok", Cancelled: "warn" };

export default function OsasInspections() {
  const [inspections, setInspections] = useState([]);
  const [houses, setHouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showSchedule, setShowSchedule] = useState(false);
  const [completing, setCompleting] = useState(null);

  const [form, setForm] = useState({ boarding_house_id: "", inspector_name: "", scheduled_date: "" });
  const [checklist, setChecklist] = useState(DEFAULT_CHECKLIST.map((item) => ({ item, passed: true, note: "" })));
  const [remarks, setRemarks] = useState("");
  const [violations, setViolations] = useState("");
  const [safetyRating, setSafetyRating] = useState(5);
  const [photoCaption, setPhotoCaption] = useState("");
  const [photos, setPhotos] = useState([]);

  useEffect(() => { load(); }, []);

  function load() {
    setLoading(true);
    Promise.all([api.osas.listInspections(), api.osas.listBoardingHouses()])
      .then(([i, h]) => { setInspections(i); setHouses(h); })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  async function handleSchedule(e) {
    e.preventDefault();
    try {
      await api.osas.scheduleInspection({
        boarding_house_id: Number(form.boarding_house_id),
        inspector_name: form.inspector_name,
        scheduled_date: new Date(form.scheduled_date).toISOString(),
      });
      setShowSchedule(false);
      setForm({ boarding_house_id: "", inspector_name: "", scheduled_date: "" });
      load();
    } catch (err) { setError(err.message); }
  }

  function openComplete(inspection) {
    setCompleting(inspection);
    setChecklist(inspection.checklist?.length ? inspection.checklist : DEFAULT_CHECKLIST.map((item) => ({ item, passed: true, note: "" })));
    setPhotos(inspection.photos || []);
    setRemarks(inspection.remarks || "");
    setViolations(inspection.violations || "");
    setSafetyRating(inspection.safety_rating || 5);
  }

  function addPhoto() {
    if (!photoCaption.trim()) return;
    setPhotos([...photos, { caption: photoCaption.trim(), url: null }]);
    setPhotoCaption("");
  }

  async function handleComplete(e) {
    e.preventDefault();
    try {
      await api.osas.completeInspection(completing.id, { checklist, photos, remarks, violations, safety_rating: Number(safetyRating) });
      setCompleting(null);
      load();
    } catch (err) { setError(err.message); }
  }

  async function handleCancel(id) {
    if (!window.confirm("Cancel this scheduled inspection?")) return;
    try { await api.osas.cancelInspection(id); load(); } catch (err) { setError(err.message); }
  }

  return (
    <>
      <div className="osas-main-head">
        <div>
          <div className="osas-main-title">Boarding house inspections</div>
          <div className="osas-main-sub">Schedule inspections, then log checklist results, violations, and a safety rating.</div>
        </div>
        <button className="btn primary" onClick={() => setShowSchedule((v) => !v)}>
          {showSchedule ? "Close" : "+ Schedule inspection"}
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {showSchedule && (
        <form className="card" style={{ marginBottom: 20 }} onSubmit={handleSchedule}>
          <div className="osas-form-grid">
            <div className="field">
              <label>Boarding house</label>
              <select required value={form.boarding_house_id}
                onChange={(e) => setForm({ ...form, boarding_house_id: e.target.value })}>
                <option value="">Select...</option>
                {houses.map((h) => <option key={h.id} value={h.id}>{h.name} — {h.barangay}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Inspector name</label>
              <input required value={form.inspector_name}
                onChange={(e) => setForm({ ...form, inspector_name: e.target.value })} />
            </div>
            <div className="field">
              <label>Scheduled date</label>
              <input required type="datetime-local" value={form.scheduled_date}
                onChange={(e) => setForm({ ...form, scheduled_date: e.target.value })} />
            </div>
          </div>
          <button className="btn primary" type="submit">Schedule</button>
        </form>
      )}

      {completing && (
        <form className="card" style={{ marginBottom: 20 }} onSubmit={handleComplete}>
          <div className="panel-title">Complete inspection — {completing.boarding_house_name}</div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "#544f43", marginBottom: 8 }}>Checklist</label>
            {checklist.map((c, idx) => (
              <div key={idx} style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 6 }}>
                <input type="checkbox" checked={c.passed}
                  onChange={(e) => { const cl = [...checklist]; cl[idx] = { ...c, passed: e.target.checked }; setChecklist(cl); }} />
                <span style={{ fontSize: 13, flex: 1 }}>{c.item}</span>
                <input placeholder="note (optional)" value={c.note || ""}
                  onChange={(e) => { const cl = [...checklist]; cl[idx] = { ...c, note: e.target.value }; setChecklist(cl); }}
                  style={{ width: 180, padding: "5px 8px", fontSize: 12, border: "1px solid var(--line)", borderRadius: 6 }} />
              </div>
            ))}
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "#544f43", marginBottom: 8 }}>Photo documentation (caption/note per photo)</label>
            {photos.map((p, i) => <div key={i} className="badge pending" style={{ marginRight: 6, marginBottom: 6 }}>{p.caption}</div>)}
            <div style={{ display: "flex", gap: 8 }}>
              <input placeholder="e.g. Fire exit blocked by furniture" value={photoCaption}
                onChange={(e) => setPhotoCaption(e.target.value)}
                style={{ flex: 1, padding: "8px 10px", fontSize: 12, border: "1px solid var(--line)", borderRadius: 6 }} />
              <button type="button" className="btn" onClick={addPhoto}>Add</button>
            </div>
          </div>

          <div className="osas-form-grid">
            <div className="field">
              <label>Safety rating (1–5)</label>
              <select value={safetyRating} onChange={(e) => setSafetyRating(e.target.value)}>
                {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          </div>
          <div className="field">
            <label>Remarks</label>
            <textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} />
          </div>
          <div className="field">
            <label>Violation records</label>
            <textarea value={violations} onChange={(e) => setViolations(e.target.value)} placeholder="Leave blank if none found" />
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn primary" type="submit">Save & mark completed</button>
            <button className="btn" type="button" onClick={() => setCompleting(null)}>Cancel</button>
          </div>
        </form>
      )}

      <div className="card">
        {loading ? (
          <div className="loading-text">Loading...</div>
        ) : inspections.length === 0 ? (
          <div className="review-empty">No inspections scheduled yet.</div>
        ) : (
          <table>
            <tbody>
              <tr>
                <th>Boarding house</th>
                <th>Inspector</th>
                <th>Scheduled</th>
                <th>Status</th>
                <th>Safety rating</th>
                <th></th>
              </tr>
              {inspections.map((i) => (
                <tr key={i.id}>
                  <td>{i.boarding_house_name}</td>
                  <td>{i.inspector_name}</td>
                  <td>{new Date(i.scheduled_date).toLocaleString()}</td>
                  <td><span className={`badge ${STATUS_BADGE[i.status]}`}>{i.status}</span></td>
                  <td>{i.safety_rating ? `${i.safety_rating}/5` : "—"}</td>
                  <td>
                    {i.status === "Scheduled" && (
                      <div style={{ display: "flex", gap: 6 }}>
                        <button className="btn" style={{ padding: "5px 10px", fontSize: 11 }} onClick={() => openComplete(i)}>Complete</button>
                        <button className="btn" style={{ padding: "5px 10px", fontSize: 11 }} onClick={() => handleCancel(i.id)}>Cancel</button>
                      </div>
                    )}
                    {i.status === "Completed" && (
                      <button className="btn" style={{ padding: "5px 10px", fontSize: 11 }} onClick={() => openComplete(i)}>View / edit</button>
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
