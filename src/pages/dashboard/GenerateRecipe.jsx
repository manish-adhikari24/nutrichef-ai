import { useMemo, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { Check, ShoppingCart, Sparkle, Timer, UsersThree, Warning } from '@phosphor-icons/react';
import { activeTargets, allAllergies } from '../../data/profile.js';

const MEALS = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];
const TIMES = [15, 30, 45, 60];
const MEAL_SHARE = { Breakfast: 0.25, Lunch: 0.3, Dinner: 0.35, Snack: 0.1 };

// A meal's share of the daily targets, so recipes fit into the whole day.
function mealTargets(targets, meal) {
  if (!targets) return undefined;
  const share = MEAL_SHARE[meal];
  return Object.fromEntries(
    ['kcal', 'protein', 'carbs', 'fat', 'fiber'].map((key) => [key, Math.round(targets[key] * share)])
  );
}

function Recipe({ recipe, flags, onAddMissing, added, onAgain, busy }) {
  const missing = recipe.ingredients.filter((i) => i.missing);
  const { kcal, protein, carbs, fat, fiber } = recipe.nutrition;

  return (
    <article className="recipe" aria-labelledby="recipe-title">
      <p className="mock-kicker"><Sparkle size={14} weight="fill" aria-hidden /> Written by AI, please check it before cooking</p>
      <h2 id="recipe-title" className="recipe-title">{recipe.title}</h2>
      <p className="recipe-desc">{recipe.description}</p>
      <ul className="meta-list">
        <li><Timer size={16} aria-hidden /> {recipe.minutes} min</li>
        <li><UsersThree size={16} aria-hidden /> Serves {recipe.servings}</li>
      </ul>

      {flags.length > 0 && (
        <div className="allergy-alert" role="alert">
          <Warning size={22} weight="fill" aria-hidden />
          <p>
            <b>Don&apos;t cook this without checking.</b> An ingredient may contain{' '}
            {flags.join(', ')}, which you listed as an allergy. Generate another recipe instead.
          </p>
        </div>
      )}

      <dl className="target-list recipe-nutrition" aria-label="Estimated nutrition per serving">
        <div><dt>Calories</dt><dd>{kcal} <small>kcal</small></dd></div>
        <div><dt>Protein</dt><dd>{protein} <small>g</small></dd></div>
        <div><dt>Carbs</dt><dd>{carbs} <small>g</small></dd></div>
        <div><dt>Fat</dt><dd>{fat} <small>g</small></dd></div>
        <div><dt>Fiber</dt><dd>{fiber} <small>g</small></dd></div>
      </dl>
      <p className="field-hint">Estimated per serving.</p>

      <div className="recipe-columns">
        <section aria-labelledby="ing-title">
          <h3 id="ing-title" className="dash-h2">Ingredients</h3>
          <ul className="recipe-ingredients">
            {recipe.ingredients.map((i) => (
              <li key={i.name}>
                <span>{i.amount} {i.name}</span>
                {i.missing && <b className="missing-tag">To buy</b>}
              </li>
            ))}
          </ul>
          {missing.length > 0 && (
            <button type="button" className="btn btn-ghost btn-sm recipe-add" onClick={onAddMissing} disabled={added}>
              {added ? <Check size={16} weight="bold" aria-hidden /> : <ShoppingCart size={16} aria-hidden />}
              {added ? 'Added to grocery list' : 'Add missing to grocery list'}
            </button>
          )}
        </section>
        <section aria-labelledby="steps-title">
          <h3 id="steps-title" className="dash-h2">Method</h3>
          <ol className="recipe-steps">
            {recipe.steps.map((step) => <li key={step}>{step}</li>)}
          </ol>
        </section>
      </div>

      <p className="recipe-why"><b>Why this suits you:</b> {recipe.why_it_fits}</p>
      {recipe.label_checks.length > 0 && (
        <p className="recipe-why"><b>Check these labels:</b> {recipe.label_checks.join(', ')}</p>
      )}
      <p className="recipe-disclaimer">
        AI can make mistakes. If you have an allergy, check every ingredient and label yourself.
        This isn&apos;t medical or dietary advice.
      </p>
      <button type="button" className="btn btn-primary" onClick={onAgain} disabled={busy}>
        {busy ? 'Writing your recipe…' : 'Generate another'}
      </button>
    </article>
  );
}

