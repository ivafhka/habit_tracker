import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api, getToken } from "../api.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    if (!getToken()) {
      setUser(null);
      return false;
    }
    try {
      const res = await api("/api/auth/me");
      if (!res.ok) {
        localStorage.removeItem("token");
        setUser(null);
        return false;
      }
      setUser(await res.json());
      return true;
    } catch (e) {
      console.error("Auth check failed:", e);
      setUser(null);
      return false;
    }
  }, []);

  useEffect(() => {
    refresh().finally(() => setReady(true));
  }, [refresh]);

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, ready, refresh, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
