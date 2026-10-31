import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout.jsx';
import PasswordField from '../components/PasswordField.jsx';
import { isSignedIn, login } from '../lib/api.js';
import { img } from '../img.js';

export default function Login() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');

  if (isSignedIn()) return <Navigate to={state?.from ?? '/dashboard'} replace />;

  function onSubmit(e) {
    e.preventDefault();
    const found = {};
    if (!email.trim()) found.email = 'Enter your email address.';
    if (!password) found.password = 'Enter your password.';
    setErrors(found);
    setFormError('');
    if (Object.keys(found).length) return;
    const result = login(email);
    if (!result.ok) {
      setFormError(result.error);
      return;
    }
    navigate(state?.from ?? '/dashboard');
  }

  return (
    <AuthLayout
      title="Welcome back"
      intro="Sign in to pick up where you left off: your recipes, your allergies and your nutrition."
      image={img('harvest-bowl.jpg')}
      imageAlt="A colorful bowl of chickpeas, avocado, sweet potato and tomatoes from above"
      note="your kitchen missed you"
    >
      <p className="demo-note">
        Prototype: accounts are kept in this browser until the backend is connected, so
        passwords aren&apos;t checked yet.
      </p>
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
        <button className="btn btn-primary btn-lg btn-block" type="submit">Sign in</button>
        <p className="auth-switch">
          New to NutriChef AI? <Link to="/signup">Create a free account</Link>
        </p>
      </form>
    </AuthLayout>
  );
}
