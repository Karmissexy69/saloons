import { FormEvent, useState } from "react";
import { requestOtp } from "../lib/api";
import { navigate } from "../lib/router";
import { savePendingOtpEmail, useStoredSession } from "../lib/session";

interface Props {
  nextTarget: string;
}

export function LoginPage({ nextTarget }: Props) {
  const session = useStoredSession();
  const [email, setEmail] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setNotice("");

    try {
      const response = await requestOtp(email.trim(), "Customer Web");
      savePendingOtpEmail(email.trim());
      setNotice(response.message || "OTP sent");
      navigate(`/verify?email=${encodeURIComponent(email.trim())}&next=${encodeURIComponent(nextTarget)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to request OTP");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="ve-auth-shell">
      <div className="ve-auth-story">
        <p className="ve-eyebrow">Customer Login</p>
        <h1 className="ve-display-lg">Return to your points, vouchers, and appointments with email OTP.</h1>
        <p className="ve-supporting-copy">
          This flow is separate from the internal salon login. It is built for customer-safe authentication and profile access.
        </p>
      </div>
      <div className="ve-auth-panel">
        <h2 className="ve-display-sm">Request OTP</h2>
        <p className="ve-panel-copy">Enter the email you use for your salon profile.</p>
        {session ? (
          <div className="ve-panel ve-panel-success">
            <p className="ve-panel-title">You are already signed in.</p>
            <button className="ve-text-link" onClick={() => navigate("/account/profile")}>
              Open my account
            </button>
          </div>
        ) : null}
        <form className="ve-form-stack" onSubmit={handleSubmit}>
          <label className="ve-field">
            <span>Email address</span>
            <input
              className="ve-input"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              required
            />
          </label>
          {notice ? <div className="ve-inline-note ve-inline-note-success">{notice}</div> : null}
          {error ? <div className="ve-inline-note ve-inline-note-error">{error}</div> : null}
          <button className="ve-button ve-button-primary ve-button-block" type="submit" disabled={loading}>
            {loading ? "Sending OTP..." : "Send OTP"}
          </button>
        </form>
      </div>
    </section>
  );
}
