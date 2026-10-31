import { useState } from 'react';
import { Link, useLocation, useNavigate, useOutletContext } from 'react-router-dom';
import { allAllergies, EMPTY_HEALTH, saveProfile } from '../../lib/api.js';
import { ACTIVITY, bmi, bmiCategory, GOALS, suggestTargets } from '../../lib/nutrition.js';

const DIETS = ['No specific diet', 'Vegetarian', 'Vegan', 'Pescatarian', 'Halal', 'Kosher', 'Low carb'];
const MACROS = [
  { key: 'proteinPct', label: 'Protein' },
  { key: 'carbsPct', label: 'Carbs' },
  { key: 'fatPct', label: 'Fat' },
];

function Field({ id, label, hint, error, children }) {
  return (
    <div className="field">
      <label htmlFor={id} className="field-label">{label}</label>
      {children}
      {hint && <p className="field-hint">{hint}</p>}
      {error && <p id={`${id}-error`} className="field-error">{error}</p>}
    </div>
  );
}

function validate(p) {
  const errors = {};
  const inRange = (value, min, max) => value === '' || (Number(value) >= min && Number(value) <= max);
  if (!p.firstName.trim()) errors.firstName = 'Enter your first name.';
  if (!p.lastName.trim()) errors.lastName = 'Enter your last name.';
  if (!inRange(p.age, 13, 120)) errors.age = 'Enter an age from 13 to 120.';
  if (!inRange(p.heightCm, 100, 250)) errors.heightCm = 'Enter a height from 100 to 250 cm.';
  if (!inRange(p.weightKg, 25, 350)) errors.weightKg = 'Enter a weight from 25 to 350 kg.';
  if (p.calorieTarget === '') errors.calorieTarget = 'Enter a daily calorie target, or use the suggested one.';
  else if (!inRange(p.calorieTarget, 1000, 6000)) errors.calorieTarget = 'Enter a calorie target from 1,000 to 6,000.';
  if (p.proteinPct + p.carbsPct + p.fatPct !== 100) errors.macros = 'Percentages must total 100%.';
  return errors;
}

