import { useState } from 'react';
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
import {
  generatedCount,
  listSaved,
  mealsOn,
  setWaterToday,
  totalsFor,
  waterToday,
} from '../../lib/api.js';
import { dailyTargets, intakeStatus } from '../../lib/nutrition.js';
import { suggestWellness } from '../../lib/rules.js';
import WellnessCard from '../../components/WellnessCard.jsx';

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
  const [water, setWater] = useState(waterToday);
  const targets = dailyTargets(profile);
  const totals = totalsFor(mealsOn());
  const saved = listSaved();
  const wellness = suggestWellness(profile, totals.kcal);
  const dateText = new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  function changeWater(amount) {
    const next = Math.max(0, water + amount);
    setWaterToday(next);
    setWater(next);
  }

  const cards = [
    { icon: Fire, value: totals.kcal.toLocaleString('en-US'), label: 'Calories today', sub: targets ? `${Math.round((totals.kcal / targets.kcal) * 100)}% of goal` : 'No goal set' },
    { icon: ForkKnife, value: `${totals.protein}g`, label: 'Protein today', sub: targets ? `Target ${targets.protein}g` : 'No goal set' },
    { icon: Sparkle, value: generatedCount(), label: 'Recipes generated', sub: 'Today' },
  ];

  return (
    <>
      <div className="dash-top">
        <div>
          <h1 className="dash-title">{greeting()}{profile.firstName ? `, ${profile.firstName}` : ''}</h1>
          <p className="dash-date">{dateText}</p>
        </div>
        <Link to="/dashboard/generate" className="btn btn-primary"><Sparkle size={18} weight="fill" aria-hidden /> Generate recipe</Link>
      </div>

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
          {saved.length === 0 ? (
            <p className="dash-empty">Recipes you save will appear here.</p>
          ) : (
            <ul className="dash-rows">
              {saved.slice(0, 3).map(({ id, recipe }) => (
                <li key={id} className="dash-row">
                  <span>
                    <b>{recipe.title}</b>
                    <small>{recipe.meal}, {recipe.minutes} min</small>
                  </span>
                  <span className="dash-row-num">{recipe.nutrition.kcal} kcal</span>
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
