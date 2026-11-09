// Dashboard home: greeting, today's totals, water, quick links, macros, recent recipes and a wellness tip (FR-14).
import { Link, useOutletContext } from 'react-router-dom';
import {
  BookmarkSimple,
  ChartLineUp,
  CookingPot,
  Drop,
  Fire,
  FirstAidKit,
  ForkKnife,
  Minus,
  Plus,
  Sparkle,
} from '@phosphor-icons/react';
import LoadStatus from '../../components/LoadStatus.jsx';
import WellnessCard from '../../components/WellnessCard.jsx';
import { getDashboard, setWater } from '../../lib/api.js';
import { dailyTargets, intakeStatus } from '../../lib/nutrition.js';
import { useLoad } from '../../lib/useLoad.js';

// Daily water goal in glasses.
const WATER_GOAL = 8;

// "Good morning/afternoon/evening" by the local time.
function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

// Progress bars for calories and macros, compared with the targets. Also used by the Nutrition page.
export function MacroBars({ totals, targets }) {
  // Each row: label, amount eaten, target, unit.
  const rows = [
    ['Calories', totals.kcal, targets?.kcal, 'kcal'],
    ['Protein', totals.protein, targets?.protein, 'g'],
    ['Carbs', totals.carbs, targets?.carbs, 'g'],
    ['Fat', totals.fat, targets?.fat, 'g'],
  ];
  return (
    <div className="meters">
      {rows.map(([label, value, target, unit]) => {
        // "Under", "Near" or "Above target".
        const status = intakeStatus(value, target);
        return (
          <div key={label} className="meter">
            <div className="meter-row">
              <span>{label}{status && <em className="status-label"> {status}</em>}</span>
              <span><b>{value.toLocaleString('en-US')}</b>{target ? ` of ${target.toLocaleString('en-US')}` : ''} {unit}</span>
            </div>
            {/* Bar filled up to 100% of the target. */}
            {target && (
              <div className="meter-track" aria-hidden="true">
                <span style={{ width: `${Math.min((value / target) * 100, 100)}%` }} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function Dashboard() {
  // The profile comes from DashboardLayout. The dashboard data comes from /api/dashboard.
  const { profile } = useOutletContext();
  const { data, setData, error, loading, reload } = useLoad(getDashboard);
  // Daily targets from the profile, or null if not set.
  const targets = dailyTargets(profile);
  const dateText = new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  // Title row, shown while loading and after.
  const header = (
    <div className="dash-top">
      <div>
        <h1 className="dash-title">{greeting()}{profile.firstName ? `, ${profile.firstName}` : ''}</h1>
        <p className="dash-date">{dateText}</p>
      </div>
      <Link to="/dashboard/generate" className="btn btn-primary"><Sparkle size={18} weight="fill" aria-hidden /> Generate recipe</Link>
    </div>
  );

  // Still loading or failed: show the header and a status message.
  if (!data) {
    return (
      <>
        {header}
        <LoadStatus loading={loading} error={error} onRetry={reload} />
      </>
    );
  }

  const { totals, water, generatedToday, recent, wellness } = data;

  // Update the water count straight away, then save it. Undo if saving fails.
  async function changeWater(amount) {
    const glasses = Math.max(0, water + amount);
    setData({ ...data, water: glasses });
    try {
      await setWater(glasses);
    } catch {
      setData({ ...data, water });
    }
  }

  // The summary cards.
  const cards = [
    { icon: Fire, value: totals.kcal.toLocaleString('en-US'), label: 'Calories today', sub: targets ? `${Math.round((totals.kcal / targets.kcal) * 100)}% of goal` : 'No goal set' },
    { icon: ForkKnife, value: `${totals.protein}g`, label: 'Protein today', sub: targets ? `Target ${targets.protein}g` : 'No goal set' },
    { icon: Sparkle, value: generatedToday, label: 'Recipes generated', sub: 'Today' },
  ];

  return (
    <>
      {header}

      {/* Prompt to finish the profile when there are no targets yet. */}
      {!targets && (
        <div className="care-note" role="note">
          <p><b>Your goals aren&apos;t set yet.</b> <Link to="/dashboard/profile">Complete your profile</Link> to personalise recipes and track your progress.</p>
        </div>
      )}

      {/* Summary cards, plus the water card with + and - buttons. */}
      <ul className="stat-cards" aria-label="Today's summary">
        {cards.map(({ icon: Icon, value, label, sub }) => (
          <li key={label} className="stat-card">
            <Icon size={24} aria-hidden />
            <b>{value}</b>
            <span>{label}</span>
            <small>{sub}</small>
          </li>
        ))}
        <li className="stat-card">
          <Drop size={24} aria-hidden />
          <b>{water}</b>
          <span>Glasses of water</span>
          <div className="water-controls">
            <button type="button" className="icon-btn" onClick={() => changeWater(-1)} disabled={water === 0} aria-label="Remove a glass of water"><Minus size={18} aria-hidden /></button>
            <small role="status">{water >= WATER_GOAL ? 'Goal reached' : `${WATER_GOAL - water} more to go`}</small>
            <button type="button" className="icon-btn" onClick={() => changeWater(1)} aria-label="Add a glass of water"><Plus size={18} aria-hidden /></button>
          </div>
        </li>
      </ul>

      {/* Shortcuts to common pages. */}
      <nav className="quick-actions" aria-label="Quick actions">
        <Link to="/dashboard/generate"><CookingPot size={24} aria-hidden /> Generate recipe</Link>
        <Link to="/dashboard/saved"><BookmarkSimple size={24} aria-hidden /> Log a meal</Link>
        <Link to="/dashboard/progress"><ChartLineUp size={24} aria-hidden /> View progress</Link>
        <Link to="/dashboard/allergies"><FirstAidKit size={24} aria-hidden /> Allergy profile</Link>
      </nav>

      {/* Today's macros and recent saved recipes, side by side. */}
      <div className="dash-columns">
        <section aria-labelledby="macro-title">
          <div className="dash-h2-row">
            <h2 id="macro-title" className="dash-h2">Today&apos;s macro breakdown</h2>
            <Link to="/dashboard/nutrition" className="inline-link">View full report</Link>
          </div>
          {totals.kcal === 0 ? (
            <p className="dash-empty">
              Nothing logged today. <Link to="/dashboard/generate" className="inline-link">Generate a recipe</Link> and log it as eaten to see your progress.
            </p>
          ) : (
            <MacroBars totals={totals} targets={targets} />
          )}
        </section>

        <section aria-labelledby="recent-title">
          <div className="dash-h2-row">
            <h2 id="recent-title" className="dash-h2">Recent recipes</h2>
            <Link to="/dashboard/saved" className="inline-link">View all</Link>
          </div>
          {recent.length === 0 ? (
            <p className="dash-empty">Recipes you save will appear here.</p>
          ) : (
            <ul className="dash-rows">
              {recent.map((item) => (
                <li key={item.id} className="dash-row">
                  <span>
                    <b>{item.title}</b>
                    <small>{item.meal}, {item.minutes} min</small>
                  </span>
                  <span className="dash-row-num">{item.kcal} kcal</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* The wellness tip, if there is one (FR-16). */}
      {wellness && <WellnessCard suggestion={wellness} />}
    </>
  );
}
