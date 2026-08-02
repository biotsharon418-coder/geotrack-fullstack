// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";

// Student pages
import StudentLogin     from "./pages/student/StudentLogin";
import StudentLayout    from "./pages/student/StudentLayout";
import StudentHome      from "./pages/student/StudentHome";
import StudentStatus    from "./pages/student/StudentStatus";
import StudentDirectory from "./pages/student/StudentDirectory";
import DormDetail       from "./pages/student/DormDetail";
import StudentConcern   from "./pages/student/StudentConcern";
import StudentSOS       from "./pages/student/StudentSOS";
import StudentProfile   from "./pages/student/StudentProfile";
import ForgotPassword   from "./pages/student/ForgotPassword";
import ResetPassword    from "./pages/student/ResetPassword";
import VerifyOTP        from "./pages/student/VerifyOTP";
import TwoFAVerify      from "./pages/student/TwoFAVerify";

// OSAS pages
import OsasLogin          from "./pages/osas/OsasLogin";
import OsasLayout         from "./pages/osas/OsasLayout";
import OsasDashboard      from "./pages/osas/OsasDashboard";
import OsasStatusUpdates  from "./pages/osas/OsasStatusUpdates";
import OsasVerification   from "./pages/osas/OsasVerification";
import OsasReviews        from "./pages/osas/OsasReviews";
import OsasConcerns       from "./pages/osas/OsasConcerns";
import OsasEmergencies    from "./pages/osas/OsasEmergencies";
import OsasReports        from "./pages/osas/OsasReports";
import OsasAccounts       from "./pages/osas/OsasAccounts";
import OsasAuditLogs      from "./pages/osas/OsasAuditLogs";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/student/login" replace />} />

          {/* -- Student (public) -- */}
          <Route path="/student/login"          element={<StudentLogin />} />
          <Route path="/student/forgot-password" element={<ForgotPassword />} />
          <Route path="/student/reset-password"  element={<ResetPassword />} />
          <Route path="/student/verify-otp"      element={<VerifyOTP />} />
          <Route path="/student/2fa-verify"      element={<TwoFAVerify />} />

          {/* -- Student (protected) -- */}
          <Route path="/student" element={
            <ProtectedRoute requiredRole="student"><StudentLayout /></ProtectedRoute>
          }>
            <Route path="home"             element={<StudentHome />} />
            <Route path="status"           element={<StudentStatus />} />
            <Route path="directory"        element={<StudentDirectory />} />
            <Route path="directory/:houseId" element={<DormDetail />} />
            <Route path="concern"          element={<StudentConcern />} />
            <Route path="sos"              element={<StudentSOS />} />
            <Route path="profile"          element={<StudentProfile />} />
          </Route>

          {/* -- OSAS (public) -- */}
          <Route path="/osas/login" element={<OsasLogin />} />

          {/* -- OSAS (protected) -- */}
          <Route path="/osas" element={
            <ProtectedRoute requiredRole="osas_admin"><OsasLayout /></ProtectedRoute>
          }>
            <Route path="dashboard"      element={<OsasDashboard />} />
            <Route path="status-updates" element={<OsasStatusUpdates />} />
            <Route path="verification"   element={<OsasVerification />} />
            <Route path="reviews"        element={<OsasReviews />} />
            <Route path="concerns"       element={<OsasConcerns />} />
            <Route path="emergencies"    element={<OsasEmergencies />} />
            <Route path="reports"        element={<OsasReports />} />
            <Route path="accounts"       element={<OsasAccounts />} />
            <Route path="audit-logs"     element={<OsasAuditLogs />} />
          </Route>

          <Route path="*" element={<Navigate to="/student/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
