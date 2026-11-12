// Generate Recipe page: add ingredients, choose filters, generate, then save or log the recipe (FR-04 to FR-10).
// When the recipe chat is switched on, it also shows a "Recent recipes" list and a chat under the recipe.
import { useEffect, useRef, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { BookmarkSimple, Check, ForkKnife, Plus, Sparkle, Warning, X } from '@phosphor-icons/react';
import RecentRecipes from '../../components/RecentRecipes.jsx';
import RecipeCard from '../../components/RecipeCard.jsx';
import RecipeChat from '../../components/RecipeChat.jsx';
import { allAllergies, deleteRecipe, generateRecipe, getRecipeChat, listRecent, logMeal, sampleRecipe, saveRecipe } from '../../lib/api.js';
import { findAllergens } from '../../lib/allergens.js';
import { CATEGORIES, normalizeList } from '../../lib/ingredients.js';
import { dailyTargets } from '../../lib/nutrition.js';

// The filter drop-downs (FR-09).
const FILTERS = [
  { key: 'meal', label: 'Meal type', options: ['Breakfast', 'Lunch', 'Dinner', 'Snack'] },
  { key: 'cuisine', label: 'Cuisine style', options: ['Any', 'Asian', 'Mediterranean', 'Mexican', 'Western'] },
  { key: 'time', label: 'Prep time', options: ['Any', 'Under 15 min', 'Under 30 min', 'Under 1 hour'] },
  { key: 'difficulty', label: 'Difficulty', options: ['Any', 'Easy', 'Medium', 'Hard'] },
  { key: 'budget', label: 'Budget', options: ['Any', 'Low', 'Medium', 'High'] },
];
// Turns the prep time choice into minutes for the API.
const MINUTES = { 'Under 15 min': 15, 'Under 30 min': 30, 'Under 1 hour': 60 };
// Category tabs for the ingredient suggestions.
const CATEGORY_NAMES = ['All', ...Object.keys(CATEGORIES)];
const allChips = Object.values(CATEGORIES).flat();
// Errors where a sample recipe should be offered instead.
const OFFER_SAMPLE = ['not_configured', 'ai_unavailable'];

export default function GenerateRecipe() {
  // currentRecipe lives in DashboardLayout, so it's kept when moving between pages.
  const { profile, currentRecipe, setCurrentRecipe } = useOutletContext();
  // Ingredient input and the list typed or picked so far.
  const [typed, setTyped] = useState('');
  const [rawIngredients, setRawIngredients] = useState([]);
  const [category, setCategory] = useState('All');
  const [filters, setFilters] = useState({ meal: 'Dinner', cuisine: 'Any', time: 'Under 30 min', difficulty: 'Any', budget: 'Any' });
  // Optional calorie target per serving.
  const [useCalories, setUseCalories] = useState(false);
  const [calories, setCalories] = useState(500);
  const [servings, setServings] = useState(2);
  const [notes, setNotes] = useState('');
  // Generation state and messages.
  const [inputError, setInputError] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState('');
  // Save options for the finished recipe.
  const [note, setNote] = useState('');
  const [rating, setRating] = useState(0);
  // Swaps the user accepted, the save state and the log state.
  const [accepted, setAccepted] = useState({});
  const [saved, setSaved] = useState(false);
  const [logged, setLogged] = useState(false);
  // The ingredient box, so focus can return to it after adding.
  const inputRef = useRef(null);
  // Recipe chat. `recent` is null while the feature is switched off (or not yet checked).
  const [recent, setRecent] = useState(null);
  const [messages, setMessages] = useState([]);
  // The recent recipe waiting for delete confirmation.
  const [pendingDelete, setPendingDelete] = useState(null);
  const dialogRef = useRef(null);

  // Allergies, consent and cleaned-up ingredient names, worked out from the profile and the list.
  const allergies = allAllergies(profile);
  const consent = profile.healthConsent;
  const ingredients = normalizeList(rawIngredients);
  const names = ingredients.map((i) => i.name);
  // An instant warning while typing. The server's check decides what's blocked.
  const conflicts = findAllergens(names, allergies);
  // Suggestion chips for the selected category.
  const chips = category === 'All' ? allChips : CATEGORIES[category];
  // Filters that aren't "Any", shown as badges.
  const activeBadges = Object.entries(filters).filter(([, value]) => value !== 'Any').map(([, value]) => value);
  if (useCalories) activeBadges.push(`About ${calories} kcal`);

  // Add one ingredient from a suggestion chip.
  function addIngredient(name) {
    setRawIngredients((list) => [...list, name]);
    setInputError('');
  }

  // Remove an ingredient from the list.
  function removeIngredient(name) {
    setRawIngredients(ingredients.filter((i) => i.name !== name).map((i) => i.name));
  }

  // Add whatever is typed. Commas add several at once.
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

  // The request body sent to the API.
  function buildRequest() {
    return {
      ingredients: names,
      meal: filters.meal,
      cuisine: filters.cuisine,
      difficulty: filters.difficulty,
      budget: filters.budget,
      minutes: MINUTES[filters.time] ?? null,
      calories: useCalories ? calories : null,
      servings,
      notes,
    };
  }

  // Generate a recipe with the given API call (real or sample). Stops early if there are no ingredients or there's an allergy conflict.
  // Load the recent list. A failure (404 while the feature is off) hides the list and the chat.
  async function loadRecent() {
    try {
      setRecent((await listRecent()).results);
      return true;
    } catch {
      setRecent(null);
      return false;
    }
  }

  // On opening the page: load the list, and the chat of the recipe that's already showing.
  useEffect(() => {
    let active = true;
    (async () => {
      if (!(await loadRecent()) || !currentRecipe?.id) return;
      try {
        const data = await getRecipeChat(currentRecipe.id);
        if (active) {
          setMessages(data.messages);
          setSaved(data.saved);
        }
      } catch {
        // The recipe may have been deleted elsewhere. The page still works without its chat.
      }
    })();
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Open or close the delete dialog to match pendingDelete.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (pendingDelete && !dialog.open) dialog.showModal();
    if (!pendingDelete && dialog.open) dialog.close();
  }, [pendingDelete]);

  // Reopen a recipe from the recent list, with its chat.
  async function openRecipe(id) {
    setMessage('');
    try {
      const data = await getRecipeChat(id);
      setCurrentRecipe(data.recipe);
      setMessages(data.messages);
      setSaved(data.saved);
      setLogged(false);
      setAccepted({});
      setNote('');
      setRating(0);
      setError(null);
      requestAnimationFrame(() => document.getElementById('recipe-title')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    } catch (err) {
      setError({ message: err.message });
    }
  }

  // Delete a recent recipe after confirmation. If it's the one showing, clear it.
  async function confirmDelete() {
    const { id } = pendingDelete;
    setPendingDelete(null);
    try {
      await deleteRecipe(id);
      if (currentRecipe?.id === id) {
        setCurrentRecipe(null);
        setMessages([]);
      }
      loadRecent();
    } catch (err) {
      setError({ message: err.message });
    }
  }

  async function requestRecipe(call) {
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
      // Show the new recipe, reset the save options, and scroll to it.
      const recipe = await call(buildRequest());
      setCurrentRecipe(recipe);
      setAccepted({});
      setNote('');
      setRating(0);
      setSaved(false);
      setLogged(false);
      // A new recipe starts with an empty chat and goes to the top of the recent list.
      setMessages([]);
      if (recent !== null) loadRecent();
      requestAnimationFrame(() => document.getElementById('recipe-title')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    } catch (err) {
      // A blocked recipe clears the old one, so an unsafe recipe is never left on screen.
      if (err.code === 'blocked') setCurrentRecipe(null);
      setError({ message: err.message, code: err.code });
    } finally {
      setBusy(false);
    }
  }

  // Save the recipe. The note includes any swaps the user accepted.
  async function onSave() {
    const subs = Object.entries(accepted).filter(([, value]) => value).map(([from, to]) => `${from} swapped for ${to}`);
    try {
      await saveRecipe(currentRecipe.id, { note: [note.trim(), ...subs].filter(Boolean).join('. '), rating });
      setSaved(true);
      setMessage('Recipe saved.');
    } catch (err) {
      // 409 means it was already saved.
      if (err.status === 409) setSaved(true);
      setMessage(err.message);
    }
  }

  // Log the recipe as eaten today.
  async function onLog() {
    try {
      await logMeal(currentRecipe.id);
      setLogged(true);
      setMessage('Logged as eaten today.');
    } catch (err) {
      setMessage(err.message);
    }
  }

  const page = (
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

      {/* Left panel: add ingredients, suggestion chips and the added list with allergy warnings. */}
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

        {/* Right panel: filters, servings, calorie target and notes. */}
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
            <input id="g-notes" type="text" maxLength={300} placeholder="Something spicy, one pan only" value={notes} onChange={(e) => setNotes(e.target.value)} aria-describedby="g-notes-hint" />
            <p id="g-notes-hint" className="field-hint">Don&apos;t include personal or health details.</p>
          </div>

          {activeBadges.length > 0 && (
            <ul className="chip-list" aria-label="Selected filters">
              {activeBadges.map((badge) => <li key={badge} className="chip chip-on">{badge}</li>)}
            </ul>
          )}
        </section>
      </div>

      {/* The Generate button and a waiting message. */}
      <div className="generate-action">
        <button type="button" className="btn btn-primary btn-lg" onClick={() => requestRecipe(generateRecipe)} disabled={busy}>
          <Sparkle size={18} weight="fill" aria-hidden />
          {busy ? 'Writing your recipe…' : 'Generate recipe'}
        </button>
        {busy && <p className="generate-wait" role="status">Checking allergies and writing your recipe.</p>}
      </div>

      {/* Error message, with a sample recipe option or a Try again button. */}
      {error && (
        <div className={error.code === 'blocked' ? 'allergy-alert' : 'generate-error'} role="alert">
          {error.code === 'blocked' && <Warning size={22} weight="fill" aria-hidden />}
          <p>{error.message}</p>
          {OFFER_SAMPLE.includes(error.code) && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => requestRecipe(sampleRecipe)} disabled={busy}>Show a sample recipe instead</button>
          )}
          {!OFFER_SAMPLE.includes(error.code) && names.length > 0 && conflicts.length === 0 && (
            <button type="button" className="link-btn" onClick={() => requestRecipe(generateRecipe)}>Try again</button>
          )}
        </div>
      )}

      {/* The generated recipe, with save, log and regenerate buttons. */}
      {currentRecipe && (
        <RecipeCard
          recipe={currentRecipe}
          accepted={accepted}
          onAccept={(ingredient, value) => setAccepted((a) => ({ ...a, [ingredient]: value }))}
        >
          {/* Note and rating, shown until it's saved. */}
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
            <button type="button" className="btn btn-ghost" onClick={() => requestRecipe(generateRecipe)} disabled={busy}>
              {busy ? 'Writing…' : 'Regenerate'}
            </button>
            <span role="status" className="profile-status">{message}</span>
          </div>
        </RecipeCard>
      )}

      {/* The chat, when the feature is on and the recipe is stored on the server. */}
      {recent !== null && currentRecipe?.id && (
        <RecipeChat
          key={currentRecipe.id}
          recipe={currentRecipe}
          messages={messages}
          setMessages={setMessages}
          onRecipeChange={(recipe) => {
            setCurrentRecipe(recipe);
            // The title may have changed, so refresh the list.
            loadRecent();
          }}
        />
      )}
    </>
  );

  // Chat switched off: the page as it always was.
  if (recent === null) return page;

  // Chat switched on: recent recipes on the left, the page on the right.
  return (
    <div className="generate-shell">
      <RecentRecipes items={recent} activeId={currentRecipe?.id} onOpen={openRecipe} onDelete={setPendingDelete} />
      <div className="generate-main">{page}</div>

      {/* Delete confirmation dialog. */}
      <dialog ref={dialogRef} className="confirm-dialog" aria-labelledby="recent-delete-title" onClose={() => setPendingDelete(null)}>
        <h2 id="recent-delete-title" className="dash-h2">Delete this recipe?</h2>
        <p>{pendingDelete?.title} and its chat will be deleted. It will also be removed from your saved recipes.</p>
        <div className="confirm-actions">
          <button type="button" className="btn btn-ghost" onClick={() => setPendingDelete(null)}>Keep recipe</button>
          <button type="button" className="btn btn-danger" onClick={confirmDelete}>Delete recipe</button>
        </div>
      </dialog>
    </div>
  );
}
