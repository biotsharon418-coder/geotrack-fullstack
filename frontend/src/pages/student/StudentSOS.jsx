// src/pages/student/StudentSOS.jsx
//
// Emergency Assistance / SOS module (student side). A student picks an
// emergency category, the browser's geolocation is captured automatically
// if permission is granted, and the alert goes straight to OSAS. While a
// case is open (Active or Responding) this page shows its live timeline
// instead of the trigger form, so a student can't accidentally send a
// second alert on top of one already in progress.

import { useEffect, useRef, useState } from "react";
import { api } from "../../api/client";

const LOCATION_PUSH_INTERVAL_MS = 20000; // how often live GPS is pushed to OSAS while a case is open

const CATEGORIES = ["Medical Emergency", "Safety Threat", "Fire", "Natural Disaster", "Other"];

const STATUS_STYLE = {
  Active:     { bg: "#fbe4dc", color: "#7a3a23" },
  Responding: { bg: "#fdeecb", color: "#8a6414" },
  Resolved:   { bg: "#e1f0e6", color: "#2f5d3f" },
  Cancelled:  { bg: "#eee9dd", color: "#6b6457" },
};

function StatusPill({ status }) {
  const s = STATUS_STYLE[status] || STATUS_STYLE.Active;
  return (
    <span style={{
      display:"inline-block", padding:"3px 10px", borderRadius:999,
      fontSize:11, fontWeight:700, background:s.bg, color:s.color,
    }}>{status}</span>
  );
}

function collapseLocationPings(entries) {
  // Keep only the most recent "Location updated" ping so live GPS sharing
  // (which pushes every ~20s) doesn't flood the timeline with noise.
  const lastLocationIdx = entries.map(e => e.event).lastIndexOf("Location updated");
  return entries.filter((e, i) => e.event !== "Location updated" || i === lastLocationIdx);
}

