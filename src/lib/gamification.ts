/**
 * Local gamification. No account, no network.
 *
 * XP: 10 per completed focus minute. 5 per resisted blocked attempt.
 * An emergency unlock awards no XP for that session and subtracts 20 XP,
 * never below 0.
 *
 * A day counts toward the streak when non-emergency focus minutes reach the
 * goal (default 60, user-chosen, 15–240 in steps of 15). Each ISO week has
 * one comodín: it bridges a single missed day so the streak does not reset.
 * The bridged day does not itself count. Today, while still short of the
 * goal, never spends the comodín.
 *
 * Night owl: a non-emergency session of at least 15 minutes whose local
 * start hour is 22–23 or 0–4. Early bird: start hour 5, 6, or 7, same length.
 *
 * Old saves have no `gamification` field. The first load replays the retained
 * sessions (newest 40) and, when recovered time is higher, credits the
 * difference as lifetime minutes. That credit does not invent streak days.
 */

export const XP_PER_FOCUS_MINUTE = 10;
export const XP_PER_RESISTED_ATTEMPT = 5;
export const EMERGENCY_XP_PENALTY = 20;
export const DEFAULT_GOAL_MINUTES = 60;
export const MIN_GOAL_MINUTES = 15;
export const MAX_GOAL_MINUTES = 240;
export const GOAL_STEP_MINUTES = 15;
export const NIGHT_MIN_MINUTES = 15;
export const EARLY_MIN_MINUTES = 15;
export const DAY_HISTORY_CAP = 400;
const DAY_WALK_CAP = 400;
const XP_CAP = 1_000_000_000;

export const MODE_IDS = ['trabajo', 'estudio', 'casa', 'gym'] as const;
export type FocusModeId = (typeof MODE_IDS)[number];

export const ACHIEVEMENT_IDS = [
  'first_session',
  'hour_1',
  'hour_10',
  'streak_7',
  'streak_30',
  'resisted_100',
  'mode_trabajo',
  'mode_estudio',
  'mode_casa',
  'mode_gym',
  'night_owl',
  'early_bird',
] as const;

export type AchievementId = (typeof ACHIEVEMENT_IDS)[number];

export const ACHIEVEMENT_MARK: Record<AchievementId, string> = {
  first_session: '1',
  hour_1: '1h',
  hour_10: '10',
  streak_7: '7',
  streak_30: '30',
  resisted_100: '100',
  mode_trabajo: 'W',
  mode_estudio: 'E',
  mode_casa: 'H',
  mode_gym: 'D',
  night_owl: 'N',
  early_bird: 'M',
};

export const LEVELS = [
  { id: 'chispa', minXp: 0 },
  { id: 'presente', minXp: 100 },
  { id: 'foco', minXp: 300 },
  { id: 'constante', minXp: 750 },
  { id: 'guardian', minXp: 1500 },
  { id: 'ritual', minXp: 3000 },
  { id: 'silencio', minXp: 6000 },
  { id: 'apartado', minXp: 12000 },
] as const;

export type LevelId = (typeof LEVELS)[number]['id'];

export type DayProgress = {
  focusMinutes: number;
  xp: number;
  resisted: number;
};

export type GamificationState = {
  xp: number;
  goalMinutes: number;
  focusMinutes: number;
  sessionsCompleted: number;
  resistedCounted: number;
  modes: FocusModeId[];
  nightOwl: boolean;
  earlyBird: boolean;
  /** Achievement id → unlock time, ms. Absent means locked. */
  unlocked: Partial<Record<AchievementId, number>>;
  /** Local YYYY-MM-DD → that day's totals. */
  days: Record<string, DayProgress>;
};

export type FocusSessionEvent = {
  mode: string;
  startedAt: number;
  endedAt: number;
  emergency?: boolean;
};

export type GamificationResult = {
  state: GamificationState;
  /** Newly unlocked on this call. Empty when nothing changed. */
  unlocked: AchievementId[];
};

export type StreakSnapshot = {
  streak: number;
  todayKey: string;
  todayMinutes: number;
  todayMet: boolean;
  /** True when this ISO week already bridged a miss in the current chain. */
  comodinUsedThisWeek: boolean;
  comodinDay: string | null;
  savedDays: string[];
};

export type WeeklySummary = {
  weekKey: string;
  focusMinutes: number;
  /** Net XP this week, never negative. */
  xp: number;
  resisted: number;
  daysMet: number;
  goalMinutes: number;
};

export type LevelProgress = {
  level: number;
  id: LevelId;
  minXp: number;
  nextXp: number | null;
  into: number;
  span: number;
  /** 0–1. Full on the last level. */
  ratio: number;
};

