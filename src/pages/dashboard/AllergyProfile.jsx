import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Check, Plus, X } from '@phosphor-icons/react';
import { ALLERGENS } from '../../lib/allergens.js';
import { saveProfile } from '../../lib/api.js';

export default function AllergyProfile() {
  const { profile, setProfile } = useOutletContext();
  const [typed, setTyped] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');

  const others = profile.otherAllergies.split(',').map((a) => a.trim()).filter(Boolean);

  function update(changes, message) {
    const next = { ...profile, ...changes };
    if (saveProfile(next)) {
      setProfile(next);
      setStatus(message);
    } else {
      setStatus('Your browser blocked saving. Check its storage settings and try again.');
    }
  }

  function toggle(allergen) {
    const on = profile.allergies.includes(allergen);
    update(
      { allergies: on ? profile.allergies.filter((a) => a !== allergen) : [...profile.allergies, allergen] },
      `${allergen} ${on ? 'removed' : 'added'}.`
    );
  }

  function addOther(e) {
    e.preventDefault();
    const name = typed.trim();
    if (!name) {
      setError('Enter an allergen name to add it.');
      return;
    }
    setError('');
    setTyped('');
    if (!others.some((o) => o.toLowerCase() === name.toLowerCase())) {
      update({ otherAllergies: [...others, name].join(', ') }, `${name} added.`);
    }
  }

  return (
    <>
      <h1 className="dash-title">Allergy profile</h1>
      <p className="lede generate-lede">
        We check every ingredient and recipe against this list, and block any recipe that contains one of them.
      </p>

      <section aria-labelledby="common-title" className="profile-section">
        <h2 id="common-title" className="dash-h2">Common allergens</h2>
        <div className="chip-list" role="group" aria-labelledby="common-title">
          {ALLERGENS.map((allergen) => {
            const on = profile.allergies.includes(allergen);
            return (
              <button key={allergen} type="button" className={`chip chip-btn${on ? ' chip-on' : ''}`} aria-pressed={on} onClick={() => toggle(allergen)}>
                {on && <Check size={14} weight="bold" aria-hidden />}
                {allergen}
              </button>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="other-title" className="profile-section">
        <h2 id="other-title" className="dash-h2">Other allergies</h2>
        <form className="dash-add" onSubmit={addOther} noValidate>
          <div className="dash-add-name">
            <label htmlFor="other-allergy" className="field-label">Allergen</label>
            <input
              id="other-allergy"
              type="text"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? 'other-allergy-error' : undefined}
            />
          </div>
          <button type="submit" className="btn btn-primary dash-add-btn"><Plus size={18} aria-hidden /> Add</button>
          {error && <p id="other-allergy-error" className="field-error dash-add-error">{error}</p>}
        </form>
        {others.length > 0 && (
          <ul className="added-list">
            {others.map((name) => (
              <li key={name}>
                <span>{name}</span>
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => update({ otherAllergies: others.filter((o) => o !== name).join(', ') }, `${name} removed.`)}
                  aria-label={`Remove ${name}`}
                >
                  <X size={18} aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p role="status" className="profile-status">{status}</p>
      <p className="recipe-disclaimer">
        We can&apos;t detect cross-contamination or know what&apos;s in a specific product. Always check labels yourself.
      </p>
    </>
  );
}
