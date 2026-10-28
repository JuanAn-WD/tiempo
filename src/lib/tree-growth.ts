/**
 * What the pixel tree shows. Stages and minutes stay in `gamification`:
 * six named stages, eight visible steps inside each one. The tree never
 * moves backwards; a quiet week only adds a sleeping bird.
 */
import {
  LEVELS,
  MODE_IDS,
  TREE_MINUTES,
  addDays,
  isoWeekKeyFromDay,
  levelProgress,
  surprisesAt,
  weeklyProgress,
  type FocusModeId,
  type GamificationState,
  type GroveTree,
  type LevelId,
  type PlantId,
  type SkyId,
  type SurpriseId,
} from '@/lib/gamification';

export const SUBSTAGES = 8;
export const MARK_MINUTES = 10 * 60;
export const MARK_CAP = 3;
export const DORMANT_DAYS = 7;
export const FRUIT_WEEK_DAYS = 5;

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';
export type TimeSky = 'dawn' | 'day' | 'dusk' | 'night';

export type Stretch = {
  index: number;
  id: LevelId;
  /** 1–6, for the stage label. */
  stageNumber: number;
  /** 0–7 inside the current stage. */
  substage: number;
  /** Eight segment fills, 0–1. Earlier segments are full. */
  segments: number[];
  remainingMinutes: number;
  into: number;
  forest: number;
  nextId: LevelId | null;
};

export type ModeMark = {
  mode: FocusModeId;
  count: number;
};

export type TreeView = {
  stretch: Stretch;
  species: PlantId;
  nextSpecies: PlantId;
  season: Season;
  sky: TimeSky;
  fireflies: number;
  fruits: number;
  sleeping: boolean;
  marks: ModeMark[];
  surprises: SurpriseId[];
  grove: GroveTree[];
};

const SEASON_ORDER: Season[] = ['spring', 'summer', 'autumn', 'winter'];

export function stretchProgress(recoveredMinutes: number): Stretch {
  const level = levelProgress(recoveredMinutes);
  const boundary = level.nextMinutes ?? TREE_MINUTES;
  const span = Math.max(1, boundary - level.minMinutes);
  const intoStage = Math.max(0, Math.min(span, level.into - level.minMinutes));
  const subSpan = span / SUBSTAGES;
  let substage = Math.floor(intoStage / subSpan);
  if (substage >= SUBSTAGES) substage = SUBSTAGES - 1;
  if (substage < 0) substage = 0;
  const segments = Array.from({ length: SUBSTAGES }, (_, index) => {
    if (index < substage) return 1;
    if (index > substage) return 0;
    return Math.min(1, Math.max(0, (intoStage - substage * subSpan) / subSpan));
  });
  const remainingMinutes = Math.max(0, Math.ceil((substage + 1) * subSpan - intoStage));
  return {
    index: level.index,
    id: level.id,
    stageNumber: level.index + 1,
    substage,
    segments,
    remainingMinutes,
    into: level.into,
    forest: level.forest,
    nextId: level.nextId,
  };
}

/** Steps only move forward inside one tree. A finished tree starts again at the seed. */
export function stretchStep(recoveredMinutes: number): number {
  const stretch = stretchProgress(recoveredMinutes);
  return stretch.forest * LEVELS.length * SUBSTAGES + stretch.index * SUBSTAGES + stretch.substage;
}

export function seasonFromMonth(month: number): Season {
  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 6 && month <= 8) return 'summer';
  if (month >= 9 && month <= 11) return 'autumn';
  return 'winter';
}

export function seasonAt(at: number, offsetMinutes: number): Season {
  const shifted = new Date(at + offsetMinutes * 60_000);
  return seasonFromMonth(shifted.getUTCMonth() + 1);
}

export function skyFromHour(hour: number): TimeSky {
  const safe = ((Math.floor(hour) % 24) + 24) % 24;
  if (safe >= 5 && safe < 8) return 'dawn';
  if (safe >= 8 && safe < 17) return 'day';
  if (safe >= 17 && safe < 21) return 'dusk';
  return 'night';
}

/** Free skies follow the clock. A Pro pick of dawn, dusk, or night stays put. */
export function visibleSky(choice: SkyId, isPro: boolean, hour: number): TimeSky {
  if (isPro && (choice === 'dawn' || choice === 'dusk' || choice === 'night')) return choice;
  return skyFromHour(hour);
}

export function lastFocusDay(state: GamificationState): string | null {
  let last: string | null = null;
  for (const [key, day] of Object.entries(state.days)) {
    if (day.focusMinutes <= 0) continue;
    if (last == null || key > last) last = key;
  }
  return last;
}

export function isDormant(state: GamificationState, todayKey: string): boolean {
  const last = lastFocusDay(state);
  if (!last) return false;
  return addDays(last, DORMANT_DAYS) <= todayKey;
}

export function fruitWeekCount(state: GamificationState): number {
  const counts = new Map<string, number>();
  for (const [key, day] of Object.entries(state.days)) {
    if (day.focusMinutes < state.goalMinutes) continue;
    const week = isoWeekKeyFromDay(key);
    counts.set(week, (counts.get(week) ?? 0) + 1);
  }
  let weeks = 0;
  for (const count of counts.values()) {
    if (count >= FRUIT_WEEK_DAYS) weeks += 1;
  }
  return weeks;
}

export function modeMarks(state: GamificationState): ModeMark[] {
  const totals: Record<FocusModeId, number> = { trabajo: 0, estudio: 0, casa: 0, gym: 0 };
  for (const day of Object.values(state.days)) {
    for (const mode of MODE_IDS) totals[mode] += day.modes[mode] ?? 0;
  }
  return MODE_IDS.map((mode) => ({
    mode,
    count: Math.min(MARK_CAP, Math.floor(totals[mode] / MARK_MINUTES)),
  })).filter((mark) => mark.count > 0);
}

export function describeTree(
  state: GamificationState,
  at: number,
  offsetMinutes: number,
  isPro: boolean,
): TreeView {
  const stretch = stretchProgress(state.recoveredMinutes);
  const week = weeklyProgress(state, at, offsetMinutes);
  const todayKey = week.todayKey;
  const hour = new Date(at + offsetMinutes * 60_000).getUTCHours();
  const sleeping = stretch.index >= 2 && isDormant(state, todayKey);
  const fruits = stretch.index >= 4 ? fruitWeekCount(state) : 0;
  return {
    stretch,
    species: state.sprout ?? state.plant,
    nextSpecies: state.plant,
    season: seasonAt(at, offsetMinutes),
    sky: visibleSky(state.sky, isPro, hour),
    fireflies: week.days.filter((day) => day.status === 'met').length,
    fruits,
    sleeping,
    marks: modeMarks(state),
    surprises: surprisesAt(stretch.into),
    grove: state.grove ?? [],
  };
}

export function seasonIndex(season: Season): number {
  return SEASON_ORDER.indexOf(season);
}
