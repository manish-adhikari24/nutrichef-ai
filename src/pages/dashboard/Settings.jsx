import { useEffect, useRef, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { clearAllData, saveProfile } from '../../lib/api.js';

export default function Settings() {
  const { profile, setProfile } = useOutletContext();
  const navigate = useNavigate();
  const [status, setStatus] = useState('');
  const [confirming, setConfirming] = useState(false);
  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (confirming && !dialog.open) dialog.showModal();
    if (!confirming && dialog.open) dialog.close();
  }, [confirming]);

  function toggle(key, on, label) {
    const next = { ...profile, [key]: on };
    if (saveProfile(next)) {
      setProfile(next);
      setStatus(`${label} turned ${on ? 'on' : 'off'}.`);
    }
  }

  function erase() {
    clearAllData();
    navigate('/');
  }

  return (
    <>
      <h1 className="dash-title">Settings</h1>

      <section aria-labelledby="sugg-title" className="profile-section">
        <h2 id="sugg-title" className="dash-h2">Suggestions</h2>
        <label className="check-row profile-check">
          <input type="checkbox" checked={profile.showSupplements} onChange={(e) => toggle('showSupplements', e.target.checked, 'Supplement suggestions')} />
          <span>Show optional supplement suggestions on recipes</span>
        </label>
        <label className="check-row profile-check">
          <input type="checkbox" checked={profile.showWellness} onChange={(e) => toggle('showWellness', e.target.checked, 'Wellness suggestions')} />
          <span>Show wellness suggestions on the dashboard</span>
        </label>
        <p role="status" className="profile-status">{status}</p>
      </section>

      <section aria-labelledby="data-title" className="profile-section">
        <h2 id="data-title" className="dash-h2">Your data</h2>
        <p className="settings-text">
          Your account, profile and recipes are stored in this browser for now. Deleting them signs you out and can&apos;t be undone.
        </p>
        <button type="button" className="btn btn-danger" onClick={() => setConfirming(true)}>Delete my data</button>
      </section>

      <dialog ref={dialogRef} className="confirm-dialog" aria-labelledby="erase-title" onClose={() => setConfirming(false)}>
        <h2 id="erase-title" className="dash-h2">Delete all your data?</h2>
        <p>This removes your account, profile, saved recipes and food log from this browser.</p>
        <div className="confirm-actions">
          <button type="button" className="btn btn-ghost" onClick={() => setConfirming(false)}>Keep my data</button>
          <button type="button" className="btn btn-danger" onClick={erase}>Delete my data</button>
        </div>
      </dialog>
    </>
  );
}
