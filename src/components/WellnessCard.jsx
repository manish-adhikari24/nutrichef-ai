import { Heart } from '@phosphor-icons/react';
import { WELLNESS_DISCLAIMER } from '../lib/rules.js';

export default function WellnessCard({ suggestion }) {
  return (
    <section className="wellness" aria-labelledby="wellness-title">
      <h2 id="wellness-title" className="dash-h2">
        <Heart size={22} aria-hidden /> {suggestion.title}
      </h2>
      <p>{suggestion.text}</p>
      <p className="disclaimer">{WELLNESS_DISCLAIMER}</p>
    </section>
  );
}
