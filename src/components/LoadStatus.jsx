// Shows a loading message or an error with a retry button while a page's data loads.
export default function LoadStatus({ loading, error, onRetry }) {
  // Something went wrong: show the message and a "Try again" button.
  if (error) {
    return (
      <div className="generate-error" role="alert">
        <p>{error.message}</p>
        <button type="button" className="link-btn" onClick={onRetry}>Try again</button>
      </div>
    );
  }
  // Still loading: show a status message. Done: show nothing.
  return loading ? <p className="dash-empty" role="status">Loading…</p> : null;
}
