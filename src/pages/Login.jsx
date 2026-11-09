// Login page. Step 1: email and password. Step 2 (new device): the emailed code (FR-02).
import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout.jsx';
import CodeForm from '../components/CodeForm.jsx';
import PasswordField from '../components/PasswordField.jsx';
import { isSignedIn, login, resendCode, verifyLogin } from '../lib/api.js';
import { img } from '../img.js';

export default function Login() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const [email, setEmail] = useState(state?.email ?? '');
  const [password, setPassword] = useState('');
  // "Keep me signed in on this device".
  const [keep, setKeep] = useState(false);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  // Set when the server asks for an emailed code. Switches to step 2.
  const [ticket, setTicket] = useState(null);

  // Already signed in: go to the dashboard, or the page they were trying to open.
  if (isSignedIn()) return <Navigate to={state?.from ?? '/dashboard'} replace />;
  const done = () => navigate(state?.from ?? '/dashboard');

  async function onSubmit(e) {
    // Check both fields are filled in before calling the server.
    e.preventDefault();
    const found = {};
    if (!email.trim()) found.email = 'Enter your email address.';
    if (!password) found.password = 'Enter your password.';
    setErrors(found);
    setFormError('');
    if (Object.keys(found).length) return;
    setBusy(true);
    try {
      // Trusted device: signed in straight away. Otherwise a ticket comes back for step 2.
      const result = await login(email, password);
      if (result.ticket) {
        setTicket(result.ticket);
        setBusy(false);
      } else {
        done();
      }
    } catch (error) {
      // The account isn't verified yet: go to the verification page.
      if (error.code === 'verify_email') {
        navigate('/verify-email', { state: { email: error.email ?? email, sent: true } });
        return;
      }
      setFormError(error.message);
      setBusy(false);
    }
  }

  // Step 2: the email code screen.
  if (ticket) {
    return (
      <AuthLayout
        title="Check your email"
        intro="For your security, enter the code we just sent to finish signing in."
        image={img('harvest-bowl.jpg')}
        imageAlt="A colorful bowl of chickpeas, avocado, sweet potato and tomatoes from above"
        note="nearly there"
      >
        <CodeForm
          email={email.trim().toLowerCase()}
          submitLabel="Sign in"
          onSubmit={async (code) => {
            await verifyLogin(ticket, code, keep);
            done();
          }}
          onResend={() => resendCode({ purpose: 'login', ticket })}
        />
      </AuthLayout>
    );
  }

  // Step 1: the sign-in form.
  return (
    <AuthLayout
      title="Welcome back"
      intro="Sign in to pick up where you left off: your recipes, your allergies and your nutrition."
      image={img('harvest-bowl.jpg')}
      imageAlt="A colorful bowl of chickpeas, avocado, sweet potato and tomatoes from above"
      note="your kitchen missed you"
    >
      {/* Success notice (e.g. after a password reset) or the server's error. */}
      {state?.notice && !formError && <p className="form-notice" role="status">{state.notice}</p>}
      {formError && <p className="error-summary" role="alert">{formError}</p>}
      <form className="auth-form" onSubmit={onSubmit} noValidate>
        <div className="field">
          <label htmlFor="login-email" className="field-label">Email address</label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={errors.email ? 'login-email-error' : undefined}
          />
          {errors.email && <p id="login-email-error" className="field-error">{errors.email}</p>}
        </div>
        <PasswordField
          id="login-password"
          label="Password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
        />
        <div className="login-row">
          <label className="check-row">
            <input type="checkbox" checked={keep} onChange={(e) => setKeep(e.target.checked)} />
            <span>Keep me signed in on this device</span>
          </label>
          <Link to="/forgot-password" state={{ email }} className="inline-link">Forgot password?</Link>
        </div>
        <p className="field-hint keep-hint">
          With this on, you won&apos;t need an email code here for 30 days. Don&apos;t use it on shared computers.
        </p>
        <button className="btn btn-primary btn-lg btn-block" type="submit" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
        <p className="auth-switch">
          New to NutriChef AI? <Link to="/signup">Create a free account</Link>
        </p>
      </form>
    </AuthLayout>
  );
}
