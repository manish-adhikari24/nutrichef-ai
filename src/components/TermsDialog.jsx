import { useEffect, useRef } from 'react';
import { X } from '@phosphor-icons/react';
import { TERMS, TERMS_STATUS } from '../data/terms.js';

// Highlights [placeholders] so unfinished details are easy to spot.
function WithPlaceholders({ text }) {
  return text.split(/(\[[^\]]+\])/).map((part, i) =>
    part.startsWith('[') ? <mark key={i}>{part}</mark> : part
  );
}

export default function TermsDialog({ open, onClose, onAgree }) {
  const ref = useRef(null);

  // A native dialog traps focus, closes on Escape and returns focus when it closes.
  useEffect(() => {
    const dialog = ref.current;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog ref={ref} className="terms" aria-labelledby="terms-title" onClose={onClose}>
      <header className="terms-head">
        <div>
          <h2 id="terms-title" className="terms-title">Terms and Conditions</h2>
          <p className="terms-status">{TERMS_STATUS}</p>
        </div>
        <button type="button" className="icon-btn" onClick={onClose} aria-label="Close terms">
          <X size={22} aria-hidden />
        </button>
      </header>

      <div className="terms-body" tabIndex={0}>
        <ol className="terms-list">
          {TERMS.map((section) => (
            <li key={section.title}>
              <h3>{section.title}</h3>
              {section.body.map((text) => (
                <p key={text}><WithPlaceholders text={text} /></p>
              ))}
            </li>
          ))}
        </ol>
      </div>

      <footer className="terms-foot">
        <button type="button" className="btn btn-ghost" onClick={onClose}>Close</button>
        <button type="button" className="btn btn-primary" onClick={onAgree}>I agree</button>
      </footer>
    </dialog>
  );
}
