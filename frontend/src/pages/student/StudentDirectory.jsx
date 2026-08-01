// src/pages/student/StudentDirectory.jsx

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../api/client";

export default function StudentDirectory() {
  const [houses, setHouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    api.student
      .listBoardingHouses()
      .then(setHouses)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <div className="student-header">
        <div className="greet">Browse</div>
        <h2>Boarding house directory</h2>
      </div>
      <div className="student-body">
        {error && <div className="error-banner">{error}</div>}
        <div className="card">
          {loading ? (
            <div className="loading-text">Loading...</div>
          ) : houses.length === 0 ? (
            <div className="review-empty">No boarding houses registered yet.</div>
          ) : (
            houses.map((h) => (
              <div
                className="listing-row"
                key={h.id}
                onClick={() => navigate(`/student/directory/${h.id}`, { state: h })}
              >
                <div>
                  <div className="listing-name">{h.name}</div>
                  <div className="listing-meta">
                    {h.barangay}
                    {h.monthly_rate ? ` - ₱${h.monthly_rate}/mo` : ""}
                  </div>
                </div>
                <span className={`badge ${h.is_verified ? "ok" : "pending"}`}>
                  {h.is_verified ? "Verified" : "Pending"}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
