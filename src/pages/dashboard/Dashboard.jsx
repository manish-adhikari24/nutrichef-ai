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

const WATER_GOAL = 8;

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export function MacroBars({ totals, targets }) {
  const rows = [
    ['Calories', totals.kcal, targets?.kcal, 'kcal'],
    ['Protein', totals.protein, targets?.protein, 'g'],
    ['Carbs', totals.carbs, targets?.carbs, 'g'],
    ['Fat', totals.fat, targets?.fat, 'g'],
  ];
  return (
    <div className="meters">
      {rows.map(([label, value, target, unit]) => {
        const status = intakeStatus(value, target);
        return (
          <div key={label} className="meter">
            <div className="meter-row">
              <span>{label}{status && <em className="status-label"> {status}</em>}</span>
              <span><b>{value.toLocaleString('en-US')}</b>{target ? ` of ${target.toLocaleString('en-US')}` : ''} {unit}</span>
            </div>
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
  const { profile } = useOutletContext();
  const { data, setData, error, loading, reload } = useLoad(getDashboard);
  const targets = dailyTargets(profile);
  const dateText = new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const header = (
    <div className="dash-top">
      <div>
        <h1 className="dash-title">{greeting()}{profile.firstName ? `, ${profile.firstName}` : ''}</h1>
        <p className="dash-date">{dateText}</p>
      </div>
      <Link to="/dashboard/generate" className="btn btn-primary"><Sparkle size={18} weight="fill" aria-hidden /> Generate recipe</Link>
    </div>
  );

  if (!data) {
    return (
      <>
        {header}
        <LoadStatus loading={loading} error={error} onRetry={reload} />
      </>
    );
  }

  const { totals, water, generatedToday, recent, wellness } = data;

  async function changeWater(amount) {
    const glasses = Math.max(0, water + amount);
    setData({ ...data, water: glasses });
    try {
      await setWater(glasses);
    } catch {
      setData({ ...data, water });
    }
  }

  const cards = [
    { icon: Fire, value: totals.kcal.toLocaleString('en-US'), label: 'Calories today', sub: targets ? `${Math.round((totals.kcal / targets.kcal) * 100)}% of goal` : 'No goal set' },
    { icon: ForkKnife, value: `${totals.protein}g`, label: 'Protein today', sub: targets ? `Target ${targets.protein}g` : 'No goal set' },
    { icon: Sparkle, value: generatedToday, label: 'Recipes generated', sub: 'Today' },
  ];

  return (
    <>
      {header}

      {!targets && (
        <div className="care-note" role="note">
          <p><b>Your goals aren&apos;t set yet.</b> <Link to="/dashboard/profile">Complete your profile</Link> to personalise recipes and track your progress.</p>
        </div>
      )}

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

      <nav className="quick-actions" aria-label="Quick actions">
        <Link to="/dashboard/generate"><CookingPot size={24} aria-hidden /> Generate recipe</Link>
        <Link to="/dashboard/saved"><BookmarkSimple size={24} aria-hidden /> Log a meal</Link>
        <Link to="/dashboard/progress"><ChartLineUp size={24} aria-hidden /> View progress</Link>
        <Link to="/dashboard/allergies"><FirstAidKit size={24} aria-hidden /> Allergy profile</Link>
      </nav>

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

      {wellness && <WellnessCard suggestion={wellness} />}
    </>
  );
}
