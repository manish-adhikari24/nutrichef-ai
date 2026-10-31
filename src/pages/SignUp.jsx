import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Check } from '@phosphor-icons/react';
import AuthLayout from '../components/AuthLayout.jsx';
import PasswordField from '../components/PasswordField.jsx';
import TermsDialog from '../components/TermsDialog.jsx';
import { loadProfile, saveProfile } from '../data/profile.js';
import { img } from '../img.js';

const DIETS = ['Vegetarian', 'Vegan', 'Pescatarian', 'Gluten-free', 'High protein', 'No restrictions'];

export default function SignUp() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const [values, setValues] = useState({
    firstName: '',
    lastName: '',
    email: state?.email ?? '',
    password: '',
    diets: [],
    terms: false,
  });
  const [termsOpen, setTermsOpen] = useState(false);

  const set = (k) => (e) =>
    setValues((v) => ({ ...v, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  function toggleDiet(d) {
    setValues((v) => ({
      ...v,
      diets: v.diets.includes(d) ? v.diets.filter((x) => x !== d) : [...v.diets, d],
    }));
  }

  // TODO: create the account with a real sign-up API. For now, any click moves on to login.
  function onSubmit(e) {
    e.preventDefault();
    saveProfile({ ...loadProfile(), firstName: values.firstName.trim(), lastName: values.lastName.trim() });
    navigate('/login', { state: { fromSignup: true, email: values.email } });
  }

  return (
    <AuthLayout
      title="Create your free account"
      intro="Tell us a little about how you eat and we'll shape your pantry and meal plan around it."
      image={img('kitchen-tablet.jpg')}
      imageAlt="A tablet showing a recipe on a kitchen counter next to limes and a wooden spoon"
      note="dinner, sorted"
    >
      <form className="auth-form" onSubmit={onSubmit} noValidate>
        <div className="name-row">
          <div className="field">
            <label htmlFor="su-first" className="field-label">First name</label>
            <input id="su-first" autoComplete="given-name" value={values.firstName} onChange={set('firstName')} />
          </div>
          <div className="field">
            <label htmlFor="su-last" className="field-label">Last name</label>
            <input id="su-last" autoComplete="family-name" value={values.lastName} onChange={set('lastName')} />
          </div>
        </div>

        <div className="field">
          <label htmlFor="su-email" className="field-label">Email address</label>
          <input
            id="su-email"
            type="email"
            autoComplete="email"
            value={values.email}
            onChange={set('email')}
          />
        </div>

        <PasswordField
          id="su-password"
          label="Password"
          autoComplete="new-password"
          value={values.password}
          onChange={set('password')}
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
          <div className="check-row">
            <input id="su-terms" type="checkbox" checked={values.terms} onChange={set('terms')} />
            <span>
              <label htmlFor="su-terms">I agree to the </label>
              <button type="button" className="link-btn" onClick={() => setTermsOpen(true)}>
                Terms and Conditions
              </button>
            </span>
          </div>
        </div>

        <button className="btn btn-primary btn-lg btn-block" type="submit">
          Create free account
        </button>
        <p className="auth-switch">
          Already have an account? <Link to="/login">Log in</Link>
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
