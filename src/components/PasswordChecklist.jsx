import { Check, X } from '@phosphor-icons/react';

export const PASSWORD_RULES = [
  { test: (p) => p.length >= 10, label: 'At least 10 characters' },
  { test: (p) => /[A-Z]/.test(p), label: 'An uppercase letter' },
  { test: (p) => /[a-z]/.test(p), label: 'A lowercase letter' },
  { test: (p) => /\d/.test(p), label: 'A number' },
  { test: (p) => /[^A-Za-z0-9]/.test(p), label: 'A symbol, such as ! or #' },
];

export const meetsPasswordRules = (password) => PASSWORD_RULES.every((rule) => rule.test(password));

// Live feedback while typing. The server also rejects common, breached and
// name-based passwords, which can't be checked here.
export default function PasswordChecklist({ password, id }) {
  return (
    <div className="password-rules" id={id}>
      <ul aria-label="Password requirements">
        {PASSWORD_RULES.map(({ test, label }) => {
          const met = test(password);
          return (
            <li key={label} className={met ? 'is-met' : undefined}>
              {met ? <Check size={14} weight="bold" aria-hidden /> : <X size={14} aria-hidden />}
              {label}
              <span className="visually-hidden">{met ? ', done' : ', not yet'}</span>
            </li>
          );
        })}
      </ul>
      <p className="field-hint">It also can&apos;t be a common password, include your name or email, or appear in a known data breach.</p>
    </div>
  );
}