export default function Profile() {
  const { profile, setProfile } = useOutletContext();
  const { state } = useLocation();
  const navigate = useNavigate();
  const [form, setForm] = useState(profile);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState('');

  const update = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    setStatus('');
  };
  const bind = (key) => ({
    value: form[key],
    onChange: (e) => update(key, e.target.value),
    'aria-invalid': errors[key] ? true : undefined,
    'aria-describedby': errors[key] ? `p-${key}-error` : undefined,
  });

  const suggested = suggestTargets(form);
  const macroTotal = form.proteinPct + form.carbsPct + form.fatPct;
  const allergies = allAllergies(form);
  const under18 = Number(form.age) > 0 && Number(form.age) < 18;
  const bmiValue = bmi(form);

  function applySuggested() {
    if (!suggested) return;
    const { calorieTarget, proteinPct, carbsPct, fatPct } = suggested;
    setForm((f) => ({ ...f, calorieTarget, proteinPct, carbsPct, fatPct }));
    setErrors((e) => ({ ...e, calorieTarget: undefined, macros: undefined }));
    setStatus('');
  }

  async function save(e) {
    e.preventDefault();
    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length) {
      setStatus('Fix the highlighted details to save your profile.');
      return;
    }
    try {
      const saved = await saveProfile(form);
      setProfile(saved);
      setForm(saved);
      if (state?.setup) {
        navigate('/dashboard');
        return;
      }
      setStatus('Profile saved.');
    } catch (error) {
      setErrors(error.fields ?? {});
      setStatus(error.message);
    }
  }

  async function removeHealthDetails() {
    try {
      const saved = await saveProfile({ ...form, ...EMPTY_HEALTH });
      setForm(saved);
      setProfile(saved);
      setErrors({});
      setStatus('Health details removed.');
    } catch (error) {
      setStatus(error.message);
    }
  }

  return (
    <>
      <h1 className="dash-title">{state?.setup ? 'Set up your profile' : 'Your profile'}</h1>
      <p className="lede profile-lede">
        NutriChef AI uses these details to set your targets and write recipes that suit you.
        We only ask for what we need for meal planning.
      </p>

      <form className="profile-form" onSubmit={save} noValidate>
        <section className="profile-section" aria-labelledby="p-about">
          <h2 id="p-about" className="dash-h2">About you</h2>
          <div className="profile-grid">
            <Field id="p-firstName" label="First name" error={errors.firstName}>
              <input id="p-firstName" type="text" autoComplete="given-name" {...bind('firstName')} />
            </Field>
            <Field id="p-lastName" label="Last name" error={errors.lastName}>
              <input id="p-lastName" type="text" autoComplete="family-name" {...bind('lastName')} />
            </Field>
          </div>
        </section>

        <section className="profile-section" aria-labelledby="p-body">
          <h2 id="p-body" className="dash-h2">Body and activity</h2>
          <div className="profile-grid">
            <Field id="p-age" label="Age" error={errors.age}>
              <input id="p-age" type="number" inputMode="numeric" {...bind('age')} />
            </Field>
            <Field id="p-sex" label="Sex" hint="Used only in the calorie estimate.">
              <select id="p-sex" {...bind('sex')}>
                <option value="">Select</option>
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="other">Prefer not to say</option>
              </select>
            </Field>
            <Field id="p-heightCm" label="Height (cm)" error={errors.heightCm}>
              <input id="p-heightCm" type="number" inputMode="decimal" {...bind('heightCm')} />
            </Field>
            <Field id="p-weightKg" label="Weight (kg)" error={errors.weightKg}>
              <input id="p-weightKg" type="number" inputMode="decimal" {...bind('weightKg')} />
            </Field>
            <Field id="p-activity" label="Activity level">
              <select id="p-activity" {...bind('activity')}>
                {ACTIVITY.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
              </select>
            </Field>
            <Field id="p-goal" label="Fitness goal">
              <select id="p-goal" {...bind('goal')}>
                {GOALS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
              </select>
            </Field>
          </div>
          {bmiValue && (
            <p className="field-hint">BMI {bmiValue.toFixed(1)}, category: {bmiCategory(form)}. BMI is a general guide and doesn&apos;t reflect your whole health.</p>
          )}
          {under18 && (
            <div className="care-note profile-care" role="note">
              <p><b>Please check with a doctor or dietitian.</b> General targets may not suit people under 18, so we won&apos;t suggest a calorie deficit.</p>
            </div>
          )}
        </section>

        <section className="profile-section" aria-labelledby="p-targets">
          <h2 id="p-targets" className="dash-h2">Nutrition goals</h2>
          <div className="suggest-row">
            {suggested ? (
              <>
                <p>
                  Suggested: <b>{suggested.calorieTarget.toLocaleString('en-US')} kcal a day</b>, an estimate from the
                  Mifflin-St Jeor formula, your activity and your goal.
                </p>
                <button type="button" className="btn btn-ghost btn-sm" onClick={applySuggested}>Use suggested targets</button>
              </>
            ) : (
              <p className="field-hint">Add your age, sex, height and weight to get suggested targets.</p>
            )}
          </div>

          <Field id="p-calorieTarget" label="Daily calorie target (kcal)" error={errors.calorieTarget}>
            <input id="p-calorieTarget" type="number" inputMode="numeric" {...bind('calorieTarget')} />
          </Field>

          <fieldset className="field macro-field">
            <legend className="field-label">Macronutrient split</legend>
            {MACROS.map(({ key, label }) => (
              <div key={key} className="macro-row">
                <label htmlFor={`p-${key}`}>{label}</label>
                <input
                  id={`p-${key}`}
                  type="range"
                  min="5"
                  max="80"
                  step="1"
                  value={form[key]}
                  onChange={(e) => update(key, Number(e.target.value))}
                />
                <output htmlFor={`p-${key}`}>{form[key]}%</output>
              </div>
            ))}
            <p className={macroTotal === 100 ? 'field-hint' : 'field-error'} role="status">
              Total: {macroTotal}%{macroTotal !== 100 && '. Percentages must total 100%.'}
            </p>
          </fieldset>
        </section>

        <section className="profile-section" aria-labelledby="p-food">
          <h2 id="p-food" className="dash-h2">Food preferences</h2>
          <Field id="p-diet" label="Dietary preference">
            <select id="p-diet" {...bind('diet')}>
              {DIETS.map((d) => <option key={d}>{d}</option>)}
            </select>
          </Field>
          <Field id="p-dislikes" label="Foods you dislike">
            <input id="p-dislikes" type="text" {...bind('dislikes')} />
          </Field>
          <p className="allergy-summary">
            <b>Allergies:</b> {allergies.length ? allergies.join(', ') : 'None listed'}.{' '}
            <Link to="/dashboard/allergies" className="inline-link">Manage allergy profile</Link>
          </p>
        </section>

        <section className="profile-section" aria-labelledby="p-consent">
          <h2 id="p-consent" className="dash-h2">Your consent</h2>
          <label className="check-row consent-row">
            <input type="checkbox" checked={form.healthConsent} onChange={(e) => update('healthConsent', e.target.checked)} />
            <span>
              Use my diet, allergies, dislikes and targets to personalise AI recipes. I understand
              these are sent to NutriChef AI&apos;s AI provider, Anthropic, which may process them
              outside Australia.
            </span>
          </label>
          <p className="field-hint">
            Without this, the AI only receives your ingredients and filters. Your allergies are still checked in the app.
          </p>
        </section>

        <div className="profile-actions">
          <button type="submit" className="btn btn-primary btn-lg">
            {state?.setup ? 'Save and go to dashboard' : 'Save profile'}
          </button>
          <button type="button" className="link-btn" onClick={removeHealthDetails}>Remove my health details</button>
          <span role="status" className="profile-status">{status}</span>
        </div>
      </form>
    </>
  );
}
