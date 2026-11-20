// Wellness page (FR-16): today at a glance, up to 3 general tips matched to the user, and insights from the last 7 days.
// Everything is worked out from the user's own logs and the seeded tips. No AI is used here.
import { Link } from 'react-router-dom';
import { Drop, Fire, ForkKnife, Lightbulb, Minus, Plus, BowlFood, Warning } from '@phosphor-icons/react';
import LoadStatus from '../../components/LoadStatus.jsx';
import { getWellness } from '../../lib/api.js';
import { useCallback } from 'react';
import { useLoad } from '../../lib/useLoad.js';
import { useWaterCounter } from '../../lib/useWaterCounter.js';

const fmt = (n) => n.toLocaleString('en-US');

// Short weekday for a date, and "Today" for the last day.
function dayName(date, isToday) {
  // Noon avoids the date shifting across time zones when parsed.
  return isToday ? 'Today' : new Date(`${date}T12:00:00`).toLocaleDateString('en-AU', { weekday: 'short' });
}

export default function Wellness() {
  const { data, setData, error, loading, reload } = useLoad(getWellness);
  // Water taps: never lost, saved in order (see lib/useWaterCounter.js). Updates today's card and chart bar.
  const showWater = useCallback((glasses) => setData((d) => ({
    ...d,
    today: { ...d.today, water: glasses },
    days: d.days.map((day, i) => (i === d.days.length - 1 ? { ...day, water: glasses } : day)),
  })), [setData]);
  const changeWater = useWaterCounter(showWater, reload);

  if (!data) {
    return (
      <>
        <h1 className="dash-title">Wellness</h1>
        <LoadStatus loading={loading} error={error} onRetry={reload} />
      </>
    );
  }

  const { today, targets, waterGoal, tips, tipsOn, disclaimer, days, insights } = data;

  // The water chart's top value: the goal or the highest day, whichever is bigger.
  const waterMax = Math.max(waterGoal, ...days.map((d) => d.water));

  return (
    <>
      <h1 className="dash-title">Wellness</h1>
      <p className="lede generate-lede">How today is going, a few ideas that suit you, and how your week looks.</p>

      {!targets && (
        <div className="care-note" role="note">
          <p><b>No daily targets yet.</b> <Link to="/dashboard/profile">Complete your profile</Link> to compare your day and week with your goals.</p>
        </div>
      )}

      {/* Today at a glance. */}
      <section aria-labelledby="w-today" className="dash-section">
        <h2 id="w-today" className="dash-h2">Today at a glance</h2>
        <ul className="stat-cards">
          <li className="stat-card">
            <Fire size={24} aria-hidden />
            <b>{fmt(today.kcal)}</b>
            <span>Calories</span>
            <small>{targets ? `of ${fmt(targets.kcal)} kcal target` : 'No target set'}</small>
          </li>
          <li className="stat-card">
            <ForkKnife size={24} aria-hidden />
            <b>{today.protein}g</b>
            <span>Protein</span>
            <small>{targets ? `of ${targets.protein}g target` : 'No target set'}</small>
          </li>
          <li className="stat-card">
            <BowlFood size={24} aria-hidden />
            <b>{today.meals}</b>
            <span>Meals logged</span>
            <small>{today.meals ? 'Today' : <Link to="/dashboard/generate" className="inline-link">Generate a recipe</Link>}</small>
          </li>
          <li className="stat-card">
            <Drop size={24} aria-hidden />
            <b>{today.water}</b>
            <span>Glasses of water</span>
            <div className="water-controls">
              <button type="button" className="icon-btn" onClick={() => changeWater(-1, today.water)} disabled={today.water === 0} aria-label="Remove a glass of water"><Minus size={18} aria-hidden /></button>
              <small role="status">{today.water >= waterGoal ? 'Goal reached' : `${waterGoal - today.water} more to go`}</small>
              <button type="button" className="icon-btn" onClick={() => changeWater(1, today.water)} aria-label="Add a glass of water"><Plus size={18} aria-hidden /></button>
            </div>
          </li>
        </ul>
      </section>

      {/* Up to 3 general tips matched to the user's goal, BMI, calories left and the time of day. */}
      <section aria-labelledby="w-tips" className="dash-section">
        <h2 id="w-tips" className="dash-h2">Ideas for today</h2>
        {!tipsOn ? (
          <p className="dash-empty">
            Wellness suggestions are turned off. Turn them back on in <Link to="/dashboard/settings" className="inline-link">Settings</Link>.
          </p>
        ) : tips.length === 0 ? (
          <p className="dash-empty">No suggestions right now. Check back later in the day.</p>
        ) : (
          <>
            <ul className="tip-cards">
              {tips.map((tip) => (
                <li key={tip.title} className="tip-card">
                  <Lightbulb size={22} aria-hidden />
                  <h3>{tip.title}</h3>
                  <p>{tip.text}</p>
                </li>
              ))}
            </ul>
            <p className="disclaimer"><Warning size={16} weight="fill" aria-hidden /> {disclaimer}</p>
          </>
        )}
      </section>

      {/* The last 7 days: facts from the logs, and a water chart. */}
      <section aria-labelledby="w-week" className="dash-section">
        <h2 id="w-week" className="dash-h2">Your week</h2>
        <ul className="insight-cards">
          {insights.map((item) => (
            <li key={item.key} className="insight-card">
              <span>{item.label}</span>
              <b>{item.value}</b>
              <small>{item.detail}</small>
            </li>
          ))}
        </ul>

        <figure className="water-chart">
          <figcaption className="dash-h3">Water, last 7 days</figcaption>
          <div className="water-bars" role="group" aria-label={`Glasses of water per day, goal ${waterGoal}`}>
            {/* The goal line. */}
            <div className="water-goal" style={{ bottom: `${(waterGoal / waterMax) * 100}%` }}>
              <span>Goal {waterGoal}</span>
            </div>
            {/* One bar per day, each with a text label for screen readers. */}
            {days.map((d, i) => {
              const label = `${dayName(d.date, i === days.length - 1)}: ${d.water} ${d.water === 1 ? 'glass' : 'glasses'}`;
              return (
                <div key={d.date} className="water-col" role="img" aria-label={label} title={label}>
                  <span className={`water-bar${d.water >= waterGoal ? ' is-goal' : ''}`} style={{ height: `${(d.water / waterMax) * 100}%` }} />
                </div>
              );
            })}
          </div>
          <div className="water-days" aria-hidden="true">
            {days.map((d, i) => <span key={d.date}>{dayName(d.date, i === days.length - 1)}</span>)}
          </div>
        </figure>
      </section>
    </>
  );
}
