// src/pages/osas/OsasVerification.jsx
// Boarding houses come from students at sign-up (or via status updates).
// OSAS can verify, edit, re-pin, view inline reviews, and delete.
// The manual "Register boarding house" form has been removed.

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { api } from "../../api/client";

const pinIcon = new L.Icon({
  iconUrl:"https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl:"https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize:[25,41], iconAnchor:[12,41], popupAnchor:[1,-34], shadowSize:[41,41],
});

async function geocodeAddress(address) {
  const q = `${address}, San Pablo City, Laguna, Philippines`;
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`,
    { headers:{ "Accept-Language":"en" } }
  );
  if (!res.ok) throw new Error("Address lookup failed.");
  const data = await res.json();
  return data.length ? { lat:parseFloat(data[0].lat), lng:parseFloat(data[0].lon), displayName:data[0].display_name } : null;
}

export default function OsasVerification() {
  const [houses, setHouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editPinned, setEditPinned] = useState(null);
  const [editGeocoding, setEditGeocoding] = useState(false);
  const [editGeoError, setEditGeoError] = useState("");
  const [showEditMap, setShowEditMap] = useState(false);

  const [expandedHouseId, setExpandedHouseId] = useState(null);
  const [reviewsByHouse, setReviewsByHouse] = useState({});

  useEffect(() => { load(); }, []);

  function load() {
    setLoading(true);
    api.osas.listBoardingHouses()
      .then(setHouses)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }

  async function handleVerify(hid) {
    try { await api.osas.verifyBoardingHouse(hid); load(); }
    catch(err) { setError(err.message); }
  }

  function startEdit(h) {
    setEditingId(h.id);
    setEditForm({ name:h.name, barangay:h.barangay, monthly_rate:h.monthly_rate ?? "", address:"" });
    setEditPinned(h.latitude != null ? { lat:h.latitude, lng:h.longitude, displayName:h.barangay } : null);
    setEditGeoError(""); setShowEditMap(h.latitude != null);
  }

  async function handleEditGeocode() {
    if (!editForm.barangay?.trim()) return;
    setEditGeocoding(true); setEditGeoError("");
    try {
      const addr = editForm.address?.trim() ? `${editForm.address}, ${editForm.barangay}` : editForm.barangay;
      const res = await geocodeAddress(addr);
      if (res) { setEditPinned(res); setShowEditMap(true); }
      else setEditGeoError("Address not found. Try a more specific location.");
    } catch(err) { setEditGeoError(err.message); }
    finally { setEditGeocoding(false); }
  }

  async function saveEdit(hid) {
    try {
      await api.osas.updateBoardingHouse(hid, {
        name:editForm.name, barangay:editForm.barangay,
        monthly_rate:editForm.monthly_rate === "" ? null : parseFloat(editForm.monthly_rate),
        latitude:editPinned?.lat ?? null,
        longitude:editPinned?.lng ?? null,
      });
      setEditingId(null); load();
    } catch(err) { setError(err.message); }
  }

  async function handleDelete(hid) {
    if (!window.confirm("Delete this boarding house? This also removes its reviews.")) return;
    try { await api.osas.deleteBoardingHouse(hid); load(); }
    catch(err) { setError(err.message); }
  }

  async function toggleReviews(hid) {
    if (expandedHouseId === hid) { setExpandedHouseId(null); return; }
    setExpandedHouseId(hid);
    if (!reviewsByHouse[hid]) {
      try {
        const data = await api.osas.getReviews(hid);
        setReviewsByHouse(prev => ({ ...prev, [hid]:data }));
      } catch(err) { setError(err.message); }
    }
  }

  return (
    <>
      <div className="osas-main-head">
        <div>
          <div className="osas-main-title">Boarding house verification</div>
          <div className="osas-main-sub">
            Boarding houses are submitted by students at sign-up or when they update their status.
            Review, verify, re-pin, and check student reviews before approving.
          </div>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="card">
        {loading ? <div className="loading-text">Loading...</div>
        : houses.length === 0 ? <div className="review-empty">No boarding houses submitted yet. Students add them when they register or update their monthly status.</div>
        : (
          <table>
            <tbody>
              <tr><th>Boarding house</th><th>Barangay</th><th>Submitted by</th><th>Status</th><th></th></tr>
              {houses.map(h => (
                <>
                  <tr key={h.id}>
                    {editingId === h.id ? (
                      <>
                        <td>
                          <input value={editForm.name} onChange={e => setEditForm({...editForm,name:e.target.value})} style={{width:"100%",fontSize:12,padding:4}} />
                        </td>
                        <td>
                          <input value={editForm.barangay} onChange={e => setEditForm({...editForm,barangay:e.target.value})} style={{width:"100%",fontSize:12,padding:4}} />
                        </td>
                        <td colSpan={2} style={{fontSize:11,color:"#857d6c"}}>
                          Rate: <input type="number" value={editForm.monthly_rate} onChange={e => setEditForm({...editForm,monthly_rate:e.target.value})} style={{width:70,fontSize:11,padding:2}} />
                          {" "}Street/landmark:{" "}
                          <input value={editForm.address||""} onChange={e => setEditForm({...editForm,address:e.target.value})} style={{width:140,fontSize:11,padding:2}} placeholder="optional" />
                          {" "}
                          <button type="button" className="btn" style={{padding:"3px 8px",fontSize:10}} onClick={handleEditGeocode} disabled={editGeocoding}>
                            {editGeocoding ? "Finding..." : "Re-pin location"}
                          </button>
                          {editGeoError && <div style={{color:"var(--pin)",fontSize:10,marginTop:3}}>{editGeoError}</div>}
                          {editPinned && <div style={{color:"var(--ok)",fontSize:10,marginTop:3}}>{editPinned.displayName}</div>}
                          {showEditMap && editPinned && (
                            <div style={{height:160,borderRadius:8,overflow:"hidden",marginTop:8,border:"1px solid var(--line)"}}>
                              <MapContainer center={[editPinned.lat,editPinned.lng]} zoom={16}
                                style={{height:"100%",width:"100%"}} scrollWheelZoom={false}
                                key={`edit-${editPinned.lat}-${editPinned.lng}`}>
                                <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                <Marker position={[editPinned.lat,editPinned.lng]} icon={pinIcon} />
                              </MapContainer>
                            </div>
                          )}
                        </td>
                        <td>
                          <button className="btn primary" style={{padding:"4px 10px",fontSize:11}} onClick={() => saveEdit(h.id)}>Save</button>{" "}
                          <button className="btn" style={{padding:"4px 10px",fontSize:11}} onClick={() => setEditingId(null)}>Cancel</button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td>{h.name}</td>
                        <td>{h.barangay}</td>
                        <td style={{fontSize:12,color:"#6b6457"}}>{h.submitted_by||"-"}</td>
                        <td><span className={`badge ${h.is_verified?"ok":"pending"}`}>{h.is_verified?"Verified":"Pending"}</span></td>
                        <td style={{whiteSpace:"nowrap"}}>
                          {!h.is_verified && <button className="btn primary" style={{padding:"5px 10px",fontSize:11,marginRight:4}} onClick={() => handleVerify(h.id)}>Verify</button>}
                          <button className="btn" style={{padding:"5px 10px",fontSize:11,marginRight:4}} onClick={() => toggleReviews(h.id)}>
                            {expandedHouseId===h.id?"Hide reviews":"Reviews"}
                          </button>
                          <button className="btn" style={{padding:"5px 10px",fontSize:11,marginRight:4}} onClick={() => startEdit(h)}>Edit</button>
                          <button className="btn" style={{padding:"5px 10px",fontSize:11,color:"var(--pin)"}} onClick={() => handleDelete(h.id)}>Delete</button>
                        </td>
                      </>
                    )}
                  </tr>
                  {expandedHouseId === h.id && (
                    <tr key={`reviews-${h.id}`}>
                      <td colSpan={5} style={{background:"#faf9f5",padding:"8px 12px"}}>
                        {!reviewsByHouse[h.id] ? <div className="loading-text">Loading reviews...</div>
                        : reviewsByHouse[h.id].length === 0 ? <div className="review-empty">No reviews yet.</div>
                        : reviewsByHouse[h.id].map(r => (
                          <div className="review-item" key={r.id}>
                            <div className="review-top">
                              <span className="review-name">Unknown</span>
                              <span className="review-stars">{"★".repeat(r.rating)}{"☆".repeat(5-r.rating)}</span>
                            </div>
                            <div className="review-text">{r.text}</div>
                          </div>
                        ))}
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
