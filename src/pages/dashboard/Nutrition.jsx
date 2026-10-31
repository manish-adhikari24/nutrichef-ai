import { useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { X } from '@phosphor-icons/react';
import { MacroBars } from './Dashboard.jsx';
import { lastDays, mealsOn, removeLogged, today, totalsFor } from '../../lib/api.js';
import { dailyTargets } from '../../lib/nutrition.js';

export default function Nutrition() {
  const { profile } = useOutletContext();
  const [view, setView] = useState('today');
  const [meals, setMeals] = useState(() => mealsOn());
  const targets = dailyTargets(profile);
  const days = lastDays(7).map((d) => d.toLocaleDateString('en-CA'));
  const weekMeals = days.flatMap((d) => mealsOn(d));

  function remove(id) {
    removeLogged(id);
    setMeals(mealsOn(today()));
  }

  const weekTotals = totalsFor(weekMeals);
  const totals = view === 'today' ? totalsFor(meals) : weekTotals;
  // The week view compares seven days of intake with seven days of targets.
  const shownTargets = targets && view === 'week'
    ? Object.fromEntries(Object.entries(targets).map(([key, value]) => [key, value * 7]))
    : targets;

  return (
    <>
      <div className="dash-top">
        <h1 className="dash-title">Nutrition tracker</h1>
        <div className="chip-list" role="group" aria-label="Time period">
          <button type="button" className={`chip chip-btn${view === 'today' ? ' chip-on' : ''}`} aria-pressed={view === 'today'} onClick={() => setView('today')}>Today</button>
          <button type="button" className={`chip chip-btn${view === 'week' ? ' chip-on' : ''}`} aria-pressed={view === 'week'} onClick={() => setView('week')}>This week</button>
        </div>
      </div>

      {!targets && (
        <div className="care-note" role="note">
          <p><b>No targets yet.</b> <Link to="/dashboard/profile">Complete your profile</Link> to compare your intake with your goals.</p>
        </div>
      )}

      {totals.kcal === 0 ? (
        <p className="dash-empty">
          Nothing logged {view === 'today' ? 'today' : 'this week'}.{' '}
          <Link to="/dashboard/generate" className="inline-link">Generate a recipe</Link> or log one from your{' '}
          <Link to="/dashboard/saved" className="inline-link">saved recipes</Link>.
        </p>
      ) : (
        <MacroBars totals={totals} targets={shownTargets} />
      )}

      {view === 'today' && meals.length > 0 && (
        <section aria-labelledby="eaten-title" className="dash-section">
          <h2 id="eaten-title" className="dash-h2">Eaten today</h2>
          <ul className="dash-rows">
            {meals.map((m) => (
              <li key={m.id} className="dash-row">
                <span><b>{m.title}</b><small>{m.meal}</small></span>
                <span className="dash-row-end">
                  <span className="dash-row-num">{m.kcal} kcal</span>
                  <button type="button" className="icon-btn" onClick={() => remove(m.id)} aria-label={`Remove ${m.title} from today`}><X size={18} aria-hidden /></button>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
