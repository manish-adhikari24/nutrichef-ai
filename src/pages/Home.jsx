import { Link } from 'react-router-dom';
import { Egg, Lemon, Pan } from '../components/Doodles.jsx';
import AppMock from '../components/AppMock.jsx';
import SignupBand from '../components/SignupBand.jsx';
import { img } from '../img.js';

// Protein eaten each day of a sample week, against a 90 g daily target.
const WEEK = [
  { d: 'Mon', g: 62 },
  { d: 'Tue', g: 71 },
  { d: 'Wed', g: 84 },
  { d: 'Thu', g: 88 },
  { d: 'Fri', g: 93 },
  { d: 'Sat', g: 90 },
  { d: 'Sun', g: 96 },
];

function ProteinChart() {
  const w = 300;
  const h = 150;
  const max = 110;
  const x = (i) => 26 + i * ((w - 40) / 6);
  const y = (g) => h - 22 - (g / max) * (h - 36);
  const line = WEEK.map((p, i) => `${i ? 'L' : 'M'}${x(i)} ${y(p.g)}`).join(' ');

  return (
    <figure className="journal-chart">
      <figcaption>Example: protein per day</figcaption>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        role="img"
        aria-label="Daily protein rose from 62 grams on Monday to 96 grams on Sunday, reaching the 90 gram target by Friday."
      >
        <line x1="20" x2={w - 6} y1={y(90)} y2={y(90)} className="chart-target" />
        <text x={22} y={y(90) - 6} textAnchor="start" className="chart-label">
          target 90 g
        </text>
        <path d={line} className="chart-line" />
        {WEEK.map((p, i) => (
          <g key={p.d}>
            <circle cx={x(i)} cy={y(p.g)} r="3.2" className="chart-dot" />
            <text x={x(i)} y={h - 4} textAnchor="middle" className="chart-label">
              {p.d}
            </text>
          </g>
        ))}
      </svg>
    </figure>
  );
}

export default function Home() {
  return (
    <>
      {/* Hero */}
      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-stage">
          <p className="hero-kicker">The smart recipe generator</p>
          <div className="hero-layout">
            <h1 id="hero-title" className="hero-word">
              <span>Nutri</span>
              <span>Chef</span>
              <span className="visually-hidden"> AI, the smart recipe generator</span>
            </h1>
            <div className="hero-plate">
              <img
                className="hero-bowl"
                src={img('hero-bowl.webp')}
                alt="A bowl of roasted tofu, egg, edamame, sweetcorn, cucumber and red cabbage"
                width="760"
                height="760"
                fetchPriority="high"
              />
              <span className="hero-sticker" aria-hidden="true">ai</span>
            </div>
            <div className="hero-foot">
              <p className="hero-tagline">Cook what you have. Eat what you need.</p>
              <div className="hero-ctas">
                <Link to="/signup" className="btn btn-primary btn-lg">
                  Get started free
                </Link>
                <Link to="/dashboard/generate" className="btn btn-ghost btn-lg">
                  Generate recipe
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="wrap hero-strip">
          <span>NutriChef AI.</span>
          <span>Recipes for real fridges.</span>
          <span className="hero-strip-accent">Free during beta</span>
          <span>Made for home cooks</span>
        </div>
      </section>

      {/* Manifesto */}
      <section className="manifesto" aria-labelledby="manifesto-title">
        <div className="wrap manifesto-inner">
          <h2 id="manifesto-title" className="visually-hidden">Why NutriChef AI</h2>
          <p className="manifesto-text">
            Most of us open the fridge without a plan <Egg className="inline-doodle" /> stare at half
            a lemon and a bag of spinach, and order takeout anyway.
          </p>
          <p className="manifesto-text">
            But your kitchen already holds a week of good dinners. NutriChef AI reads what you have{' '}
            <Lemon className="inline-doodle" /> weighs it against what your body needs, and writes a
            recipe you can start <Pan className="inline-doodle" /> in the next five minutes.
          </p>
          <p className="manifesto-outline" aria-hidden="true">
            Less waste.
            <br />
            Better plates.
            <br />
            Zero guesswork.
          </p>
        </div>
      </section>

      {/* App preview */}
      <section className="section preview" aria-labelledby="preview-title">
        <div className="wrap">
          <div className="section-head">
            <h2 id="preview-title" className="display-2">
              From a half-full fridge to dinner, in three moves.
            </h2>
            <p className="lede">
              Click through the steps to see what you&apos;ll do in the app and what you get back.
            </p>
          </div>
          <AppMock />
          <p className="preview-more">
            <Link to="/how-it-works" className="text-link">
              Take the full tour of the app
            </Link>
          </p>
        </div>
      </section>

      {/* Journal spread */}
      <section className="section spread-section" aria-labelledby="spread-title">
        <div className="wrap spread-grid">
          <div className="spread-photo">
            <img
              src={img('table-spread.jpg')}
              alt="A wooden table set with a bowl of eggs, greens, avocado and radish"
              loading="lazy"
              width="1400"
              height="933"
            />
          </div>

          <div className="journal" aria-label="Example of saved recipes and progress in NutriChef AI">
            <article className="journal-page">
              <header className="journal-head">
                <span>Saved recipe, example</span>
                <span>p. 24</span>
              </header>
              <h3 className="journal-title">Sheet-pan harissa chickpeas</h3>
              <p className="journal-body">
                Built from the chickpeas, red onion and half a cauliflower left over on Thursday.
                Roast everything hot and fast, then finish with yogurt and lemon.
              </p>
              <ul className="journal-list">
                <li>1 can chickpeas, drained</li>
                <li>½ cauliflower, in florets</li>
                <li>1 red onion, wedged</li>
                <li>2 tbsp harissa</li>
                <li>Greek yogurt, to serve</li>
              </ul>
              <span className="note journal-note">allergen-checked</span>
            </article>
            <article className="journal-page journal-page-right">
              <header className="journal-head">
                <span>Your progress, example</span>
                <span>p. 25</span>
              </header>
              <ProteinChart />
              <p className="journal-body">
                An example of the progress view: log the recipes you cook and see how your week
                compares with your goals.
              </p>
            </article>
          </div>

          <div className="spread-copy">
            <p className="spread-lines">
              Not another recipe site.
              <br />
              Not another calorie app.
              <br />A cook who starts with your fridge.
            </p>
            <h2 id="spread-title" className="visually-hidden">Your saved recipes and progress</h2>
            <p className="lede">
              Save the recipes you love, log what you eat, and see how your day and week compare
              with your goals.
            </p>
            <Link to="/features" className="text-link">
              Explore every feature
            </Link>
          </div>
        </div>
      </section>

      <SignupBand />
    </>
  );
}
