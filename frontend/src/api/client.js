// src/api/client.js — thin API wrapper for GeoTrack
//
// Set VITE_API_URL in your Vercel project environment variables to point
// at the Railway backend, e.g.:
//   VITE_API_URL=https://geotrack-api.up.railway.app/api
// Locally it defaults to http://127.0.0.1:8000/api

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api";

function getToken()    { return localStorage.getItem("geotrack_token"); }
function getRole()     { return localStorage.getItem("geotrack_role"); }

function setSession({ access_token, role, full_name }) {
  localStorage.setItem("geotrack_token", access_token);
  localStorage.setItem("geotrack_role", role);
  localStorage.setItem("geotrack_full_name", full_name);
}

function clearSession() {
  localStorage.removeItem("geotrack_token");
  localStorage.removeItem("geotrack_role");
  localStorage.removeItem("geotrack_full_name");
  window.dispatchEvent(new CustomEvent("geotrack:session-cleared"));
}

class AuthError extends Error {}

async function request(path, { method = "GET", body, formEncoded = false } = {}) {
  const headers = {};
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  let payload = body;
  if (body && !formEncoded) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }

  const res = await fetch(`${API_BASE_URL}${path}`, { method, headers, body: payload });

  if (!res.ok) {
    let detail = `Request failed (${res.status})`;
    try {
      const err = await res.json();
      if (Array.isArray(err.detail)) detail = err.detail.map((e) => e.msg).join(" ");
      else if (err.detail) detail = err.detail;
    } catch { /* non-JSON */ }

    if (res.status === 401 || res.status === 403) {
      // 401 = expired/invalid token; 403 = valid token but wrong role
      // (e.g. DB was reset and the user was re-seeded with a different role).
      // In both cases the session is unusable — clear it so the user
      // is sent back to login rather than stuck on a broken page.
      clearSession();
      throw new AuthError("Your session is no longer valid. Please sign in again.");
    }
    throw new Error(detail);
  }

  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

async function loginRequest(email, password) {
  const params = new URLSearchParams();
  params.append("username", email);
  params.append("password", password);
  return request("/auth/token", { method: "POST", body: params, formEncoded: true });
}

export const api = {
  getToken, getRole, setSession, clearSession, loginRequest, AuthError,
  registerStudent: (p) => request("/auth/register/student", { method: "POST", body: p }),
  registerOsasAdmin: (p) => request("/auth/register/osas",   { method: "POST", body: p }),
  forgotPassword: (email) => request("/auth/forgot-password", { method: "POST", body: { email } }),
  resetPassword: (token, new_password) => request("/auth/reset-password", { method: "POST", body: { token, new_password } }),

  student: {
    myProfile:        ()         => request("/student/me"),
    updateMyProfile:  (p)        => request("/student/me", { method: "PUT", body: p }),
    listBoardingHouses: ()       => request("/student/boarding-houses"),
    getReviews:       (hid)      => request(`/student/boarding-houses/${hid}/reviews`),
    postReview:       (hid, p)   => request(`/student/boarding-houses/${hid}/reviews`, { method: "POST", body: p }),
    myReviews:        ()         => request("/student/my-reviews"),
    updateReview:     (rid, p)   => request(`/student/reviews/${rid}`, { method: "PUT", body: p }),
    deleteReview:     (rid)      => request(`/student/reviews/${rid}`, { method: "DELETE" }),
    submitStatusUpdate:(p)       => request("/student/status-updates", { method: "POST", body: p }),
    myStatusUpdates:  ()         => request("/student/status-updates"),
    updateStatusUpdate:(uid, p)  => request(`/student/status-updates/${uid}`, { method: "PUT", body: p }),
    deleteStatusUpdate:(uid)     => request(`/student/status-updates/${uid}`, { method: "DELETE" }),
    reportConcern:    (p)        => request("/student/concerns", { method: "POST", body: p }),
    myBoardingHouse:  ()         => request("/student/my-boarding-house"),
  },

  osas: {
    dashboardSummary:   ()          => request("/osas/dashboard-summary"),
    geoMapPoints:       ()          => request("/osas/geo-map"),
    allStatusUpdates:   ()          => request("/osas/status-updates"),
    flagStatusUpdate:   (uid, r)    => request(`/osas/status-updates/${uid}/flag?reason=${encodeURIComponent(r)}`, { method: "PATCH" }),
    listBoardingHouses: ()          => request("/osas/boarding-houses"),
    updateBoardingHouse:(hid, p)    => request(`/osas/boarding-houses/${hid}`, { method: "PUT", body: p }),
    deleteBoardingHouse:(hid)       => request(`/osas/boarding-houses/${hid}`, { method: "DELETE" }),
    verifyBoardingHouse:(hid)       => request(`/osas/boarding-houses/${hid}/verify`, { method: "PATCH" }),
    getReviews:         (hid)       => request(`/osas/boarding-houses/${hid}/reviews`),
    allConcerns:        ()          => request("/osas/concerns"),
    updateConcernStatus:(cid, s)    => request(`/osas/concerns/${cid}/status?new_status=${encodeURIComponent(s)}`, { method: "PATCH" }),
    deleteConcern:      (cid)       => request(`/osas/concerns/${cid}`, { method: "DELETE" }),
    listAccounts:       ()          => request("/osas/accounts"),
    updateAccount:      (aid, p)    => request(`/osas/accounts/${aid}`, { method: "PUT", body: p }),
    deleteAccount:      (aid)       => request(`/osas/accounts/${aid}`, { method: "DELETE" }),
    listStudents:       ()          => request("/osas/students"),
    archiveStudent:     (sid)       => request(`/osas/students/${sid}/archive`,   { method: "PATCH" }),
    unarchiveStudent:   (sid)       => request(`/osas/students/${sid}/unarchive`, { method: "PATCH" }),
    deleteStudent:      (sid)       => request(`/osas/students/${sid}`, { method: "DELETE" }),
    generateTallyReport:(groups, m) => {
      const p = new URLSearchParams({ group_by: groups.join(",") });
      if (m) p.append("month_label", m);
      return request(`/osas/reports/tally?${p.toString()}`);
    },
  },
};
