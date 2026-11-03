import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { api } from "../lib/api";
import { Spinner } from "./ui";

interface Admin { id: string; email: string }
interface AuthState {
  admin: Admin | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}
const Ctx = createContext<AuthState | null>(null);
export const useAuth = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth outside AuthProvider");
  return v;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<{ admin: Admin }>("/admin/me")
      .then((r) => setAdmin(r.admin))
      .catch(() => setAdmin(null))
      .finally(() => setLoading(false));
  }, []);

  const value: AuthState = {
    admin,
    loading,
    login: async (email, password) => {
      const r = await api<{ admin: Admin }>("/admin/login", { method: "POST", body: { email, password } });
      setAdmin(r.admin);
    },
    logout: async () => {
      await api("/admin/logout", { method: "POST" }).catch(() => {});
      setAdmin(null);
    },
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function RequireAdmin() {
  const { admin, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Spinner />;
  if (!admin) return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  return <Outlet />;
}