function Timeline({ entries: rawEntries }) {
  const entries = collapseLocationPings(rawEntries);
  return (
    <div style={{ marginTop:12 }}>
      {entries.map((e, i) => (
        <div key={e.id} style={{
          display:"flex", gap:10, paddingBottom: i===entries.length-1 ? 0 : 12,
        }}>
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center" }}>
            <div style={{
              width:9, height:9, borderRadius:"50%",
              background: e.actor_role==="osas_admin" ? "var(--moss)" : "var(--pin)",
              marginTop:4, flexShrink:0,
            }}/>
            {i !== entries.length-1 && <div style={{ width:2, flex:1, background:"var(--line)", marginTop:2 }}/>}
          </div>
          <div style={{ paddingBottom:2 }}>
            <div style={{ fontSize:12.5, fontWeight:700, color:"#3a352b" }}>{e.event}</div>
            {e.note && <div style={{ fontSize:12, color:"#6b6457", marginTop:2 }}>{e.note}</div>}
            <div style={{ fontSize:10.5, color:"#a39c8a", marginTop:2 }}>
              {e.actor_name} - {new Date(e.created_at).toLocaleString()}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function StudentSOS() {
  const [cases, setCases] = useState(null);
  const [error, setError] = useState("");
  const [category, setCategory] = useState("");
  const [details, setDetails] = useState("");
  const [locationState, setLocationState] = useState("idle"); // idle | locating | ok | denied
  const [coords, setCoords] = useState(null);
  const [sending, setSending] = useState(false);
  const [confirming, setConfirming] = useState(false);

  function loadCases() {
    api.student.myEmergencies()
      .then(setCases)
      .catch(err => setError(err.message));
  }

  useEffect(() => { loadCases(); }, []);

  const activeCase = cases?.find(c => c.status === "Active" || c.status === "Responding");
  const history = (cases || []).filter(c => c.status === "Resolved" || c.status === "Cancelled");
  const [liveSharing, setLiveSharing] = useState(false);
  const lastPushRef = useRef(0);

  // Live GPS sharing: while a case is Active/Responding, keep watching the
  // browser's position and push updates to OSAS (throttled) so responders
  // always see roughly where the student is right now, not just where they
  // were when the alert was sent.
  useEffect(() => {
    if (!activeCase || !navigator.geolocation) { setLiveSharing(false); return; }
    setLiveSharing(true);
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const now = Date.now();
        if (now - lastPushRef.current < LOCATION_PUSH_INTERVAL_MS) return;
        lastPushRef.current = now;
        api.student.updateSOSLocation(activeCase.id, {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        }).then(() => loadCases()).catch(() => {});
      },
      () => setLiveSharing(false),
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCase?.id]);

  // Response tracking: poll for OSAS status changes / notes on the open
  // case so the timeline updates live without the student refreshing.
  useEffect(() => {
    if (!activeCase) return;
    const id = setInterval(loadCases, 12000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCase?.id]);

  function requestLocation() {
    if (!navigator.geolocation) { setLocationState("denied"); return; }
    setLocationState("locating");
    navigator.geolocation.getCurrentPosition(
      pos => { setCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }); setLocationState("ok"); },
      () => setLocationState("denied"),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }

  function startConfirm(cat) {
    setCategory(cat);
    setConfirming(true);
    requestLocation();
  }

  async function handleSendSOS() {
    setSending(true);
    setError("");
    try {
      await api.student.triggerSOS({
        category,
        details: details.trim() || null,
        latitude: coords?.latitude ?? null,
        longitude: coords?.longitude ?? null,
      });
      setConfirming(false); setCategory(""); setDetails(""); setCoords(null); setLocationState("idle");
      loadCases();
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  async function handleCancel() {
    if (!activeCase) return;
    if (!window.confirm("Cancel this SOS alert? Only do this if it's a false alarm or you no longer need help.")) return;
    try {
      await api.student.cancelEmergency(activeCase.id);
      loadCases();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <>
      <div className="student-header">
        <div className="greet">Emergency assistance</div>
        <h2>SOS</h2>
      </div>
      <div className="student-body">
        {error && <div className="error-banner">{error}</div>}

        {cases === null ? (
          <div className="card"><p style={{fontSize:12.5,color:"#6b6457"}}>Loading...</p></div>

        ) : activeCase ? (
          <div className="card" style={{ borderLeft:"4px solid var(--pin)" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
              <div>
                <div className="card-title" style={{ marginBottom:4 }}>{activeCase.category}</div>
                <StatusPill status={activeCase.status} />
              </div>
              <button className="btn" style={{ fontSize:11.5, padding:"6px 10px" }} onClick={handleCancel}>
                Cancel alert
              </button>
            </div>
            {activeCase.details && (
              <p style={{ fontSize:12.5, color:"#544f43", marginTop:10 }}>{activeCase.details}</p>
            )}
            <div style={{ fontSize:11, color:"#a39c8a", marginTop:8, display:"flex", alignItems:"center", gap:6 }}>
              {activeCase.latitude
                ? `Location shared - ${activeCase.latitude.toFixed(5)}, ${activeCase.longitude.toFixed(5)}`
                : "No location shared"}
              {liveSharing && (
                <span style={{ display:"inline-flex", alignItems:"center", gap:4, color:"#2f5d3f", fontWeight:700 }}>
                  <span style={{ width:6, height:6, borderRadius:"50%", background:"#2f5d3f", display:"inline-block" }}/>
                  Live
                </span>
              )}
            </div>
            <div style={{ borderTop:"1px solid var(--line)", marginTop:14, paddingTop:12 }}>
              <div className="card-title" style={{ fontSize:12.5 }}>Timeline</div>
              <Timeline entries={activeCase.timeline} />
            </div>
          </div>

        ) : confirming ? (
          <div className="card">
            <div className="card-title">Confirm SOS - {category}</div>
            <p style={{ fontSize:12, color:"#6b6457", margin:"6px 0 12px" }}>
              This sends an alert straight to OSAS with your details below. Only send this if you genuinely need help.
            </p>
            <div style={{ fontSize:11.5, marginBottom:12 }}>
              {locationState === "locating" && <span style={{color:"#8a6414"}}>Getting your location...</span>}
              {locationState === "ok" && <span style={{color:"#2f5d3f"}}>Location ready to share with OSAS.</span>}
              {locationState === "denied" && <span style={{color:"#7a3a23"}}>Location unavailable - the alert will still be sent without it.</span>}
            </div>
            <div className="field">
              <label>Anything OSAS should know? (optional)</label>
              <textarea value={details} onChange={e=>setDetails(e.target.value)}
                placeholder="e.g. exact location, what's happening..." />
            </div>
            <div className="pill-row" style={{ marginTop:10 }}>
              <button className="btn" onClick={() => { setConfirming(false); setCategory(""); }} disabled={sending}>
                Back
              </button>
              <button className="btn primary" style={{ background:"var(--pin)" }} onClick={handleSendSOS} disabled={sending}>
                {sending ? "Sending..." : "Send SOS now"}
              </button>
            </div>
          </div>

        ) : (
          <>
            <div className="card" style={{ textAlign:"center", padding:"28px 20px" }}>
              <div style={{ fontSize:12.5, color:"#6b6457", marginBottom:14 }}>
                In an emergency, tap a category below to alert OSAS immediately.
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                {CATEGORIES.map(cat => (
                  <button key={cat} className="btn" onClick={() => startConfirm(cat)}
                    style={{ padding:"16px 10px", fontWeight:700, borderColor:"var(--pin)", color:"var(--pin)" }}>
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {history.length > 0 && (
              <div className="card" style={{ marginTop:14 }}>
                <div className="card-title">Emergency history</div>
                {history.map(c => (
                  <div key={c.id} style={{ padding:"10px 0", borderBottom:"1px solid #ece7da" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                      <div style={{ fontWeight:600, fontSize:12.5 }}>{c.category}</div>
                      <StatusPill status={c.status} />
                    </div>
                    <div style={{ fontSize:11, color:"#a39c8a", marginTop:2 }}>
                      {new Date(c.created_at).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
