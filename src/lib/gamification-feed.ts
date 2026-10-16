import type { AchievementId } from '@/lib/gamification';

type Listener = (ids: readonly AchievementId[]) => void;

const listeners = new Set<Listener>();
let pending: AchievementId[] = [];

function dedupe(ids: readonly AchievementId[]): AchievementId[] {
  const seen = new Set<AchievementId>();
  const out: AchievementId[] = [];
  for (const id of ids) {
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

/** Tell the overlay about badges just earned. Safe to call when it is not mounted yet. */
export function publishUnlocks(ids: readonly AchievementId[]) {
  const fresh = dedupe(ids);
  if (fresh.length === 0) return;
  if (listeners.size === 0) {
    pending = dedupe([...pending, ...fresh]);
    return;
  }
  for (const listener of listeners) {
    try {
      listener(fresh);
    } catch {
      /* the celebration is optional */
    }
  }
}

export function subscribeUnlocks(listener: Listener): () => void {
  listeners.add(listener);
  if (pending.length > 0) {
    const batch = pending;
    pending = [];
    try {
      listener(batch);
    } catch {
      pending = dedupe([...batch, ...pending]);
    }
  }
  return () => {
    listeners.delete(listener);
  };
}