const DAY_KEY = /^(\d{4})-(\d{2})-(\d{2})$/;

export function emptyGamification(): GamificationState {
  return {
    xp: 0,
    goalMinutes: DEFAULT_GOAL_MINUTES,
    focusMinutes: 0,
    sessionsCompleted: 0,
    resistedCounted: 0,
    modes: [],
    nightOwl: false,
    earlyBird: false,
    unlocked: {},
    days: {},
  };
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

export function levelProgress(xp: number): LevelProgress {
  const safe = nonNegInt(xp);
  let index = 0;
  for (let i = 0; i < LEVELS.length; i += 1) {
    if (safe >= LEVELS[i].minXp) index = i;
  }
  const current = LEVELS[index];
  const next = LEVELS[index + 1] ?? null;
  const span = next ? next.minXp - current.minXp : 1;
  const into = safe - current.minXp;
  const ratio = next ? Math.min(1, into / span) : 1;
  return {
    level: index + 1,
    id: current.id,
    minXp: current.minXp,
    nextXp: next ? next.minXp : null,
    into,
    span,
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
    const minutes = state.days[cursor]?.focusMinutes ?? 0;
    if (minutes >= state.goalMinutes) {
      streak += 1;
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
  const comodinDay = savedDays.find((day) => isoWeekKeyFromDay(day) === thisWeek) ?? null;
  return {
    streak,
    todayKey,
    todayMinutes,
    todayMet,
    comodinUsedThisWeek: comodinDay != null,
    comodinDay,
    savedDays,
  };
}

export function weeklySummary(state: GamificationState, at: number, offsetMinutes: number): WeeklySummary {
  const days = weekDayKeys(at, offsetMinutes);
  let focusMinutes = 0;
  let xp = 0;
  let resisted = 0;
  let daysMet = 0;
  for (const day of days) {
    const bucket = state.days[day];
    if (!bucket) continue;
    focusMinutes += bucket.focusMinutes;
    xp += bucket.xp;
    resisted += bucket.resisted;
    if (bucket.focusMinutes >= state.goalMinutes) daysMet += 1;
  }
  return {
    weekKey: isoWeekKeyFromDay(localDayKey(at, offsetMinutes)),
    focusMinutes,
    xp: Math.max(0, xp),
    resisted,
    daysMet,
    goalMinutes: state.goalMinutes,
  };
}

export function applyFocusSession(
  state: GamificationState,
  session: FocusSessionEvent,
  offsetMinutes: number,
): GamificationResult {
  if (!Number.isFinite(session.startedAt) || !Number.isFinite(session.endedAt)) {
    return { state, unlocked: [] };
  }
  const at = session.endedAt;
  if (session.emergency === true) return applyEmergency(state, at, offsetMinutes);

  const minutes = sessionFullMinutes(session);
  const lived = sessionDurationMs(session) > 0;
  if (!lived && minutes === 0) return { state, unlocked: [] };

  const next = cloneState(state);
  next.xp = capXp(next.xp + minutes * XP_PER_FOCUS_MINUTE);
  next.focusMinutes += minutes;
  if (lived) {
    next.sessionsCompleted += 1;
    const mode = focusMode(session.mode);
    if (mode && !next.modes.includes(mode)) next.modes = [...next.modes, mode];
    if (isNightSession(session, offsetMinutes)) next.nightOwl = true;
    if (isEarlySession(session, offsetMinutes)) next.earlyBird = true;
  }
  if (minutes > 0) {
    next.days = addDay(next.days, localDayKey(at, offsetMinutes), {
      focusMinutes: minutes,
      xp: minutes * XP_PER_FOCUS_MINUTE,
    });
  }
  return withAchievements(next, at, offsetMinutes);
}

export function applyResistedAttempts(
  state: GamificationState,
  total: number,
  at: number,
  offsetMinutes: number,
): GamificationResult {
  const safeTotal = nonNegInt(total);
  if (safeTotal <= state.resistedCounted) return { state, unlocked: [] };
  const delta = safeTotal - state.resistedCounted;
  const gained = delta * XP_PER_RESISTED_ATTEMPT;
  const next = cloneState(state);
  next.resistedCounted = safeTotal;
  next.xp = capXp(next.xp + gained);
  const when = Number.isFinite(at) ? at : 0;
  next.days = addDay(next.days, localDayKey(when, offsetMinutes), { xp: gained, resisted: delta });
  return withAchievements(next, when, offsetMinutes);
}

export function setGoalMinutes(
  state: GamificationState,
  minutes: number,
  at: number,
  offsetMinutes: number,
): GamificationResult {
  const goal = clampGoalMinutes(minutes);
  if (goal === state.goalMinutes) return { state, unlocked: [] };
  const next = cloneState(state);
  next.goalMinutes = goal;
  return withAchievements(next, Number.isFinite(at) ? at : 0, offsetMinutes);
}

/**
 * Apply the session a native or in-app unlock just prepended.
 * Same newest session → no change, so a repeated tap cannot double XP.
 */
export function applyUnlockedSession(
  progress: GamificationState,
  before: readonly FocusSessionEvent[],
  after: readonly FocusSessionEvent[],
  offsetMinutes: number,
): GamificationResult {
  const newest = after[0];
  if (!newest || !Number.isFinite(newest.startedAt) || !Number.isFinite(newest.endedAt)) {
    return { state: progress, unlocked: [] };
  }
  const previous = before[0];
  if (
    previous &&
    previous.startedAt === newest.startedAt &&
    previous.endedAt === newest.endedAt &&
    Boolean(previous.emergency) === Boolean(newest.emergency)
  ) {
    return { state: progress, unlocked: [] };
  }
  return applyFocusSession(progress, newest, offsetMinutes);
}

export function sanitizeGamification(raw: unknown): GamificationState {
  const empty = emptyGamification();
  if (!raw || typeof raw !== 'object') return empty;
  const data = raw as Partial<GamificationState>;
  const modes: FocusModeId[] = [];
  if (Array.isArray(data.modes)) {
    for (const mode of data.modes) {
      const id = focusMode(mode);
      if (id && !modes.includes(id)) modes.push(id);
    }
  }
  const unlocked: GamificationState['unlocked'] = {};
  if (data.unlocked && typeof data.unlocked === 'object') {
    for (const id of ACHIEVEMENT_IDS) {
      const stamp = (data.unlocked as Partial<Record<AchievementId, unknown>>)[id];
      if (typeof stamp === 'number' && Number.isFinite(stamp) && stamp > 0) unlocked[id] = stamp;
    }
  }
  return {
    xp: nonNegInt(data.xp),
    goalMinutes: clampGoalMinutes(data.goalMinutes),
    focusMinutes: nonNegInt(data.focusMinutes),
    sessionsCompleted: nonNegInt(data.sessionsCompleted),
    resistedCounted: nonNegInt(data.resistedCounted),
    modes,
    nightOwl: data.nightOwl === true,
    earlyBird: data.earlyBird === true,
    unlocked,
    days: sanitizeDays(data.days),
  };
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
): GamificationState {
  if (raw == null) return seedGamification(sessions, recoveredMs, offsetMinutes);
  return sanitizeGamification(raw);
}

export function seedGamification(
  sessions: readonly FocusSessionEvent[],
  recoveredMs = 0,
  offsetMinutes?: number,
): GamificationState {
  const ordered = [...sessions]
    .filter((session) => Number.isFinite(session.startedAt) && Number.isFinite(session.endedAt))
    .sort((a, b) => a.endedAt - b.endedAt || a.startedAt - b.startedAt);
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
  const floorMinutes = Math.max(state.focusMinutes, Math.max(0, recoveredMinutes - emergencyMinutes));
  if (floorMinutes > state.focusMinutes) {
    const extra = floorMinutes - state.focusMinutes;
    state = {
      ...state,
      focusMinutes: floorMinutes,
      xp: capXp(state.xp + extra * XP_PER_FOCUS_MINUTE),
    };
  }
  if (state.focusMinutes > 0 && state.sessionsCompleted < 1) {
    state = { ...state, sessionsCompleted: 1 };
  }
  const at = ordered.length > 0 ? ordered[ordered.length - 1].endedAt : Date.now();
  const offset = offsetMinutes ?? deviceOffsetMinutes(at);
  return withAchievements(state, at, offset).state;
}

function applyEmergency(state: GamificationState, at: number, offsetMinutes: number): GamificationResult {
  const spent = Math.min(EMERGENCY_XP_PENALTY, state.xp);
  if (spent <= 0) return { state, unlocked: [] };
  const next = cloneState(state);
  next.xp = state.xp - spent;
  next.days = addDay(next.days, localDayKey(at, offsetMinutes), { xp: -spent });
  return withAchievements(next, at, offsetMinutes);
}

function withAchievements(state: GamificationState, at: number, offsetMinutes: number): GamificationResult {
  const streak = computeStreak(state, at, offsetMinutes).streak;
  const earned: [AchievementId, boolean][] = [
    ['first_session', state.sessionsCompleted >= 1],
    ['hour_1', state.focusMinutes >= 60],
    ['hour_10', state.focusMinutes >= 600],
    ['streak_7', streak >= 7],
    ['streak_30', streak >= 30],
    ['resisted_100', state.resistedCounted >= 100],
    ['mode_trabajo', state.modes.includes('trabajo')],
    ['mode_estudio', state.modes.includes('estudio')],
    ['mode_casa', state.modes.includes('casa')],
    ['mode_gym', state.modes.includes('gym')],
    ['night_owl', state.nightOwl],
    ['early_bird', state.earlyBird],
  ];
  const fresh: AchievementId[] = [];
  let unlocked = state.unlocked;
  const when = Number.isFinite(at) && at > 0 ? Math.floor(at) : Date.now();
  for (const [id, ok] of earned) {
    if (!ok || unlocked[id] != null) continue;
    if (unlocked === state.unlocked) unlocked = { ...state.unlocked };
    unlocked[id] = when;
    fresh.push(id);
  }
  if (fresh.length === 0) return { state, unlocked: fresh };
  return { state: { ...state, unlocked }, unlocked: fresh };
}

function connects(
  start: string,
  used: Set<string>,
  pendingWeek: string,
  state: GamificationState,
): boolean {
  const seen = new Set(used);
  seen.add(pendingWeek);
  let cursor = start;
  for (let guard = 0; guard < DAY_WALK_CAP; guard += 1) {
    if ((state.days[cursor]?.focusMinutes ?? 0) >= state.goalMinutes) return true;
    const week = isoWeekKeyFromDay(cursor);
    if (seen.has(week)) return false;
    seen.add(week);
    cursor = addDays(cursor, -1);
  }
  return false;
}

function isNightSession(session: FocusSessionEvent, offsetMinutes: number): boolean {
  if (session.emergency === true || sessionFullMinutes(session) < NIGHT_MIN_MINUTES) return false;
  const hour = localHour(session.startedAt, offsetMinutes);
  return hour >= 22 || hour < 5;
}

function isEarlySession(session: FocusSessionEvent, offsetMinutes: number): boolean {
  if (session.emergency === true || sessionFullMinutes(session) < EARLY_MIN_MINUTES) return false;
  const hour = localHour(session.startedAt, offsetMinutes);
  return hour >= 5 && hour < 8;
}

function focusMode(value: unknown): FocusModeId | null {
  return MODE_IDS.find((id) => id === value) ?? null;
}

function addDay(
  days: Record<string, DayProgress>,
  key: string,
  patch: Partial<DayProgress>,
): Record<string, DayProgress> {
  const current = days[key] ?? { focusMinutes: 0, xp: 0, resisted: 0 };
  return pruneDays({
    ...days,
    [key]: {
      focusMinutes: current.focusMinutes + (patch.focusMinutes ?? 0),
      xp: current.xp + (patch.xp ?? 0),
      resisted: current.resisted + (patch.resisted ?? 0),
    },
  });
}

function pruneDays(days: Record<string, DayProgress>): Record<string, DayProgress> {
  const keys = Object.keys(days);
  if (keys.length <= DAY_HISTORY_CAP) return days;
  const next: Record<string, DayProgress> = {};
  for (const key of keys.sort().slice(-DAY_HISTORY_CAP)) next[key] = days[key];
  return next;
}

function sanitizeDays(raw: unknown): Record<string, DayProgress> {
  if (!raw || typeof raw !== 'object') return {};
  const days: Record<string, DayProgress> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!DAY_KEY.test(key) || !value || typeof value !== 'object') continue;
    const row = value as Partial<DayProgress>;
    days[key] = {
      focusMinutes: nonNegInt(row.focusMinutes),
      xp: boundedInt(row.xp, -XP_CAP, XP_CAP, 0),
      resisted: nonNegInt(row.resisted),
    };
  }
  return pruneDays(days);
}

function cloneState(state: GamificationState): GamificationState {
  const days: Record<string, DayProgress> = {};
  for (const [key, value] of Object.entries(state.days)) days[key] = { ...value };
  return {
    ...state,
    modes: [...state.modes],
    unlocked: { ...state.unlocked },
    days,
  };
}

function nonNegInt(value: unknown): number {
  return boundedInt(value, 0, XP_CAP, 0);
}

/** Milliseconds can exceed the XP cap. Only reject junk and negatives. */
function nonNegMillis(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return 0;
  return Math.floor(value);
}

function boundedInt(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(value)));
}

function capXp(value: number): number {
  return Math.min(XP_CAP, Math.max(0, value));
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}
