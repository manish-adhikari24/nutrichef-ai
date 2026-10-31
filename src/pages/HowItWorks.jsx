import { Link } from 'react-router-dom';
import { Basket, Check, FirstAidKit, ForkKnife, Heart, Timer } from '@phosphor-icons/react';
import { LogoMark } from '../components/Logo.jsx';
import AppMock from '../components/AppMock.jsx';
import SignupBand from '../components/SignupBand.jsx';

const INPUTS = [
  { icon: Basket, label: 'Your ingredients', hint: 'typed or picked from suggestions' },
  { icon: FirstAidKit, label: 'Your allergies', hint: 'stored in your allergy profile' },
  { icon: Heart, label: 'Your goals', hint: 'calories, protein, carbs and fat' },
  { icon: ForkKnife, label: 'How you eat', hint: 'diet and foods you dislike' },
  { icon: Timer, label: 'Your filters', hint: 'meal, cuisine, time, difficulty, budget' },
];

const OUTPUTS = [
  'A structured recipe with quantities and steps',
  'An allergen check, with unsafe recipes blocked',
  'Calories and macros for each serving',
  'Pass or warning against your goals',
  'Substitutes for what you don\'t have',
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

export default function HowItWorks() {
  return (
    <>
      <section className="page-hero" aria-labelledby="hiw-title">
        <div className="wrap">
          <h1 id="hiw-title" className="display-1">
            A kitchen that thinks before you cook.
          </h1>
          <p className="lede page-lede">
            NutriChef AI is a web app that writes recipes from what you already own. Here&apos;s
            how it gets from your ingredients to a recipe that&apos;s safe for you.
          </p>
        </div>
      </section>

      <section className="section tour-mock" aria-label="The app in three steps">
        <div className="wrap">
          <AppMock />
        </div>
      </section>

      <section className="section" aria-labelledby="engine-title">
        <div className="wrap">
          <div className="section-head">
            <h2 id="engine-title" className="display-2">What happens when you select Generate</h2>
            <p className="lede">
              Everything about your kitchen and your goals goes in. A checked recipe comes out, or
              it&apos;s blocked if it isn&apos;t safe for you.
            </p>
          </div>
          <EngineDiagram />
          <p className="preview-more">
            <Link to="/features" className="text-link">See every feature</Link>
          </p>
        </div>
      </section>

      <SignupBand heading="Ready to see what your kitchen can make?" />
    </>
  );
}
