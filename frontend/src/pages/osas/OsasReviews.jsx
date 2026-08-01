// src/pages/osas/OsasReviews.jsx
//
// Same anonymity guarantee as the student-facing review list: the
// backend's /api/osas/boarding-houses/{id}/reviews endpoint never
// includes an author field, so every entry here also renders "Unknown".

import { useEffect, useState } from "react";
import { api } from "../../api/client";

export default function OsasReviews() {
  const [houses, setHouses] = useState([]);
  const [selectedHouseId, setSelectedHouseId] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api.osas
      .listBoardingHouses()
      .then((data) => {
        setHouses(data);
        if (data.length > 0) setSelectedHouseId(data[0].id);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (selectedHouseId == null) return;
    api.osas
      .getReviews(selectedHouseId)
      .then(setReviews)
      .catch((err) => setError(err.message));
  }, [selectedHouseId]);

  return (
    <>
      <div className="osas-main-head">
        <div>
          <div className="osas-main-title">Student reviews</div>
          <div className="osas-main-sub">Reviews are anonymous to OSAS as well - every entry shows as "Unknown".</div>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="card">
        <div className="panel-title">Student reviews per boarding house</div>
        <div className="field" style={{ maxWidth: 280 }}>
          <label>Select boarding house</label>
          <select
            value={selectedHouseId ?? ""}
            onChange={(e) => setSelectedHouseId(Number(e.target.value))}
          >
            {houses.map((h) => (
              <option key={h.id} value={h.id}>{h.name}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="loading-text">Loading...</div>
        ) : reviews.length === 0 ? (
          <div className="review-empty">No reviews yet for this boarding house.</div>
        ) : (
          reviews.map((r) => (
            <div className="review-item" key={r.id}>
              <div className="review-top">
                <span className="review-name">Unknown</span>
                <span className="review-stars">
                  {"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}
                </span>
              </div>
              <div className="review-text">{r.text}</div>
            </div>
          ))
        )}

        <div style={{ fontSize: 11.5, color: "#a39c8a", marginTop: 10 }}>
          Reviewer identities are not shown to OSAS or other students - all entries display as
          "Unknown" to keep feedback honest.
        </div>
      </div>
    </>
  );
}
