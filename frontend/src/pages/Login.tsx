import { FormEvent, useState, useEffect } from "react";
import { useNavigate, NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { apiClient } from "../api/client";

export default function Login() {
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [googleClientId, setGoogleClientId] = useState<string | null>(null);

  async function handleGoogleCallback(response: any) {
    setSubmitting(true);
    setError(null);
    try {
      await loginWithGoogle(response.credential);
      navigate("/dashboard");
    } catch (err: any) {
      setError(err.response?.data?.detail || "Google authentication failed");
    } finally {
      setSubmitting(false);
    }
  }

  useEffect(() => {
    apiClient.get("/auth/google/client-id")
      .then((res) => {
        const client_id = res.data.client_id;
        if (client_id) {
          setGoogleClientId(client_id);
          if ((window as any).google?.accounts?.id) {
            const google = (window as any).google;
            google.accounts.id.initialize({
              client_id: client_id,
              callback: handleGoogleCallback,
            });
            google.accounts.id.renderButton(
              document.getElementById("google-signin-btn"),
              { theme: "outline", size: "large", width: "336", shape: "rectangular", text: "signin_with" }
            );
          }
        }
      })
      .catch((err) => console.error("Failed to load Google Client ID:", err));
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await login(email, password);
      navigate("/dashboard");
    } catch (err: any) {
      setError(err.response?.data?.detail || "Invalid email or password");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <div className="w-full max-w-sm card">
        <h1 className="font-display text-2xl mb-1">Sign in</h1>
        <p className="text-sm text-ink/60 mb-6">Access the VaxiPredict intelligence platform.</p>

        {error && <p className="text-sm text-coral bg-coral/10 rounded-md px-3 py-2 mb-4">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-ink/60">Email</label>
            <input className="input mt-1" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-ink/60">Password</label>
            <input className="input mt-1" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <button type="submit" disabled={submitting} className="btn-primary w-full justify-center">
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <div className={`mt-6 ${googleClientId ? "block" : "hidden"}`}>
          <div className="relative flex items-center justify-center my-4">
            <div className="border-t border-ink/10 w-full"></div>
            <span className="absolute bg-card px-3 text-xs text-ink/40 font-medium uppercase">Or sign in with</span>
          </div>
          <div id="google-signin-btn" className="w-full flex justify-center mt-2"></div>
        </div>

        <p className="text-xs text-ink/50 mt-5 text-center">
          No account? <NavLink to="/register" className="text-teal font-medium">Register</NavLink>
        </p>
      </div>
    </div>
  );
}
