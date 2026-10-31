// Shared two-column layout for the sign-up and login pages.
export default function AuthLayout({ title, intro, children, image, imageAlt, note }) {
  return (
    <section className="auth" aria-labelledby="auth-title">
      <div className="wrap auth-grid">
        <div className="auth-form-col">
          <h1 id="auth-title" className="display-2">
            {title}
          </h1>
          {intro && <p className="lede auth-intro">{intro}</p>}
          {children}
        </div>
        <div className="auth-photo">
          <img src={image} alt={imageAlt} width="1200" height="800" />
          {note && <span className="note auth-note">{note}</span>}
        </div>
      </div>
    </section>
  );
}
