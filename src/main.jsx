// Entry point: loads the global styles and puts the React app on the page.
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import App from './App.jsx';
// Stylesheets, in order: design tokens first, then base, layout and page styles.
import './styles/tokens.css';
import './styles/base.css';
import './styles/layout.css';
import './styles/pages.css';
import './styles/dashboard.css';
import './styles/app-pages.css';
import './styles/report-ui.css';

// The shareable build is hosted where the URL can't change, so it keeps
// navigation in memory. Normal builds use real URLs.
const Router = import.meta.env.MODE === 'share' ? MemoryRouter : BrowserRouter;

// StrictMode adds extra checks while developing. The router enables page navigation.
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Router>
      <App />
    </Router>
  </StrictMode>
);
