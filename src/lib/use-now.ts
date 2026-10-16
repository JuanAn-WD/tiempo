import { useLayoutEffect, useState } from 'react';
import { AppState } from 'react-native';

/**
 * Wall clock for streak and week math.
 * `revision` should change when progress changes, so a finished session
 * refreshes the day bucket without reading the clock during render.
 */
export function useNow(revision: unknown): number {
  const [now, setNow] = useState(0);

  useLayoutEffect(() => {
    // The streak follows the wall clock. Reading it during render is impure,
    // and this write runs before paint so the first frame is already today.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(Date.now());
  }, [revision]);

  useLayoutEffect(() => {
    const tick = () => setNow(Date.now());
    const id = setInterval(tick, 60_000);
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') tick();
    });
    return () => {
      clearInterval(id);
      sub.remove();
    };
  }, []);

  return now;
}
