import {
  Basket,
  ChartDonut,
  ArrowsClockwise,
  CalendarBlank,
  ShoppingCart,
  Recycle,
} from '@phosphor-icons/react';
import SignupBand from '../components/SignupBand.jsx';
import { img } from '../img.js';

const FEATURES = [
  {
    icon: Basket,
    title: 'Pantry-first recipes',
    body: 'Type what you have or snap a photo of your fridge. Every recipe starts from your ingredients, not from a shopping trip.',
    note: 'works with 3 ingredients or 30',
  },
  {
    icon: ChartDonut,
    title: 'Portions that match your goals',
    body: 'Set calorie, protein or fiber targets once. Each recipe is scaled so a serving lands where you want it.',
    note: 'macros on every recipe',
  },
  {
    icon: ArrowsClockwise,
    title: 'Swaps for anything missing',
    body: 'Out of buttermilk? Allergic to nuts? NutriChef suggests a swap that keeps the dish working and tells you why.',
    note: 'yogurt + lemon = buttermilk',
  },
  {
    icon: CalendarBlank,
    title: 'Weekly plans that share ingredients',
    body: 'Plan the nights you will cook. Recipes are chosen to reuse what you buy, so half a bunch of coriander never goes slimy again.',
    note: 'leftovers have a plan too',
  },
  {
    icon: ShoppingCart,
    title: 'A grocery list that writes itself',
    body: 'Anything a recipe needs and you do not have goes straight onto one list, grouped by aisle.',
    note: 'sorted by aisle',
  },
  {
    icon: Recycle,
    title: 'Use-it-up alerts',
    body: 'Tell it when you shop and it will nudge you before the spinach turns, with a recipe that uses it tonight.',
    note: 'less food in the bin',
  },
];

export default function Features() {
  return (
    <>
      <section className="page-hero" aria-labelledby="features-title">
        <div className="wrap">
          <h1 id="features-title" className="display-1">
            Everything it does, in plain words.
          </h1>
          <p className="lede page-lede">
            NutriChef AI does one job well: it turns the food you have into meals you want to
            eat, sized for the goals you set.
          </p>
        </div>
      </section>

      <div className="wrap">
        <div className="banner-photo">
          <img
            src={img('produce-grid.jpg')}
            alt="Rows of bowls filled with fresh vegetables, grains, beans and herbs"
            loading="lazy"
            width="1600"
            height="1067"
          />
        </div>
      </div>

      <section className="section" aria-label="Features">
        <div className="wrap">
          <ul className="feature-list">
            {FEATURES.map(({ icon: Icon, title, body, note }) => (
              <li key={title} className="feature">
                <Icon size={30} className="feature-icon" aria-hidden />
                <h2 className="feature-title">{title}</h2>
                <p className="feature-body">{body}</p>
                <span className="note feature-note">{note}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <SignupBand heading="Try every feature free while we're in beta." />
    </>
  );
}
