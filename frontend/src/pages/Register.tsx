import { FormEvent, useState, useEffect } from "react";
import { useNavigate, NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import type { UserRole } from "../types";

const ROLES: { value: UserRole; label: string }[] = [
  { value: "health_worker", label: "Health Worker" },
  { value: "analyst", label: "Analyst" },
  { value: "viewer", label: "Public" },
];

export default function Register() {
  const { register, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("health_worker");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleGoogleCallback(response: any) {
    setSubmitting(true);
    setError(null);
    try {
      await loginWithGoogle(response.credential);
      navigate("/dashboard");
    } catch (err: any) {
      setError(err.response?.data?.detail || "Google registration failed");
    } finally {
      setSubmitting(false);
    }
  }

  useEffect(() => {
    const client_id = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";
    if (client_id && (window as any).google?.accounts?.id) {
      const google = (window as any).google;
      google.accounts.id.initialize({
        client_id: client_id,
        callback: handleGoogleCallback,
      });
      google.accounts.id.renderButton(
        document.getElementById("google-signup-btn"),
        { theme: "outline", size: "large", width: "300", shape: "rectangular", text: "signup_with" }
      );
    }
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await register(fullName, email, password, role);
      navigate("/dashboard");
    } catch (err: any) {
      setError(err.response?.data?.detail || "Registration failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <div className="w-full max-w-sm card">
        <h1 className="font-display text-2xl mb-1">Create account</h1>
        <p className="text-sm text-ink/60 mb-6">Join the VaxiPredict platform.</p>

        {error && <p className="text-sm text-coral bg-coral/10 rounded-md px-3 py-2 mb-4">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-ink/60">Full name</label>
            <input className="input mt-1" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-ink/60">Email</label>
            <input className="input mt-1" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-ink/60">Password</label>
            <input className="input mt-1" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-ink/60">Role</label>
            <select className="input mt-1" value={role} onChange={(e) => setRole(e.target.value as UserRole)}>
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
          <button type="submit" disabled={submitting} className="btn-primary w-full justify-center">
            {submitting ? "Creating account…" : "Create account"}
          </button>
        </form>

        {import.meta.env.VITE_GOOGLE_CLIENT_ID && (
          <div className="mt-6">
            <div className="relative flex items-center justify-center my-4">
              <div className="border-t border-ink/10 w-full"></div>
              <span className="absolute bg-card px-3 text-xs text-ink/40 font-medium uppercase">Or register with</span>
            </div>
            <div id="google-signup-btn" className="w-full flex justify-center mt-2"></div>
          </div>
        )}

        <p className="text-xs text-ink/50 mt-5 text-center">
          Already have an account? <NavLink to="/login" className="text-teal font-medium">Sign in</NavLink>
        </p>
      </div>
    </div>
  );
}
