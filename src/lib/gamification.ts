/**
 * Local progress. No account, no network.
 *
 * The metric is reclaimed time: whole minutes of a focus session, counted
 * only when the session lasts at least 5 minutes and did not end as a
 * justified pause (emergency unlock). Pauses never subtract time. Blocked
 * attempts are a neutral day count: they do not move the level, the streak,
 * or the badges.
 *
 * One tree grows with that time. Its life is 300 hours: seed, sprout, sapling,
 * young tree, tree, mature tree, with a smooth ratio between those stages.
 * At 300 hours the tree joins a personal forest and a new seed is planted.
 * Unused time does not shrink it. A justified pause adds nothing and subtracts
 * nothing.
 *
 * `plant` is the species chosen for the next seed. `sprout` is the species of
 * the tree that is growing now; it changes only when a finished tree is
 * planted and a new seed starts. `grove` lists finished trees. Saves from
 * before those fields existed keep their minutes and rebuild the list.
 *
 * The daily streak counts consecutive days that met the goal. One comodín per
 * ISO week bridges a single missed day. A justified pause is skipped: it does
 * not break the streak and does not spend the comodín. Today, while it is still
 * short of the goal, is not a miss. The weekly view stays 5 of 7 real goal days.
 * Badges, once earned, stay earned.
 *
 * Saves from the recovered-time profile (v2) upgrade in place: minutes stay,
 * and retained pause sessions are stamped onto their days. Saves from the first
 * gamification (XP, 12 badges) migrate once from `focusMinutes`, never from XP.
 * Older saves with no progress field are seeded from sessions and recovered
 * time, without inventing goal days for the top-up.
 */

export const MIN_COUNTED_MINUTES = 5;
export const DEFAULT_GOAL_MINUTES = 60;
export const MIN_GOAL_MINUTES = 15;
export const MAX_GOAL_MINUTES = 240;
export const GOAL_STEP_MINUTES = 15;
export const DAY_HISTORY_CAP = 400;
export const QUIET_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
export const REWARD_HOURS_MIN = 1;
export const REWARD_HOURS_MAX = 500;
export const TEXT_MAX = 80;

const MINUTE_CAP = 100_000_000;

export const MODE_IDS = ['trabajo', 'estudio', 'casa', 'gym'] as const;
export type FocusModeId = (typeof MODE_IDS)[number];

export const BADGE_IDS = [
  'first_lock',
  'hour_1',
  'goal_7',
  'week_5',
  'hour_10',
  'hour_50',
  'hour_100',
  'month_quiet',
] as const;

export type BadgeId = (typeof BADGE_IDS)[number];

export const BADGE_MARK: Record<BadgeId, string> = {
  first_lock: '1',
  hour_1: '1h',
  goal_7: '7',
  week_5: '5/7',
  hour_10: '10',
  hour_50: '50',
  hour_100: '100',
  month_quiet: '30',
};

/** One tree is complete at 300 hours, then it joins the forest. */
export const TREE_MINUTES = 300 * 60;

/** Stage starts within the current tree. Mature runs until `TREE_MINUTES`. */
export const LEVELS = [
  { id: 'semilla', minMinutes: 0 },
  { id: 'brote', minMinutes: 5 * 60 },
  { id: 'planton', minMinutes: 20 * 60 },
  { id: 'joven', minMinutes: 60 * 60 },
  { id: 'arbol', minMinutes: 150 * 60 },
  { id: 'maduro', minMinutes: 240 * 60 },
] as const;

export type LevelId = (typeof LEVELS)[number]['id'];

export const PURPOSE_IDS = ['leer', 'familia', 'deporte', 'descansar', 'otro'] as const;
export type PurposeId = (typeof PURPOSE_IDS)[number];

export const PLANT_IDS = ['default', 'olive', 'fern', 'clay'] as const;
export type PlantId = (typeof PLANT_IDS)[number];

export const SKY_IDS = ['default', 'dawn', 'dusk', 'night'] as const;
export type SkyId = (typeof SKY_IDS)[number];

export const FREE_PLANT: PlantId = 'default';
export const FREE_SKY: SkyId = 'default';

/** Visitors at fixed hours inside the current tree. Not bought, not forced. */
export const SURPRISE_IDS = ['mushroom', 'butterfly', 'bird', 'squirrel'] as const;
export type SurpriseId = (typeof SURPRISE_IDS)[number];

export const SURPRISE_HOURS: readonly { id: SurpriseId; hours: number }[] = [
  { id: 'mushroom', hours: 10 },
  { id: 'butterfly', hours: 40 },
  { id: 'bird', hours: 90 },
  { id: 'squirrel', hours: 180 },
];

export function surprisesAt(intoMinutes: number): SurpriseId[] {
  const hours = Math.max(0, intoMinutes) / 60;
  return SURPRISE_HOURS.filter((item) => hours >= item.hours).map((item) => item.id);
}

export type GroveTree = {
  /** When this tree joined the forest. 0 if the save had no date. */
  at: number;
  plant: PlantId;
  surprises: SurpriseId[];
};

export type DayProgress = {
  focusMinutes: number;
  modes: Partial<Record<FocusModeId, number>>;
  attempts: number;
  /** A justified pause landed on this day. It does not add minutes. */
  pause?: boolean;
};

export type Reward = {
  hours: number;
  text: string;
  /** Recovered minutes when the reward was set. The target is new time. */
  baselineMinutes: number;
  createdAt: number;
  completedAt: number | null;
};

export type Challenge = {
  text: string;
  mode: FocusModeId;
  /** Distinct days this week, 1–7. */
  target: number;
};

