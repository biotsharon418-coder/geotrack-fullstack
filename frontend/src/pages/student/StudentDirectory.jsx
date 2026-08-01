// src/pages/student/StudentDirectory.jsx

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../api/client";

export default function StudentDirectory() {
  const [houses, setHouses] = useState([]);
  const [ratings, setRatings] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();


  useEffect(() => {
    loadDirectory();
  }, []);


  async function loadDirectory() {
    try {
      const list = await api.student.listBoardingHouses();
      setHouses(list);


      // get reviews summary per boarding house
      const ratingData = {};

      await Promise.all(
        list.map(async (h) => {
          try {
            const reviews = await api.student.getReviews(h.id);

            const total = reviews.length;

            const average =
              total > 0
                ? (
                    reviews.reduce(
                      (sum, r) => sum + r.rating,
                      0
                    ) / total
                  ).toFixed(1)
                : null;


            ratingData[h.id] = {
              average,
              total
            };

          } catch {
            ratingData[h.id] = {
              average:null,
              total:0
            };
          }
        })
      );


      setRatings(ratingData);

    } catch(err){
      setError(err.message);
    }
    finally{
      setLoading(false);
    }
  }



  return (
    <>
      <div className="student-header">
        <div className="greet">Browse</div>
        <h2>Boarding house directory</h2>
      </div>


      <div className="student-body">

        {error && (
          <div className="error-banner">
            {error}
          </div>
        )}


        <div className="card">

        {loading ? (

          <div className="loading-text">
            Loading...
          </div>


        ) : houses.length === 0 ? (

          <div className="review-empty">
            No boarding houses registered yet.
          </div>


        ) : (


          houses.map((h) => (
  <div
    className="listing-row"
    key={h.id}
    onClick={() => navigate(`/student/directory/${h.id}`, { state: h })}
    style={{ cursor:"pointer" }}
  >
    <div style={{flex:1}}>
      <div className="listing-name">{h.name}</div>

      <div className="listing-meta">
        {h.barangay}
        {h.monthly_rate ? ` - ₱${h.monthly_rate}/mo` : ""}
      </div>

      <div style={{
        marginTop:8,
        fontSize:12,
        color:"#5a8a3c",
        fontWeight:600
      }}>
         View student reviews →
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