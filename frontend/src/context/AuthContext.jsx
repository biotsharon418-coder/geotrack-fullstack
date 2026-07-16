// src/context/AuthContext.jsx
//
// Holds the currently logged-in user's role and name in React state,
// backed by localStorage so a refresh doesn't log the user out.
// This is shared code, but each app (Student / OSAS) only ever reads
// the role it cares about -- a student token simply won't work against
// /api/osas/* routes, and vice versa, because the backend checks the
// role inside the JWT on every request.

import { createContext, useContext, useEffect, useState } from "react";
import { api } from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [role, setRole] = useState(api.getRole());
  const [fullName, setFullName] = useState(localStorage.getItem("geotrack_full_name"));

  function login({ access_token, role, full_name }) {
    api.setSession({ access_token, role, full_name });
    setRole(role);
    setFullName(full_name);
  }

  function logout() {
    api.clearSession();
    setRole(null);
    setFullName(null);
  }

  // Called from StudentProfile after a successful name change so the
  // home screen "Hi, {firstName}" and any other place that reads
  // fullName from context updates immediately without a sign-out/sign-in.
  function updateFullName(newName) {
    localStorage.setItem("geotrack_full_name", newName);
    setFullName(newName);
  }

  // If a 401 happens deep inside any page's API call, client.js clears
  // localStorage and fires this event -- this keeps React's in-memory
  // role/fullName state in sync with that, even though the clear didn't
  // go through the logout() function above.
  useEffect(() => {
    function handleSessionCleared() {
      setRole(null);
      setFullName(null);
    }
    window.addEventListener("geotrack:session-cleared", handleSessionCleared);
    return () => window.removeEventListener("geotrack:session-cleared", handleSessionCleared);
  }, []);

  const isAuthenticated = Boolean(role);

  return (
    <AuthContext.Provider value={{ role, fullName, isAuthenticated, login, logout, updateFullName }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside an AuthProvider");
  return ctx;
}
