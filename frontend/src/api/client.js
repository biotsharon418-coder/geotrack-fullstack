// src/api/client.js - GeoTrack API v3
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api";

// ===== Dual Session Support (Student + OSAS) =====

function isOsasPortal() {
  return window.location.pathname.startsWith("/osas");
}

function getPrefix() {
  return isOsasPortal() ? "osas" : "student";
}

function getToken() {
  return localStorage.getItem(`${getPrefix()}_token`);
}

function getRole() {
  return localStorage.getItem(`${getPrefix()}_role`);
}

function getFullName() {
  return localStorage.getItem(`${getPrefix()}_full_name`);
}

function setSession({ access_token, role, full_name }) {
  const prefix = getPrefix();

  localStorage.setItem(`${prefix}_token`, access_token);
  localStorage.setItem(`${prefix}_role`, role);
  localStorage.setItem(`${prefix}_full_name`, full_name);

  window.dispatchEvent(new CustomEvent("geotrack:session-changed"));
}

function clearSession() {
  const prefix = getPrefix();

  localStorage.removeItem(`${prefix}_token`);
  localStorage.removeItem(`${prefix}_role`);
  localStorage.removeItem(`${prefix}_full_name`);

  window.dispatchEvent(new CustomEvent("geotrack:session-cleared"));
}

class AuthError extends Error {}

async function request(path, { method="GET", body, formEncoded=false }={}) {
  const headers = {};
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  let payload = body;
  if (body && !formEncoded) { headers["Content-Type"] = "application/json"; payload = JSON.stringify(body); }
  const res = await fetch(`${API_BASE_URL}${path}`, { method, headers, body: payload });
  if (!res.ok) {
    let detail = `Request failed (${res.status})`;
    try { const e = await res.json(); detail = Array.isArray(e.detail) ? e.detail.map(x=>x.msg).join(" ") : (e.detail||detail); } catch {}
    if (res.status===401||res.status===403) { clearSession(); throw new AuthError("Session expired. Please sign in again."); }
    throw new Error(detail);
  }
  const text = await res.text(); return text ? JSON.parse(text) : null;
}

async function loginRequest(email, password) {
  const p = new URLSearchParams(); p.append("username",email); p.append("password",password);
  return request("/auth/token", { method:"POST", body:p, formEncoded:true });
}

