import { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { Basket, CalendarBlank, ChartDonut, CookingPot, SignOut, User } from '@phosphor-icons/react';
import Logo from './Logo.jsx';
import ThemeToggle from './ThemeToggle.jsx';
import { INITIAL_GROCERIES, INITIAL_PANTRY } from '../data/sampleDashboard.js';
import { loadProfile } from '../data/profile.js';

const LINKS = [
  { to: '/dashboard', label: 'Generate', icon: CookingPot, end: true },
  { to: '/dashboard/nutrition', label: 'Nutrition', icon: ChartDonut },
  { to: '/dashboard/pantry', label: 'Pantry', icon: Basket },
  { to: '/dashboard/meal-plan', label: 'Meal plan', icon: CalendarBlank },
];

export default function DashboardLayout() {
  // Kept here so edits survive moving between dashboard pages.
  const [pantry, setPantry] = useState(INITIAL_PANTRY);
  const [groceries, setGroceries] = useState(INITIAL_GROCERIES);
  const [profile, setProfile] = useState(loadProfile);

  return (
    <div className="dash">
      <aside className="dash-side">
        <div className="dash-brand">
          <Link to="/dashboard" className="header-logo" aria-label="NutriChef AI dashboard">
            <Logo />
          </Link>
          <ThemeToggle />
        </div>
        <nav className="dash-nav" aria-label="Dashboard">
          {LINKS.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className="dash-link">
              <Icon size={22} aria-hidden />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="dash-tools">
          <Link to="/" className="dash-logout">
            <SignOut size={20} aria-hidden /> Log out
          </Link>
          <NavLink to="/dashboard/profile" className="dash-head" aria-label="Your profile" title="Your profile">
            <User size={20} weight="bold" aria-hidden />
          </NavLink>
        </div>
      </aside>

      <main id="main" className="dash-main" tabIndex={-1}>
        <Outlet context={{ pantry, setPantry, groceries, setGroceries, profile, setProfile }} />
      </main>
    </div>
  );
}
