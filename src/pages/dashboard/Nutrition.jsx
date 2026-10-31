import { useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { X } from '@phosphor-icons/react';
import { MacroBars } from './Dashboard.jsx';
import LoadStatus from '../../components/LoadStatus.jsx';
import { getLog, removeLogged, totalsFor } from '../../lib/api.js';
import { dailyTargets } from '../../lib/nutrition.js';
import { useLoad } from '../../lib/useLoad.js';

export default function Nutrition() {
  const { profile } = useOutletContext();
  const [view, setView] = useState('today');
  const [message, setMessage] = useState('');
  const { data, error, loading, reload } = useLoad(getLog);
  const targets = dailyTargets(profile);

  async function remove(id) {
    try {
      await removeLogged(id);
      reload();
    } catch (err) {
      setMessage(err.message);
    }
  }

  const totals = data && (view === 'today' ? totalsFor(data.today) : totalsFor(data.days));
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

      {!data && <LoadStatus loading={loading} error={error} onRetry={reload} />}

      {data && (totals.kcal === 0 ? (
        <p className="dash-empty">
          Nothing logged {view === 'today' ? 'today' : 'this week'}.{' '}
          <Link to="/dashboard/generate" className="inline-link">Generate a recipe</Link> or log one from your{' '}
          <Link to="/dashboard/saved" className="inline-link">saved recipes</Link>.
        </p>
      ) : (
        <MacroBars totals={totals} targets={shownTargets} />
      ))}

      {data && view === 'today' && data.today.length > 0 && (
        <section aria-labelledby="eaten-title" className="dash-section">
          <h2 id="eaten-title" className="dash-h2">Eaten today</h2>
          <ul className="dash-rows">
            {data.today.map((m) => (
              <li key={m.id} className="dash-row">
                <span><b>{m.title}</b><small>{m.meal}</small></span>
                <span className="dash-row-end">
                  <span className="dash-row-num">{m.kcal} kcal</span>
                  <button type="button" className="icon-btn" onClick={() => remove(m.id)} aria-label={`Remove ${m.title} from today`}><X size={18} aria-hidden /></button>
                </span>
              </li>
            ))}
          </ul>
          <p role="status" className="profile-status">{message}</p>
        </section>
      )}
    </>
  );
}
