import type { BadgeId, LevelId } from '@/lib/gamification';

export type Celebration =
  | { kind: 'badge'; id: BadgeId }
  | { kind: 'level'; id: LevelId };

type Listener = (items: readonly Celebration[]) => void;

const listeners = new Set<Listener>();
let pending: Celebration[] = [];

function keyOf(item: Celebration): string {
  return `${item.kind}:${item.id}`;
}

export function dedupeCelebrations(items: readonly Celebration[]): Celebration[] {
  const seen = new Set<string>();
  const out: Celebration[] = [];
  for (const item of items) {
    const key = keyOf(item);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

/** Tell the overlay about a level or a badge. Safe to call before it is mounted. */
export function publishCelebrations(items: readonly Celebration[]) {
  const fresh = dedupeCelebrations(items);
  if (fresh.length === 0) return;
  if (listeners.size === 0) {
    pending = dedupeCelebrations([...pending, ...fresh]);
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

export function subscribeCelebrations(listener: Listener): () => void {
  listeners.add(listener);
  if (pending.length > 0) {
    const batch = pending;
    pending = [];
    try {
      listener(batch);
    } catch {
      pending = dedupeCelebrations([...batch, ...pending]);
    }
  }
  return () => {
    listeners.delete(listener);
  };
}
