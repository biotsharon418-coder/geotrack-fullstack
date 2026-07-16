// src/hooks/useSessionExpiry.js
//
// Every page that calls the API wraps its catch block with this so a
// real session expiry (api.AuthError, from a 401) logs the user out and
// sends them back to login, instead of just showing a confusing error
// banner on a page that will keep failing every request from then on.
// A 403 (wrong role, valid token) is NOT treated this way -- that's a
// real permissions error and should stay visible to the user.

import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";

export function useSessionExpiry() {
  const { logout, role } = useAuth();
  const navigate = useNavigate();

  /**
   * Call this inside a catch block: handleError(err, setError).
   * Returns true if it handled the error (session expired -> redirected),
   * false if the caller should still display `err.message` itself.
   */
  function handleError(err, setError) {
    if (err instanceof api.AuthError) {
      logout();
      const loginPath = role === "osas_admin" ? "/osas/login" : "/student/login";
      navigate(loginPath, { replace: true });
      return true;
    }
    setError(err.message);
    return false;
  }

  return { handleError };
}
