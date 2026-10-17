import type { BadgeId, FocusModeId, LevelId, PlantId, PurposeId, SkyId } from '@/lib/gamification';

export type SessionClose = {
  countedMinutes: number;
  weekMinutes: number;
  badges: BadgeId[];
  levelUp: LevelId | null;
  treesCompleted: number;
  rewardCompleted: boolean;
  rewardText: string | null;
  purpose: PurposeId | null;
  streak: number;
  growth: number;
  stage: LevelId;
  plant: PlantId;
  sky: SkyId;
  mode: FocusModeId | null;
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
