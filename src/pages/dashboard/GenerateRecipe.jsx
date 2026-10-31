import { useRef, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { BookmarkSimple, Check, ForkKnife, Plus, Sparkle, Warning, X } from '@phosphor-icons/react';
import RecipeCard from '../../components/RecipeCard.jsx';
import {
  acceptRecipe,
  allAllergies,
  generateRecipe,
  isSaved,
  logMeal,
  RecipeError,
  saveRecipe,
} from '../../lib/api.js';
import { findAllergens } from '../../lib/allergens.js';
import { CATEGORIES, normalizeList } from '../../lib/ingredients.js';
import { dailyTargets, mealTargets } from '../../lib/nutrition.js';
import { SAMPLE_RECIPES } from '../../lib/sampleRecipes.js';

const FILTERS = [
  { key: 'meal', label: 'Meal type', options: ['Breakfast', 'Lunch', 'Dinner', 'Snack'] },
  { key: 'cuisine', label: 'Cuisine style', options: ['Any', 'Asian', 'Mediterranean', 'Mexican', 'Western'] },
  { key: 'time', label: 'Prep time', options: ['Any', 'Under 15 min', 'Under 30 min', 'Under 1 hour'] },
  { key: 'difficulty', label: 'Difficulty', options: ['Any', 'Easy', 'Medium', 'Hard'] },
  { key: 'budget', label: 'Budget', options: ['Any', 'Low', 'Medium', 'High'] },
];
const MINUTES = { 'Under 15 min': 15, 'Under 30 min': 30, 'Under 1 hour': 60 };
const CATEGORY_NAMES = ['All', ...Object.keys(CATEGORIES)];
const allChips = Object.values(CATEGORIES).flat();

export default function GenerateRecipe() {
  const { profile, currentRecipe, setCurrentRecipe } = useOutletContext();
  const [typed, setTyped] = useState('');
  const [rawIngredients, setRawIngredients] = useState([]);
  const [category, setCategory] = useState('All');
  const [filters, setFilters] = useState({ meal: 'Dinner', cuisine: 'Any', time: 'Under 30 min', difficulty: 'Any', budget: 'Any' });
  const [useCalories, setUseCalories] = useState(false);
  const [calories, setCalories] = useState(500);
  const [servings, setServings] = useState(2);
  const [notes, setNotes] = useState('');
  const [inputError, setInputError] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState('');
  const [note, setNote] = useState('');
  const [rating, setRating] = useState(0);
  const [accepted, setAccepted] = useState({});
  const [logged, setLogged] = useState(false);
  const sampleIndex = useRef(0);
  const inputRef = useRef(null);

  const allergies = allAllergies(profile);
  const consent = profile.healthConsent;
  const ingredients = normalizeList(rawIngredients);
  const names = ingredients.map((i) => i.name);
  const conflicts = findAllergens(names, allergies);
  const chips = category === 'All' ? allChips : CATEGORIES[category];
  const activeBadges = Object.entries(filters).filter(([, value]) => value !== 'Any').map(([, value]) => value);
  if (useCalories) activeBadges.push(`About ${calories} kcal`);

  function addIngredient(name) {
    setRawIngredients((list) => [...list, name]);
    setInputError('');
  }

  function removeIngredient(name) {
    const remaining = ingredients.filter((i) => i.name !== name).map((i) => i.name);
    setRawIngredients(remaining);
  }

  function onAdd(e) {
    e.preventDefault();
    const parts = typed.split(',').map((p) => p.trim()).filter(Boolean);
    if (parts.length === 0) {
      setInputError('Enter an ingredient name to add it.');
      return;
    }
    setRawIngredients((list) => [...list, ...parts]);
    setTyped('');
    setInputError('');
    inputRef.current?.focus();
  }

  function showRecipe(recipe) {
    setCurrentRecipe(recipe);
    setAccepted({});
    setNote('');
    setRating(0);
    setLogged(false);
    setMessage('');
    requestAnimationFrame(() => document.getElementById('recipe-title')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }

  function buildRequest() {
    const personal = consent
      ? {
          diet: profile.diet === 'No specific diet' ? '' : profile.diet,
          allergies,
          dislikes: profile.dislikes,
          targets: mealTargets(profile, filters.meal) ?? undefined,
        }
      : {};
    return {
      ingredients: names,
      meal: filters.meal,
      cuisine: filters.cuisine,
      difficulty: filters.difficulty,
      budget: filters.budget,
      minutes: MINUTES[filters.time],
      calories: useCalories ? calories : undefined,
      servings,
      notes,
      ...personal,
    };
  }

  async function generate() {
    setMessage('');
    if (names.length === 0) {
      setError({ message: 'Please enter at least one ingredient.' });
      return;
    }
    if (conflicts.length) {
      setError({ message: `Remove ${conflicts.join(', ')} from your ingredients before generating.` });
      return;
    }
    setBusy(true);
    setError(null);
    try {
      showRecipe(await generateRecipe(buildRequest(), allergies));
    } catch (err) {
      const known = err instanceof RecipeError;
      setCurrentRecipe(known && err.code === 'blocked' ? null : currentRecipe);
      setError({
        message: known ? err.message : 'The recipe couldn\'t be generated. Try again in a moment.',
        code: known ? err.code : undefined,
      });
    } finally {
      setBusy(false);
    }
  }

  function showSample() {
    const sample = SAMPLE_RECIPES[sampleIndex.current % SAMPLE_RECIPES.length];
    sampleIndex.current += 1;
    try {
      const request = { ...buildRequest(), diet: profile.diet === 'No specific diet' ? '' : profile.diet };
      showRecipe(acceptRecipe(sample, request, allergies, 'sample'));
      setError(null);
    } catch (err) {
      setCurrentRecipe(null);
      setError({ message: err.message, code: 'blocked' });
    }
  }

  function onSave() {
    const subs = Object.entries(accepted).filter(([, value]) => value).map(([from, to]) => `${from} swapped for ${to}`);
    const fullNote = [note.trim(), ...subs].filter(Boolean).join('. ');
    const result = saveRecipe(currentRecipe, { note: fullNote, rating });
    setMessage(result.ok ? 'Recipe saved.' : result.error);
  }

  function onLog() {
    logMeal(currentRecipe);
    setLogged(true);
    setMessage('Logged as eaten today.');
  }

  const saved = currentRecipe ? isSaved(currentRecipe.id) : false;

  return (
    <>
      <h1 className="dash-title">What&apos;s in your kitchen today?</h1>
      <p className="lede generate-lede">
        Add your ingredients and we&apos;ll write a recipe that&apos;s allergen-checked and fits your goals.
      </p>

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
            here, but the AI won&apos;t know about them, so more recipes may be blocked.{' '}
            <Link to="/dashboard/profile">Give consent in your profile</Link>.
          </p>
        </div>
      )}

      <div className="generate-grid">
        <section aria-labelledby="add-title" className="generate-panel">
          <h2 id="add-title" className="dash-h2">Add ingredients</h2>
          <form className="dash-add" onSubmit={onAdd} noValidate>
            <div className="dash-add-name">
              <label htmlFor="g-ingredient" className="field-label">Ingredient</label>
              <input
                id="g-ingredient"
                ref={inputRef}
                type="text"
                placeholder="chicken, broccoli, lemon"
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                aria-invalid={inputError ? true : undefined}
                aria-describedby={inputError ? 'g-ingredient-error' : undefined}
              />
            </div>
            <button type="submit" className="btn btn-primary dash-add-btn"><Plus size={18} aria-hidden /> Add</button>
            {inputError && <p id="g-ingredient-error" className="field-error dash-add-error">{inputError}</p>}
          </form>

          <div className="chip-list category-chips" role="group" aria-label="Filter suggestions by category">
            {CATEGORY_NAMES.map((name) => (
              <button key={name} type="button" className={`chip chip-btn${category === name ? ' chip-on' : ''}`} aria-pressed={category === name} onClick={() => setCategory(name)}>
                {name}
              </button>
            ))}
          </div>
          <div className="chip-list" role="group" aria-label="Suggested ingredients">
            {chips.map((name) => {
              const on = names.includes(name.toLowerCase());
              return (
                <button key={name} type="button" className={`chip chip-btn${on ? ' chip-on' : ''}`} aria-pressed={on} onClick={() => (on ? removeIngredient(name.toLowerCase()) : addIngredient(name))}>
                  {on && <Check size={14} weight="bold" aria-hidden />}
                  {name}
                </button>
              );
            })}
          </div>

          <h3 className="dash-h3">Your added ingredients ({ingredients.length})</h3>
          {ingredients.length === 0 ? (
            <p className="dash-empty">No ingredients yet. Add at least one to generate a recipe.</p>
          ) : (
            <ul className="added-list">
              {ingredients.map((i) => {
                const bad = findAllergens([i.name], allergies);
                return (
                  <li key={i.name} className={bad.length ? 'is-conflict' : undefined}>
                    <span>
                      {i.name}
                      {bad.length > 0 && <b className="conflict-tag"><Warning size={14} weight="fill" aria-hidden /> Contains {bad.join(', ')}</b>}
                      {!i.recognised && !bad.length && <small> Not in our list, kept as typed</small>}
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
              <p><b>Allergy conflict.</b> Your ingredients include {conflicts.join(', ')}. Remove it to generate a recipe.</p>
            </div>
          )}
        </section>

        <section aria-labelledby="filter-title" className="generate-panel">
          <h2 id="filter-title" className="dash-h2">Recipe filters</h2>
          <div className="filter-grid">
            {FILTERS.map(({ key, label, options }) => (
              <div key={key} className="field">
                <label htmlFor={`f-${key}`} className="field-label">{label}</label>
                <select id={`f-${key}`} value={filters[key]} onChange={(e) => setFilters((f) => ({ ...f, [key]: e.target.value }))}>
                  {options.map((option) => <option key={option}>{option}</option>)}
                </select>
              </div>
            ))}
            <div className="field">
              <label htmlFor="f-servings" className="field-label">Servings</label>
              <select id="f-servings" value={servings} onChange={(e) => setServings(Number(e.target.value))}>
                {[1, 2, 3, 4, 5, 6].map((n) => <option key={n}>{n}</option>)}
              </select>
            </div>
          </div>

          <label className="check-row">
            <input type="checkbox" checked={useCalories} onChange={(e) => setUseCalories(e.target.checked)} />
            <span>Set a calorie target per serving</span>
          </label>
          {useCalories && (
            <div className="field calorie-field">
              <label htmlFor="f-calories" className="field-label">About {calories} kcal</label>
              <input id="f-calories" type="range" min="100" max="1200" step="50" value={calories} onChange={(e) => setCalories(Number(e.target.value))} />
            </div>
          )}

          <div className="field">
            <label htmlFor="g-notes" className="field-label">Anything else? <span className="field-optional">Optional</span></label>
            <input id="g-notes" type="text" maxLength={300} placeholder="Something spicy, one pan only" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          {activeBadges.length > 0 && (
            <ul className="chip-list" aria-label="Selected filters">
              {activeBadges.map((badge) => <li key={badge} className="chip chip-on">{badge}</li>)}
            </ul>
          )}
        </section>
      </div>

      <div className="generate-action">
        <button type="button" className="btn btn-primary btn-lg" onClick={generate} disabled={busy}>
          <Sparkle size={18} weight="fill" aria-hidden />
          {busy ? 'Writing your recipe…' : 'Generate recipe'}
        </button>
        {busy && <p className="generate-wait" role="status">Checking allergies and writing your recipe.</p>}
      </div>

      {error && (
        <div className={error.code === 'blocked' ? 'allergy-alert' : 'generate-error'} role="alert">
          {error.code === 'blocked' && <Warning size={22} weight="fill" aria-hidden />}
          <p>{error.message}</p>
          {error.code === 'not_configured' && names.length > 0 && conflicts.length === 0 && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={showSample}>Show a sample recipe instead</button>
          )}
          {error.code !== 'not_configured' && names.length > 0 && conflicts.length === 0 && (
            <button type="button" className="link-btn" onClick={generate}>Try again</button>
          )}
        </div>
      )}

      {currentRecipe && (
        <RecipeCard
          recipe={currentRecipe}
          profile={profile}
          accepted={accepted}
          onAccept={(ingredient, value) => setAccepted((a) => ({ ...a, [ingredient]: value }))}
        >
          {!saved && (
            <div className="save-fields">
              <div className="field">
                <label htmlFor="save-note" className="field-label">Note <span className="field-optional">Optional</span></label>
                <input id="save-note" type="text" maxLength={200} value={note} onChange={(e) => setNote(e.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="save-rating" className="field-label">Rating <span className="field-optional">Optional</span></label>
                <select id="save-rating" value={rating} onChange={(e) => setRating(Number(e.target.value))}>
                  <option value={0}>No rating</option>
                  {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n} out of 5</option>)}
                </select>
              </div>
            </div>
          )}
          <div className="recipe-actions">
            <button type="button" className="btn btn-primary" onClick={onSave} disabled={saved}>
              {saved ? <Check size={18} weight="bold" aria-hidden /> : <BookmarkSimple size={18} aria-hidden />}
              {saved ? 'Saved' : 'Save recipe'}
            </button>
            <button type="button" className="btn btn-ghost" onClick={onLog} disabled={logged}>
              {logged ? <Check size={18} weight="bold" aria-hidden /> : <ForkKnife size={18} aria-hidden />}
              {logged ? 'Logged' : 'Log as eaten'}
            </button>
            <button type="button" className="btn btn-ghost" onClick={generate} disabled={busy}>
              {busy ? 'Writing…' : 'Regenerate'}
            </button>
            <span role="status" className="profile-status">{message}</span>
          </div>
        </RecipeCard>
      )}
    </>
  );
}
