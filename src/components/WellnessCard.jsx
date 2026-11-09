// Card showing one general wellness tip with its disclaimer (FR-16).
import { Heart } from '@phosphor-icons/react';

// `suggestion` comes from the API: { title, text, disclaimer }.
export default function WellnessCard({ suggestion }) {
  return (
    <section className="wellness" aria-labelledby="wellness-title">
      <h2 id="wellness-title" className="dash-h2">
        <Heart size={22} aria-hidden /> {suggestion.title}
      </h2>
      <p>{suggestion.text}</p>
      <p className="disclaimer">{suggestion.disclaimer}</p>
    </section>
  );
}
