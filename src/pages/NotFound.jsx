import { Link } from 'react-router-dom';
import { Pan } from '../components/Doodles.jsx';

export default function NotFound() {
  return (
    <section className="page-hero not-found" aria-labelledby="nf-title">
      <div className="wrap">
        <Pan className="nf-doodle" />
        <h1 id="nf-title" className="display-1">This page isn&apos;t on the menu.</h1>
        <p className="lede page-lede">The link may be old, or the address has a typo.</p>
        <Link to="/" className="btn btn-primary btn-lg">Back to the home page</Link>
      </div>
    </section>
  );
}
