import { useState } from 'react';
import { Link, Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  ChartDonut,
  ChartLineUp,
  CookingPot,
  DotsThree,
  FirstAidKit,
  GearSix,
  Heart,
  House,
  Question,
  BookmarkSimple,
  SignOut,
  User,
} from '@phosphor-icons/react';
import Logo from './Logo.jsx';
import ThemeToggle from './ThemeToggle.jsx';
import { getProfile, isSignedIn, logout } from '../lib/api.js';
import { useLoad } from '../lib/useLoad.js';
import LoadStatus from './LoadStatus.jsx';

export const NAV_GROUPS = [
  {
    label: 'Main',
    links: [
      { to: '/dashboard', label: 'Dashboard', icon: House, end: true },
      { to: '/dashboard/generate', label: 'Generate recipe', short: 'Generate', icon: CookingPot },
      { to: '/dashboard/saved', label: 'Saved recipes', short: 'Saved', icon: BookmarkSimple },
      { to: '/dashboard/nutrition', label: 'Nutrition tracker', short: 'Nutrition', icon: ChartDonut },
    ],
  },
  {
    label: 'Health',
    links: [
      { to: '/dashboard/allergies', label: 'Allergy profile', icon: FirstAidKit },
      { to: '/dashboard/progress', label: 'Progress', icon: ChartLineUp },
      { to: '/dashboard/wellness', label: 'Wellness', icon: Heart },
    ],
  },
  {
    label: 'Account',
    links: [
      { to: '/dashboard/settings', label: 'Settings', icon: GearSix },
      { to: '/dashboard/help', label: 'Help', icon: Question },
    ],
  },
];

export default function DashboardLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { data: profile, setData: setProfile, error, loading, reload } = useLoad(() => (isSignedIn() ? getProfile() : null));
  // Kept here so the latest recipe is still there after visiting another page.
  const [currentRecipe, setCurrentRecipe] = useState(null);

  if (!isSignedIn()) return <Navigate to="/login" replace state={{ from: location.pathname }} />;

  function signOut() {
    logout();
    navigate('/');
  }

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
          {NAV_GROUPS.map((group) => (
            <div key={group.label} className={`dash-group dash-group-${group.label.toLowerCase()}`}>
              <p className="dash-group-label">{group.label}</p>
              {group.links.map(({ to, label, short, icon: Icon, end }) => (
                <NavLink key={to} to={to} end={end} className="dash-link">
                  <Icon size={22} aria-hidden />
                  <span className="dash-link-full">{label}</span>
                  <span className="dash-link-short">{short ?? label}</span>
                </NavLink>
              ))}
            </div>
          ))}
          <NavLink to="/dashboard/more" className="dash-link dash-link-more">
            <DotsThree size={22} aria-hidden />
            <span>More</span>
          </NavLink>
        </nav>
        <div className="dash-tools">
          <button type="button" className="dash-logout" onClick={signOut}>
            <SignOut size={20} aria-hidden /> Log out
          </button>
          <NavLink to="/dashboard/profile" className="dash-head" aria-label="Your profile" title="Your profile">
            <User size={20} weight="bold" aria-hidden />
          </NavLink>
        </div>
      </aside>

      <main id="main" className="dash-main" tabIndex={-1}>
        {profile ? (
          <Outlet context={{ profile, setProfile, currentRecipe, setCurrentRecipe }} />
        ) : (
          <LoadStatus loading={loading} error={error} onRetry={reload} />
        )}
      </main>
    </div>
  );
}
