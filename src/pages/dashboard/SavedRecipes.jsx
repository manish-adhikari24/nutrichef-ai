import { useEffect, useRef, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { CaretDown, CaretUp, ForkKnife, ShieldCheck, Sparkle, Star, Trash } from '@phosphor-icons/react';
import RecipeCard from '../../components/RecipeCard.jsx';
import { deleteSaved, listSaved, logMeal } from '../../lib/api.js';

const PAGE_SIZE = 6;

const FILTERS = [
  { label: 'All', test: () => true },
  { label: 'Breakfast', test: (r) => r.meal === 'Breakfast' },
  { label: 'Lunch', test: (r) => r.meal === 'Lunch' },
  { label: 'Dinner', test: (r) => r.meal === 'Dinner' },
  { label: 'Vegan', test: (r) => r.diet === 'Vegan' },
  { label: 'High protein', test: (r) => r.nutrition.protein >= 25 },
  { label: 'Under 30 min', test: (r) => r.minutes < 30 },
];

function matchesSearch(recipe, search) {
  const term = search.trim().toLowerCase();
  if (!term) return true;
  return recipe.title.toLowerCase().includes(term) || recipe.ingredients.some((i) => i.name.toLowerCase().includes(term));
}

export default function SavedRecipes() {
  const { profile } = useOutletContext();
  const [saved, setSaved] = useState(listSaved);
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [message, setMessage] = useState('');
  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (pendingDelete && !dialog.open) dialog.showModal();
    if (!pendingDelete && dialog.open) dialog.close();
  }, [pendingDelete]);

  const test = FILTERS.find((f) => f.label === filter).test;
  const results = saved.filter((s) => test(s.recipe) && matchesSearch(s.recipe, search));
  const pages = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
  const currentPage = Math.min(page, pages);
  const visible = results.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function confirmDelete() {
    deleteSaved(pendingDelete.id);
    setSaved(listSaved());
    setMessage(`Deleted ${pendingDelete.recipe.title}.`);
    setPendingDelete(null);
  }

  return (
    <>
      <div className="dash-top">
        <div>
          <h1 className="dash-title">Saved recipes</h1>
          <p className="dash-date">{saved.length} saved</p>
        </div>
        <Link to="/dashboard/generate" className="btn btn-primary"><Sparkle size={18} weight="fill" aria-hidden /> Generate new</Link>
      </div>

      {saved.length === 0 ? (
        <p className="dash-empty">
          You haven&apos;t saved any recipes yet. <Link to="/dashboard/generate" className="inline-link">Generate your first recipe</Link>.
        </p>
      ) : (
        <>
          <div className="saved-tools">
            <div className="chip-list" role="group" aria-label="Filter saved recipes">
              {FILTERS.map(({ label }) => (
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
              <input id="saved-search" type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
            </div>
          </div>

          <p role="status" className="profile-status saved-status">{message}</p>

          {results.length === 0 ? (
            <p className="dash-empty">No saved recipes match. Try another filter or search.</p>
          ) : (
            <ul className="saved-list">
              {visible.map((item) => {
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
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => { logMeal(recipe); setMessage(`Logged ${recipe.title} as eaten today.`); }}>
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
                    {open && <RecipeCard recipe={recipe} profile={profile} />}
                  </li>
                );
              })}
            </ul>
          )}

          {pages > 1 && (
            <nav className="pagination" aria-label="Saved recipe pages">
              <button type="button" className="btn btn-ghost btn-sm" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>Previous</button>
              <span>Page {currentPage} of {pages}</span>
              <button type="button" className="btn btn-ghost btn-sm" disabled={currentPage === pages} onClick={() => setPage(currentPage + 1)}>Next</button>
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
