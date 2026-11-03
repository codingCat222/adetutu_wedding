import { useState, type FormEvent } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import Monogram from "../components/Monogram";
import { ApiError } from "../lib/api";
import { useAuth } from "./AuthContext";
import { Spinner } from "./ui";

export default function AdminLoginPage() {
  const { admin, loading, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? "/admin/guests";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (loading) return <Spinner />;
  if (admin) return <Navigate to="/admin/guests" replace />;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await login(email.trim(), password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  const input = "w-full bg-transparent border border-ivory/30 rounded-sm px-4 py-3 font-sans text-ivory focus:border-gold transition-colors";
  return (
    <div className="min-h-screen bg-deep-plum text-ivory flex items-center justify-center px-6">
      <form onSubmit={submit} className="w-full max-w-sm space-y-5">
        <Monogram className="w-14 h-14 mx-auto text-gold" />
        <h1 className="font-serif text-3xl text-center">Admin Sign In</h1>
        <div>
          <label htmlFor="email" className="block font-sans text-sm text-ivory/70 mb-2">Email</label>
          <input id="email" type="email" autoComplete="username" required className={input} value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label htmlFor="password" className="block font-sans text-sm text-ivory/70 mb-2">Password</label>
          <input id="password" type="password" autoComplete="current-password" required className={input} value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {error && <p role="alert" className="text-sm text-gold font-sans">{error}</p>}
        <button disabled={busy} className="w-full bg-gold text-deep-plum font-sans font-medium text-sm px-8 py-3.5 rounded-sm hover:bg-ivory transition-colors disabled:opacity-60">
          {busy ? "Signing in…" : "Sign In"}
        </button>
      </form>
    </div>
  );
}