export default function GenerateRecipe() {
  const { pantry, profile, setGroceries } = useOutletContext();
  const [meal, setMeal] = useState('Dinner');
  const [minutes, setMinutes] = useState(30);
  const [servings, setServings] = useState(2);
  const [notes, setNotes] = useState('');
  const [excluded, setExcluded] = useState([]);
  const [status, setStatus] = useState('idle'); // idle | loading
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [added, setAdded] = useState(false);

  const consent = profile.healthConsent;
  const allergies = allAllergies(profile);
  const targets = activeTargets(profile);
  const ingredients = useMemo(
    () => [...pantry].sort((a, b) => (a.daysLeft ?? 999) - (b.daysLeft ?? 999)),
    [pantry]
  );
  const chosen = ingredients.filter((i) => !excluded.includes(i.id));

  function toggleItem(id) {
    setExcluded((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]));
  }

  async function generate(e) {
    e?.preventDefault();
    if (chosen.length === 0) {
      setError('Choose at least one ingredient to cook with.');
      return;
    }
    setStatus('loading');
    setError('');
    setAdded(false);

    // Health details are only sent with the consent given on the profile page.
    const body = {
      pantry: chosen.map((i) => (i.amount ? `${i.name} (${i.amount})` : i.name)),
      useSoon: chosen.filter((i) => i.daysLeft != null && i.daysLeft <= 3).map((i) => i.name),
      meal,
      minutes,
      servings,
      notes,
      ...(consent && {
        diet: profile.diet === 'No specific diet' ? '' : profile.diet,
        allergies,
        dislikes: profile.dislikes,
        targets: mealTargets(targets, meal),
      }),
    };

    try {
      const response = await fetch('/api/generate-recipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? 'The recipe couldn\'t be generated. Try again in a moment.');
      setResult({ recipe: data.recipe, flags: data.allergenFlags ?? [] });
    } catch (err) {
      setError(err instanceof TypeError ? 'Check your internet connection and try again.' : err.message);
    } finally {
      setStatus('idle');
    }
  }

  function addMissing() {
    const missing = result.recipe.ingredients.filter((i) => i.missing);
    setGroceries((items) => [
      ...items,
      ...missing.map((i, index) => ({ id: Date.now() + index, name: `${i.name}, ${i.amount}`, bought: false })),
    ]);
    setAdded(true);
  }

  const busy = status === 'loading';

  return (
    <>
      <h1 className="dash-title">What should we cook?</h1>

      {consent ? (
        <p className="generate-context">
          Personalised for you:{' '}
          {[
            profile.diet !== 'No specific diet' && profile.diet,
            allergies.length > 0 ? `avoiding ${allergies.join(', ')}` : 'no allergies listed',
            targets && `${targets.kcal.toLocaleString('en-US')} kcal a day`,
          ].filter(Boolean).join('; ')}.{' '}
          <Link to="/dashboard/profile">Edit profile</Link>
        </p>
      ) : (
        <div className="care-note" role="note">
          <p>
            <b>Your allergies and diet aren&apos;t being used.</b> Recipes won&apos;t avoid your
            allergens until you <Link to="/dashboard/profile">add them and give consent in your profile</Link>.
          </p>
        </div>
      )}

      <form className="generate-form" onSubmit={generate} noValidate>
        <div className="generate-options">
          <div className="field">
            <label htmlFor="g-meal" className="field-label">Meal</label>
            <select id="g-meal" value={meal} onChange={(e) => setMeal(e.target.value)}>
              {MEALS.map((m) => <option key={m}>{m}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="g-time" className="field-label">Time available</label>
            <select id="g-time" value={minutes} onChange={(e) => setMinutes(Number(e.target.value))}>
              {TIMES.map((t) => <option key={t} value={t}>{t} minutes</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="g-servings" className="field-label">Servings</label>
            <select id="g-servings" value={servings} onChange={(e) => setServings(Number(e.target.value))}>
              {[1, 2, 3, 4, 5, 6].map((n) => <option key={n}>{n}</option>)}
            </select>
          </div>
        </div>

        <fieldset className="field diet-field">
          <legend className="field-label">Ingredients to use ({chosen.length} of {ingredients.length})</legend>
          <div className="chip-list">
            {ingredients.map((i) => {
              const on = !excluded.includes(i.id);
              const soon = i.daysLeft != null && i.daysLeft <= 3;
              return (
                <label key={i.id} className={`chip chip-check${on ? ' chip-on' : ''}`}>
                  <input type="checkbox" checked={on} onChange={() => toggleItem(i.id)} />
                  {on && <Check size={14} weight="bold" aria-hidden />}
                  {i.name}{soon && ', use soon'}
                </label>
              );
            })}
          </div>
          {ingredients.length === 0 && (
            <p className="dash-empty">Your pantry is empty. <Link to="/dashboard/pantry">Add ingredients</Link> to get started.</p>
          )}
        </fieldset>

        <div className="field">
          <label htmlFor="g-notes" className="field-label">
            Anything else? <span className="field-optional">Optional</span>
          </label>
          <input
            id="g-notes"
            type="text"
            maxLength={300}
            placeholder="Something spicy, one pan only"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <button type="submit" className="btn btn-primary btn-lg" disabled={busy}>
          <Sparkle size={18} weight="fill" aria-hidden />
          {busy ? 'Writing your recipe…' : 'Generate recipe'}
        </button>
      </form>

      <div aria-live="polite">
        {error && (
          <div className="generate-error" role="alert">
            <p>{error}</p>
            <button type="button" className="link-btn" onClick={generate}>Try again</button>
          </div>
        )}
        {busy && !result && <p className="generate-wait">Checking your pantry and writing a recipe. This can take up to a minute.</p>}
      </div>

      {result && (
        <Recipe
          recipe={result.recipe}
          flags={result.flags}
          onAddMissing={addMissing}
          added={added}
          onAgain={generate}
          busy={busy}
        />
      )}
    </>
  );
}
