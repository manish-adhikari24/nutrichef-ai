// Profile button for the top bar. It opens a small menu: name and email, Your profile, Settings and Log out.
// Follows the menu-button pattern: Escape or a click elsewhere closes it, and arrow keys move between items.
import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { GearSix, SignOut, User, UserCircle } from '@phosphor-icons/react';

// profile: the signed-in user's profile ({ firstName, lastName, email }). onSignOut: logs out.
export default function ProfileMenu({ profile, onSignOut }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const buttonRef = useRef(null);
  const { pathname } = useLocation();

  // Close the menu whenever the page changes.
  useEffect(() => setOpen(false), [pathname]);

  // While open: a click outside closes it.
  useEffect(() => {
    if (!open) return undefined;
    const onPointer = (e) => { if (!wrapRef.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onPointer);
    return () => document.removeEventListener('mousedown', onPointer);
  }, [open]);

  // When it opens, move focus to the first item, so keyboard users land inside the menu.
  useEffect(() => {
    if (open) wrapRef.current?.querySelector('[role="menuitem"]')?.focus();
  }, [open]);

  // Escape closes and returns focus to the button. Arrow keys, Home and End move between items.
  function onMenuKeyDown(e) {
    const items = [...wrapRef.current.querySelectorAll('[role="menuitem"]')];
    const index = items.indexOf(document.activeElement);
    const moves = { ArrowDown: index + 1, ArrowUp: index - 1, Home: 0, End: items.length - 1 };
    if (e.key === 'Escape') {
      setOpen(false);
      buttonRef.current?.focus();
    } else if (e.key in moves) {
      e.preventDefault();
      items[(moves[e.key] + items.length) % items.length]?.focus();
    } else if (e.key === 'Tab') {
      setOpen(false);
    }
  }

  const name = [profile.firstName, profile.lastName].filter(Boolean).join(' ') || 'Your account';

  return (
    <div className="profile-menu" ref={wrapRef}>
      <button
        ref={buttonRef}
        type="button"
        className={`dash-head${open ? ' is-open' : ''}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls="profile-menu-list"
        aria-label="Account menu"
        title="Account menu"
        onClick={() => setOpen((o) => !o)}
      >
        <User size={20} weight="bold" aria-hidden />
      </button>

      {open && (
        <div id="profile-menu-list" className="profile-menu-list" role="menu" aria-label="Account" onKeyDown={onMenuKeyDown}>
          {/* Who is signed in. */}
          <div className="profile-menu-who">
            <b>{name}</b>
            <small>{profile.email}</small>
          </div>
          <Link to="/dashboard/profile" role="menuitem" className="profile-menu-item"><UserCircle size={20} aria-hidden /> Your profile</Link>
          <Link to="/dashboard/settings" role="menuitem" className="profile-menu-item"><GearSix size={20} aria-hidden /> Settings</Link>
          <button type="button" role="menuitem" className="profile-menu-item is-signout" onClick={onSignOut}><SignOut size={20} aria-hidden /> Log out</button>
        </div>
      )}
    </div>
  );
}
