import { useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Check } from '@phosphor-icons/react';
import AuthLayout from '../components/AuthLayout.jsx';
import PasswordField from '../components/PasswordField.jsx';
import { img } from '../img.js';

const DIETS = ['Vegetarian', 'Vegan', 'Pescatarian', 'Gluten-free', 'High protein', 'No restrictions'];

function validate(v) {
  const errors = {};
  if (!v.name.trim()) errors.name = 'Enter your first name so we know what to call you.';
  if (!/^\S+@\S+\.\S+$/.test(v.email)) errors.email = 'Enter an email address like name@example.com.';
  if (v.password.length < 8) errors.password = 'Use at least 8 characters for your password.';
  if (!v.terms) errors.terms = 'Accept the terms to create your account.';
  return errors;
}

export default function SignUp() {
  const { state } = useLocation();
  const [values, setValues] = useState({
    name: '',
    email: state?.email ?? '',
    password: '',
    diets: [],
    terms: false,
  });
  const [touched, setTouched] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [status, setStatus] = useState('idle'); // idle | saving | done
  const summaryRef = useRef(null);

  const errors = validate(values);
  const show = (k) => (submitted || touched[k]) && errors[k];

  const set = (k) => (e) =>
    setValues((v) => ({ ...v, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const blur = (k) => () => setTouched((t) => ({ ...t, [k]: true }));

  function toggleDiet(d) {
    setValues((v) => ({
      ...v,
      diets: v.diets.includes(d) ? v.diets.filter((x) => x !== d) : [...v.diets, d],
    }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setSubmitted(true);
    if (Object.keys(errors).length) {
      requestAnimationFrame(() => summaryRef.current?.focus());
      return;
    }
    setStatus('saving');
    // TODO: replace with a call to the real sign-up API.
    await new Promise((r) => setTimeout(r, 900));
    setStatus('done');
  }

  if (status === 'done') {
    return (
      <AuthLayout
        title={`Welcome to the kitchen, ${values.name.trim()}.`}
        intro={`We've sent a confirmation link to ${values.email}. Open it to start your first recipe.`}
        image={img('kitchen-tablet.jpg')}
        imageAlt="A tablet showing a recipe on a kitchen counter next to limes and a wooden spoon"
        note="first recipe: on us"
      >
        <div className="auth-done" role="status">
          <Check size={22} weight="bold" aria-hidden /> Account created
        </div>
        <Link to="/how-it-works" className="btn btn-ghost">
          Take the tour while you wait
        </Link>
      </AuthLayout>
    );
  }

  const errorList = Object.entries(errors);

  return (
    <AuthLayout
      title="Create your free account"
      intro="Tell us a little about how you eat and your first recipe will be ready in under a minute."
      image={img('kitchen-tablet.jpg')}
      imageAlt="A tablet showing a recipe on a kitchen counter next to limes and a wooden spoon"
      note="dinner, sorted"
    >
      {submitted && errorList.length > 0 && (
        <div className="error-summary" tabIndex={-1} ref={summaryRef} role="alert">
          <p>Fix {errorList.length === 1 ? 'this' : 'these'} to continue:</p>
          <ul>
            {errorList.map(([k, msg]) => (
              <li key={k}>
                <a href={`#su-${k}`}>{msg}</a>
              </li>
            ))}
          </ul>
        </div>
      )}

      <form className="auth-form" onSubmit={onSubmit} noValidate>
        <div className="field">
          <label htmlFor="su-name" className="field-label">First name</label>
          <input
            id="su-name"
            autoComplete="given-name"
            value={values.name}
            onChange={set('name')}
            onBlur={blur('name')}
            aria-invalid={show('name') ? true : undefined}
            aria-describedby={show('name') ? 'su-name-error' : undefined}
          />
          {show('name') && <p id="su-name-error" className="field-error">{errors.name}</p>}
        </div>

        <div className="field">
          <label htmlFor="su-email" className="field-label">Email address</label>
          <input
            id="su-email"
            type="email"
            autoComplete="email"
            value={values.email}
            onChange={set('email')}
            onBlur={blur('email')}
            aria-invalid={show('email') ? true : undefined}
            aria-describedby={show('email') ? 'su-email-error' : undefined}
          />
          {show('email') && <p id="su-email-error" className="field-error">{errors.email}</p>}
        </div>

        <PasswordField
          id="su-password"
          label="Password"
          autoComplete="new-password"
          value={values.password}
          onChange={set('password')}
          onBlur={blur('password')}
          hint="At least 8 characters."
          error={show('password') ? errors.password : undefined}
        />

        <fieldset className="field diet-field">
          <legend className="field-label">
            How do you eat? <span className="field-optional">Optional, change it any time</span>
          </legend>
          <div className="chip-list">
            {DIETS.map((d) => {
              const on = values.diets.includes(d);
              return (
                <label key={d} className={`chip chip-check${on ? ' chip-on' : ''}`}>
                  <input type="checkbox" checked={on} onChange={() => toggleDiet(d)} />
                  {on && <Check size={14} weight="bold" aria-hidden />}
                  {d}
                </label>
              );
            })}
          </div>
        </fieldset>

        <div className="field">
          <label className="check-row" htmlFor="su-terms">
            <input
              id="su-terms"
              type="checkbox"
              checked={values.terms}
              onChange={set('terms')}
              aria-invalid={show('terms') ? true : undefined}
              aria-describedby={show('terms') ? 'su-terms-error' : undefined}
            />
            <span>I agree to the Terms of Service and Privacy Policy.</span>
          </label>
          {show('terms') && <p id="su-terms-error" className="field-error">{errors.terms}</p>}
        </div>

        <button className="btn btn-primary btn-lg btn-block" type="submit" disabled={status === 'saving'}>
          {status === 'saving' ? 'Creating your account…' : 'Create free account'}
        </button>
        <p className="auth-switch">
          Already have an account? <Link to="/signin">Sign in</Link>
        </p>
      </form>
    </AuthLayout>
  );
}
