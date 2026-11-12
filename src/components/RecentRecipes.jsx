// "Recent recipes" list on the Generate page: reopen a recipe with its chat, or delete it.
import { Trash } from '@phosphor-icons/react';

// Short date for a list item, e.g. "12 Nov".
const shortDate = (iso) => new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });

// items: [{ id, title, meal, generatedAt }]. activeId: the recipe that's open now.
export default function RecentRecipes({ items, activeId, onOpen, onDelete }) {
  return (
    <aside className="recent" aria-labelledby="recent-title">
      <h2 id="recent-title" className="dash-h2">Recent recipes</h2>
      {items.length === 0 ? (
        <p className="recent-empty">Recipes you generate will appear here.</p>
      ) : (
        <ul className="recent-list">
          {items.map((item) => (
            <li key={item.id} className={item.id === activeId ? 'is-active' : undefined}>
              {/* Opens the recipe and its chat. */}
              <button type="button" className="recent-open" onClick={() => onOpen(item.id)} aria-current={item.id === activeId ? 'true' : undefined}>
                <b>{item.title}</b>
                <small>{item.meal}, {shortDate(item.generatedAt)}</small>
              </button>
              <button type="button" className="icon-btn recent-delete" onClick={() => onDelete(item)} aria-label={`Delete ${item.title}`}>
                <Trash size={18} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
