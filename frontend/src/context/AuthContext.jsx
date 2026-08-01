import { createContext, useContext, useRef, useState } from "react";
import { api } from "../api/client";

const AuthContext = createContext();

function getPrefix() {
  return window.location.pathname.startsWith("/osas")
    ? "osas"
    : "student";
}

function getStoredName() {
  return localStorage.getItem(`${getPrefix()}_full_name`);
}

export function AuthProvider({ children }) {
  const [role, setRole] = useState(api.getRole());
  const [fullName, setFullName] = useState(getStoredName());
  const timerRef = useRef(null);

  function login(session) {
    api.setSession(session);
    setRole(session.role);
    setFullName(session.full_name);
  }

  function logout() {
    clearTimeout(timerRef.current);
    api.clearSession();
    setRole(null);
    setFullName(null);
  }

  function updateFullName(name) {
    localStorage.setItem(`${getPrefix()}_full_name`, name);
    setFullName(name);
  }

  return (
    <AuthContext.Provider
      value={{
        role,
        fullName,
        login,
        logout,
        updateFullName,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);