export type GamificationState = {
  v: 3;
  goalMinutes: number;
  recoveredMinutes: number;
  startedAt: number | null;
  /** Start of the current stretch without a justified pause. */
  quietSince: number | null;
  unlocked: Partial<Record<BadgeId, number>>;
  days: Record<string, DayProgress>;
  /** Lifetime days that have met the goal. Never goes down. */
  goalDays: number;
  /** Day keys already included in `goalDays`. */
  goalMarked: string[];
  /** Ledger cursor. Attempts before this are not written onto a day. */
  attemptsNoted: number;
  purpose: PurposeId | null;
  reward: Reward | null;
  challenge: Challenge | null;
  /** Species chosen for the next seed. Pro. Does not repaint the current tree. */
  plant: PlantId;
  /** Species of the tree that is growing now. */
  sprout: PlantId;
  sky: SkyId;
  /** Trees already planted in the forest, oldest first. */
  grove: GroveTree[];
};

export type FocusSessionEvent = {
  mode: string;
  startedAt: number;
  endedAt: number;
  emergency?: boolean;
};

export type ProgressResult = {
  state: GamificationState;
  badges: BadgeId[];
  /** Stage reached inside the current tree. Null when a finished tree resets to seed. */
  levelUp: LevelId | null;
  /** Trees that joined the forest on this call. */
  treesCompleted: number;
  rewardCompleted: boolean;
};

export type DayMark = 'met' | 'grace' | 'pause' | 'missed' | 'today' | 'open';

export type WeeklyProgress = {
  weekKey: string;
  focusMinutes: number;
  daysMet: number;
  goalMinutes: number;
  todayKey: string;
  todayMinutes: number;
  todayMet: boolean;
  days: { key: string; status: DayMark; minutes: number }[];
  modes: Partial<Record<FocusModeId, number>>;
};

export type LevelProgress = {
  /** Completed trees already in the forest. */
  forest: number;
  /** Minutes into the tree that is growing now. */
  into: number;
  /** 0–1 across the current tree. Exact completion is a new seed at 0. */
  overall: number;
  index: number;
  id: LevelId;
  /** Stage start, in minutes, inside the current tree. */
  minMinutes: number;
  nextId: LevelId | null;
  /** Next stage start, or `TREE_MINUTES` while the tree is mature. */
  nextMinutes: number | null;
  remainingMinutes: number;
  /** 0–1 inside the current stage. */
  ratio: number;
};

export type StreakSnapshot = {
  streak: number;
  todayKey: string;
  todayMinutes: number;
  todayMet: boolean;
  /** False once this ISO week has bridged a miss in the living chain. */
  graceAvailable: boolean;
  graceDay: string | null;
  savedDays: string[];
};

export type RewardSnapshot = {
  hours: number;
  text: string;
  gainedMinutes: number;
  targetMinutes: number;
  ratio: number;
  completed: boolean;
};

export type ChallengeSnapshot = {
  text: string;
  mode: FocusModeId;
  target: number;
  days: number;
  met: boolean;
};

const DAY_KEY = /^(\d{4})-(\d{2})-(\d{2})$/;
const DAY_WALK_CAP = 500;

const LEGACY_BADGES: Record<string, BadgeId> = {
  first_session: 'first_lock',
  hour_1: 'hour_1',
  hour_10: 'hour_10',
  streak_7: 'goal_7',
};

export function emptyGamification(): GamificationState {
  return {
    v: 3,
    goalMinutes: DEFAULT_GOAL_MINUTES,
    recoveredMinutes: 0,
    startedAt: null,
    quietSince: null,
    unlocked: {},
    days: {},
    goalDays: 0,
    goalMarked: [],
    attemptsNoted: 0,
    purpose: null,
    reward: null,
    challenge: null,
    plant: FREE_PLANT,
    sprout: FREE_PLANT,
    sky: FREE_SKY,
    grove: [],
  };
}

export function minuteParts(total: number): { hours: number; minutes: number } {
  const safe = Math.max(0, Math.floor(total));
  return { hours: Math.floor(safe / 60), minutes: safe % 60 };
}

/** Minutes east of UTC for the device zone at `at` (DST included). */
export function deviceOffsetMinutes(at: number = Date.now()): number {
  return -new Date(at).getTimezoneOffset();
}

export function localDayKey(ts: number, offsetMinutes: number): string {
  const shifted = new Date(ts + offsetMinutes * 60_000);
  const year = shifted.getUTCFullYear();
  const month = shifted.getUTCMonth() + 1;
  const day = shifted.getUTCDate();
  return `${year}-${pad(month)}-${pad(day)}`;
}

export function localHour(ts: number, offsetMinutes: number): number {
  return new Date(ts + offsetMinutes * 60_000).getUTCHours();
}

export function addDays(dayKey: string, delta: number): string {
  const match = DAY_KEY.exec(dayKey);
  if (!match) return dayKey;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + delta));
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

