// Shows a loading message or an error with a retry button while a page's data loads.
export default function LoadStatus({ loading, error, onRetry }) {
  if (error) {
    return (
      <div className="generate-error" role="alert">
        <p>{error.message}</p>
        <button type="button" className="link-btn" onClick={onRetry}>Try again</button>
      </div>
    );
  }
  return loading ? <p className="dash-empty" role="status">Loading…</p> : null;
}
