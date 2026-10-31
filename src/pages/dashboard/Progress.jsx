import { Link, useOutletContext } from 'react-router-dom';
import LoadStatus from '../../components/LoadStatus.jsx';
import { getLog } from '../../lib/api.js';
import { dailyTargets, intakeStatus } from '../../lib/nutrition.js';
import { useLoad } from '../../lib/useLoad.js';

const fmt = (n) => n.toLocaleString('en-US');

export default function Progress() {
  const { profile } = useOutletContext();
  const { data, error, loading, reload } = useLoad(getLog);
  const targets = dailyTargets(profile);

  if (!data) {
    return (
      <>
        <h1 className="dash-title">Your progress</h1>
        <LoadStatus loading={loading} error={error} onRetry={reload} />
      </>
    );
  }

  const days = data.days.map((d, index) => ({
    ...d,
    // Noon avoids the date shifting across time zones when parsed.
    day: index === data.days.length - 1 ? 'Today' : new Date(`${d.date}T12:00:00`).toLocaleDateString('en-AU', { weekday: 'short' }),
  }));
  const logged = days.filter((d) => d.kcal > 0);
  const scaleMax = Math.max(2400, (targets?.kcal ?? 0) * 1.15, ...days.map((d) => d.kcal * 1.1));
  const pct = (value) => `${(value / scaleMax) * 100}%`;

  return (
    <>
      <h1 className="dash-title">Your progress</h1>

      {logged.length === 0 ? (
        <p className="dash-empty">
          No meals logged in the last 7 days. <Link to="/dashboard/generate" className="inline-link">Generate a recipe</Link> and log it to start your chart.
        </p>
      ) : (
        <>
          <section aria-labelledby="chart-title">
            <h2 id="chart-title" className="dash-h2">Calories, last 7 days</h2>
            <figure className="bars-figure">
              <div className="bars" role="group" aria-label="Calories per day for the last 7 days">
                {targets && (
                  <div className="bars-goal" style={{ bottom: pct(targets.kcal) }}>
                    <span>Goal {fmt(targets.kcal)}</span>
                  </div>
                )}
                {days.map((d) => {
                  const label = `${d.day}: ${fmt(d.kcal)} kcal`;
                  return (
                    <div key={d.date} className="bar-col" tabIndex={0} role="img" aria-label={label}>
                      <span className="bar-tip" aria-hidden="true">{label}</span>
                      <span className="bar" style={{ height: pct(d.kcal) }} />
                    </div>
                  );
                })}
              </div>
              <div className="bars-days" aria-hidden="true">
                {days.map((d) => <span key={d.date}>{d.day}</span>)}
              </div>
            </figure>
          </section>

          <section aria-labelledby="table-title" className="dash-section">
            <h2 id="table-title" className="dash-h2">Day by day</h2>
            <div className="table-scroll">
              <table className="progress-table">
                <thead>
                  <tr><th scope="col">Day</th><th scope="col">Calories</th><th scope="col">Protein</th><th scope="col">Carbs</th><th scope="col">Fat</th><th scope="col">Status</th></tr>
                </thead>
                <tbody>
                  {days.map((d) => (
                    <tr key={d.date}>
                      <th scope="row">{d.day}</th>
                      <td>{fmt(d.kcal)}</td>
                      <td>{d.protein}g</td>
                      <td>{d.carbs}g</td>
                      <td>{d.fat}g</td>
                      <td>{d.kcal > 0 && targets ? intakeStatus(d.kcal, targets.kcal) : 'No data'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </>
  );
}
