import { Link, useOutletContext } from 'react-router-dom';
import WellnessCard from '../../components/WellnessCard.jsx';
import { mealsOn, totalsFor } from '../../lib/api.js';
import { suggestWellness } from '../../lib/rules.js';

export default function Wellness() {
  const { profile } = useOutletContext();
  const suggestion = suggestWellness(profile, totalsFor(mealsOn()).kcal);

  return (
    <>
      <h1 className="dash-title">Wellness</h1>
      {suggestion ? (
        <WellnessCard suggestion={suggestion} />
      ) : (
        <p className="dash-empty">
          {profile.showWellness ? (
            <>Set your goal in your <Link to="/dashboard/profile" className="inline-link">profile</Link> to get a suggestion.</>
          ) : (
            <>Wellness suggestions are turned off. Turn them back on in <Link to="/dashboard/settings" className="inline-link">Settings</Link>.</>
          )}
        </p>
      )}
    </>
  );
}
