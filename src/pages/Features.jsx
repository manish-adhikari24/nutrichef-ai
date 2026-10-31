import {
  Basket,
  BookmarkSimple,
  ChartDonut,
  ArrowsClockwise,
  Heart,
  ShieldCheck,
  Sparkle,
  Pill,
} from '@phosphor-icons/react';
import SignupBand from '../components/SignupBand.jsx';
import { img } from '../img.js';

const FEATURES = [
  {
    icon: Basket,
    title: 'Ingredient-first recipes',
    body: 'Type what you have or pick from suggestions. Every recipe starts with your ingredients, which helps cut food waste.',
    note: 'works with 1 ingredient or 30',
  },
  {
    icon: ShieldCheck,
    title: 'Allergy checks on every recipe',
    body: 'We compare your ingredients and each generated recipe with your allergy profile, and block anything that conflicts.',
    note: 'still check your labels',
  },
  {
    icon: ChartDonut,
    title: 'Nutrition you can see',
    body: 'Every recipe shows calories, protein, carbs and fat per serving, with a clear pass or warning against your goals.',
    note: 'macros on every recipe',
  },
  {
    icon: ArrowsClockwise,
    title: 'Safe ingredient swaps',
    body: 'Missing something? We suggest alternatives that suit your allergies and diet, and tell you why each one works.',
    note: 'lemon out, vinegar in',
  },
  {
    icon: Sparkle,
    title: 'Filters that shape the recipe',
    body: 'Choose the meal type, cuisine, prep time, difficulty and budget before you generate.',
    note: 'tonight: quick and cheap',
  },
  {
    icon: BookmarkSimple,
    title: 'Saved recipes and history',
    body: 'Save the recipes you love with a note and a rating, then search or filter them later.',
    note: 'your own recipe book',
  },
  {
    icon: Pill,
    title: 'Optional supplement notes',
    body: 'General ideas based on your goals and nutrition gaps, always with a safety disclaimer. You can turn them off.',
    note: 'information, not advice',
  },
  {
    icon: Heart,
    title: 'Dashboard and wellness',
    body: 'Track today\'s calories, macros and water, and get general activity suggestions for your goal.',
    note: 'not medical advice',
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
            NutriChef AI turns the food you have into meals you want to eat, checked for your
            allergies and sized for your goals.
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
