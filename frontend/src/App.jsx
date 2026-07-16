// src/App.jsx
//
// Top-level router. Notice the two route trees never intersect:
//   /student/*  -> StudentLogin, then StudentLayout + its child pages
//   /osas/*     -> OsasLogin, then OsasLayout + its child pages
// ProtectedRoute enforces the matching role on every dashboard route,
// backed by the same role check the FastAPI backend does on every request.

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";

import StudentLogin from "./pages/student/StudentLogin";
import StudentLayout from "./pages/student/StudentLayout";
import StudentHome from "./pages/student/StudentHome";
import StudentStatus from "./pages/student/StudentStatus";
import StudentDirectory from "./pages/student/StudentDirectory";
import DormDetail from "./pages/student/DormDetail";
import StudentConcern from "./pages/student/StudentConcern";
import StudentProfile from "./pages/student/StudentProfile";
import ForgotPassword from "./pages/student/ForgotPassword";
import ResetPassword from "./pages/student/ResetPassword";

import OsasLogin from "./pages/osas/OsasLogin";
import OsasLayout from "./pages/osas/OsasLayout";
import OsasDashboard from "./pages/osas/OsasDashboard";
import OsasStatusUpdates from "./pages/osas/OsasStatusUpdates";
import OsasVerification from "./pages/osas/OsasVerification";
import OsasReviews from "./pages/osas/OsasReviews";
import OsasConcerns from "./pages/osas/OsasConcerns";
import OsasReports from "./pages/osas/OsasReports";
import OsasAccounts from "./pages/osas/OsasAccounts";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Landing: send people to a sensible default instead of a blank page */}
          <Route path="/" element={<Navigate to="/student/login" replace />} />

          {/* ---------------- STUDENT APP ---------------- */}
          <Route path="/student/login" element={<StudentLogin />} />
          <Route path="/student/forgot-password" element={<ForgotPassword />} />
          <Route path="/student/reset-password" element={<ResetPassword />} />
          <Route
            path="/student"
            element={
              <ProtectedRoute requiredRole="student">
                <StudentLayout />
              </ProtectedRoute>
            }
          >
            <Route path="home" element={<StudentHome />} />
            <Route path="status" element={<StudentStatus />} />
            <Route path="directory" element={<StudentDirectory />} />
            <Route path="directory/:houseId" element={<DormDetail />} />
            <Route path="concern" element={<StudentConcern />} />
            <Route path="profile" element={<StudentProfile />} />
          </Route>

          {/* ---------------- OSAS ADMIN APP ---------------- */}
          <Route path="/osas/login" element={<OsasLogin />} />
          <Route
            path="/osas"
            element={
              <ProtectedRoute requiredRole="osas_admin">
                <OsasLayout />
              </ProtectedRoute>
            }
          >
            <Route path="dashboard" element={<OsasDashboard />} />
            <Route path="status-updates" element={<OsasStatusUpdates />} />
            <Route path="verification" element={<OsasVerification />} />
            <Route path="reviews" element={<OsasReviews />} />
            <Route path="concerns" element={<OsasConcerns />} />
            <Route path="reports" element={<OsasReports />} />
            <Route path="accounts" element={<OsasAccounts />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/student/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
