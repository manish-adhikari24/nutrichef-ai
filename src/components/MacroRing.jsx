// A small donut showing how a recipe splits into protein, carbs and fat.
// Each segment also has a text label, so the chart never relies on color alone.
const SEGMENTS = [
  { key: 'protein', label: 'Protein', color: 'var(--beet)' },
  { key: 'carbs', label: 'Carbs', color: 'var(--saffron)' },
  { key: 'fat', label: 'Fat', color: 'var(--herb)' },
];

export default function MacroRing({ protein, carbs, fat, kcal, size = 132 }) {
  const values = { protein, carbs, fat };
  const total = protein + carbs + fat;
  const r = 42;
  const c = 2 * Math.PI * r;
  let offset = 0;

  return (
    <figure className="macro-ring">
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        role="img"
        aria-label={`${kcal} calories: ${protein} grams protein, ${carbs} grams carbs, ${fat} grams fat`}
      >
        <circle cx="50" cy="50" r={r} fill="none" stroke="var(--line)" strokeWidth="10" />
        {SEGMENTS.map((s) => {
          const len = (values[s.key] / total) * c;
          const el = (
            <circle
              key={s.key}
              cx="50"
              cy="50"
              r={r}
              fill="none"
              stroke={s.color}
              strokeWidth="10"
              strokeDasharray={`${Math.max(len - 2, 0)} ${c}`}
              strokeDashoffset={-offset}
              transform="rotate(-90 50 50)"
            />
          );
          offset += len;
          return el;
        })}
        <text x="50" y="49" textAnchor="middle" className="ring-num">
          {kcal}
        </text>
        <text x="50" y="62" textAnchor="middle" className="ring-unit">
          kcal
        </text>
      </svg>
      <figcaption className="macro-legend">
        {SEGMENTS.map((s) => (
          <span key={s.key}>
            <i style={{ background: s.color }} aria-hidden />
            {s.label} <b>{values[s.key]}g</b>
          </span>
        ))}
      </figcaption>
    </figure>
  );
}
