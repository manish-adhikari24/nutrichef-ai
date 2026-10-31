import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout.jsx';
import PasswordField from '../components/PasswordField.jsx';
import { img } from '../img.js';

export default function Login() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const [email, setEmail] = useState(state?.email ?? '');
  const [password, setPassword] = useState('');

  // TODO: check credentials with a real sign-in API. For now, any click opens the dashboard.
  function onSubmit(e) {
    e.preventDefault();
    navigate('/dashboard');
  }

  return (
    <AuthLayout
      title={state?.fromSignup ? 'One more step: log in' : 'Welcome back'}
      intro="Log in to pick up where you left off: your pantry, your meal plan and your nutrition."
      image={img('harvest-bowl.jpg')}
      imageAlt="A colorful bowl of chickpeas, avocado, sweet potato and tomatoes from above"
      note="your pantry missed you"
    >
      <form className="auth-form" onSubmit={onSubmit} noValidate>
        <div className="field">
          <label htmlFor="login-email" className="field-label">Email address</label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <PasswordField
          id="login-password"
          label="Password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button className="btn btn-primary btn-lg btn-block" type="submit">
          Log in
        </button>
        <p className="auth-switch">
          New to NutriChef AI? <Link to="/signup">Create a free account</Link>
        </p>
      </form>
    </AuthLayout>
  );
}
