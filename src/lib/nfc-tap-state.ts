/**
 * Applies one native tap to the JS session.
 * The activity already started or stopped the blocker. This only keeps
 * sessions, recovered time, and the locked flag aligned.
 */
export type NativeTapState = {
  locked: boolean;
  lockedAt: number | null;
  recoveredMs: number;
  mode: string;
  sessions: { mode: string; startedAt: number; endedAt: number; emergency?: boolean }[];
};

export function applyNativeTapEvent<T extends NativeTapState>(
  state: T,
  event: { action: 'lock' | 'unlock'; at: number },
): T {
  if (event.action === 'unlock') {
    if (!state.locked) return state;
    const endedAt = event.at;
    const recovered = state.lockedAt != null ? Math.max(0, endedAt - state.lockedAt) : 0;
    return {
      ...state,
      locked: false,
      lockedAt: null,
      recoveredMs: state.recoveredMs + recovered,
      sessions:
        state.lockedAt != null
          ? [{ mode: state.mode, startedAt: state.lockedAt, endedAt }, ...state.sessions].slice(0, 40)
          : state.sessions,
    };
  }

  if (state.locked) return state;
  return { ...state, locked: true, lockedAt: event.at };
}
