// Recipe page. /dashboard/recipe/new shows progress while the AI writes the recipe,
// then /dashboard/recipe/<id> shows the recipe, its actions (favourites, log, delete) and its chat.
import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { ArrowLeft, Check, CircleNotch, ForkKnife, Heart, Trash, Warning } from '@phosphor-icons/react';
import LoadStatus from '../../components/LoadStatus.jsx';
import RecipeCard from '../../components/RecipeCard.jsx';
import RecipeChat from '../../components/RecipeChat.jsx';
import { deleteRecipe, generateRecipe, getRecipeChat, logMeal, sampleRecipe, saveRecipe, sendChat } from '../../lib/api.js';
import { useLoad } from '../../lib/useLoad.js';
import { filterBadges } from './GenerateRecipe.jsx';

// Errors where a sample recipe should be offered instead.
const OFFER_SAMPLE = ['not_configured', 'ai_unavailable'];
// The progress steps, and how many seconds in each one starts.
const STEPS = [
  [0, 'Checking your ingredients against your allergies'],
  [2, 'Writing your recipe'],
  [18, 'Calculating nutrition and checking the recipe again'],
];

export default function RecipePage() {
  const { id } = useParams();
  if (id === 'new') return <Generating />;
  // Recipe addresses are numbers; anything else can't be a recipe.
  return /^\d+$/.test(id) ? <RecipeView key={id} id={Number(id)} /> : <RecipeMissing />;
}

// While the AI writes the recipe. Generation runs in DashboardLayout, so leaving this page doesn't stop it.
function Generating() {
  const { generation, startGeneration, reference, draft } = useOutletContext();
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  const [seconds, setSeconds] = useState(0);

  // Wait for the recipe, then open its page (replacing this one in the browser history).
  useEffect(() => {
    if (!generation) return undefined;
    let active = true;
    setError(null);
    setSeconds(0);
    generation.promise
      .then((recipe) => active && navigate(`/dashboard/recipe/${recipe.id}`, { replace: true }))
      .catch((err) => active && setError(err));
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => { active = false; clearInterval(timer); };
  }, [generation, navigate]);

  // Opened directly with nothing being written: go to the form.
  if (!generation) return <Navigate to="/dashboard/generate" replace />;

  const step = STEPS.filter(([start]) => seconds >= start).length - 1;
  const badges = filterBadges(draft, reference);

  return (
    <>
      <p className="recipe-back"><Link to="/dashboard/generate" className="inline-link"><ArrowLeft size={16} aria-hidden /> Edit ingredients</Link></p>
      <h1 className="dash-title">{error ? 'We couldn’t write that recipe' : 'Writing your recipe…'}</h1>

      {/* What the recipe is being made from. */}
      <ul className="chip-list generating-chips" aria-label="Your ingredients">
        {generation.request.ingredients.map((name) => <li key={name} className="chip">{name}</li>)}
        {badges.map((badge) => <li key={badge} className="chip chip-on">{badge}</li>)}
      </ul>

      {error ? (
        // A problem: an allergy block, the AI being down, or a rate limit.
        <div className={error.code === 'blocked' ? 'allergy-alert' : 'generate-error'} role="alert">
          {error.code === 'blocked' && <Warning size={22} weight="fill" aria-hidden />}
          <p>{error.message}</p>
          {OFFER_SAMPLE.includes(error.code) && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => startGeneration(generation.request, sampleRecipe)}>Show a sample recipe instead</button>
          )}
          {error.code !== 'blocked' && !OFFER_SAMPLE.includes(error.code) && (
            <button type="button" className="link-btn" onClick={() => startGeneration(generation.request, generateRecipe)}>Try again</button>
          )}
        </div>
      ) : (
        // Progress steps. The current one spins, earlier ones are ticked.
        <div className="generating" role="status">
          <ol className="generating-steps">
            {STEPS.map(([, label], i) => (
              <li key={label} className={i < step ? 'is-done' : i === step ? 'is-current' : undefined}>
                {i < step ? <Check size={18} weight="bold" aria-hidden /> : i === step ? <CircleNotch size={18} className="spin" aria-hidden /> : <span className="step-dot" aria-hidden />}
                {label}
              </li>
            ))}
          </ol>
          <p className="field-hint">
            This usually takes 20 to 40 seconds. You can leave this page: the recipe will appear in Recent recipes when it&apos;s ready.
          </p>
        </div>
      )}
    </>
  );
}

// Shown when the recipe doesn't exist, was deleted, or belongs to someone else.
function RecipeMissing() {
  return (
    <div className="generate-error" role="alert">
      <p>This recipe doesn&apos;t exist or was deleted.</p>
      <p><Link to="/dashboard/generate" className="inline-link">Make a new recipe</Link> or <Link to="/dashboard/saved" className="inline-link">open your favourites</Link>.</p>
    </div>
  );
}

