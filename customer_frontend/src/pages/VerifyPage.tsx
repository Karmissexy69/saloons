import { FormEvent, useState } from "react";
import { requestOtp, verifyOtp } from "../lib/api";
import { navigate } from "../lib/router";
import { clearPendingOtpEmail, savePendingOtpEmail, useStoredSession } from "../lib/session";

interface Props {
  pendingEmail: string;
  nextTarget: string;
}

export function VerifyPage({ pendingEmail, nextTarget }: Props) {
  const session = useStoredSession();
  const [email, setEmail] = useState(pendingEmail);
  const [otpCode, setOtpCode] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      await verifyOtp(email.trim(), otpCode.trim(), "Customer Web");
      clearPendingOtpEmail();
      navigate(nextTarget || "/account/profile", true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to verify OTP");
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setError("");
    setNotice("");
    try {
      const response = await requestOtp(email.trim(), "Customer Web");
      savePendingOtpEmail(email.trim());
      setNotice(response.message || "A new OTP was sent.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to resend OTP");
    }
  }

  return (
    <section className="ve-auth-shell">
      <div className="ve-auth-story">
        <p className="ve-eyebrow">Verification</p>
        <h1 className="ve-display-lg">Enter the code from your email to open the customer area.</h1>
        <p className="ve-supporting-copy">
          OTP verification is wired to the current customer auth contract and refresh flow.
        </p>
      </div>
      <div className="ve-auth-panel">
        <h2 className="ve-display-sm">Verify OTP</h2>
        {session ? (
          <div className="ve-panel ve-panel-success">
            <p className="ve-panel-title">You are already signed in.</p>
            <button className="ve-text-link" onClick={() => navigate("/account/profile")}>
              Continue to account
            </button>
          </div>
        ) : null}
        <form className="ve-form-stack" onSubmit={handleSubmit}>
          <label className="ve-field">
            <span>Email address</span>
            <input className="ve-input" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </label>
          <label className="ve-field">
            <span>OTP code</span>
            <input
              className="ve-input ve-input-code"
              type="text"
              inputMode="numeric"
              value={otpCode}
              onChange={(event) => setOtpCode(event.target.value)}
              placeholder="6-digit code"
              required
            />
          </label>
          {notice ? <div className="ve-inline-note ve-inline-note-success">{notice}</div> : null}
          {error ? <div className="ve-inline-note ve-inline-note-error">{error}</div> : null}
          <button className="ve-button ve-button-primary ve-button-block" type="submit" disabled={loading}>
            {loading ? "Verifying..." : "Verify and Continue"}
          </button>
          <button className="ve-button ve-button-ghost ve-button-block" type="button" onClick={handleResend}>
            Resend OTP
          </button>
        </form>
      </div>
    </section>
  );
}
