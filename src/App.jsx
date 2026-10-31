import { useEffect, useRef } from 'react';
import { Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import Header from './components/Header.jsx';
import Footer from './components/Footer.jsx';
import DashboardLayout from './components/DashboardLayout.jsx';
import Home from './pages/Home.jsx';
import HowItWorks from './pages/HowItWorks.jsx';
import Features from './pages/Features.jsx';
import Story from './pages/Story.jsx';
import SignUp from './pages/SignUp.jsx';
import Login from './pages/Login.jsx';
import NotFound from './pages/NotFound.jsx';
import GenerateRecipe from './pages/dashboard/GenerateRecipe.jsx';
import Profile from './pages/dashboard/Profile.jsx';
import Nutrition from './pages/dashboard/Nutrition.jsx';
import Pantry from './pages/dashboard/Pantry.jsx';
import MealPlan from './pages/dashboard/MealPlan.jsx';

const TITLES = {
  '/': 'NutriChef AI | Cook what you have. Eat what you need.',
  '/how-it-works': 'How it works | NutriChef AI',
  '/features': 'Features | NutriChef AI',
  '/our-story': 'Our story | NutriChef AI',
  '/signup': 'Create your account | NutriChef AI',
  '/login': 'Log in | NutriChef AI',
  '/dashboard': 'Generate a recipe | NutriChef AI',
  '/dashboard/nutrition': 'Nutrition | NutriChef AI',
  '/dashboard/profile': 'Your profile | NutriChef AI',
  '/dashboard/pantry': 'Pantry | NutriChef AI',
  '/dashboard/meal-plan': 'Meal plan | NutriChef AI',
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
          <Route path="/our-story" element={<Story />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signin" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<NotFound />} />
        </Route>
        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route index element={<GenerateRecipe />} />
          <Route path="nutrition" element={<Nutrition />} />
          <Route path="profile" element={<Profile />} />
          <Route path="pantry" element={<Pantry />} />
          <Route path="meal-plan" element={<MealPlan />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </>
  );
}
