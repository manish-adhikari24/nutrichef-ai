import { useEffect, useRef, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { deleteAccount, saveProfile } from '../../lib/api.js';

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

  async function toggle(key, on, label) {
    try {
      setProfile(await saveProfile({ ...profile, [key]: on }));
      setStatus(`${label} turned ${on ? 'on' : 'off'}.`);
    } catch (error) {
      setStatus(error.message);
    }
  }

  async function erase() {
    try {
      await deleteAccount();
      navigate('/');
    } catch (error) {
      setConfirming(false);
      setStatus(error.message);
    }
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
          This permanently deletes your account, profile, saved recipes and food log. It can&apos;t be undone.
        </p>
        <button type="button" className="btn btn-danger" onClick={() => setConfirming(true)}>Delete my data</button>
      </section>

      <dialog ref={dialogRef} className="confirm-dialog" aria-labelledby="erase-title" onClose={() => setConfirming(false)}>
        <h2 id="erase-title" className="dash-h2">Delete all your data?</h2>
        <p>This permanently removes your account, profile, saved recipes and food log.</p>
        <div className="confirm-actions">
          <button type="button" className="btn btn-ghost" onClick={() => setConfirming(false)}>Keep my data</button>
          <button type="button" className="btn btn-danger" onClick={erase}>Delete my data</button>
        </div>
      </dialog>
    </>
  );
}