export const api = {
  getToken, getRole, getFullName, setSession, clearSession, loginRequest, AuthError,
  registerStudent:  p => request("/auth/register/student", {method:"POST",body:p}),
  registerOsasAdmin:p => request("/auth/register/osas",   {method:"POST",body:p}),
  verifyOTP:        (email,otp) => request("/auth/verify-otp",{method:"POST",body:{email,otp}}),
  resendOTP:        email => request(`/auth/resend-otp?email=${encodeURIComponent(email)}`,{method:"POST"}),
  forgotPassword:   email => request("/auth/forgot-password",{method:"POST",body:{email}}),
  resetPassword:    (token,new_password) => request("/auth/reset-password",{method:"POST",body:{token,new_password}}),
  verify2FA:        (pending_token,totp_code) => request("/auth/2fa/verify",{method:"POST",body:{pending_token,totp_code}}),
  setup2FA:         () => request("/auth/2fa/setup",{method:"POST"}),
  enable2FA:        code => request(`/auth/2fa/enable?code=${code}`,{method:"POST"}),
  disable2FA:       () => request("/auth/2fa/disable",{method:"POST"}),

  student: {
    myProfile:          ()        => request("/student/me"),
    updateMyProfile:    p         => request("/student/me",{method:"PUT",body:p}),
    listBoardingHouses: ()        => request("/student/boarding-houses"),
    getReviews:         hid       => request(`/student/boarding-houses/${hid}/reviews`),
    postReview:         (hid,p)   => request(`/student/boarding-houses/${hid}/reviews`,{method:"POST",body:p}),
    myReviews:          ()        => request("/student/my-reviews"),
    updateReview:       (rid,p)   => request(`/student/reviews/${rid}`,{method:"PUT",body:p}),
    deleteReview:       rid       => request(`/student/reviews/${rid}`,{method:"DELETE"}),
    submitStatusUpdate: p         => request("/student/status-updates",{method:"POST",body:p}),
    myStatusUpdates:    ()        => request("/student/status-updates"),
    updateStatusUpdate: (uid,p)   => request(`/student/status-updates/${uid}`,{method:"PUT",body:p}),
    deleteStatusUpdate: uid       => request(`/student/status-updates/${uid}`,{method:"DELETE"}),
    reportConcern:      p         => request("/student/concerns",{method:"POST",body:p}),
  myBoardingHouse:    ()        => request("/student/my-boarding-house"),
  getComplianceHistory: () => request("/student/compliance"),
  getComplianceStatus: () => request("/student/compliance/status"),
  triggerSOS:         p         => request("/student/sos",{method:"POST",body:p}),
  myEmergencies:      ()        => request("/student/sos"),
  emergencyDetail:    id        => request(`/student/sos/${id}`),
  cancelEmergency:    id        => request(`/student/sos/${id}/cancel`,{method:"PATCH"}),
  myNotifications:    ()        => request("/student/notifications"),
  markNotificationRead: id      => request(`/student/notifications/${id}/read`,{method:"PATCH"}),
  markAllNotificationsRead: ()  => request("/student/notifications/read-all",{method:"PATCH"}),
  getConsent:         ()        => request("/student/consent"),
  submitConsent:      p         => request("/student/consent",{method:"POST",body:p}),
  },

  osas: {
    dashboard:          ()           => request("/osas/dashboard"),
    geoMapPoints:       ()           => request("/osas/geo-map"),
    allStatusUpdates:   (params={})  => { const q=new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([,v])=>v!=null&&v!==""))); return request(`/osas/status-updates?${q}`); },
    flagStatusUpdate:   (uid,r)      => request(`/osas/status-updates/${uid}/flag?reason=${encodeURIComponent(r)}`,{method:"PATCH"}),
    listBoardingHouses: ()           => request("/osas/boarding-houses"),
    updateBoardingHouse:(hid,p)      => request(`/osas/boarding-houses/${hid}`,{method:"PUT",body:p}),
    deleteBoardingHouse:hid          => request(`/osas/boarding-houses/${hid}`,{method:"DELETE"}),
    verifyBoardingHouse:hid          => request(`/osas/boarding-houses/${hid}/verify`,{method:"PATCH"}),
    getReviews:         hid          => request(`/osas/boarding-houses/${hid}/reviews`),
    allConcerns:        ()           => request("/osas/concerns"),
    updateConcernStatus:(cid,s)      => request(`/osas/concerns/${cid}/status?new_status=${encodeURIComponent(s)}`,{method:"PATCH"}),
    deleteConcern:      cid          => request(`/osas/concerns/${cid}`,{method:"DELETE"}),
    listAccounts:       ()           => request("/osas/accounts"),
    updateAccount:      (aid,p)      => request(`/osas/accounts/${aid}`,{method:"PUT",body:p}),
    deleteAccount:      aid          => request(`/osas/accounts/${aid}`,{method:"DELETE"}),
    listStudents:       (params={})  => { const q=new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([,v])=>v!=null&&v!==""))); return request(`/osas/students?${q}`); },
    archiveStudent:     sid          => request(`/osas/students/${sid}/archive`,{method:"PATCH"}),
    unarchiveStudent:   sid          => request(`/osas/students/${sid}/unarchive`,{method:"PATCH"}),
    deleteStudent:      sid          => request(`/osas/students/${sid}`,{method:"DELETE"}),
    auditLogs:          (params={})  => { const q=new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([,v])=>v!=null&&v!==""))); return request(`/osas/audit-logs?${q}`); },
    generateTallyReport:(groups,m)   => { const p=new URLSearchParams({group_by:groups.join(",")}); if(m)p.append("month_label",m); return request(`/osas/reports/tally?${p}`); },
   complianceDashboard: () =>
    request("/osas/compliance/dashboard"),
    listEmergencies:    (status) => request(`/osas/emergencies${status?`?status=${encodeURIComponent(status)}`:""}`),
    emergencyDetail:    id       => request(`/osas/emergencies/${id}`),
    updateEmergencyStatus: (id,p) => request(`/osas/emergencies/${id}/status`,{method:"PATCH",body:p}),
    addEmergencyNote:   (id,note) => request(`/osas/emergencies/${id}/notes`,{method:"POST",body:{note}}),
    exportURL: (fmt, groups, m) => {
  const p = new URLSearchParams({
    group_by: groups.join(",")
  });

  if (m) p.append("month_label", m);

  return `${API_BASE_URL}/osas/reports/export/${fmt}?${p}`;
},
    sendAnnouncement:   p             => request("/osas/announcements",{method:"POST",body:p}),
    riskAssessment:     ()            => request("/osas/risk-assessment"),
    riskAssessmentDetail: sid         => request(`/osas/risk-assessment/${sid}`),
    listInspections:    (params={})   => { const q=new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([,v])=>v!=null&&v!==""))); return request(`/osas/inspections?${q}`); },
    scheduleInspection: p             => request("/osas/inspections",{method:"POST",body:p}),
    completeInspection: (iid,p)       => request(`/osas/inspections/${iid}/complete`,{method:"PATCH",body:p}),
    cancelInspection:   iid           => request(`/osas/inspections/${iid}/cancel`,{method:"PATCH"}),
    deleteInspection:   iid           => request(`/osas/inspections/${iid}`,{method:"DELETE"}),
    consentLogs:        ()            => request("/osas/consent-logs"),
    complianceHistory:  (params={})   => { const q=new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([,v])=>v!=null&&v!==""))); return request(`/osas/compliance/history?${q}`); },
    complianceReport:   (params={})   => { const q=new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([,v])=>v!=null&&v!==""))); return request(`/osas/compliance/report?${q}`); },
    sendComplianceReminders: ()       => request("/osas/compliance/send-reminders",{method:"POST"}),
    checkMissedSubmissions: ()        => request("/osas/compliance/check-missed",{method:"POST"}),
    updateComplianceFlags: ()         => request("/osas/compliance/update-flags",{method:"POST"}),

},

};