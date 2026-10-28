// The NutriChef AI mark: a plate, a leaf, and a spark of saffron for the "AI".
// Colors come from theme tokens, so the mark adapts to light and dark mode.
export function LogoMark({ size = 36, title }) {
  return (
    <svg
      className="logo-mark"
      width={size}
      height={size}
      viewBox="0 0 48 48"
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <circle cx="24" cy="26" r="18.5" fill="none" stroke="var(--ink)" strokeWidth="3" />
      <path d="M14 36 C13 25 21 17 33 18 C34 30 26 37 14 36 Z" fill="var(--beet)" />
      <path d="M16 34 L29 21" stroke="var(--paper)" strokeWidth="1.9" strokeLinecap="round" />
      <path
        d="M38 2.5 L39.8 7.7 L45 9.5 L39.8 11.3 L38 16.5 L36.2 11.3 L31 9.5 L36.2 7.7 Z"
        fill="var(--saffron)"
      />
    </svg>
  );
}

export default function Logo({ size = 34 }) {
  return (
    <span className="logo">
      <LogoMark size={size} />
      <span className="logo-word">
        NutriChef<em>ai</em>
      </span>
    </span>
  );
}
