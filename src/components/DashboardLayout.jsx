// Layout for every signed-in page: sidebar menu (bottom bar on phones), then the current page.
import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  ChartDonut,
  ChartLineUp,
  CookingPot,
  DotsThree,
  GearSix,
  Heart,
  House,
  PersonSimpleWalk,
  Question,
} from '@phosphor-icons/react';
import Logo from './Logo.jsx';
import ProfileMenu from './ProfileMenu.jsx';
import ThemeToggle from './ThemeToggle.jsx';
import { getProfile, getReference, isSignedIn, listRecent, logout } from '../lib/api.js';
import { useLoad } from '../lib/useLoad.js';
import LoadStatus from './LoadStatus.jsx';

// The dashboard menu, in groups. `short` is the label used in the phone's bottom bar.
export const NAV_GROUPS = [
  {
    label: 'Main',
    links: [
      { to: '/dashboard', label: 'Dashboard', icon: House, end: true },
      { to: '/dashboard/generate', label: 'Generate recipe', short: 'Generate', icon: CookingPot },
      { to: '/dashboard/saved', label: 'Favourites', short: 'Favourites', icon: Heart },
      { to: '/dashboard/nutrition', label: 'Nutrition tracker', short: 'Nutrition', icon: ChartDonut },
    ],
  },
  {
    label: 'Health',
    links: [
      { to: '/dashboard/progress', label: 'Progress', icon: ChartLineUp },
      { to: '/dashboard/wellness', label: 'Wellness', icon: PersonSimpleWalk },
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

// An empty Generate form. Prep time stores the minutes as text ('30'), or 'any'.
const EMPTY_DRAFT = {
  rawIngredients: [],
  filters: { meal: 'Dinner', cuisine: 'Any', time: '30', difficulty: 'Any', budget: 'Any' },
  useCalories: false,
  calories: 500,
  servings: 2,
  notes: '',
};

export default function DashboardLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  // Load the profile once, if signed in. Every dashboard page gets it from here.
  const { data: profile, setData: setProfile, error, loading, reload } = useLoad(() => (isSignedIn() ? getProfile() : null));
  // The seeded lists (allergens, ingredients, goals, diets, form choices), loaded once from the database.
  const ref = useLoad(getReference);
  // The Generate form, kept here so it's still filled in after visiting the recipe page.
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  // The recipe being written: { request, promise }. Kept here so leaving the page doesn't stop it.
  const [generation, setGeneration] = useState(null);
  // The 10 newest recipes for the sidebar.
  const [recent, setRecent] = useState([]);

  const reloadRecent = useCallback(async () => {
    try {
      setRecent((await listRecent()).results);
    } catch {
      // The list is a convenience. If it fails, the rest of the app still works.
    }
  }, []);

  // Load the list once when signed in.
  useEffect(() => {
    if (isSignedIn()) reloadRecent();
  }, [reloadRecent]);

  // Start writing a recipe with the given API call (real or sample). The new recipe joins Recent recipes.
  const startGeneration = useCallback((request, call) => {
    const promise = call(request).then((recipe) => {
      reloadRecent();
      return recipe;
    });
    // Stop the browser warning about an unhandled error. The recipe page shows it instead.
    promise.catch(() => {});
    setGeneration({ request, promise });
  }, [reloadRecent]);

  // Signed out in another tab: this tab follows straight away, so it doesn't keep showing account data.
  useEffect(() => {
    function onStorage(event) {
      if ((event.key === 'nc-access' || event.key === null) && !isSignedIn()) navigate('/login', { replace: true });
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [navigate]);

  // Not signed in: go to login, remembering which page they wanted.
  if (!isSignedIn()) return <Navigate to="/login" replace state={{ from: location.pathname }} />;

  // Log out: clear the tokens and go to the home page.
  function signOut() {
    logout();
    navigate('/');
  }

  return (
    <div className="dash">
      {/* Sidebar: logo and menu. */}
      <aside className="dash-side">
        <div className="dash-brand">
          <Link to="/dashboard" className="header-logo" aria-label="NutriChef AI dashboard">
            <Logo />
          </Link>
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
              {/* Recent recipes go under the Main links (hidden in the phone's bottom bar). */}
              {group.label === 'Main' && <RecentRecipes items={recent} writing={generation} />}
            </div>
          ))}
          {/* "More" link, shown only in the phone's bottom bar. */}
          <NavLink to="/dashboard/more" className="dash-link dash-link-more">
            <DotsThree size={22} aria-hidden />
            <span>More</span>
          </NavLink>
        </nav>
      </aside>

      <div className="dash-content">
        {/* Top bar: light/dark mode and the account menu (profile, settings, log out). Stays in view while scrolling. */}
        <header className="dash-topbar">
          <ThemeToggle />
          {profile && <ProfileMenu profile={profile} onSignOut={signOut} />}
        </header>

      {/* The page's content. Shared data is passed to it through the Outlet context. */}
      <main id="main" className="dash-main" tabIndex={-1}>
        {profile && ref.data ? (
          <Outlet context={{ profile, setProfile, reference: ref.data, draft, setDraft, generation, startGeneration, recent, reloadRecent }} />
        ) : (
          <LoadStatus
            loading={loading || ref.loading}
            error={error ?? ref.error}
            onRetry={() => { if (error) reload(); if (ref.error) ref.reload(); }}
          />
        )}
      </main>
      </div>
    </div>
  );
}

// "Recent recipes" in the sidebar: the 10 newest recipes, saved automatically when generated.
// `writing` is set while a recipe is being written, and links to its progress page.
export function RecentRecipes({ items, writing }) {
  return (
    <div className="recent-nav" aria-labelledby="recent-nav-title">
      <p id="recent-nav-title" className="dash-group-label">Recent recipes</p>
      {writing && <WritingLink writing={writing} />}
      {items.length === 0 && !writing ? (
        <p className="recent-nav-empty">Recipes you generate appear here.</p>
      ) : (
        <ul>
          {items.map((item) => (
            <li key={item.id}>
              <NavLink to={`/dashboard/recipe/${item.id}`} className="recent-nav-link" title={item.title}>{item.title}</NavLink>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// A "Writing your recipe…" link, shown only until the recipe is finished or fails.
function WritingLink({ writing }) {
  const [done, setDone] = useState(false);
  useEffect(() => {
    let active = true;
    setDone(false);
    writing.promise.then(() => active && setDone(true), () => active && setDone(true));
    return () => { active = false; };
  }, [writing]);
  if (done) return null;
  return <NavLink to="/dashboard/recipe/new" className="recent-nav-link is-writing">Writing your recipe…</NavLink>;
}
