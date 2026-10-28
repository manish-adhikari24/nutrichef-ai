import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { List, X } from '@phosphor-icons/react';
import Logo from './Logo.jsx';
import ThemeToggle from './ThemeToggle.jsx';

const LINKS = [
  { to: '/', label: 'Home', end: true },
  { to: '/how-it-works', label: 'How it works' },
  { to: '/features', label: 'Features' },
  { to: '/our-story', label: 'Our story' },
];

export default function Header() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => setOpen(false), [pathname]);

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

        <nav className="main-nav" aria-label="Main">
          {LINKS.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className="nav-link">
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="header-actions">
          <ThemeToggle />
          <NavLink to="/signin" className="nav-link signin-link">
            Sign in
          </NavLink>
          <Link to="/signup" className="btn btn-primary btn-sm header-signup">
            Sign up free
          </Link>
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

      <nav id="mobile-menu" className="mobile-menu" data-open={open} aria-label="Mobile">
        <div className="wrap">
          {LINKS.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className="mobile-link">
              {l.label}
            </NavLink>
          ))}
          <Link to="/signup" className="btn btn-primary mobile-cta">
            Sign up free
          </Link>
        </div>
      </nav>
    </header>
  );
}
