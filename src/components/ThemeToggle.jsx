// Light/dark mode button in the header.
import { useState } from 'react';
import { Sun, Moon } from '@phosphor-icons/react';

// The current theme is stored as data-theme on the <html> element.
function readTheme() {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState(readTheme);
  // The theme a click will switch to.
  const next = theme === 'dark' ? 'light' : 'dark';

  // Apply the new theme and remember it for next time.
  function toggle() {
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem('nc-theme', next);
    } catch {
      // Storage can be unavailable (private mode); the toggle still works for this visit.
    }
    setTheme(next);
  }

  return (
    <button
      type="button"
      className="icon-btn"
      onClick={toggle}
      aria-label={`Switch to ${next} mode`}
      title={`Switch to ${next} mode`}
    >
      {theme === 'dark' ? <Sun size={20} aria-hidden /> : <Moon size={20} aria-hidden />}
    </button>
  );
}
