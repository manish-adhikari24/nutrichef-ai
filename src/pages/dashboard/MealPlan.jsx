import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Plus } from '@phosphor-icons/react';
import { WEEK_PLAN } from '../../data/sampleDashboard.js';

function GroceryList() {
  const { groceries, setGroceries } = useOutletContext();
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const boughtCount = groceries.filter((g) => g.bought).length;

  function add(e) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Enter an item name to add it.');
      return;
    }
    setGroceries((items) => [...items, { id: Date.now(), name: trimmed, bought: false }]);
    setName('');
    setError('');
  }

  function toggle(id) {
    setGroceries((items) => items.map((g) => (g.id === id ? { ...g, bought: !g.bought } : g)));
  }

  return (
    <section aria-labelledby="grocery-title">
      <div className="dash-h2-row">
        <h2 id="grocery-title" className="dash-h2">Grocery list</h2>
        <span className="dash-count" role="status">{boughtCount} of {groceries.length} bought</span>
      </div>

      {groceries.length === 0 ? (
        <p className="dash-empty">Your list is empty. Add an item below.</p>
      ) : (
        <ul className="grocery-list">
          {groceries.map((g) => (
            <li key={g.id}>
              <label className={`check-row${g.bought ? ' is-bought' : ''}`}>
                <input type="checkbox" checked={g.bought} onChange={() => toggle(g.id)} />
                <span>{g.name}</span>
              </label>
            </li>
          ))}
        </ul>
      )}

      {boughtCount > 0 && (
        <button
          type="button"
          className="link-btn"
          onClick={() => setGroceries((items) => items.filter((g) => !g.bought))}
        >
          Clear bought items
        </button>
      )}

      <form className="dash-add dash-add-compact" onSubmit={add} noValidate>
        <div className="dash-add-name">
          <label htmlFor="grocery-name" className="field-label">Add an item</label>
          <input
            id="grocery-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? 'grocery-error' : undefined}
          />
        </div>
        <button className="btn btn-ghost dash-add-btn" type="submit">
          <Plus size={18} aria-hidden /> Add
        </button>
        {error && <p id="grocery-error" className="field-error dash-add-error">{error}</p>}
      </form>
    </section>
  );
}

export default function MealPlan() {
  return (
    <>
      <p className="dash-sample">Sample data. Your changes reset when you refresh.</p>
      <h1 className="dash-title">This week&apos;s meal plan</h1>
      <div className="dash-columns dash-columns-plan">
        <section aria-labelledby="dinners-title">
          <h2 id="dinners-title" className="dash-h2">Dinners</h2>
          <ol className="plan-list">
            {WEEK_PLAN.map((d) => (
              <li key={d.day} className={`plan-day${d.today ? ' is-today' : ''}`}>
                <span className="plan-name">
                  {d.day}
                  {d.today && <b className="today-tag">Today</b>}
                </span>
                {d.meal ? (
                  <>
                    <span className="plan-meal">{d.meal}</span>
                    <span className="plan-meta">
                      {d.kcal} kcal, {d.protein} g protein, {d.minutes} min
                    </span>
                  </>
                ) : (
                  <span className="plan-meal plan-off">No cooking planned</span>
                )}
              </li>
            ))}
          </ol>
        </section>
        <GroceryList />
      </div>
    </>
  );
}
