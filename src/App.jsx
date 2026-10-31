import { useEffect, useRef } from 'react';
import { Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import Header from './components/Header.jsx';
import Footer from './components/Footer.jsx';
import DashboardLayout from './components/DashboardLayout.jsx';
import Home from './pages/Home.jsx';
import HowItWorks from './pages/HowItWorks.jsx';
import Features from './pages/Features.jsx';
import Results from './pages/Results.jsx';
import Reviews from './pages/Reviews.jsx';
import Story from './pages/Story.jsx';
import SignUp from './pages/SignUp.jsx';
import Login from './pages/Login.jsx';
import NotFound from './pages/NotFound.jsx';
import Dashboard from './pages/dashboard/Dashboard.jsx';
import GenerateRecipe from './pages/dashboard/GenerateRecipe.jsx';
import SavedRecipes from './pages/dashboard/SavedRecipes.jsx';
import Nutrition from './pages/dashboard/Nutrition.jsx';
import AllergyProfile from './pages/dashboard/AllergyProfile.jsx';
import Progress from './pages/dashboard/Progress.jsx';
import Wellness from './pages/dashboard/Wellness.jsx';
import Settings from './pages/dashboard/Settings.jsx';
import Help from './pages/dashboard/Help.jsx';
import More from './pages/dashboard/More.jsx';
import Profile from './pages/dashboard/Profile.jsx';

const TITLES = {
  '/': 'NutriChef AI | Cook what you have. Eat what you need.',
  '/how-it-works': 'How it works | NutriChef AI',
  '/features': 'Features | NutriChef AI',
  '/results': 'Results | NutriChef AI',
  '/reviews': 'Reviews | NutriChef AI',
  '/our-story': 'Our story | NutriChef AI',
  '/signup': 'Create your account | NutriChef AI',
  '/login': 'Sign in | NutriChef AI',
  '/dashboard': 'Dashboard | NutriChef AI',
  '/dashboard/generate': 'Generate recipe | NutriChef AI',
  '/dashboard/saved': 'Saved recipes | NutriChef AI',
  '/dashboard/nutrition': 'Nutrition tracker | NutriChef AI',
  '/dashboard/allergies': 'Allergy profile | NutriChef AI',
  '/dashboard/progress': 'Progress | NutriChef AI',
  '/dashboard/wellness': 'Wellness | NutriChef AI',
  '/dashboard/settings': 'Settings | NutriChef AI',
  '/dashboard/help': 'Help | NutriChef AI',
  '/dashboard/more': 'More | NutriChef AI',
  '/dashboard/profile': 'Your profile | NutriChef AI',
};

function SiteLayout() {
  return (
    <>
      <Header />
      <main id="main" tabIndex={-1}>
        <Outlet />
      </main>
      <Footer />
    </>
  );
}

export default function App() {
  const { pathname } = useLocation();
  const firstRender = useRef(true);

  // On every route change: reset scroll, update the title, move focus to the new page.
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = TITLES[pathname] ?? 'Page not found | NutriChef AI';
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    document.getElementById('main')?.focus({ preventScroll: true });
  }, [pathname]);

  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      <Routes>
        <Route element={<SiteLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
          <Route path="/features" element={<Features />} />
          <Route path="/results" element={<Results />} />
          <Route path="/reviews" element={<Reviews />} />
          <Route path="/our-story" element={<Story />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signin" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<NotFound />} />
        </Route>
        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="generate" element={<GenerateRecipe />} />
          <Route path="saved" element={<SavedRecipes />} />
          <Route path="nutrition" element={<Nutrition />} />
          <Route path="allergies" element={<AllergyProfile />} />
          <Route path="progress" element={<Progress />} />
          <Route path="wellness" element={<Wellness />} />
          <Route path="settings" element={<Settings />} />
          <Route path="help" element={<Help />} />
          <Route path="more" element={<More />} />
          <Route path="profile" element={<Profile />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </>
  );
}
