// Header for the public pages: logo, main links, theme toggle, sign-in buttons and the phone menu.
import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { List, X } from '@phosphor-icons/react';
import Logo from './Logo.jsx';
import ThemeToggle from './ThemeToggle.jsx';

// The main navigation links. `end` makes Home active only on "/" exactly.
const LINKS = [
  { to: '/', label: 'Home', end: true },
  { to: '/features', label: 'Features' },
  { to: '/how-it-works', label: 'How it works' },
  { to: '/results', label: 'Results' },
  { to: '/reviews', label: 'Reviews' },
];

export default function Header() {
  // Whether the phone menu is open.
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();

  // Close the phone menu whenever the page changes.
  useEffect(() => setOpen(false), [pathname]);

  // While the menu is open, Escape closes it.
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <header className="site-header">
      <div className="wrap header-row">
        <Link to="/" className="header-logo" aria-label="NutriChef AI home">
          <Logo />
        </Link>

        {/* Desktop links. */}
        <nav className="main-nav" aria-label="Main">
          {LINKS.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className="nav-link">
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="header-actions">
          <ThemeToggle />
          <NavLink to="/login" className="nav-link login-link">
            Sign in
          </NavLink>
          <Link to="/signup" className="btn btn-primary btn-sm header-signup">
            Get started free
          </Link>
          {/* Phone menu button. */}
          <button
            type="button"
            className="icon-btn menu-btn"
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? 'Close menu' : 'Open menu'}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <X size={22} aria-hidden /> : <List size={22} aria-hidden />}
          </button>
        </div>
      </div>

      {/* Phone menu, shown when data-open is true. */}
      <nav id="mobile-menu" className="mobile-menu" data-open={open} aria-label="Mobile">
        <div className="wrap">
          {LINKS.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className="mobile-link">
              {l.label}
            </NavLink>
          ))}
          <Link to="/signup" className="btn btn-primary mobile-cta">
            Get started free
          </Link>
        </div>
      </nav>
    </header>
  );
}
