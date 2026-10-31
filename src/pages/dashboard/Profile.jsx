import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Check } from '@phosphor-icons/react';
import {
  ACTIVITY,
  ALLERGENS,
  CONDITIONS,
  DIETS,
  EMPTY_PROFILE,
  GOALS_LIST,
  calculateTargets,
  needsCare,
  saveProfile,
} from '../../data/profile.js';

const TARGET_FIELDS = [
  { key: 'kcal', label: 'Calories', unit: 'kcal' },
  { key: 'protein', label: 'Protein', unit: 'g' },
  { key: 'carbs', label: 'Carbs', unit: 'g' },
  { key: 'fat', label: 'Fat', unit: 'g' },
  { key: 'fiber', label: 'Fiber', unit: 'g' },
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

function ChipGroup({ legend, hint, options, selected, onToggle }) {
  return (
    <fieldset className="field diet-field">
      <legend className="field-label">{legend}</legend>
      {hint && <p className="field-hint chip-hint">{hint}</p>}
      <div className="chip-list">
        {options.map((option) => {
          const on = selected.includes(option);
          return (
            <label key={option} className={`chip chip-check${on ? ' chip-on' : ''}`}>
              <input type="checkbox" checked={on} onChange={() => onToggle(option)} />
              {on && <Check size={14} weight="bold" aria-hidden />}
              {option}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

function validate(p) {
  const errors = {};
  const inRange = (value, min, max) => value === '' || (Number(value) >= min && Number(value) <= max);
  if (!inRange(p.age, 13, 120)) errors.age = 'Enter an age from 13 to 120.';
  if (!inRange(p.heightCm, 100, 250)) errors.heightCm = 'Enter a height from 100 to 250 cm.';
  if (!inRange(p.weightKg, 25, 350)) errors.weightKg = 'Enter a weight from 25 to 350 kg.';
  return errors;
}

export default function Profile() {
  const { profile, setProfile } = useOutletContext();
  const [form, setForm] = useState(profile);
  const [status, setStatus] = useState('');
  const [errors, setErrors] = useState({});

  const update = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    setStatus('');
  };
  const bind = (key) => ({
    value: form[key],
    onChange: (e) => update(key, e.target.value),
  });
  const toggle = (key) => (option) =>
    update(key, form[key].includes(option) ? form[key].filter((x) => x !== option) : [...form[key], option]);

  const calculated = calculateTargets(form);
  const care = needsCare(form);

  function save(e) {
    e.preventDefault();
    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length) {
      setStatus('Fix the highlighted details to save your profile.');
      return;
    }
    const saved = saveProfile(form);
    if (saved) setProfile(form);
    setStatus(saved ? 'Profile saved.' : 'Your browser blocked saving. Check its storage settings and try again.');
  }

  function clearHealth() {
    const cleared = {
      ...EMPTY_PROFILE,
      firstName: form.firstName,
      lastName: form.lastName,
    };
    setForm(cleared);
    setProfile(cleared);
    saveProfile(cleared);
    setErrors({});
    setStatus('Health details removed.');
  }

  function changeCustomTargets(on) {
    setForm((f) => ({
      ...f,
      customTargets: on,
      targets: on && calculated
        ? Object.fromEntries(TARGET_FIELDS.map(({ key }) => [key, String(calculated[key])]))
        : f.targets,
    }));
    setStatus('');
  }

  const customKcal = Number(form.targets.kcal);
  const lowCustom = form.customTargets && customKcal > 0 && customKcal < 1200;

  return (
    <>
      <h1 className="dash-title">Your profile</h1>
      <p className="lede profile-lede">
        NutriChef AI uses these details to set your daily targets and write recipes that suit you.
        They&apos;re saved only in this browser for now.
      </p>

      <form className="profile-form" onSubmit={save} noValidate>
        <section className="profile-section" aria-labelledby="p-about">
          <h2 id="p-about" className="dash-h2">About you</h2>
          <div className="profile-grid">
            <Field id="p-first" label="First name">
              <input id="p-first" type="text" autoComplete="given-name" {...bind('firstName')} />
            </Field>
            <Field id="p-last" label="Last name">
              <input id="p-last" type="text" autoComplete="family-name" {...bind('lastName')} />
            </Field>
          </div>
        </section>

        <section className="profile-section" aria-labelledby="p-body">
          <h2 id="p-body" className="dash-h2">Body and activity</h2>
          <div className="profile-grid">
            <Field id="p-age" label="Age" error={errors.age}>
              <input id="p-age" type="number" inputMode="numeric" {...bind('age')} aria-invalid={errors.age ? true : undefined} aria-describedby={errors.age ? 'p-age-error' : undefined} />
            </Field>
            <Field id="p-sex" label="Sex" hint="Used only in the calorie formula.">
              <select id="p-sex" {...bind('sex')}>
                <option value="">Select</option>
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="other">Prefer not to say</option>
              </select>
            </Field>
            <Field id="p-height" label="Height (cm)" error={errors.heightCm}>
              <input id="p-height" type="number" inputMode="decimal" {...bind('heightCm')} aria-invalid={errors.heightCm ? true : undefined} aria-describedby={errors.heightCm ? 'p-height-error' : undefined} />
            </Field>
            <Field id="p-weight" label="Weight (kg)" error={errors.weightKg}>
              <input id="p-weight" type="number" inputMode="decimal" {...bind('weightKg')} aria-invalid={errors.weightKg ? true : undefined} aria-describedby={errors.weightKg ? 'p-weight-error' : undefined} />
            </Field>
            <Field id="p-activity" label="Activity level">
              <select id="p-activity" {...bind('activity')}>
                {ACTIVITY.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
              </select>
            </Field>
            <Field id="p-goal" label="Goal">
              <select id="p-goal" {...bind('goal')}>
                {GOALS_LIST.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
              </select>
            </Field>
          </div>
          <label className="check-row profile-check">
            <input type="checkbox" checked={form.pregnant} onChange={(e) => update('pregnant', e.target.checked)} />
            <span>I&apos;m pregnant or breastfeeding</span>
          </label>
        </section>

        <section className="profile-section" aria-labelledby="p-food">
          <h2 id="p-food" className="dash-h2">Food and health</h2>
          <Field id="p-diet" label="Diet">
            <select id="p-diet" {...bind('diet')}>
              {DIETS.map((d) => <option key={d}>{d}</option>)}
            </select>
          </Field>
          <ChipGroup
            legend="Allergies and intolerances"
            options={ALLERGENS}
            selected={form.allergies}
            onToggle={toggle('allergies')}
          />
          <Field id="p-other" label="Other allergies" hint="Separate them with commas.">
            <input id="p-other" type="text" {...bind('otherAllergies')} />
          </Field>
          <Field id="p-dislikes" label="Foods you dislike">
            <input id="p-dislikes" type="text" {...bind('dislikes')} />
          </Field>
          <ChipGroup
            legend="Health conditions"
            hint="Optional. These stay out of AI requests and only change the safety guidance here."
            options={CONDITIONS}
            selected={form.conditions}
            onToggle={toggle('conditions')}
          />
        </section>

        <section className="profile-section" aria-labelledby="p-targets">
          <h2 id="p-targets" className="dash-h2">Daily targets</h2>

          {care.length > 0 && (
            <div className="care-note" role="note">
              <p>
                <b>Please check with a doctor or dietitian.</b> Because {care.join(' and ')}, general
                targets may not suit you. We won&apos;t suggest a calorie deficit.
              </p>
            </div>
          )}

          {!form.customTargets && (
            calculated ? (
              <>
                <dl className="target-list">
                  {TARGET_FIELDS.map(({ key, label, unit }) => (
                    <div key={key}>
                      <dt>{label}</dt>
                      <dd>{calculated[key].toLocaleString('en-US')} <small>{unit}</small></dd>
                    </div>
                  ))}
                </dl>
                <p className="field-hint">
                  An estimate from the Mifflin-St Jeor formula, your activity and your goal.
                  {calculated.floorApplied && ` We've kept it at our ${calculated.floor.toLocaleString('en-US')} kcal minimum.`}
                </p>
              </>
            ) : (
              <p className="dash-empty">Add your age, sex, height and weight to see your targets.</p>
            )
          )}

          {form.customTargets && (
            <div className="profile-grid profile-grid-targets">
              {TARGET_FIELDS.map(({ key, label, unit }) => (
                <Field key={key} id={`t-${key}`} label={`${label} (${unit})`}>
                  <input
                    id={`t-${key}`}
                    type="number"
                    inputMode="numeric"
                    value={form.targets[key]}
                    onChange={(e) => update('targets', { ...form.targets, [key]: e.target.value })}
                  />
                </Field>
              ))}
            </div>
          )}
          {lowCustom && (
            <p className="care-text" role="note">
              Under 1,200 kcal a day is very low for most adults. Please check with a doctor or dietitian.
            </p>
          )}

          <label className="check-row profile-check">
            <input type="checkbox" checked={form.customTargets} onChange={(e) => changeCustomTargets(e.target.checked)} />
            <span>Set my own targets</span>
          </label>
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
            Without this, recipes use only your ingredients and won&apos;t account for your allergies.
          </p>
        </section>

        <div className="profile-actions">
          <button type="submit" className="btn btn-primary btn-lg">Save profile</button>
          <button type="button" className="link-btn" onClick={clearHealth}>Remove my health details</button>
          <span role="status" className="profile-status">{status}</span>
        </div>
      </form>
    </>
  );
}
