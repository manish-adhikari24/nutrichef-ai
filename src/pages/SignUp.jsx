import { useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout.jsx';
import PasswordField from '../components/PasswordField.jsx';
import TermsDialog from '../components/TermsDialog.jsx';
import { register } from '../lib/api.js';
import { img } from '../img.js';

function passwordStrength(password) {
  if (!password) return null;
  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^a-zA-Z0-9]/.test(password)) score += 1;
  if (score <= 1) return { level: 1, label: 'Weak: use at least 8 characters' };
  if (score <= 3) return { level: 2, label: 'Good: add symbols or length to make it stronger' };
  return { level: 3, label: 'Strong' };
}

function validate(v) {
  const errors = {};
  if (!v.firstName.trim()) errors.firstName = 'Enter your first name.';
  if (!v.lastName.trim()) errors.lastName = 'Enter your last name.';
  if (!/^\S+@\S+\.\S+$/.test(v.email.trim())) errors.email = 'Enter a valid email address.';
  if (v.password.length < 8) errors.password = 'Use at least 8 characters.';
  if (v.confirm !== v.password || !v.confirm) errors.confirm = 'Passwords do not match.';
  if (!v.terms) errors.terms = 'Accept the Terms and Conditions to create your account.';
  return errors;
}

export default function SignUp() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const [values, setValues] = useState({
    firstName: '',
    lastName: '',
    email: state?.email ?? '',
    password: '',
    confirm: '',
    terms: false,
  });
  const [touched, setTouched] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState('');
  const [busy, setBusy] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  const summaryRef = useRef(null);

  const errors = validate(values);
  const show = (key) => (submitted || touched[key] ? errors[key] : undefined);
  const set = (key) => (e) => {
    setServerError('');
    setValues((v) => ({ ...v, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  };
  const blur = (key) => () => setTouched((t) => ({ ...t, [key]: true }));
  const strength = passwordStrength(values.password);

  async function onSubmit(e) {
    e.preventDefault();
    setSubmitted(true);
    if (Object.keys(errors).length) {
      requestAnimationFrame(() => summaryRef.current?.focus());
      return;
    }
    setBusy(true);
    try {
      await register(values);
      navigate('/dashboard/profile', { state: { setup: true } });
    } catch (error) {
      setServerError(error.message);
      setBusy(false);
    }
  }

  const field = (key, label, autoComplete, type = 'text') => (
    <div className="field">
      <label htmlFor={`su-${key}`} className="field-label">{label}</label>
      <input
        id={`su-${key}`}
        type={type}
        autoComplete={autoComplete}
        value={values[key]}
        onChange={set(key)}
        onBlur={blur(key)}
        aria-invalid={show(key) ? true : undefined}
        aria-describedby={show(key) ? `su-${key}-error` : undefined}
      />
      {show(key) && <p id={`su-${key}-error`} className="field-error">{show(key)}</p>}
    </div>
  );

  const errorList = Object.entries(errors);

  return (
    <AuthLayout
      title="Create your account"
      intro="Start generating personalised AI recipes today. No credit card required."
      image={img('kitchen-tablet.jpg')}
      imageAlt="A tablet showing a recipe on a kitchen counter next to limes and a wooden spoon"
      note="dinner, sorted"
    >
      {submitted && errorList.length > 0 && (
        <div className="error-summary" tabIndex={-1} ref={summaryRef} role="alert">
          <p>Fix {errorList.length === 1 ? 'this' : 'these'} to continue:</p>
          <ul>
            {errorList.map(([key, message]) => (
              <li key={key}><a href={`#su-${key}`}>{message}</a></li>
            ))}
          </ul>
        </div>
      )}
      {serverError && (
        <p className="error-summary" role="alert">
          {serverError}{' '}
          {serverError.includes('already registered') && <Link to="/login">Sign in</Link>}
        </p>
      )}

      <form className="auth-form" onSubmit={onSubmit} noValidate>
        <div className="name-row">
          {field('firstName', 'First name', 'given-name')}
          {field('lastName', 'Last name', 'family-name')}
        </div>
        {field('email', 'Email address', 'email', 'email')}

        <PasswordField
          id="su-password"
          label="Password"
          autoComplete="new-password"
          value={values.password}
          onChange={set('password')}
          onBlur={blur('password')}
          error={show('password')}
        />
        {strength && (
          <div className="strength" data-level={strength.level}>
            <span className="strength-bar" aria-hidden="true"><i /><i /><i /></span>
            <span className="field-hint" role="status">Strength: {strength.label}</span>
          </div>
        )}
        <PasswordField
          id="su-confirm"
          label="Confirm password"
          autoComplete="new-password"
          value={values.confirm}
          onChange={set('confirm')}
          onBlur={blur('confirm')}
          error={show('confirm')}
        />

        <div className="field">
          <div className="check-row consent-row">
            <input
              id="su-terms"
              type="checkbox"
              checked={values.terms}
              onChange={set('terms')}
              aria-invalid={show('terms') ? true : undefined}
              aria-describedby={show('terms') ? 'su-terms-error' : undefined}
            />
            <span>
              <label htmlFor="su-terms">I agree to the </label>
              <button type="button" className="link-btn" onClick={() => setTermsOpen(true)}>
                Terms and Conditions
              </button>
              <label htmlFor="su-terms">. I understand supplement suggestions are informational only.</label>
            </span>
          </div>
          {show('terms') && <p id="su-terms-error" className="field-error">{show('terms')}</p>}
        </div>

        <button className="btn btn-primary btn-lg btn-block" type="submit" disabled={busy}>
          {busy ? 'Creating your account…' : 'Create account and start cooking'}
        </button>
        <p className="auth-switch">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </form>

      <TermsDialog
        open={termsOpen}
        onClose={() => setTermsOpen(false)}
        onAgree={() => {
          setValues((v) => ({ ...v, terms: true }));
          setTermsOpen(false);
        }}
      />
    </AuthLayout>
  );
}
