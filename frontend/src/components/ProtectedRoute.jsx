import { Navigate } from "react-router-dom";
import { api } from "../api/client";

export default function ProtectedRoute({ requiredRole, children }) {
  const role = api.getRole();
  const token = api.getToken();

  if (!token) {
    return (
      <Navigate
        to={requiredRole === "osas_admin"
          ? "/osas/login"
          : "/student/login"}
        replace
      />
    );
  }

  if (role !== requiredRole) {
    return (
      <Navigate
        to={requiredRole === "osas_admin"
          ? "/osas/login"
          : "/student/login"}
        replace
      />
    );
  }

  return children;
}