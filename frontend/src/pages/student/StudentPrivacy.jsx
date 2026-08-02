// src/pages/student/StudentPrivacy.jsx
// Data Privacy and Consent Management Module — student-facing digital
// consent form for the Data Privacy Act (RA 10173) and location sharing
// used by the SOS / geo-map features.

import { useEffect, useState } from "react";
import { api } from "../../api/client";

export default function StudentPrivacy() {
  const [consent, setConsent] = useState(null);
  const [dataPrivacy, setDataPrivacy] = useState(false);
  const [locationSharing, setLocationSharing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.student.getConsent()
      .then((c) => {
        setConsent(c);
        setDataPrivacy(c.data_privacy_agreed);
        setLocationSharing(c.location_sharing_agreed);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true); setError(""); setSaved(false);
    try {
      const c = await api.student.submitConsent({
        data_privacy_agreed: dataPrivacy,
        location_sharing_agreed: locationSharing,
      });
      setConsent(c);
      setSaved(true);
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  }

  if (loading) return <div style={{ padding: 20 }} className="loading-text">Loading...</div>;

  return (
    <div style={{ padding: 20 }}>
      <div className="osas-main-head" style={{ marginBottom: 18 }}>
        <div>
          <div className="osas-main-title" style={{ fontSize: 22 }}>Data privacy & consent</div>
          <div className="osas-main-sub">Required under the Data Privacy Act of 2012 (RA 10173).</div>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}
      {saved && <div className="badge ok" style={{ marginBottom: 14, display: "inline-block" }}>Consent preferences saved.</div>}

      <div className="card" style={{ marginBottom: 16, fontSize: 13, color: "#544f43", lineHeight: 1.6 }}>
        GeoTrack collects your boarding house status, location during SOS emergencies, complaints,
        and compliance history so that LSPU–SPCC OSAS can monitor off-campus student welfare.
        Your data is stored securely, only accessible to authorized OSAS personnel, and is retained
        according to the university's data retention policy. You may withdraw location-sharing
        consent at any time, though this may limit emergency response features.
      </div>

      <form className="card" onSubmit={handleSubmit}>
        <label style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 16, fontSize: 13 }}>
          <input type="checkbox" checked={dataPrivacy} onChange={(e) => setDataPrivacy(e.target.checked)} style={{ marginTop: 3 }} />
          <span>I have read and agree to the Data Privacy Agreement, and consent to OSAS collecting
            and processing my personal data for off-campus monitoring purposes.</span>
        </label>

        <label style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 16, fontSize: 13 }}>
          <input type="checkbox" checked={locationSharing} onChange={(e) => setLocationSharing(e.target.checked)} style={{ marginTop: 3 }} />
          <span>I consent to sharing my GPS location with OSAS when I trigger an SOS emergency alert.</span>
        </label>

        {consent?.agreed_at && (
          <div style={{ fontSize: 11, color: "#a39c8a", marginBottom: 12 }}>
            Last updated: {new Date(consent.agreed_at).toLocaleString()} · Policy v{consent.policy_version}
          </div>
        )}

        <button className="btn primary" type="submit" disabled={saving}>
          {saving ? "Saving..." : "Save preferences"}
        </button>
      </form>
    </div>
  );
}
