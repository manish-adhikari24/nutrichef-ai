// Hand-drawn style line doodles used inline in editorial text and as margin notes.
// They are decorative, so they are hidden from assistive tech.
const base = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  focusable: 'false',
};

export function Egg(props) {
  return (
    <svg viewBox="0 0 48 48" className="doodle" {...base} {...props}>
      <path d="M6 30c1-9 9-14 18-13 9 0 18 4 18 13 0 8-9 12-19 12C13 42 5 38 6 30z" />
      <circle cx="23" cy="29" r="6.5" fill="var(--saffron)" stroke="currentColor" />
      <path d="M20 26.5c1-1.2 2.4-1.6 3.6-1.2" />
    </svg>
  );
}

export function Lemon(props) {
  return (
    <svg viewBox="0 0 48 48" className="doodle" {...base} {...props}>
      <path d="M8 26a16 16 0 0 0 32 0z" />
      <path d="M12 26a12 12 0 0 0 24 0" />
      <path d="M24 26v11.5M24 26l-8 7.5M24 26l8 7.5M24 26l-11 2.5M24 26l11 2.5" />
      <path d="M30 13c3-4 7-5 10-4-1 3-4 6-8 6" />
    </svg>
  );
}

export function Leaf(props) {
  return (
    <svg viewBox="0 0 48 48" className="doodle" {...base} {...props}>
      <path d="M8 40C7 22 19 9 40 8c1 20-12 33-32 32z" />
      <path d="M10 38C18 30 25 22 33 15M17 31l-1-8M22 26l7 1M25 23l-1-7" />
    </svg>
  );
}

export function Whisk(props) {
  return (
    <svg viewBox="0 0 48 48" className="doodle" {...base} {...props}>
      <path d="M30 18L42 6" strokeWidth="2.6" />
      <path d="M30 18C20 8 6 10 8 22c2 12 18 14 22-4z" />
      <path d="M30 18C22 12 11 14 12 22s14 8 18-4" />
      <path d="M30 18c-6-2-13 0-12 5s9 3 12-5" />
    </svg>
  );
}

export function Carrot(props) {
  return (
    <svg viewBox="0 0 48 48" className="doodle" {...base} {...props}>
      <path d="M30 14C20 16 9 30 6 42c12-4 27-14 28-24z" fill="var(--saffron)" fillOpacity=".35" />
      <path d="M14 30l4 3M18 24l4 3M22 19l3 3" />
      <path d="M31 15c1-5 4-8 9-9M33 17c4-2 9-2 12 1M31 15c-1-4 0-8 3-10" />
    </svg>
  );
}

export function Pan(props) {
  return (
    <svg viewBox="0 0 48 48" className="doodle" {...base} {...props}>
      <ellipse cx="20" cy="27" rx="15" ry="8" />
      <path d="M5 27c0 6 7 10 15 10s15-4 15-10" />
      <path d="M35 25l10-4" strokeWidth="2.6" />
      <path d="M15 14c-2-3 2-4 0-7M21 13c-2-3 2-4 0-7M27 14c-2-3 2-4 0-7" />
    </svg>
  );
}

// Curved hand-drawn arrows for margin notes. `dir` flips them horizontally.
export function NoteArrow({ variant = 1, flip = false, ...props }) {
  const paths = {
    1: ['M4 6C14 4 30 10 36 30', 'M29 26l7 4 2-8'],
    2: ['M4 30C10 16 24 8 40 10', 'M33 6l7 4-6 6'],
    3: ['M6 4c-2 14 8 26 26 28', 'M26 27l6 5-6 5'],
  }[variant];
  return (
    <svg
      viewBox="0 0 44 40"
      className="note-arrow"
      {...base}
      strokeWidth="1.8"
      style={flip ? { transform: 'scaleX(-1)' } : undefined}
      {...props}
    >
      {paths.map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}
