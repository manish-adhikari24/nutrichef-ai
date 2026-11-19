// Public Privacy Policy page. The content lives in data/privacy.js.
import { PRIVACY, PRIVACY_STATUS } from '../data/privacy.js';

export default function Privacy() {
  return (
    <section className="page-hero legal" aria-labelledby="privacy-title">
      <div className="wrap legal-wrap">
        <h1 id="privacy-title" className="display-1">Privacy Policy</h1>
        <p className="legal-status">{PRIVACY_STATUS}</p>
        <ol className="terms-list">
          {PRIVACY.map((section) => (
            <li key={section.title}>
              <h2>{section.title}</h2>
              {section.body.map((text) => <p key={text}>{text}</p>)}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
