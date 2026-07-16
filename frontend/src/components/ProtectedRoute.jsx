// src/components/ProtectedRoute.jsx
//
// Guards a route so only a user with the matching role can see it.
// A student who is somehow holding a /osas/* URL gets redirected to the
// OSAS login instead of the dashboard, and vice versa -- the frontend
// route guard mirrors the same role check the backend already enforces.

import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ requiredRole, children }) {
  const { role, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    const loginPath = requiredRole === "osas_admin" ? "/osas/login" : "/student/login";
    return <Navigate to={loginPath} replace />;
  }

  if (role !== requiredRole) {
    // Logged in, but as the wrong role -- send them to their own login,
    // not the dashboard they don't have access to.
    const loginPath = requiredRole === "osas_admin" ? "/osas/login" : "/student/login";
    return <Navigate to={loginPath} replace />;
  }

  return children;
}
