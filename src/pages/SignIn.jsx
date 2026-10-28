import { useState } from 'react';
import { Link } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout.jsx';
import PasswordField from '../components/PasswordField.jsx';
import { img } from '../img.js';

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState('idle'); // idle | saving | reset
  const [resetSent, setResetSent] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email) || !password) {
      setError('Enter the email and password you signed up with.');
      return;
    }
    setError('');
    setStatus('saving');
    // TODO: replace with a call to the real sign-in API and redirect into the app.
    await new Promise((r) => setTimeout(r, 900));
    setStatus('idle');
  }

  function sendReset() {
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError('Enter your email address first, then choose "Forgot password?" again.');
      return;
    }
    setError('');
    // TODO: call the password reset endpoint.
    setResetSent(true);
  }

  return (
    <AuthLayout
      title="Welcome back"
      intro="Sign in to pick up where you left off: your pantry, your plan and your recipe journal."
      image={img('harvest-bowl.jpg')}
      imageAlt="A colorful bowl of chickpeas, avocado, sweet potato and tomatoes from above"
      note="your pantry missed you"
    >
      <form className="auth-form" onSubmit={onSubmit} noValidate>
        <div className="field">
          <label htmlFor="si-email" className="field-label">Email address</label>
          <input
            id="si-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-describedby={error ? 'si-error' : undefined}
          />
        </div>
        <PasswordField
          id="si-password"
          label="Password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <div className="auth-row">
          <label className="check-row">
            <input type="checkbox" defaultChecked /> <span>Keep me signed in</span>
          </label>
          <button type="button" className="link-btn" onClick={sendReset}>
            Forgot password?
          </button>
        </div>

        {error && (
          <p id="si-error" className="field-error" role="alert">
            {error}
          </p>
        )}
        {resetSent && (
          <p className="field-success" role="status">
            Reset link sent to {email}. It expires in 30 minutes.
          </p>
        )}

        <button className="btn btn-primary btn-lg btn-block" type="submit" disabled={status === 'saving'}>
          {status === 'saving' ? 'Signing in…' : 'Sign in'}
        </button>
        <p className="auth-switch">
          New to NutriChef AI? <Link to="/signup">Create a free account</Link>
        </p>
      </form>
    </AuthLayout>
  );
}
