// Generate Recipe page: add ingredients and choose filters (FR-04, FR-09).
// Generate opens the recipe page, which shows progress and then the recipe with its chat.
import { useState } from 'react';
import { Link, useNavigate, useOutletContext } from 'react-router-dom';
import { Sparkle, Warning, X } from '@phosphor-icons/react';
import IngredientSearch from '../../components/IngredientSearch.jsx';
import { allAllergies, generateRecipe } from '../../lib/api.js';
import { findAllergens } from '../../lib/allergens.js';
import { normalizeList } from '../../lib/ingredients.js';
import { dailyTargets } from '../../lib/nutrition.js';

// The filter drop-downs (FR-09). Their options are the seeded choices from the database.
// Each option is { value, label }. Meal types are plain names, so they're turned into the same shape.
export function filterList(reference) {
  const named = (names) => names.map((name) => ({ value: name, label: name }));
  return [
    { key: 'meal', label: 'Meal type', options: named(reference.mealTypes) },
    { key: 'cuisine', label: 'Cuisine style', options: reference.cuisines },
    { key: 'time', label: 'Prep time', options: reference.prepTimes },
    { key: 'difficulty', label: 'Difficulty', options: reference.difficulties },
    { key: 'budget', label: 'Budget', options: reference.budgets },
  ];
}

// Badges for the chosen filters, using each option's label and skipping "Any".
export function filterBadges(draft, reference) {
  const badges = filterList(reference)
    .map(({ key, options }) => options.find((o) => o.value === draft.filters[key]))
    .filter((o) => o && o.label !== 'Any')
    .map((o) => o.label);
  if (draft.useCalories) badges.push(`About ${draft.calories} kcal`);
  return badges;
}

