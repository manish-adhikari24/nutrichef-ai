// The app's routes: public pages share the header and footer, and dashboard pages share the dashboard layout.
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
import VerifyEmail from './pages/VerifyEmail.jsx';
import ForgotPassword from './pages/ForgotPassword.jsx';
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

// Browser tab title for each page.
const TITLES = {
  '/': 'NutriChef AI | Cook what you have. Eat what you need.',
  '/how-it-works': 'How it works | NutriChef AI',
  '/features': 'Features | NutriChef AI',
  '/results': 'Results | NutriChef AI',
  '/reviews': 'Reviews | NutriChef AI',
  '/our-story': 'Our story | NutriChef AI',
  '/signup': 'Create your account | NutriChef AI',
  '/login': 'Sign in | NutriChef AI',
  '/verify-email': 'Verify your email | NutriChef AI',
  '/forgot-password': 'Reset your password | NutriChef AI',
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

// Wrapper for the public pages: header, page content, footer.
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
  // Skip the focus move on first load, so the page doesn't jump.
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
      {/* Lets keyboard users jump past the menu. */}
      <a className="skip-link" href="#main">Skip to content</a>
      <Routes>
        {/* Public pages. Unknown addresses show the 404 page. */}
        <Route element={<SiteLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
          <Route path="/features" element={<Features />} />
          <Route path="/results" element={<Results />} />
          <Route path="/reviews" element={<Reviews />} />
          <Route path="/our-story" element={<Story />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/login" element={<Login />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/signin" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<NotFound />} />
        </Route>
        {/* Signed-in pages. DashboardLayout sends signed-out visitors to login. */}
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
