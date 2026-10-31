import SignupBand from '../components/SignupBand.jsx';

// These are the project's targets from its report, not measured results.
const TARGETS = [
  { value: '5 min', label: 'From new account to understanding your first recipe', hint: 'Usability target' },
  { value: '5 sec', label: 'To generate a recipe under normal conditions', hint: 'Performance target' },
  { value: '100%', label: 'Of generated recipes checked against your allergy list', hint: 'Safety requirement' },
];

const WHY = [
  { value: '1.05 billion tons', label: 'of food was wasted across households, food service and retail in 2022.', source: 'UNEP Food Waste Index Report, 2024' },
  { value: '1 billion+ meals', label: 'are wasted by households around the world every day.', source: 'UNEP Food Waste Index Report, 2024' },
  { value: '71%', label: 'of Americans were trying to eat more protein in 2024, up from 59% in 2022.', source: 'IFIC Food & Health Survey, 2024' },
];

function Stats({ items, footKey }) {
  return (
    <ul className="result-stats">
      {items.map((item) => (
        <li key={item.value}>
          <b>{item.value}</b>
          <span>{item.label}</span>
          <small>{item[footKey]}</small>
        </li>
      ))}
    </ul>
  );
}

export default function Results() {
  return (
    <>
      <section className="page-hero" aria-labelledby="results-title">
        <div className="wrap">
          <h1 id="results-title" className="display-1">What we&apos;re aiming for.</h1>
          <p className="lede page-lede">
            NutriChef AI is a prototype, so these are the targets we&apos;re building toward. We&apos;ll
            publish measured results here after testing.
          </p>
        </div>
      </section>

      <section className="section results-section" aria-labelledby="targets-title">
        <div className="wrap">
          <h2 id="targets-title" className="display-2">Our targets</h2>
          <Stats items={TARGETS} footKey="hint" />
        </div>
      </section>

      <section className="section results-section" aria-labelledby="why-title">
        <div className="wrap">
          <h2 id="why-title" className="display-2">Why it matters</h2>
          <Stats items={WHY} footKey="source" />
        </div>
      </section>

      <SignupBand heading="Be part of our first results." />
    </>
  );
}