export default function GenerateRecipe() {
  // The form lives in DashboardLayout (`draft`), so it's still filled in after visiting the recipe page.
  // reference holds the seeded lists from the database (allergens, ingredients, filter choices).
  const { profile, reference, draft, setDraft, startGeneration } = useOutletContext();
  const navigate = useNavigate();
  const [error, setError] = useState('');

  // Change one part of the form.
  const update = (key, value) => setDraft((d) => ({ ...d, [key]: typeof value === 'function' ? value(d[key]) : value }));

  // Allergies, consent and cleaned-up ingredient names, worked out from the profile and the list.
  const allergies = allAllergies(profile);
  const consent = profile.healthConsent;
  const ingredients = normalizeList(draft.rawIngredients, reference);
  const names = ingredients.map((i) => i.name);
  // An instant warning while typing. The server's check decides what's blocked.
  const conflicts = findAllergens(names, allergies, reference.allergens);
  const filterFields = filterList(reference);
  const activeBadges = filterBadges(draft, reference);

  // Remove an ingredient from the list.
  function removeIngredient(name) {
    update('rawIngredients', ingredients.filter((i) => i.name !== name).map((i) => i.name));
  }

  // Check the form, start writing the recipe, and open the recipe page to watch it.
  function onGenerate() {
    if (names.length === 0) {
      setError('Please enter at least one ingredient.');
      return;
    }
    if (conflicts.length) {
      setError(`Remove ${conflicts.join(', ')} from your ingredients before generating.`);
      return;
    }
    setError('');
    startGeneration({
      ingredients: names,
      meal: draft.filters.meal,
      cuisine: draft.filters.cuisine,
      difficulty: draft.filters.difficulty,
      budget: draft.filters.budget,
      minutes: /^\d+$/.test(draft.filters.time) ? Number(draft.filters.time) : null,
      calories: draft.useCalories ? draft.calories : null,
      servings: draft.servings,
      notes: draft.notes,
    }, generateRecipe);
    navigate('/dashboard/recipe/new');
  }

  return (
    <>
      <h1 className="dash-title">What&apos;s in your kitchen today?</h1>
      <p className="lede generate-lede">
        Add your ingredients and we&apos;ll write a recipe that&apos;s allergen-checked and fits your goals.
      </p>

      {/* What's personalised (with consent), or a note explaining what isn't sent. */}
      {consent ? (
        <p className="generate-context">
          Personalised for you:{' '}
          {[
            profile.diet !== 'No specific diet' && profile.diet,
            allergies.length > 0 ? `avoiding ${allergies.join(', ')}` : 'no allergies listed',
            dailyTargets(profile) && `${dailyTargets(profile).kcal.toLocaleString('en-US')} kcal a day`,
          ].filter(Boolean).join('; ')}.{' '}
          <Link to="/dashboard/profile">Edit profile</Link>
        </p>
      ) : (
        <div className="care-note" role="note">
          <p>
            <b>Your diet and goals aren&apos;t being sent to the AI.</b> Your allergies are still checked
            by NutriChef AI, but the AI won&apos;t know about them, so more recipes may be blocked.{' '}
            <Link to="/dashboard/profile">Give consent in your profile</Link>.
          </p>
        </div>
      )}

      {/* Left panel: search for ingredients, and the added list with allergy warnings. */}
      <div className="generate-grid">
        <section aria-labelledby="add-title" className="generate-panel">
          <h2 id="add-title" className="dash-h2">Add ingredients</h2>
          <IngredientSearch reference={reference} added={names} onAdd={(list) => update('rawIngredients', (old) => [...old, ...list])} />

          <h3 className="dash-h3">Your added ingredients ({ingredients.length})</h3>
          {ingredients.length === 0 ? (
            <p className="dash-empty">No ingredients yet. Add at least one to generate a recipe.</p>
          ) : (
            <ul className="added-list">
              {ingredients.map((i) => {
                const bad = findAllergens([i.name], allergies, reference.allergens);
                return (
                  <li key={i.name} className={bad.length ? 'is-conflict' : undefined}>
                    <span>
                      {i.name}
                      {bad.length > 0 && <b className="conflict-tag"><Warning size={14} weight="fill" aria-hidden /> Contains {bad.join(', ')}</b>}
                      {!i.recognised && !bad.length && <small> Not in our list. The AI will work out what it is.</small>}
                    </span>
                    <button type="button" className="icon-btn" onClick={() => removeIngredient(i.name)} aria-label={`Remove ${i.name}`}><X size={18} aria-hidden /></button>
                  </li>
                );
              })}
            </ul>
          )}
          {conflicts.length > 0 && (
            <div className="allergy-alert" role="alert">
              <Warning size={22} weight="fill" aria-hidden />
              <p><b>Allergy conflict.</b> Your ingredients include {conflicts.join(', ')}. Remove {conflicts.length > 1 ? 'them' : 'it'} to generate a recipe.</p>
            </div>
          )}
        </section>

        {/* Right panel: filters, servings, calorie target and notes. */}
        <section aria-labelledby="filter-title" className="generate-panel">
          <h2 id="filter-title" className="dash-h2">Recipe filters</h2>
          <div className="filter-grid">
            {filterFields.map(({ key, label, options }) => (
              <div key={key} className="field">
                <label htmlFor={`f-${key}`} className="field-label">{label}</label>
                <select id={`f-${key}`} value={draft.filters[key]} onChange={(e) => update('filters', (f) => ({ ...f, [key]: e.target.value }))}>
                  {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            ))}
            <div className="field">
              <label htmlFor="f-servings" className="field-label">Servings</label>
              <select id="f-servings" value={draft.servings} onChange={(e) => update('servings', Number(e.target.value))}>
                {[1, 2, 3, 4, 5, 6].map((n) => <option key={n}>{n}</option>)}
              </select>
            </div>
          </div>

          <label className="check-row">
            <input type="checkbox" checked={draft.useCalories} onChange={(e) => update('useCalories', e.target.checked)} />
            <span>Set a calorie target per serving</span>
          </label>
          {draft.useCalories && (
            <div className="field calorie-field">
              <label htmlFor="f-calories" className="field-label">About {draft.calories} kcal</label>
              <input id="f-calories" type="range" min="100" max="1200" step="50" value={draft.calories} onChange={(e) => update('calories', Number(e.target.value))} />
            </div>
          )}

          <div className="field">
            <label htmlFor="g-notes" className="field-label">Anything else? <span className="field-optional">Optional</span></label>
            <input id="g-notes" type="text" maxLength={300} placeholder="Something spicy, one pan only" value={draft.notes} onChange={(e) => update('notes', e.target.value)} aria-describedby="g-notes-hint" />
            <p id="g-notes-hint" className="field-hint">Don&apos;t include personal or health details.</p>
          </div>

          {activeBadges.length > 0 && (
            <ul className="chip-list" aria-label="Selected filters">
              {activeBadges.map((badge) => <li key={badge} className="chip chip-on">{badge}</li>)}
            </ul>
          )}
        </section>
      </div>

      {/* The Generate button. */}
      <div className="generate-action">
        <button type="button" className="btn btn-primary btn-lg" onClick={onGenerate}>
          <Sparkle size={18} weight="fill" aria-hidden /> Generate recipe
        </button>
      </div>
      {error && <div className="generate-error" role="alert"><p>{error}</p></div>}
    </>
  );
}
