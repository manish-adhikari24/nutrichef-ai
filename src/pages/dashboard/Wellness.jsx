import { Link, useOutletContext } from 'react-router-dom';
import WellnessCard from '../../components/WellnessCard.jsx';
import LoadStatus from '../../components/LoadStatus.jsx';
import { getDashboard } from '../../lib/api.js';
import { useLoad } from '../../lib/useLoad.js';

export default function Wellness() {
  const { profile } = useOutletContext();
  const { data, error, loading, reload } = useLoad(getDashboard);
  const suggestion = data?.wellness;

  return (
    <>
      <h1 className="dash-title">Wellness</h1>
      {!data ? (
        <LoadStatus loading={loading} error={error} onRetry={reload} />
      ) : suggestion ? (
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
