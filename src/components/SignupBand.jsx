import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

// Closing call to action used at the bottom of the marketing pages.
// It collects an email and hands it to the sign-up page.
export default function SignupBand({ heading = 'Your first recipe is one sign-up away.' }) {
  const [email, setEmail] = useState('');
  const navigate = useNavigate();

  function onSubmit(e) {
    e.preventDefault();
    navigate('/signup', { state: { email } });
  }

  return (
    <section className="signup-band" aria-labelledby="signup-band-title">
      <div className="wrap signup-band-inner">
        <div>
          <h2 id="signup-band-title" className="signup-band-title">
            {heading}
          </h2>
          <p className="signup-band-sub">
            Free while we&apos;re in beta. No card needed, and you can leave any time.
          </p>
        </div>
        <form className="signup-band-form" onSubmit={onSubmit}>
          <label htmlFor="band-email" className="field-label">
            Email address
          </label>
          <div className="inline-field">
            <input
              id="band-email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <button className="btn btn-primary" type="submit">
              Create free account
            </button>
          </div>
          <p className="signup-band-alt">
            Already cooking with us? <Link to="/login">Log in</Link>
          </p>
        </form>
      </div>
    </section>
  );
}
