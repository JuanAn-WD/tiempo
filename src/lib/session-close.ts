import type { BadgeId, LevelId, PurposeId } from '@/lib/gamification';

export type SessionClose = {
  countedMinutes: number;
  weekMinutes: number;
  badges: BadgeId[];
  levelUp: LevelId | null;
  rewardCompleted: boolean;
  rewardText: string | null;
  purpose: PurposeId | null;
};

let pending: SessionClose | null = null;

export function publishSessionClose(close: SessionClose) {
  pending = close;
}

export function takeSessionClose(): SessionClose | null {
  const value = pending;
  pending = null;
  return value;
}
