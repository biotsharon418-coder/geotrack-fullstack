// src/pages/student/DormDetail.jsx
//
// Shows the location, reviews, and a review form for one boarding
// house. Every review the backend returns has no author field at all
// (see schemas.ReviewOut on the backend) -- this page renders "Unknown"
// for every entry, EXCEPT the student's own review, which it can tell
// apart using /api/student/my-reviews and offers edit/delete on.

import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { api } from "../../api/client";
import LocationMap from "../../components/LocationMap";

export default function DormDetail() {
  const { houseId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const passedHouse = location.state; // optional, for instant header render

  const [house, setHouse] = useState(passedHouse || null);
  const [reviews, setReviews] = useState([]);
  const [myReviewIds, setMyReviewIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [rating, setRating] = useState("5");
  const [text, setText] = useState("");
  const [posting, setPosting] = useState(false);

  const [editingReviewId, setEditingReviewId] = useState(null);
  const [editRating, setEditRating] = useState("5");
  const [editText, setEditText] = useState("");

  useEffect(() => {
    loadAll();
  }, [houseId]);

  async function loadAll() {
    setLoading(true);
    try {
      const [houseList, reviewList, myReviews] = await Promise.all([
        api.student.listBoardingHouses(),
        api.student.getReviews(houseId),
        api.student.myReviews(),
      ]);
      const matchedHouse = houseList.find((h) => h.id === Number(houseId));
      if (matchedHouse) setHouse(matchedHouse);
      setReviews(reviewList);
      setMyReviewIds(new Set(myReviews.map((r) => r.id)));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handlePostReview(e) {
    e.preventDefault();
    if (!text.trim()) return;
    setPosting(true);
    setError("");
    try {
      await api.student.postReview(houseId, { rating: parseInt(rating, 10), text });
      setText("");
      loadAll();
    } catch (err) {
      setError(err.message);
    } finally {
      setPosting(false);
    }
  }

  function startEditReview(review) {
    setEditingReviewId(review.id);
    setEditRating(String(review.rating));
    setEditText(review.text);
  }

  async function saveEditReview(reviewId) {
    try {
      await api.student.updateReview(reviewId, { rating: parseInt(editRating, 10), text: editText });
      setEditingReviewId(null);
      loadAll();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDeleteReview(reviewId) {
    if (!window.confirm("Delete your review?")) return;
    try {
      await api.student.deleteReview(reviewId);
      loadAll();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <>
      <div className="student-header">

  <button
    className="btn"
    style={{
      marginBottom:12,
      padding:"8px 14px",
      fontSize:12
    }}
    onClick={() => navigate("/student/directory")}
  >
    ← Back to Directory
  </button>


  <div className="greet">
    {house?.barangay || "Boarding house"}
  </div>

  <h2>
    {house?.name || `House #${houseId}`}
  </h2>


  {
    reviews.length > 0 && (
      <div
        style={{
          marginTop:8,
          fontSize:12,
          color:"#c98a4b",
          fontWeight:700
        }}
      >
        {"★".repeat(
          Math.round(
            reviews.reduce(
              (sum,r)=>sum+r.rating,
              0
            ) / reviews.length
          )
        )}

        {" "}
        {
          (
          reviews.reduce(
            (sum,r)=>sum+r.rating,
            0
          ) / reviews.length
          ).toFixed(1)
        }

        {" "}
        ({reviews.length} student reviews)

      </div>
    )
  }

</div>
      <div className="student-body">
        {error && <div className="error-banner">{error}</div>}

        <div className="card" style={{ marginBottom: 14 }}>
          <div className="card-title">Location</div>
          <LocationMap
            latitude={house?.latitude}
            longitude={house?.longitude}
            label={house?.name}
            sublabel={house?.barangay}
            height={160}
          />
        </div>

        <div 
  id="reviews-section"
  className="card"
  style={{ marginBottom: 14 }}
>
  <div className="card-title">
    Student comments
  </div>
          {loading ? (
            <div className="loading-text">Loading...</div>
          ) : reviews.length === 0 ? (
            <div className="review-empty">No reviews yet - be the first to share your experience.</div>
          ) : (
            reviews.map((r) => {
              const isMine = myReviewIds.has(r.id);
              return (
                <div className="review-item" key={r.id}>
                  {editingReviewId === r.id ? (
                    <>
                      <div className="field">
                        <select value={editRating} onChange={(e) => setEditRating(e.target.value)}>
                          <option value="5">★★★★★ Excellent</option>
                          <option value="4">★★★★ Good</option>
                          <option value="3">★★★ Okay</option>
                          <option value="2">★★ Below average</option>
                          <option value="1">★ Poor</option>
                        </select>
                      </div>
                      <div className="field">
                        <textarea value={editText} onChange={(e) => setEditText(e.target.value)} />
                      </div>
                      <div className="pill-row">
                        <button className="btn primary" onClick={() => saveEditReview(r.id)}>Save</button>
                        <button className="btn" onClick={() => setEditingReviewId(null)}>Cancel</button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="review-top">
                        {/* Always "Unknown" -- the API response has no
                            name to show, even for the student's own
                            review, except we know locally it's theirs
                            via myReviewIds so we can offer edit/delete. */}
                        <span className="review-name">
                          {isMine ? "Unknown (you)" : "Unknown"}
                        </span>
                        <span className="review-stars">
                          {"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}
                        </span>
                      </div>
                      <div className="review-text">{r.text}</div>
                      {isMine && (
                        <div className="pill-row" style={{ marginTop: 8 }}>
                          <button className="btn" style={{ fontSize: 11, padding: 6 }} onClick={() => startEditReview(r)}>Edit</button>
                          <button className="btn" style={{ fontSize: 11, padding: 6, color: "var(--pin)" }} onClick={() => handleDeleteReview(r.id)}>Delete</button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="card">
<div className="card-title">
  Share your experience
</div>

<p style={{
  fontSize:12,
  color:"#857d6c",
  marginBottom:12,
  lineHeight:1.5
}}>
  Help other students by sharing your experience.
  Your comment will be posted anonymously.
</p>          <form onSubmit={handlePostReview}>
            <div className="field">
              <label>Rating</label>
              <select value={rating} onChange={(e) => setRating(e.target.value)}>
                <option value="5">★★★★★ Excellent</option>
                <option value="4">★★★★ Good</option>
                <option value="3">★★★ Okay</option>
                <option value="2">★★ Below average</option>
                <option value="1">★ Poor</option>
              </select>
            </div>
            <div className="field">
              <label>Your review</label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Share what it's like living here..."
              />
            </div>
            <button className="btn primary" style={{ width: "100%", padding: 13 }} disabled={posting}>
              {posting ? "Posting..." : "Post review"}
            </button>
          </form>
          <div style={{ fontSize: 11, color: "#a39c8a", marginTop: 8, textAlign: "center" }}>
            Your review is posted anonymously - your name is never shown, only "Unknown".
          </div>
        </div>
      </div>
    </>
  );
}
