import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { apiClient } from "../api/client";
import type { AuthUser, UserRole } from "../types";

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: (credential: string) => Promise<void>;
  register: (fullName: string, email: string, password: string, role: UserRole) => Promise<void>;
  logout: () => void | Promise<void>;
  hasRole: (...roles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("vaxipredict_user");
    const token = localStorage.getItem("vaxipredict_token");
    if (stored && token) {
      setUser(JSON.parse(stored));
    }

    if (token) {
      // Query latest profile/role directly from the database
      apiClient.get("/auth/me")
        .then((res) => {
          const updatedUser: AuthUser = { fullName: res.data.full_name, role: res.data.role };
          setUser(updatedUser);
          localStorage.setItem("vaxipredict_user", JSON.stringify(updatedUser));
        })
        .catch((err) => {
          console.error("Session verification failed:", err);
          // If unauthorized, clear invalid session tokens
          if (err.response?.status === 401) {
            localStorage.removeItem("vaxipredict_token");
            localStorage.removeItem("vaxipredict_user");
            setUser(null);
          }
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  async function login(email: string, password: string) {
    const { data } = await apiClient.post("/auth/login", { email, password });
    localStorage.setItem("vaxipredict_token", data.access_token);
    const authUser: AuthUser = { fullName: data.full_name, role: data.role };
    localStorage.setItem("vaxipredict_user", JSON.stringify(authUser));
    setUser(authUser);
  }

  async function loginWithGoogle(credential: string) {
    const { data } = await apiClient.post("/auth/google", { credential });
    localStorage.setItem("vaxipredict_token", data.access_token);
    const authUser: AuthUser = { fullName: data.full_name, role: data.role };
    localStorage.setItem("vaxipredict_user", JSON.stringify(authUser));
    setUser(authUser);
  }

  async function register(fullName: string, email: string, password: string, role: UserRole) {
    await apiClient.post("/auth/register", { full_name: fullName, email, password, role });
    await login(email, password);
  }

  async function logout() {
    try {
      await apiClient.post("/auth/logout");
    } catch (err) {
      console.error("Backend logout failed:", err);
    }
    localStorage.removeItem("vaxipredict_token");
    localStorage.removeItem("vaxipredict_user");
    setUser(null);
  }

  function hasRole(...roles: UserRole[]) {
    return !!user && roles.includes(user.role);
  }

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, loading, login, loginWithGoogle, register, logout, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
