// Water + and - buttons that don't lose taps.
// Each tap counts from the latest number (not the one on screen when the tap started), saves are sent
// one after another in order, and if a save fails the real count is reloaded from the server.
import { useCallback, useRef } from 'react';
import { setWater } from './api.js';

// apply(glasses): shows the new count. reload(): fetches the page data again after a failed save.
export function useWaterCounter(apply, reload) {
  const state = useRef({ latest: null, pending: 0, failed: false, chain: Promise.resolve() });

  return useCallback((amount, shown) => {
    const s = state.current;
    const glasses = Math.max(0, (s.latest ?? shown) + amount);
    s.latest = glasses;
    s.pending += 1;
    apply(glasses);
    s.chain = s.chain
      .then(() => setWater(glasses))
      .catch(() => { s.failed = true; })
      .finally(() => {
        s.pending -= 1;
        // When every tap has been saved, go back to using the number on screen.
        if (s.pending === 0) {
          s.latest = null;
          if (s.failed) {
            s.failed = false;
            reload();
          }
        }
      });
  }, [apply, reload]);
}
