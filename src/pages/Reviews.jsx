import { Link } from 'react-router-dom';
import SignupBand from '../components/SignupBand.jsx';

// Real reviews go here after user testing. Don't add invented quotes.
export default function Reviews() {
  return (
    <>
      <section className="page-hero" aria-labelledby="reviews-title">
        <div className="wrap">
          <h1 id="reviews-title" className="display-1">Reviews are coming.</h1>
          <p className="lede page-lede">
            We&apos;re testing NutriChef AI with our first home cooks. Their honest feedback will
            appear here, so we&apos;re not showing any quotes until it&apos;s real.
          </p>
          <p className="preview-more">
            <Link to="/signup" className="text-link">Try it and tell us what you think</Link>
          </p>
        </div>
      </section>
      <SignupBand />
    </>
  );
}
