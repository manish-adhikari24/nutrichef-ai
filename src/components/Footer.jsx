import { Link } from 'react-router-dom';
import Logo from './Logo.jsx';

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="wrap footer-grid">
        <div className="footer-brand">
          <Logo size={30} />
          <p className="footer-tag">Cook what you have. Eat what you need.</p>
        </div>
        <nav aria-label="Footer" className="footer-links">
          <Link to="/features">Features</Link>
          <Link to="/how-it-works">How it works</Link>
          <Link to="/results">Results</Link>
          <Link to="/reviews">Reviews</Link>
          <Link to="/our-story">Our story</Link>
          <Link to="/signup">Create an account</Link>
          <Link to="/login">Sign in</Link>
        </nav>
        <p className="footer-fine">
          © {new Date().getFullYear()} NutriChef AI. Recipes are suggestions, not medical advice.
          <br />
          Photos from Unsplash.
        </p>
      </div>
    </footer>
  );
}
