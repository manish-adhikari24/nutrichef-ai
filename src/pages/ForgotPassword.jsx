// Forgot Password page. Step 1: enter your email. Step 2: enter the code and a new password (FR-02).
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout.jsx';
import CodeForm from '../components/CodeForm.jsx';
import PasswordChecklist, { meetsPasswordRules } from '../components/PasswordChecklist.jsx';
import PasswordField from '../components/PasswordField.jsx';
import { forgotPassword, resendCode, resetPassword } from '../lib/api.js';
import { img } from '../img.js';

export default function ForgotPassword() {
  const { state } = useLocation();
  const navigate = useNavigate();
  // Pre-filled if the user came from the login page.
  const [email, setEmail] = useState(state?.email ?? '');
  const [emailError, setEmailError] = useState('');
  // Becomes true once the code is sent, which shows step 2.
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  // Step 1: check the email looks valid, then ask the server to send a code.
  async function requestCode(e) {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setEmailError('Enter a valid email address.');
      return;
    }
    setEmailError('');
    setBusy(true);
    try {
      await forgotPassword(email.trim());
      setSent(true);
    } catch (error) {
      setEmailError(error.message);
    } finally {
      setBusy(false);
    }
  }

  // Step 2: called by CodeForm with the code. Checks the password locally first.
  async function reset(code) {
    if (!meetsPasswordRules(password)) throw new Error('Your new password needs to meet every requirement in the list.');
    if (password !== confirm) throw new Error('Passwords do not match.');
    // Show the server's password or confirm error if there is one.
    try {
      await resetPassword({ email: email.trim(), code, password, confirmPassword: confirm });
    } catch (error) {
      throw new Error(error.fields?.password ?? error.fields?.confirmPassword ?? error.message);
    }
    // Back to login with a success message.
    navigate('/login', { state: { email: email.trim(), notice: 'Your password has been reset. Sign in with your new password.' } });
  }

  // Same photo and note for both steps.
  const layout = {
    image: img('harvest-bowl.jpg'),
    imageAlt: 'A colorful bowl of chickpeas, avocado, sweet potato and tomatoes from above',
    note: 'happens to everyone',
  };

  // Step 2 screen.
  if (sent) {
    return (
      <AuthLayout title="Set a new password" intro="If an account uses this email, we've sent it a code." {...layout}>
        <CodeForm
          email={email.trim().toLowerCase()}
          submitLabel="Reset password"
          onSubmit={reset}
          onResend={() => resendCode({ purpose: 'reset', email: email.trim() })}
        >
          <PasswordField
            id="reset-password"
            label="New password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            hint="Signing in with your new password will need an email code on every device."
          />
          <PasswordChecklist password={password} />
          <PasswordField
            id="reset-confirm"
            label="Confirm new password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            error={confirm && confirm !== password ? 'Passwords do not match.' : undefined}
          />
        </CodeForm>
      </AuthLayout>
    );
  }

  // Step 1 screen.
  return (
    <AuthLayout title="Forgot your password?" intro="Enter your account email and we'll send you a code to reset it." {...layout}>
      <form className="auth-form" onSubmit={requestCode} noValidate>
        <div className="field">
          <label htmlFor="forgot-email" className="field-label">Email address</label>
          <input
            id="forgot-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={emailError ? true : undefined}
            aria-describedby={emailError ? 'forgot-email-error' : undefined}
          />
          {emailError && <p id="forgot-email-error" className="field-error" role="alert">{emailError}</p>}
        </div>
        <button className="btn btn-primary btn-lg btn-block" type="submit" disabled={busy}>
          {busy ? 'Sending…' : 'Send reset code'}
        </button>
        <p className="auth-switch">
          Remembered it? <Link to="/login">Sign in</Link>
        </p>
      </form>
    </AuthLayout>
  );
}
