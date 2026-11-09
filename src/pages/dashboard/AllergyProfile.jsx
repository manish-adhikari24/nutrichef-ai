// Allergy Profile page: pick common allergens or add your own (FR-03, used by FR-06).
import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Check, Plus, X } from '@phosphor-icons/react';
import { ALLERGENS } from '../../lib/allergens.js';
import { saveProfile } from '../../lib/api.js';

export default function AllergyProfile() {
  const { profile, setProfile } = useOutletContext();
  // The custom allergy being typed, its error, and the save message.
  const [typed, setTyped] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');

  // Custom allergies are stored as one comma-separated string. Split it into a list.
  const others = profile.otherAllergies.split(',').map((a) => a.trim()).filter(Boolean);

  // Save a change to the profile and show a message (screen readers announce it too).
  async function update(changes, message) {
    try {
      setProfile(await saveProfile({ ...profile, ...changes }));
      setStatus(message);
    } catch (error) {
      setStatus(error.message);
    }
  }

  // Add or remove one common allergen.
  function toggle(allergen) {
    const on = profile.allergies.includes(allergen);
    update(
      { allergies: on ? profile.allergies.filter((a) => a !== allergen) : [...profile.allergies, allergen] },
      `${allergen} ${on ? 'removed' : 'added'}.`
    );
  }

  // Add a typed allergy, unless it's blank or already listed (ignoring capitals).
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

      {/* One toggle button per common allergen. */}
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

      {/* Custom allergies: add form and a list with remove buttons. */}
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
