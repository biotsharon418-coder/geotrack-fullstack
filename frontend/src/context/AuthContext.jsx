// src/context/AuthContext.jsx
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { api } from "../api/client";

const AuthContext = createContext(null);
// Session timeout: OSAS admin = 15 min, student = no timeout
const OSAS_TIMEOUT_MS = 15 * 60 * 1000;

export function AuthProvider({ children }) {
  const [role, setRole]         = useState(api.getRole());
  const [fullName, setFullName] = useState(localStorage.getItem("geotrack_full_name"));
  const timerRef                = useRef(null);

  function login({ access_token, role, full_name }) {
    api.setSession({ access_token, role, full_name });
    setRole(role); setFullName(full_name);
    if (role === "osas_admin") resetTimer();
  }

  function logout() { clearTimeout(timerRef.current); api.clearSession(); setRole(null); setFullName(null); }

  function updateFullName(name) { localStorage.setItem("geotrack_full_name", name); setFullName(name); }

  // Session timeout for OSAS admin
  function resetTimer() {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      if (api.getRole() === "osas_admin") {
        logout();
        window.dispatchEvent(new CustomEvent("geotrack:session-timeout"));
      }
    }, OSAS_TIMEOUT_MS);
  }

  useEffect(() => {
    // Listen for user activity to reset the timer
    if (role === "osas_admin") {
      const events = ["click","keydown","mousemove","touchstart"];
      const handler = () => resetTimer();
      events.forEach(e => window.addEventListener(e, handler, { passive:true }));
      resetTimer();
      return () => { events.forEach(e => window.removeEventListener(e, handler)); clearTimeout(timerRef.current); };
    }
  }, [role]);

  useEffect(() => {
    function handleCleared() { setRole(null); setFullName(null); clearTimeout(timerRef.current); }
    window.addEventListener("geotrack:session-cleared", handleCleared);
    return () => window.removeEventListener("geotrack:session-cleared", handleCleared);
  }, []);

  return (
    <AuthContext.Provider value={{ role, fullName, isAuthenticated: Boolean(role), login, logout, updateFullName }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
