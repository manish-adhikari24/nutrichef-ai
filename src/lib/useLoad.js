import { useCallback, useEffect, useState } from 'react';

// Loads data for a page and exposes its loading and error states.
export function useLoad(load, deps = []) {
  // One state object, so data, error and loading always change together.
  const [state, setState] = useState({ data: null, error: null, loading: true });
  // Only make a new loader function when the dependencies change.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(load, deps);

  // Runs the loader, keeping the old data while loading and storing any error.
  const reload = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await run();
      setState({ data, error: null, loading: false });
    } catch (error) {
      setState((s) => ({ ...s, error, loading: false }));
    }
  }, [run]);

  // Load once when the page opens, and again whenever the loader changes.
  useEffect(() => {
    reload();
  }, [reload]);

  // Lets a page update the data locally, e.g. after saving.
  const setData = useCallback((data) => setState((s) => ({ ...s, data })), []);
  return { ...state, reload, setData };
}
