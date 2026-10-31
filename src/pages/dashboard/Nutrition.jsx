import { Link, useOutletContext } from 'react-router-dom';
import { GOALS as SAMPLE_GOALS, LAST_7_DAYS, MEALS_TODAY, WEEK_PLAN } from '../../data/sampleDashboard.js';
import { activeTargets } from '../../data/profile.js';

const fmt = (n) => n.toLocaleString('en-US');
const sum = (key) => MEALS_TODAY.reduce((total, m) => total + m[key], 0);

const MACROS = [
  { key: 'protein', label: 'Protein' },
  { key: 'carbs', label: 'Carbs' },
  { key: 'fat', label: 'Fat' },
  { key: 'fiber', label: 'Fiber' },
];

function Meter({ label, value, goal, unit }) {
  return (
    <div className="meter">
      <div className="meter-row">
        <span>{label}</span>
        <span><b>{fmt(value)}</b> of {fmt(goal)} {unit}</span>
      </div>
      <div className="meter-track" aria-hidden>
        <span style={{ width: `${Math.min((value / goal) * 100, 100)}%` }} />
      </div>
    </div>
  );
}

// One series against one goal line, all on a shared scale from zero.
function CaloriesChart({ goal }) {
  const scaleMax = Math.max(2400, goal * 1.15);
  const pct = (kcal) => `${(kcal / scaleMax) * 100}%`;

  return (
    <figure className="bars-figure">
      <div className="bars" role="group" aria-label="Calories per day for the last 7 days">
        <div className="bars-goal" style={{ bottom: pct(goal) }}>
          <span>Goal {fmt(goal)}</span>
        </div>
        {LAST_7_DAYS.map((d) => {
          const text = `${d.day}: ${fmt(d.kcal)} kcal${d.today ? ' so far' : ''}`;
          return (
            <div key={d.day} className="bar-col" tabIndex={0} role="img" aria-label={text}>
              <span className="bar-tip" aria-hidden>{text}</span>
              <span className={`bar${d.today ? ' bar-today' : ''}`} style={{ height: pct(d.kcal) }} />
            </div>
          );
        })}
      </div>
      <div className="bars-days" aria-hidden>
        {LAST_7_DAYS.map((d) => (
          <span key={d.day} className={d.today ? 'is-today' : undefined}>
            {d.today ? 'Today' : d.day}
          </span>
        ))}
      </div>
      <details className="bars-table">
        <summary>View as a table</summary>
        <table>
          <thead>
            <tr><th scope="col">Day</th><th scope="col">Calories</th></tr>
          </thead>
          <tbody>
            {LAST_7_DAYS.map((d) => (
              <tr key={d.day}>
                <th scope="row">{d.today ? 'Today (so far)' : d.day}</th>
                <td>{fmt(d.kcal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}

export default function Nutrition() {
  const { profile } = useOutletContext();
  const personal = activeTargets(profile);
  const GOALS = personal ?? SAMPLE_GOALS;
  const eaten = sum('kcal');
  const left = GOALS.kcal - eaten;
  const dinner = WEEK_PLAN.find((d) => d.today);

  return (
    <>
      <p className="dash-sample">
        Meals and history are sample data.{' '}
        {personal ? 'Goals come from your profile.' : <>Goals are samples until you <Link to="/dashboard/profile">complete your profile</Link>.</>}
      </p>
      <h1 className="dash-title">Thursday&apos;s nutrition</h1>

      <section className="dash-today" aria-label="Today's totals">
        <div className="dash-hero">
          <p className="dash-hero-num">{fmt(Math.abs(left))}</p>
          <p className="dash-hero-label">{left >= 0 ? 'calories left today' : 'calories over today'}</p>
          <p className="dash-hero-sub">
            {fmt(eaten)} eaten of your {fmt(GOALS.kcal)} goal. Tonight&apos;s {dinner.meal.toLowerCase()} is{' '}
            {fmt(dinner.kcal)} kcal{dinner.kcal <= left ? ', so it fits.' : ", a little over what's left."}
          </p>
          <Link to="/dashboard/meal-plan" className="text-link">See this week&apos;s plan</Link>
        </div>
        <div className="meters">
          {MACROS.map((m) => (
            <Meter key={m.key} label={m.label} value={sum(m.key)} goal={GOALS[m.key]} unit="g" />
          ))}
        </div>
      </section>

      <div className="dash-columns">
        <section aria-labelledby="week-kcal-title">
          <h2 id="week-kcal-title" className="dash-h2">Calories, last 7 days</h2>
          <CaloriesChart goal={GOALS.kcal} />
        </section>

        <section aria-labelledby="meals-title">
          <h2 id="meals-title" className="dash-h2">Eaten today</h2>
          <ul className="dash-rows">
            {MEALS_TODAY.map((m) => (
              <li key={m.name} className="dash-row">
                <span>
                  <b>{m.name}</b>
                  <small>{m.dish}</small>
                </span>
                <span className="dash-row-num">{fmt(m.kcal)} kcal</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
