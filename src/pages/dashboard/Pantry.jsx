import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Plus, Trash } from '@phosphor-icons/react';

const PLACES = ['Fridge', 'Cupboard', 'Freezer'];
const USE_SOON_DAYS = 3;

const isUseSoon = (item) => item.daysLeft != null && item.daysLeft <= USE_SOON_DAYS;
const daysText = (n) => (n === 1 ? '1 day left' : `${n} days left`);

function ItemList({ items, onRemove }) {
  return (
    <ul className="dash-rows">
      {items.map((item) => (
        <li key={item.id} className="dash-row">
          <span>
            <b>{item.name}</b>
            {item.amount && <small>{item.amount}</small>}
          </span>
          <span className="dash-row-end">
            {isUseSoon(item) && <span className="soon-tag">{daysText(item.daysLeft)}</span>}
            <button
              type="button"
              className="icon-btn"
              onClick={() => onRemove(item)}
              aria-label={`Remove ${item.name}`}
            >
              <Trash size={20} aria-hidden />
            </button>
          </span>
        </li>
      ))}
    </ul>
  );
}

export default function Pantry() {
  const { pantry, setPantry } = useOutletContext();
  const [name, setName] = useState('');
  const [place, setPlace] = useState('Fridge');
  const [error, setError] = useState('');
  const [removed, setRemoved] = useState(null);

  function add(e) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Enter an ingredient name to add it.');
      return;
    }
    setPantry((items) => [...items, { id: Date.now(), name: trimmed, place }]);
    setName('');
    setError('');
  }

  function remove(item) {
    setRemoved({ item, index: pantry.indexOf(item) });
    setPantry((items) => items.filter((i) => i !== item));
  }

  function undo() {
    setPantry((items) => {
      const next = [...items];
      next.splice(removed.index, 0, removed.item);
      return next;
    });
    setRemoved(null);
  }

  const useSoon = pantry.filter(isUseSoon).sort((a, b) => a.daysLeft - b.daysLeft);

  return (
    <>
      <p className="dash-sample">Sample data. Your changes reset when you refresh.</p>
      <h1 className="dash-title">Your pantry</h1>

      <form className="dash-add" onSubmit={add} noValidate>
        <div className="dash-add-name">
          <label htmlFor="pantry-name" className="field-label">Ingredient</label>
          <input
            id="pantry-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? 'pantry-error' : undefined}
          />
        </div>
        <div>
          <label htmlFor="pantry-place" className="field-label">Kept in</label>
          <select id="pantry-place" value={place} onChange={(e) => setPlace(e.target.value)}>
            {PLACES.map((p) => <option key={p}>{p}</option>)}
          </select>
        </div>
        <button className="btn btn-primary dash-add-btn" type="submit">
          <Plus size={18} aria-hidden /> Add ingredient
        </button>
        {error && <p id="pantry-error" className="field-error dash-add-error">{error}</p>}
      </form>

      <div role="status" className="dash-status">
        {removed && (
          <>
            Removed {removed.item.name}.{' '}
            <button type="button" className="link-btn" onClick={undo}>Undo</button>
          </>
        )}
      </div>

      {pantry.length === 0 ? (
        <p className="dash-empty">Your pantry is empty. Add your first ingredient above.</p>
      ) : (
        <div className="pantry-groups">
          {useSoon.length > 0 && (
            <section aria-labelledby="group-soon" className="pantry-soon">
              <h2 id="group-soon" className="dash-h2">Use soon</h2>
              <ItemList items={useSoon} onRemove={remove} />
            </section>
          )}
          {PLACES.map((p) => {
            const items = pantry.filter((i) => i.place === p && !isUseSoon(i));
            if (items.length === 0) return null;
            return (
              <section key={p} aria-labelledby={`group-${p}`}>
                <h2 id={`group-${p}`} className="dash-h2">{p}</h2>
                <ItemList items={items} onRemove={remove} />
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}