/** ISO week of a local day key, such as `2026-W42`. */
export function isoWeekKeyFromDay(dayKey: string): string {
  const match = DAY_KEY.exec(dayKey);
  if (!match) return dayKey;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const isoYear = date.getUTCFullYear();
  const yearStart = new Date(Date.UTC(isoYear, 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${isoYear}-W${pad(week)}`;
}

export function weekDayKeys(at: number, offsetMinutes: number): string[] {
  const today = localDayKey(at, offsetMinutes);
  const match = DAY_KEY.exec(today);
  if (!match) return [today];
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  const dayNum = date.getUTCDay() || 7;
  const monday = addDays(today, 1 - dayNum);
  return Array.from({ length: 7 }, (_, index) => addDays(monday, index));
}

export function clampGoalMinutes(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return DEFAULT_GOAL_MINUTES;
  const stepped = Math.round(value / GOAL_STEP_MINUTES) * GOAL_STEP_MINUTES;
  return Math.min(MAX_GOAL_MINUTES, Math.max(MIN_GOAL_MINUTES, stepped));
}

export function stepGoalMinutes(current: number, direction: -1 | 1): number {
  return clampGoalMinutes(clampGoalMinutes(current) + direction * GOAL_STEP_MINUTES);
}

export function sessionDurationMs(session: FocusSessionEvent): number {
  if (!Number.isFinite(session.startedAt) || !Number.isFinite(session.endedAt)) return 0;
  return Math.max(0, session.endedAt - session.startedAt);
}

export function sessionFullMinutes(session: FocusSessionEvent): number {
  return Math.floor(sessionDurationMs(session) / 60_000);
}

/** Minutes that move progress. Zero for a pause or a session under 5 minutes. */
export function countedSessionMinutes(session: FocusSessionEvent): number {
  if (session.emergency === true) return 0;
  const minutes = sessionFullMinutes(session);
  if (minutes < MIN_COUNTED_MINUTES) return 0;
  return minutes;
}

export function levelProgress(recoveredMinutes: number): LevelProgress {
  const safe = nonNegMinutes(recoveredMinutes);
  const forest = Math.floor(safe / TREE_MINUTES);
  const into = safe % TREE_MINUTES;
  let index = 0;
  for (let i = 0; i < LEVELS.length; i += 1) {
    if (into >= LEVELS[i].minMinutes) index = i;
  }
  const current = LEVELS[index];
  const next = LEVELS[index + 1] ?? null;
  const nextBoundary = next ? next.minMinutes : TREE_MINUTES;
  const span = Math.max(1, nextBoundary - current.minMinutes);
  const ratio = Math.min(1, (into - current.minMinutes) / span);
  return {
    forest,
    into,
    overall: into / TREE_MINUTES,
    index,
    id: current.id,
    minMinutes: current.minMinutes,
    nextId: next ? next.id : null,
    nextMinutes: nextBoundary,
    remainingMinutes: Math.max(0, nextBoundary - into),
    ratio,
  };
}

export function computeStreak(state: GamificationState, at: number, offsetMinutes: number): StreakSnapshot {
  const todayKey = localDayKey(at, offsetMinutes);
  const todayMinutes = state.days[todayKey]?.focusMinutes ?? 0;
  const todayMet = todayMinutes >= state.goalMinutes;
  const savedDays: string[] = [];
  const usedWeeks = new Set<string>();
  let streak = 0;
  let cursor = todayMet ? todayKey : addDays(todayKey, -1);

  for (let guard = 0; guard < DAY_WALK_CAP; guard += 1) {
    if (dayMet(state, cursor)) {
      streak += 1;
      cursor = addDays(cursor, -1);
      continue;
    }
    if (dayPause(state, cursor)) {
      cursor = addDays(cursor, -1);
      continue;
    }
    const week = isoWeekKeyFromDay(cursor);
    if (usedWeeks.has(week) || !connects(addDays(cursor, -1), usedWeeks, week, state)) break;
    usedWeeks.add(week);
    savedDays.push(cursor);
    cursor = addDays(cursor, -1);
  }

  const thisWeek = isoWeekKeyFromDay(todayKey);
  const graceDay = savedDays.find((day) => isoWeekKeyFromDay(day) === thisWeek) ?? null;
  return {
    streak,
    todayKey,
    todayMinutes,
    todayMet,
    graceAvailable: graceDay == null,
    graceDay,
    savedDays,
  };
}

export function weeklyProgress(state: GamificationState, at: number, offsetMinutes: number): WeeklyProgress {
  const days = weekDayKeys(at, offsetMinutes);
  const todayKey = localDayKey(at, offsetMinutes);
  const modes: Partial<Record<FocusModeId, number>> = {};
  let focusMinutes = 0;
  let daysMet = 0;
  const marks = days.map((key) => {
    const bucket = state.days[key];
    const minutes = bucket?.focusMinutes ?? 0;
    if (bucket) {
      for (const mode of MODE_IDS) {
        const part = bucket.modes[mode] ?? 0;
        if (part > 0) modes[mode] = (modes[mode] ?? 0) + part;
      }
    }
    focusMinutes += minutes;
    const met = minutes >= state.goalMinutes;
    if (met) daysMet += 1;
    return { key, minutes, met };
  });
  const grace = new Set(computeStreak(state, at, offsetMinutes).savedDays);
  const todayMinutes = state.days[todayKey]?.focusMinutes ?? 0;
  return {
    weekKey: isoWeekKeyFromDay(todayKey),
    focusMinutes,
    daysMet,
    goalMinutes: state.goalMinutes,
    todayKey,
    todayMinutes,
    todayMet: todayMinutes >= state.goalMinutes,
    days: marks.map((day) => ({
      key: day.key,
      minutes: day.minutes,
      status: dayStatus(state, day.key, todayKey, day.met, grace),
    })),
    modes,
  };
}

export function dominantMode(state: GamificationState, at: number, offsetMinutes: number): FocusModeId | null {
  const week = weeklyProgress(state, at, offsetMinutes).modes;
  const fromWeek = leadingMode(week);
  if (fromWeek) return fromWeek;
  const life: Partial<Record<FocusModeId, number>> = {};
  for (const day of Object.values(state.days)) {
    for (const mode of MODE_IDS) {
      const part = day.modes[mode] ?? 0;
      if (part > 0) life[mode] = (life[mode] ?? 0) + part;
    }
  }
  return leadingMode(life);
}

export function rewardSnapshot(state: GamificationState): RewardSnapshot | null {
  const reward = state.reward;
  if (!reward) return null;
  const targetMinutes = reward.hours * 60;
  const gainedMinutes = Math.max(0, state.recoveredMinutes - reward.baselineMinutes);
  const ratio = targetMinutes <= 0 ? 1 : Math.min(1, gainedMinutes / targetMinutes);
  return {
    hours: reward.hours,
    text: reward.text,
    gainedMinutes,
    targetMinutes,
    ratio,
    completed: reward.completedAt != null || gainedMinutes >= targetMinutes,
  };
}

export function challengeSnapshot(
  state: GamificationState,
  at: number,
  offsetMinutes: number,
): ChallengeSnapshot | null {
  const challenge = state.challenge;
  if (!challenge) return null;
  const days = weekDayKeys(at, offsetMinutes).filter((key) => (state.days[key]?.modes[challenge.mode] ?? 0) > 0).length;
  return {
    text: challenge.text,
    mode: challenge.mode,
    target: challenge.target,
    days,
    met: days >= challenge.target,
  };
}

export function applyFocusSession(
  state: GamificationState,
  session: FocusSessionEvent,
  offsetMinutes: number,
): ProgressResult {
  if (!Number.isFinite(session.startedAt) || !Number.isFinite(session.endedAt)) return unchanged(state);
  if (session.emergency === true) {
    const next = cloneState(state);
    next.quietSince = session.endedAt;
    next.days = markPause(next.days, localDayKey(session.endedAt, offsetMinutes));
    return finish(state, next, session.endedAt);
  }
  const minutes = countedSessionMinutes(session);
  if (minutes <= 0) return unchanged(state);
  const next = cloneState(state);
  next.recoveredMinutes = capMinutes(next.recoveredMinutes + minutes);
  if (next.startedAt == null) next.startedAt = session.startedAt;
  if (next.quietSince == null) next.quietSince = session.startedAt;
  next.days = addFocusDay(next.days, localDayKey(session.endedAt, offsetMinutes), minutes, focusMode(session.mode));
  return finish(state, next, session.endedAt);
}

/**
 * Record new blocked attempts on today's count. No minutes, no badges.
 * `baseline` moves the cursor without writing the backlog onto today.
 */
export function noteAttempts(
  state: GamificationState,
  total: number,
  at: number,
  offsetMinutes: number,
  options?: { baseline?: boolean },
): ProgressResult {
  const safeTotal = nonNegMinutes(total);
  if (safeTotal <= state.attemptsNoted) return unchanged(state);
  const next = cloneState(state);
  next.attemptsNoted = safeTotal;
  if (options?.baseline) return idle(next);
  const when = Number.isFinite(at) ? at : 0;
  next.days = addAttempts(next.days, localDayKey(when, offsetMinutes), safeTotal - state.attemptsNoted);
  return idle(next);
}

export function setGoalMinutes(
  state: GamificationState,
  minutes: number,
  at: number,
): ProgressResult {
  const goal = clampGoalMinutes(minutes);
  if (goal === state.goalMinutes) return unchanged(state);
  const next = cloneState(state);
  next.goalMinutes = goal;
  return finish(state, next, Number.isFinite(at) ? at : 0);
}

export function setPurpose(state: GamificationState, purpose: PurposeId | null): ProgressResult {
  const nextPurpose = purpose && PURPOSE_IDS.includes(purpose) ? purpose : null;
  if (nextPurpose === state.purpose) return unchanged(state);
  return idle({ ...state, purpose: nextPurpose });
}

export function setReward(
  state: GamificationState,
  input: { hours: number; text: string } | null,
  at: number,
): ProgressResult {
  if (input == null) {
    if (!state.reward) return unchanged(state);
    return idle({ ...state, reward: null });
  }
  const text = cleanText(input.text);
  const hours = clampRewardHours(input.hours);
  if (!text || hours == null) return unchanged(state);
  const when = Number.isFinite(at) && at > 0 ? Math.floor(at) : Date.now();
  const next = cloneState(state);
  next.reward = {
    hours,
    text,
    baselineMinutes: state.recoveredMinutes,
    createdAt: when,
    completedAt: null,
  };
  return idle(next);
}

export function setChallenge(
  state: GamificationState,
  input: { text: string; mode: string; target: number } | null,
): ProgressResult {
  if (input == null) {
    if (!state.challenge) return unchanged(state);
    return idle({ ...state, challenge: null });
  }
  const text = cleanText(input.text);
  const mode = focusMode(input.mode);
  const target = clampChallengeTarget(input.target);
  if (!text || !mode || target == null) return unchanged(state);
  const next = cloneState(state);
  next.challenge = { text, mode, target };
  return idle(next);
}

export function setPlant(state: GamificationState, plant: PlantId): ProgressResult {
  if (!PLANT_IDS.includes(plant) || plant === state.plant) return unchanged(state);
  return idle({ ...state, plant });
}

export function setSky(state: GamificationState, sky: SkyId): ProgressResult {
  if (!SKY_IDS.includes(sky) || sky === state.sky) return unchanged(state);
  return idle({ ...state, sky });
}

/**
 * Time-based badges (a quiet month) when the app is open and no session is running.
 * Returns the same state reference when nothing changed.
 */
export function evaluateProgress(state: GamificationState, at: number): ProgressResult {
  return finish(state, state, Number.isFinite(at) ? at : 0);
}

/**
 * Apply the session a native or in-app unlock just prepended.
 * The same newest session is a no-op, so a repeated tap cannot double time.
 */
export function applyUnlockedSession(
  progress: GamificationState,
  before: readonly FocusSessionEvent[],
  after: readonly FocusSessionEvent[],
  offsetMinutes: number,
): ProgressResult {
  const newest = after[0];
  if (!newest || !Number.isFinite(newest.startedAt) || !Number.isFinite(newest.endedAt)) return unchanged(progress);
  const previous = before[0];
  if (
    previous &&
    previous.startedAt === newest.startedAt &&
    previous.endedAt === newest.endedAt &&
    Boolean(previous.emergency) === Boolean(newest.emergency)
  ) {
    return unchanged(progress);
  }
  return applyFocusSession(progress, newest, offsetMinutes);
}

export function sanitizeGamification(raw: unknown): GamificationState {
  if (isV3(raw)) return sanitizeV3(raw);
  if (isV2(raw)) return upgradeV2(raw, []);
  if (isLegacy(raw)) return migrateLegacy(raw, []);
  return emptyGamification();
}

/**
 * Missing progress replays history once. A stored object is repaired, not
 * replayed, so a later launch cannot grant the same session twice.
 */
export function resolveGamification(
  raw: unknown,
  sessions: readonly FocusSessionEvent[],
  recoveredMs = 0,
  offsetMinutes?: number,
  now?: number,
): GamificationState {
  if (raw == null) return seedGamification(sessions, recoveredMs, offsetMinutes);
  if (isV3(raw)) return sanitizeV3(raw);
  if (isV2(raw)) return upgradeV2(raw, sessions, offsetMinutes);
  if (isLegacy(raw)) return migrateLegacy(raw, sessions, offsetMinutes, now);
  return emptyGamification();
}

export function seedGamification(
  sessions: readonly FocusSessionEvent[],
  recoveredMs = 0,
  offsetMinutes?: number,
): GamificationState {
  const ordered = orderedSessions(sessions);
  let state = emptyGamification();
  for (const session of ordered) {
    const offset = offsetMinutes ?? deviceOffsetMinutes(session.endedAt);
    state = applyFocusSession(state, session, offset).state;
  }
  const emergencyMs = ordered
    .filter((session) => session.emergency === true)
    .reduce((sum, session) => sum + sessionDurationMs(session), 0);
  const recoveredMinutes = Math.floor(nonNegMillis(recoveredMs) / 60_000);
  const emergencyMinutes = Math.floor(emergencyMs / 60_000);
  const floorMinutes = Math.max(0, recoveredMinutes - emergencyMinutes);
  if (floorMinutes > state.recoveredMinutes) {
    const next = cloneState(state);
    next.recoveredMinutes = capMinutes(floorMinutes);
    const at = ordered.length > 0 ? ordered[ordered.length - 1].endedAt : 0;
    state = finish(state, next, at).state;
  }
  return state;
}

function migrateLegacy(
  raw: object,
  sessions: readonly FocusSessionEvent[],
  offsetMinutes?: number,
  now?: number,
): GamificationState {
  const data = raw as Record<string, unknown>;
  const recoveredMinutes = nonNegMinutes(data.focusMinutes);
  const unlocked: GamificationState['unlocked'] = {};
  if (data.unlocked && typeof data.unlocked === 'object') {
    const source = data.unlocked as Record<string, unknown>;
    for (const [legacy, id] of Object.entries(LEGACY_BADGES)) {
      const stamp = source[legacy];
      if (typeof stamp === 'number' && Number.isFinite(stamp) && stamp > 0) unlocked[id] = Math.floor(stamp);
    }
  }
  const days = sanitizeLegacyDays(data.days);
  let startedAt: number | null = null;
  let lastPause: number | null = null;
  for (const session of orderedSessions(sessions)) {
    const offset = offsetMinutes ?? deviceOffsetMinutes(session.endedAt);
    const key = localDayKey(session.endedAt, offset);
    if (session.emergency === true) {
      lastPause = session.endedAt;
      const current = days[key] ?? { focusMinutes: 0, modes: {}, attempts: 0 };
      days[key] = { ...current, pause: true };
      continue;
    }
    const minutes = countedSessionMinutes(session);
    if (minutes <= 0) continue;
    if (startedAt == null) startedAt = session.startedAt;
    const mode = focusMode(session.mode);
    const current = days[key] ?? { focusMinutes: 0, modes: {}, attempts: 0 };
    const modes = { ...current.modes };
    if (mode) modes[mode] = (modes[mode] ?? 0) + minutes;
    days[key] = {
      focusMinutes: current.focusMinutes,
      modes,
      attempts: current.attempts,
      ...(current.pause ? { pause: true } : {}),
    };
  }
  const built: GamificationState = {
    ...emptyGamification(),
    goalMinutes: clampGoalMinutes(data.goalMinutes),
    recoveredMinutes,
    startedAt,
    quietSince: lastPause ?? startedAt,
    unlocked,
    days: pruneDays(days),
    attemptsNoted: nonNegMinutes(data.resistedCounted),
  };
  const at = now ?? (orderedSessions(sessions).at(-1)?.endedAt ?? Date.now());
  return finish(emptyGamification(), built, at).state;
}

function finish(before: GamificationState, draft: GamificationState, at: number): ProgressResult {
  const synced = syncGoalDays(draft);
  const unlocked = { ...synced.unlocked };
  const badges: BadgeId[] = [];
  const when = Number.isFinite(at) && at > 0 ? Math.floor(at) : Date.now();
  for (const [id, ok] of badgeChecks(synced, when)) {
    if (!ok || unlocked[id] != null) continue;
    unlocked[id] = when;
    badges.push(id);
  }
  let next = synced;
  if (badges.length > 0) next = { ...synced, unlocked };
  let rewardCompleted = false;
  if (next.reward && next.reward.completedAt == null) {
    const gained = next.recoveredMinutes - next.reward.baselineMinutes;
    if (gained >= next.reward.hours * 60) {
      next = { ...next, reward: { ...next.reward, completedAt: when } };
      rewardCompleted = true;
    }
  }
  const beforeTree = levelProgress(before.recoveredMinutes);
  const afterTree = levelProgress(next.recoveredMinutes);
  const treesCompleted = Math.max(0, afterTree.forest - beforeTree.forest);
  let levelUp: LevelId | null = null;
  if (treesCompleted === 0) {
    if (afterTree.index > beforeTree.index) levelUp = afterTree.id;
  } else if (afterTree.index > 0) {
    levelUp = afterTree.id;
  }
  if (treesCompleted > 0) {
    const grown = before.sprout ?? before.plant;
    const planted: GroveTree[] = [];
    for (let index = 0; index < treesCompleted; index += 1) {
      planted.push({ at: when, plant: grown, surprises: surprisesAt(TREE_MINUTES) });
    }
    next = {
      ...next,
      grove: [...(next.grove ?? []), ...planted].slice(-afterTree.forest),
      sprout: next.plant,
    };
  }
  if (badges.length === 0 && !rewardCompleted && levelUp == null && treesCompleted === 0 && next === before) {
    return unchanged(before);
  }
  return { state: next, badges, levelUp, treesCompleted, rewardCompleted };
}

function badgeChecks(state: GamificationState, at: number): [BadgeId, boolean][] {
  return [
    ['first_lock', state.recoveredMinutes > 0],
    ['hour_1', state.recoveredMinutes >= 60],
    ['goal_7', state.goalDays >= 7],
    ['week_5', weekReached(state, 5)],
    ['hour_10', state.recoveredMinutes >= 10 * 60],
    ['hour_50', state.recoveredMinutes >= 50 * 60],
    ['hour_100', state.recoveredMinutes >= 100 * 60],
    ['month_quiet', quietLongEnough(state, at)],
  ];
}

function quietLongEnough(state: GamificationState, at: number): boolean {
  if (state.quietSince == null || state.recoveredMinutes <= 0) return false;
  if (!Number.isFinite(at)) return false;
  return at - state.quietSince >= QUIET_WINDOW_MS;
}

function weekReached(state: GamificationState, threshold: number): boolean {
  const counts = new Map<string, number>();
  for (const [key, day] of Object.entries(state.days)) {
    if (day.focusMinutes < state.goalMinutes) continue;
    const week = isoWeekKeyFromDay(key);
    counts.set(week, (counts.get(week) ?? 0) + 1);
  }
  for (const count of counts.values()) {
    if (count >= threshold) return true;
  }
  return false;
}

function syncGoalDays(state: GamificationState): GamificationState {
  const marked = new Set(state.goalMarked);
  let added = 0;
  for (const [key, day] of Object.entries(state.days)) {
    if (day.focusMinutes < state.goalMinutes || marked.has(key)) continue;
    marked.add(key);
    added += 1;
  }
  const goalMarked = [...marked].filter((key) => state.days[key]).sort();
  if (added === 0 && sameKeys(goalMarked, state.goalMarked)) return state;
  return { ...state, goalDays: state.goalDays + added, goalMarked };
}

function unchanged(state: GamificationState): ProgressResult {
  return idle(state);
}

function idle(state: GamificationState): ProgressResult {
  return { state, badges: [], levelUp: null, treesCompleted: 0, rewardCompleted: false };
}

function isRecord(raw: unknown): raw is Record<string, unknown> {
  return !!raw && typeof raw === 'object' && !Array.isArray(raw);
}

function isV3(raw: unknown): raw is Record<string, unknown> {
  return isRecord(raw) && raw.v === 3;
}

function isV2(raw: unknown): raw is Record<string, unknown> {
  return isRecord(raw) && raw.v === 2;
}

function isLegacy(raw: unknown): raw is object {
  if (!isRecord(raw) || raw.v === 2 || raw.v === 3) return false;
  return (
    'xp' in raw ||
    'focusMinutes' in raw ||
    'resistedCounted' in raw ||
    'sessionsCompleted' in raw ||
    'nightOwl' in raw ||
    'earlyBird' in raw
  );
}

function sanitizeV3(raw: Record<string, unknown>): GamificationState {
  return readStored(raw);
}

function upgradeV2(
  raw: Record<string, unknown>,
  sessions: readonly FocusSessionEvent[],
  offsetMinutes?: number,
): GamificationState {
  return stampPauses(readStored(raw), sessions, offsetMinutes);
}

function readStored(raw: Record<string, unknown>): GamificationState {
  const reward = sanitizeReward(raw.reward);
  const challenge = sanitizeChallenge(raw.challenge);
  const plant = PLANT_IDS.find((id) => id === raw.plant) ?? FREE_PLANT;
  const sprout = PLANT_IDS.find((id) => id === raw.sprout) ?? plant;
  const sky = SKY_IDS.find((id) => id === raw.sky) ?? FREE_SKY;
  const purpose = PURPOSE_IDS.find((id) => id === raw.purpose) ?? null;
  const recoveredMinutes = nonNegMinutes(raw.recoveredMinutes);
  return {
    v: 3,
    goalMinutes: clampGoalMinutes(raw.goalMinutes),
    recoveredMinutes,
    startedAt: positiveStamp(raw.startedAt),
    quietSince: positiveStamp(raw.quietSince),
    unlocked: sanitizeUnlocked(raw.unlocked),
    days: sanitizeDays(raw.days),
    goalDays: nonNegMinutes(raw.goalDays),
    goalMarked: sanitizeDayList(raw.goalMarked),
    attemptsNoted: nonNegMinutes(raw.attemptsNoted),
    purpose,
    reward,
    challenge,
    plant,
    sprout,
    sky,
    grove: sanitizeGrove(raw.grove, Math.floor(recoveredMinutes / TREE_MINUTES), sprout),
  };
}

function sanitizeSurprises(raw: unknown): SurpriseId[] {
  if (!Array.isArray(raw)) return [];
  return SURPRISE_IDS.filter((id) => raw.includes(id));
}

function sanitizeGrove(raw: unknown, forest: number, plant: PlantId): GroveTree[] {
  const parsed: GroveTree[] = [];
  if (Array.isArray(raw)) {
    for (const row of raw) {
      if (!isRecord(row)) continue;
      const treePlant = PLANT_IDS.find((id) => id === row.plant) ?? plant;
      const at = positiveStamp(row.at) ?? 0;
      const surprises = sanitizeSurprises(row.surprises);
      parsed.push({
        at,
        plant: treePlant,
        surprises: surprises.length > 0 ? surprises : surprisesAt(TREE_MINUTES),
      });
    }
  }
  const kept = parsed.slice(-Math.max(0, forest));
  const missing = Math.max(0, forest - kept.length);
  const filler: GroveTree[] = [];
  for (let index = 0; index < missing; index += 1) {
    filler.push({ at: 0, plant, surprises: surprisesAt(TREE_MINUTES) });
  }
  return [...filler, ...kept];
}

function sanitizeUnlocked(raw: unknown): GamificationState['unlocked'] {
  const unlocked: GamificationState['unlocked'] = {};
  if (!raw || typeof raw !== 'object') return unlocked;
  const source = raw as Partial<Record<BadgeId, unknown>>;
  for (const id of BADGE_IDS) {
    const stamp = source[id];
    if (typeof stamp === 'number' && Number.isFinite(stamp) && stamp > 0) unlocked[id] = Math.floor(stamp);
  }
  return unlocked;
}

function sanitizeReward(raw: unknown): Reward | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Partial<Reward>;
  const text = cleanText(row.text);
  const hours = clampRewardHours(row.hours);
  if (!text || hours == null) return null;
  const createdAt = positiveStamp(row.createdAt) ?? 1;
  const completedAt = positiveStamp(row.completedAt);
  return {
    hours,
    text,
    baselineMinutes: nonNegMinutes(row.baselineMinutes),
    createdAt,
    completedAt,
  };
}

function sanitizeChallenge(raw: unknown): Challenge | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Partial<Challenge>;
  const text = cleanText(row.text);
  const mode = focusMode(row.mode);
  const target = clampChallengeTarget(row.target);
  if (!text || !mode || target == null) return null;
  return { text, mode, target };
}

function sanitizeDays(raw: unknown): Record<string, DayProgress> {
  if (!raw || typeof raw !== 'object') return {};
  const days: Record<string, DayProgress> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!DAY_KEY.test(key) || !value || typeof value !== 'object') continue;
    days[key] = sanitizeDay(value);
  }
  return pruneDays(days);
}

function sanitizeLegacyDays(raw: unknown): Record<string, DayProgress> {
  if (!raw || typeof raw !== 'object') return {};
  const days: Record<string, DayProgress> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!DAY_KEY.test(key) || !value || typeof value !== 'object') continue;
    const row = value as { focusMinutes?: unknown };
    days[key] = { focusMinutes: nonNegMinutes(row.focusMinutes), modes: {}, attempts: 0 };
  }
  return days;
}

function sanitizeDay(raw: unknown): DayProgress {
  const row = raw as Partial<DayProgress>;
  const modes: Partial<Record<FocusModeId, number>> = {};
  if (row.modes && typeof row.modes === 'object') {
    for (const mode of MODE_IDS) {
      const minutes = nonNegMinutes((row.modes as Partial<Record<FocusModeId, unknown>>)[mode]);
      if (minutes > 0) modes[mode] = minutes;
    }
  }
  return {
    focusMinutes: nonNegMinutes(row.focusMinutes),
    modes,
    attempts: nonNegMinutes(row.attempts),
    ...(row.pause === true ? { pause: true } : {}),
  };
}

function sanitizeDayList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const keys = raw.filter((key): key is string => typeof key === 'string' && DAY_KEY.test(key));
  return [...new Set(keys)].sort();
}

function orderedSessions(sessions: readonly FocusSessionEvent[]): FocusSessionEvent[] {
  return [...sessions]
    .filter((session) => Number.isFinite(session.startedAt) && Number.isFinite(session.endedAt))
    .sort((a, b) => a.endedAt - b.endedAt || a.startedAt - b.startedAt);
}

function addFocusDay(
  days: Record<string, DayProgress>,
  key: string,
  minutes: number,
  mode: FocusModeId | null,
): Record<string, DayProgress> {
  const current = days[key] ?? { focusMinutes: 0, modes: {}, attempts: 0 };
  const modes = { ...current.modes };
  if (mode) modes[mode] = (modes[mode] ?? 0) + minutes;
  return pruneDays({
    ...days,
    [key]: {
      focusMinutes: current.focusMinutes + minutes,
      modes,
      attempts: current.attempts,
      ...(current.pause ? { pause: true } : {}),
    },
  });
}

function addAttempts(days: Record<string, DayProgress>, key: string, delta: number): Record<string, DayProgress> {
  const current = days[key] ?? { focusMinutes: 0, modes: {}, attempts: 0 };
  return pruneDays({
    ...days,
    [key]: {
      focusMinutes: current.focusMinutes,
      modes: { ...current.modes },
      attempts: current.attempts + delta,
      ...(current.pause ? { pause: true } : {}),
    },
  });
}

function markPause(days: Record<string, DayProgress>, key: string): Record<string, DayProgress> {
  const current = days[key];
  if (current?.pause) return days;
  const base = current ?? { focusMinutes: 0, modes: {}, attempts: 0 };
  return pruneDays({
    ...days,
    [key]: { focusMinutes: base.focusMinutes, modes: { ...base.modes }, attempts: base.attempts, pause: true },
  });
}

function stampPauses(
  state: GamificationState,
  sessions: readonly FocusSessionEvent[],
  offsetMinutes?: number,
): GamificationState {
  let days = state.days;
  let changed = false;
  for (const session of sessions) {
    if (session.emergency !== true || !Number.isFinite(session.endedAt)) continue;
    const offset = offsetMinutes ?? deviceOffsetMinutes(session.endedAt);
    const key = localDayKey(session.endedAt, offset);
    if (days[key]?.pause) continue;
    const base = days[key] ?? { focusMinutes: 0, modes: {}, attempts: 0 };
    days = {
      ...days,
      [key]: { focusMinutes: base.focusMinutes, modes: { ...base.modes }, attempts: base.attempts, pause: true },
    };
    changed = true;
  }
  if (!changed) return state;
  return { ...state, days: pruneDays(days) };
}

function dayMet(state: GamificationState, key: string): boolean {
  return (state.days[key]?.focusMinutes ?? 0) >= state.goalMinutes;
}

function dayPause(state: GamificationState, key: string): boolean {
  return state.days[key]?.pause === true && !dayMet(state, key);
}

function dayStatus(
  state: GamificationState,
  key: string,
  todayKey: string,
  met: boolean,
  grace: ReadonlySet<string>,
): DayMark {
  if (key > todayKey) return 'open';
  if (met) return 'met';
  if (key === todayKey) return 'today';
  if (grace.has(key)) return 'grace';
  if (state.days[key]?.pause) return 'pause';
  return 'missed';
}

function connects(start: string, used: Set<string>, pendingWeek: string, state: GamificationState): boolean {
  const seen = new Set(used);
  seen.add(pendingWeek);
  let cursor = start;
  for (let guard = 0; guard < DAY_WALK_CAP; guard += 1) {
    if (dayMet(state, cursor)) return true;
    if (dayPause(state, cursor)) {
      cursor = addDays(cursor, -1);
      continue;
    }
    const week = isoWeekKeyFromDay(cursor);
    if (seen.has(week)) return false;
    seen.add(week);
    cursor = addDays(cursor, -1);
  }
  return false;
}

function pruneDays(days: Record<string, DayProgress>): Record<string, DayProgress> {
  const keys = Object.keys(days);
  if (keys.length <= DAY_HISTORY_CAP) return days;
  const next: Record<string, DayProgress> = {};
  for (const key of keys.sort().slice(-DAY_HISTORY_CAP)) next[key] = days[key];
  return next;
}

function cloneState(state: GamificationState): GamificationState {
  const days: Record<string, DayProgress> = {};
  for (const [key, value] of Object.entries(state.days)) {
    days[key] = {
      focusMinutes: value.focusMinutes,
      attempts: value.attempts,
      modes: { ...value.modes },
      ...(value.pause ? { pause: true } : {}),
    };
  }
  return {
    ...state,
    unlocked: { ...state.unlocked },
    days,
    goalMarked: [...state.goalMarked],
    reward: state.reward ? { ...state.reward } : null,
    challenge: state.challenge ? { ...state.challenge } : null,
    grove: (state.grove ?? []).map((tree) => ({ ...tree, surprises: [...tree.surprises] })),
  };
}

function leadingMode(modes: Partial<Record<FocusModeId, number>>): FocusModeId | null {
  let best: FocusModeId | null = null;
  let bestMinutes = 0;
  for (const mode of MODE_IDS) {
    const minutes = modes[mode] ?? 0;
    if (minutes > bestMinutes) {
      best = mode;
      bestMinutes = minutes;
    }
  }
  return best;
}

function focusMode(value: unknown): FocusModeId | null {
  return MODE_IDS.find((id) => id === value) ?? null;
}

function cleanText(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, TEXT_MAX);
}

function clampRewardHours(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  const hours = Math.floor(value);
  if (hours < REWARD_HOURS_MIN || hours > REWARD_HOURS_MAX) return null;
  return hours;
}

function clampChallengeTarget(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  const target = Math.floor(value);
  if (target < 1 || target > 7) return null;
  return target;
}

function positiveStamp(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return null;
  return Math.floor(value);
}

function sameKeys(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  for (let index = 0; index < a.length; index += 1) {
    if (a[index] !== b[index]) return false;
  }
  return true;
}

function nonNegMinutes(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return 0;
  return Math.min(MINUTE_CAP, Math.floor(value));
}

function capMinutes(value: number): number {
  return Math.min(MINUTE_CAP, Math.max(0, Math.floor(value)));
}

function nonNegMillis(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return 0;
  return Math.floor(value);
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}
