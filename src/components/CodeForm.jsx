import { useEffect, useState } from 'react';

// Seconds before "Send a new code" can be clicked (matches the server's cooldown).
const RESEND_SECONDS = 60;

// The 6-digit email code step, shared by sign-up, sign-in and password reset.
export default function CodeForm({ email, onSubmit, onResend, submitLabel, children }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  // Countdown until the user can resend.
  const [wait, setWait] = useState(RESEND_SECONDS);

  // Count down once a second until it reaches 0.
  useEffect(() => {
    if (wait <= 0) return undefined;
    const timer = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(timer);
  }, [wait]);

  async function submit(e) {
    e.preventDefault();
    // Check the format before asking the server.
    if (!/^\d{6}$/.test(code)) {
      setError('Enter the 6-digit code from your email.');
      return;
    }
    setError('');
    setBusy(true);
    try {
      // The page passes onSubmit. It calls the API and moves on if the code is right.
      await onSubmit(code);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  async function resend() {
    setError('');
    // Ask for a new code and restart the countdown.
    try {
      await onResend();
      setStatus('A new code is on its way.');
      setWait(RESEND_SECONDS);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <form className="auth-form" onSubmit={submit} noValidate>
      <p className="code-sent">
        We sent a 6-digit code to <b>{email}</b>. It expires in 10 minutes. Check your spam folder if it doesn&apos;t arrive.
      </p>
      <div className="field">
        <label htmlFor="otp-code" className="field-label">Code</label>
        {/* The code box: only digits are kept, at most 6. */}
        <input
          id="otp-code"
          className="code-input"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? 'otp-error' : undefined}
        />
        {error && <p id="otp-error" className="field-error" role="alert">{error}</p>}
      </div>
      {/* Extra fields from the page, e.g. "Keep me signed in". */}
      {children}
      <button className="btn btn-primary btn-lg btn-block" type="submit" disabled={busy}>
        {busy ? 'Checking…' : submitLabel}
      </button>
      <p className="auth-switch">
        Didn&apos;t get it?{' '}
        <button type="button" className="link-btn" onClick={resend} disabled={wait > 0}>
          {wait > 0 ? `Resend in ${wait}s` : 'Send a new code'}
        </button>
      </p>
      <p role="status" className="profile-status">{status}</p>
    </form>
  );
}
