import { Link } from 'react-router-dom';
import {
  Basket,
  Heart,
  ForkKnife,
  Timer,
  Check,
  ShoppingCart,
  CaretLeft,
  CaretRight,
} from '@phosphor-icons/react';
import { LogoMark } from '../components/Logo.jsx';
import { Carrot, Egg, NoteArrow } from '../components/Doodles.jsx';
import AppMock from '../components/AppMock.jsx';
import SignupBand from '../components/SignupBand.jsx';

const INPUTS = [
  { icon: Basket, label: 'Your ingredients', hint: 'typed, or scanned from a photo' },
  { icon: Heart, label: 'Your goals', hint: 'calories, protein, fiber' },
  { icon: ForkKnife, label: 'How you eat', hint: 'diet, allergies, dislikes' },
  { icon: Timer, label: 'Your evening', hint: 'time, servings, equipment' },
];

const OUTPUTS = [
  'A recipe written for tonight',
  'Macros for every serving',
  'Smart swaps for missing items',
  'A grocery list for the gaps',
];

const PLAN = [
  ['Mon', 'Shakshuka'],
  ['Tue', 'Miso salmon bowls'],
  ['Wed', 'Harissa chickpeas'],
  ['Thu', 'Leftover fried rice'],
  ['Fri', 'Turkey tacos'],
  ['Sat', 'Out with friends'],
  ['Sun', 'Lentil ragù'],
];

const GROCERIES = [
  ['Parsley', true],
  ['Salmon fillets (2)', false],
  ['Corn tortillas', false],
  ['Red lentils', true],
];

function EngineDiagram() {
  return (
    <div className="engine" role="group" aria-label="What NutriChef AI considers and what it returns">
      <ul className="engine-col engine-in">
        {INPUTS.map(({ icon: Icon, label, hint }) => (
          <li key={label} className="engine-item">
            <Icon size={22} aria-hidden />
            <span>
              <b>{label}</b>
              <small>{hint}</small>
            </span>
          </li>
        ))}
      </ul>
      <div className="engine-core">
        <div className="engine-node">
          <LogoMark size={64} />
          <span>NutriChef AI</span>
        </div>
        <p className="engine-core-note">
          Balances thousands of ingredient pairings against your targets in a few seconds.
        </p>
      </div>
      <ul className="engine-col engine-out">
        {OUTPUTS.map((o) => (
          <li key={o} className="engine-item engine-item-out">
            <Check size={18} weight="bold" aria-hidden />
            <b>{o}</b>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CookMode() {
  return (
    <div className="cook-mode" aria-label="Cook mode screen">
      <p className="cook-step">Step 3 of 6</p>
      <p className="cook-text">
        Make four wells in the sauce and crack an egg into each. Cover and cook gently.
      </p>
      <div className="cook-timer" aria-label="Timer: 4 minutes">
        <svg viewBox="0 0 100 100" aria-hidden>
          <circle cx="50" cy="50" r="44" className="timer-track" />
          <circle cx="50" cy="50" r="44" className="timer-fill" />
        </svg>
        <span>04:00</span>
      </div>
      <div className="cook-nav" aria-hidden>
        <span><CaretLeft size={16} /> Back</span>
        <span className="cook-next">Next step <CaretRight size={16} /></span>
      </div>
    </div>
  );
}

function WeekPlan() {
  return (
    <div className="week" aria-label="Example weekly plan and grocery list">
      <ol className="week-grid">
        {PLAN.map(([d, meal]) => (
          <li key={d} className={meal === 'Out with friends' ? 'week-off' : undefined}>
            <span>{d}</span>
            <b>{meal}</b>
          </li>
        ))}
      </ol>
      <div className="grocery">
        <p className="grocery-h">
          <ShoppingCart size={18} aria-hidden /> Grocery list
        </p>
        <ul>
          {GROCERIES.map(([item, done]) => (
            <li key={item} className={done ? 'done' : undefined}>
              <span className="box" aria-hidden>{done && <Check size={12} weight="bold" />}</span>
              {item}
              {done && <span className="visually-hidden"> (bought)</span>}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default function HowItWorks() {
  return (
    <>
      <section className="page-hero" aria-labelledby="hiw-title">
        <div className="wrap">
          <h1 id="hiw-title" className="display-1">
            A kitchen that thinks before you cook.
          </h1>
          <p className="lede page-lede">
            NutriChef AI is a web app that plans dinner from what you already own. Here&apos;s
            everything it does, from the first ingredient to the last bite.
          </p>
        </div>
      </section>

      <section className="section tour-mock" aria-label="Try the app steps">
        <div className="wrap">
          <AppMock />
        </div>
      </section>

      <section className="section" aria-labelledby="engine-title">
        <div className="wrap">
          <div className="section-head">
            <h2 id="engine-title" className="display-2">What happens when you press Generate</h2>
            <p className="lede">
              Four things about you go in. A recipe that fits all four comes out, along with
              everything you need to cook it.
            </p>
          </div>
          <EngineDiagram />
        </div>
      </section>

      <section className="section" aria-labelledby="cook-title">
        <div className="wrap split">
          <div className="split-copy">
            <h2 id="cook-title" className="display-2">Hands busy? Cook mode reads along with you.</h2>
            <p className="lede">
              One step at a time, in big type, with built-in timers. Your screen stays awake, so
              you never wipe flour off a phone to find your place.
            </p>
            <span className="note margin-note">
              <Egg className="inline-doodle" /> timers start themselves
            </span>
          </div>
          <CookMode />
        </div>
      </section>

      <section className="section" aria-labelledby="week-title">
        <div className="wrap split split-rev">
          <WeekPlan />
          <div className="split-copy">
            <h2 id="week-title" className="display-2">Then it plans the rest of your week.</h2>
            <p className="lede">
              Pick the nights you&apos;ll cook. NutriChef fills them with recipes that share
              ingredients, so Monday&apos;s leftovers become Thursday&apos;s dinner and the grocery
              list stays short.
            </p>
            <div className="note-row">
              <NoteArrow variant={2} flip />
              <span className="note">
                <Carrot className="inline-doodle" /> one shop, seven dinners
              </span>
            </div>
            <Link to="/features" className="text-link">
              See every feature
            </Link>
          </div>
        </div>
      </section>

      <SignupBand heading="Ready to see what your fridge can make?" />
    </>
  );
}
