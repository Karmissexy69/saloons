import { FormEvent, useState } from "react";
import { login } from "../lib/api";
import type { AuthLoginResponse } from "../lib/types";

type Props = {
  onLogin: (response: AuthLoginResponse) => void;
};

export function LoginPage({ onLogin }: Props) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await login(username.trim(), password);
      onLogin(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="st-login-wrap">
      <section className="st-login-card">
        <header>
          <div className="st-login-mark">
            <span className="material-symbols-outlined">content_cut</span>
          </div>
          <h1>BrowPOS</h1>
          <p>Internal Operations Portal</p>
        </header>

        <form onSubmit={handleSubmit} className="st-form">
          <label>
            Username
            <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Enter username" required />
          </label>
          <label>
            Password
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </label>
          <button className="st-btn" type="submit" disabled={loading}>
            {loading ? "Signing In..." : "Sign In"}
          </button>
          {error ? <p className="st-error">{error}</p> : null}
        </form>
      </section>
    </main>
  );
}
