import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { CaretDown, CaretUp, ForkKnife, ShieldCheck, Sparkle, Star, Trash } from '@phosphor-icons/react';
import LoadStatus from '../../components/LoadStatus.jsx';
import RecipeCard from '../../components/RecipeCard.jsx';
import { deleteSaved, listSaved, logMeal } from '../../lib/api.js';
import { useLoad } from '../../lib/useLoad.js';

const FILTERS = ['All', 'Breakfast', 'Lunch', 'Dinner', 'Vegan', 'High protein', 'Under 30 min'];
const SEARCH_DELAY_MS = 300;

export default function SavedRecipes() {
  const [filter, setFilter] = useState('All');
  const [typed, setTyped] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [message, setMessage] = useState('');
  const dialogRef = useRef(null);

  const { data, error, loading, reload } = useLoad(
    () => listSaved({ page, tag: filter === 'All' ? '' : filter, q: search }),
    [page, filter, search]
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(typed.trim());
      setPage(1);
    }, SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [typed]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (pendingDelete && !dialog.open) dialog.showModal();
    if (!pendingDelete && dialog.open) dialog.close();
  }, [pendingDelete]);

  async function confirmDelete() {
    const { id, recipe } = pendingDelete;
    setPendingDelete(null);
    try {
      await deleteSaved(id);
      setMessage(`Deleted ${recipe.title}.`);
      reload();
    } catch (err) {
      setMessage(err.message);
    }
  }

  async function log(recipe) {
    try {
      await logMeal(recipe.id);
      setMessage(`Logged ${recipe.title} as eaten today.`);
    } catch (err) {
      setMessage(err.message);
    }
  }

  const hasAny = data && data.totalSaved > 0;

  return (
    <>
      <div className="dash-top">
        <div>
          <h1 className="dash-title">Saved recipes</h1>
          {data && <p className="dash-date">{data.totalSaved} saved</p>}
        </div>
        <Link to="/dashboard/generate" className="btn btn-primary"><Sparkle size={18} weight="fill" aria-hidden /> Generate new</Link>
      </div>

      {!data && <LoadStatus loading={loading} error={error} onRetry={reload} />}
      {data && error && <LoadStatus error={error} onRetry={reload} />}

      {data && !hasAny && (
        <p className="dash-empty">
          You haven&apos;t saved any recipes yet. <Link to="/dashboard/generate" className="inline-link">Generate your first recipe</Link>.
        </p>
      )}

      {hasAny && (
        <>
          <div className="saved-tools">
            <div className="chip-list" role="group" aria-label="Filter saved recipes">
              {FILTERS.map((label) => (
                <button
                  key={label}
                  type="button"
                  className={`chip chip-btn${filter === label ? ' chip-on' : ''}`}
                  aria-pressed={filter === label}
                  onClick={() => { setFilter(label); setPage(1); }}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="field saved-search">
              <label htmlFor="saved-search" className="field-label">Search by name or ingredient</label>
              <input id="saved-search" type="text" value={typed} onChange={(e) => setTyped(e.target.value)} />
            </div>
          </div>

          <p role="status" className="profile-status saved-status">{message}</p>

          {data.results.length === 0 ? (
            <p className="dash-empty">No saved recipes match. Try another filter or search.</p>
          ) : (
            <ul className="saved-list">
              {data.results.map((item) => {
                const { recipe } = item;
                const open = openId === item.id;
                return (
                  <li key={item.id} className="saved-card">
                    <div className="saved-summary">
                      <div>
                        <h2 className="saved-title">{recipe.title}</h2>
                        <p className="saved-meta">
                          {recipe.meal}, {recipe.minutes} min, {recipe.nutrition.kcal} kcal
                          <span className="saved-safe"><ShieldCheck size={15} weight="fill" aria-hidden /> Allergen-checked</span>
                        </p>
                        <p className="saved-macros">
                          Protein {recipe.nutrition.protein}g, carbs {recipe.nutrition.carbs}g, fat {recipe.nutrition.fat}g
                        </p>
                        <p className="saved-date">
                          Saved {new Date(item.savedAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                          {item.rating > 0 && <span className="saved-rating"><Star size={14} weight="fill" aria-hidden /> {item.rating} out of 5</span>}
                        </p>
                        {item.note && <p className="saved-note">{item.note}</p>}
                      </div>
                      <div className="saved-actions">
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => log(recipe)}>
                          <ForkKnife size={16} aria-hidden /> Log as eaten
                        </button>
                        <button type="button" className="btn btn-ghost btn-sm" aria-expanded={open} onClick={() => setOpenId(open ? null : item.id)}>
                          {open ? <CaretUp size={16} aria-hidden /> : <CaretDown size={16} aria-hidden />}
                          {open ? 'Hide details' : 'View details'}
                        </button>
                        <button type="button" className="icon-btn" onClick={() => setPendingDelete(item)} aria-label={`Delete ${recipe.title}`}>
                          <Trash size={20} aria-hidden />
                        </button>
                      </div>
                    </div>
                    {open && <RecipeCard recipe={recipe} />}
                  </li>
                );
              })}
            </ul>
          )}

          {data.pages > 1 && (
            <nav className="pagination" aria-label="Saved recipe pages">
              <button type="button" className="btn btn-ghost btn-sm" disabled={data.page === 1} onClick={() => setPage(data.page - 1)}>Previous</button>
              <span>Page {data.page} of {data.pages}</span>
              <button type="button" className="btn btn-ghost btn-sm" disabled={data.page === data.pages} onClick={() => setPage(data.page + 1)}>Next</button>
            </nav>
          )}
        </>
      )}

      <dialog ref={dialogRef} className="confirm-dialog" aria-labelledby="delete-title" onClose={() => setPendingDelete(null)}>
        <h2 id="delete-title" className="dash-h2">Delete this recipe?</h2>
        <p>{pendingDelete?.recipe.title} will be removed from your saved recipes.</p>
        <div className="confirm-actions">
          <button type="button" className="btn btn-ghost" onClick={() => setPendingDelete(null)}>Keep recipe</button>
          <button type="button" className="btn btn-danger" onClick={confirmDelete}>Delete recipe</button>
        </div>
      </dialog>
    </>
  );
}