// A finished recipe with its actions and chat.
function RecipeView({ id }) {
  const { reloadRecent } = useOutletContext();
  const navigate = useNavigate();
  const { data, setData, error, loading, reload } = useLoad(() => getRecipeChat(id), [id]);
  // Favourites options, the swap in progress and its result, and the log state.
  const [note, setNote] = useState('');
  const [rating, setRating] = useState(0);
  const [swapping, setSwapping] = useState(null);
  const [swapStatus, setSwapStatus] = useState(null);
  const [logged, setLogged] = useState(false);
  const [message, setMessage] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const dialogRef = useRef(null);

  // Open or close the delete dialog to match `confirming`.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (confirming && !dialog.open) dialog.showModal();
    if (!confirming && dialog.open) dialog.close();
  }, [confirming]);

  // Not found (deleted, or not this person's): no point offering "Try again".
  if (!data && error?.status === 404) return <RecipeMissing />;
  if (!data) {
    return (
      <>
        <p className="recipe-back"><Link to="/dashboard/generate" className="inline-link"><ArrowLeft size={16} aria-hidden /> New recipe</Link></p>
        <LoadStatus loading={loading} error={error} onRetry={reload} />
      </>
    );
  }

  const { recipe, messages, messagesLeft, saved } = data;
  // Update part of the loaded data. `changes` is an object, or a function of the current data.
  const patch = (changes) => setData((d) => ({ ...d, ...(typeof changes === 'function' ? changes(d) : changes) }));

  // Add to favourites with the optional note and rating.
  async function onSave() {
    // Ignore a second click while the first save is still on its way.
    if (saving) return;
    setSaving(true);
    try {
      await saveRecipe(recipe.id, { note: note.trim(), rating });
      patch({ saved: true });
      setMessage('Added to favourites.');
    } catch (err) {
      // 409 means it was already a favourite.
      if (err.status === 409) {
        patch({ saved: true });
        setMessage('Added to favourites.');
      } else {
        setMessage(err.message);
      }
    } finally {
      setSaving(false);
    }
  }

  // Apply a swap: the chat rewrites the recipe, the server re-checks allergens and recalculates nutrition.
  async function onSwap(ingredient, option) {
    setSwapping(`${ingredient}|${option.name}`);
    setSwapStatus(null);
    try {
      const result = await sendChat(
        recipe.id,
        `Please change the recipe: replace the ${ingredient} with ${option.name}, and update the amounts, method and anything else that depends on it.`
      );
      patch((d) => ({ messages: [...d.messages, ...result.messages], messagesLeft: result.messagesLeft }));
      if (result.changed) {
        patch({ recipe: result.recipe });
        reloadRecent();
        setSwapStatus({ ok: true, text: `Recipe updated: ${ingredient} swapped for ${option.name}. Allergens were re-checked and nutrition recalculated.` });
      } else {
        setSwapStatus({ ok: false, text: 'The recipe wasn’t changed. The chat below explains why.' });
      }
    } catch (err) {
      if (err.code === 'chat_limit') patch({ messagesLeft: 0 });
      setSwapStatus({ ok: false, text: err.message });
    } finally {
      setSwapping(null);
    }
  }

  // Log the recipe as eaten today.
  async function onLog() {
    try {
      await logMeal(recipe.id);
      setLogged(true);
      setMessage('Logged as eaten today.');
    } catch (err) {
      setMessage(err.message);
    }
  }

  // Delete the recipe and its chat, then go back to the form.
  async function onDelete() {
    setConfirming(false);
    try {
      await deleteRecipe(recipe.id);
      reloadRecent();
      navigate('/dashboard/generate', { replace: true });
    } catch (err) {
      setMessage(err.message);
    }
  }

  return (
    <>
      <p className="recipe-back"><Link to="/dashboard/generate" className="inline-link"><ArrowLeft size={16} aria-hidden /> New recipe</Link></p>

      <RecipeCard recipe={recipe} onSwap={onSwap} swapping={swapping} swapDisabled={messagesLeft === 0} swapStatus={swapStatus}>
        {/* Note and rating for favourites, shown until it's added. */}
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
          <button type="button" className="btn btn-primary" onClick={onSave} disabled={saved || saving}>
            <Heart size={18} weight={saved ? 'fill' : 'regular'} aria-hidden />
            {saved ? 'In favourites' : 'Add to favourites'}
          </button>
          <button type="button" className="btn btn-ghost" onClick={onLog} disabled={logged}>
            {logged ? <Check size={18} weight="bold" aria-hidden /> : <ForkKnife size={18} aria-hidden />}
            {logged ? 'Logged' : 'Log as eaten'}
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => setConfirming(true)}>
            <Trash size={18} aria-hidden /> Delete
          </button>
          <span role="status" className="profile-status">{message}</span>
        </div>
      </RecipeCard>

      <RecipeChat
        recipe={recipe}
        messages={messages}
        messagesLeft={messagesLeft}
        onReply={(result) => {
          patch((d) => ({ messages: [...d.messages, ...result.messages], messagesLeft: result.messagesLeft }));
          if (result.changed) {
            patch({ recipe: result.recipe });
            // The title may have changed, so refresh the sidebar list.
            reloadRecent();
          }
        }}
        onLimit={() => patch({ messagesLeft: 0 })}
      />

      {/* Delete confirmation dialog. */}
      <dialog ref={dialogRef} className="confirm-dialog" aria-labelledby="delete-title" onClose={() => setConfirming(false)}>
        <h2 id="delete-title" className="dash-h2">Delete this recipe?</h2>
        <p>{recipe.title} and its chat will be deleted, and removed from your favourites.</p>
        <div className="confirm-actions">
          <button type="button" className="btn btn-ghost" onClick={() => setConfirming(false)}>Keep recipe</button>
          <button type="button" className="btn btn-danger" onClick={onDelete}>Delete recipe</button>
        </div>
      </dialog>
    </>
  );
}
