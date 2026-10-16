import {
  ACHIEVEMENT_IDS,
  ACHIEVEMENT_MARK,
  DAY_HISTORY_CAP,
  DEFAULT_GOAL_MINUTES,
  EMERGENCY_XP_PENALTY,
  LEVELS,
  XP_PER_FOCUS_MINUTE,
  XP_PER_RESISTED_ATTEMPT,
  addDays,
  applyFocusSession,
  applyResistedAttempts,
  applyUnlockedSession,
  clampGoalMinutes,
  computeStreak,
  emptyGamification,
  isoWeekKeyFromDay,
  levelProgress,
  localDayKey,
  localHour,
  resolveGamification,
  seedGamification,
  sanitizeGamification,
  sessionFullMinutes,
  setGoalMinutes,
  stepGoalMinutes,
  weeklySummary,
  type FocusSessionEvent,
  type GamificationState,
} from './gamification';

function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const OFFSET = 0;

function at(day: string, hour: number, minute = 0, offset = OFFSET): number {
  const [year, month, date] = day.split('-').map(Number);
  return Date.UTC(year, month - 1, date, hour, minute) - offset * 60_000;
}

function session(
  day: string,
  minutes: number,
  mode = 'trabajo',
  hour = 10,
  offset = OFFSET,
): FocusSessionEvent {
  const startedAt = at(day, hour, 0, offset);
  return { mode, startedAt, endedAt: startedAt + minutes * 60_000 };
}

function play(sessions: FocusSessionEvent[], offset = OFFSET): GamificationState {
  return sessions.reduce(
    (state, item) => applyFocusSession(state, item, offset).state,
    emptyGamification(),
  );
}

function snapshot(state: GamificationState): string {
  return JSON.stringify(state);
}

export function testGamification() {
  check(ACHIEVEMENT_IDS.length === 12, 'about twelve achievements');
  for (const id of ACHIEVEMENT_IDS) {
    check(ACHIEVEMENT_MARK[id].length > 0, `mark for ${id}`);
  }
  check(LEVELS[0].minXp === 0, 'first level starts at 0');
  check(LEVELS[LEVELS.length - 1].id === 'apartado', 'last level');

  check(isoWeekKeyFromDay('2026-01-01') === '2026-W01', '1 Jan 2026 is week 1');
  check(isoWeekKeyFromDay('2025-12-29') === '2026-W01', 'Monday of that week stays in 2026-W01');
  check(isoWeekKeyFromDay('2026-10-16') === '2026-W42', '16 Oct 2026 is week 42');
  check(isoWeekKeyFromDay('2026-10-19') === '2026-W43', '19 Oct 2026 is week 43');
  check(addDays('2026-10-31', 1) === '2026-11-01', 'addDays crosses the month');
  check(addDays('2026-01-01', -1) === '2025-12-31', 'addDays crosses the year');

  const madrid = 120;
  const lateUtc = Date.UTC(2026, 9, 16, 22, 0);
  check(localDayKey(lateUtc, madrid) === '2026-10-17', 'positive offset rolls the local day');
  check(localHour(lateUtc, madrid) === 0, 'positive offset rolls the local hour');
  check(localHour(at('2026-10-16', 22), 0) === 22, 'local hour 22');
  check(localHour(at('2026-10-16', 4, 50), 0) === 4, 'local hour 4');

  const fresh = emptyGamification();
  const short = session('2026-10-16', 0, 'trabajo', 10);
  short.endedAt = short.startedAt + 59_000;
  const underAMinute = applyFocusSession(fresh, short, OFFSET);
  check(underAMinute.state.xp === 0, '59 seconds award no XP');
  check(underAMinute.state.sessionsCompleted === 1, 'a short session still counts');
  check(underAMinute.state.focusMinutes === 0, 'no full minute yet');
  check(underAMinute.unlocked.includes('first_session'), 'first session unlocks under a minute');
  check(!underAMinute.unlocked.includes('hour_1'), 'one hour stays locked');

  const before = snapshot(fresh);
  const quarter = applyFocusSession(fresh, session('2026-10-16', 25), OFFSET);
  check(snapshot(fresh) === before, 'apply does not mutate the input');
  check(quarter.state.xp === 25 * XP_PER_FOCUS_MINUTE, '25 minutes is 250 XP');
  check(quarter.state.focusMinutes === 25, 'minutes accumulate');
  check(quarter.state.days['2026-10-16'].focusMinutes === 25, 'minutes land on the end day');
  check(quarter.state.modes.join() === 'trabajo', 'mode is remembered');
  check(quarter.unlocked.includes('mode_trabajo'), 'trabajo badge');

  const again = applyFocusSession(quarter.state, session('2026-10-16', 35, 'estudio', 18), OFFSET);
  check(again.state.xp === 600, 'a second hour of minutes reaches 600 XP');
  check(again.state.focusMinutes === 60, 'lifetime minutes');
  check(again.unlocked.includes('hour_1'), 'one hour unlocks at 60 minutes');
  check(again.state.unlocked.hour_1 != null, 'hour badge is stored');
  const repeat = applyFocusSession(again.state, { ...session('2026-10-17', 1), mode: 'nope' }, OFFSET);
  check(!repeat.unlocked.includes('hour_1'), 'an owned badge is not reported again');
  check(repeat.state.modes.length === 2, 'an unknown mode is ignored');

  const broke = applyFocusSession(again.state, { mode: 'gym', startedAt: Number.NaN, endedAt: 1 }, OFFSET);
  check(broke.state === again.state, 'a broken session is a no-op');

  const zero = applyEmergencyChain(0);
  check(zero.xp === 0, 'a penalty cannot pass below 0');
  check(zero.sessionsCompleted === 0, 'an emergency is not a completed session');
  check(zero.unlocked.first_session == null, 'an emergency does not open the first badge');
  check(zero.days['2026-10-16'] == null, 'a penalty with nothing to take writes no day');

  const rich = applyFocusSession(fresh, session('2026-10-16', 10), OFFSET).state;
  const penalized = applyFocusSession(
    rich,
    { ...session('2026-10-16', 30), emergency: true },
    OFFSET,
  );
  check(penalized.state.xp === 100 - EMERGENCY_XP_PENALTY, 'emergency takes 20 XP and no minute XP');
  check(penalized.state.focusMinutes === 10, 'emergency minutes are not focus');
  check(penalized.state.days['2026-10-16'].focusMinutes === 10, 'the goal ignores the emergency');
  check(penalized.state.days['2026-10-16'].xp === 100 - EMERGENCY_XP_PENALTY, 'the day keeps the net XP');
  check(!penalized.unlocked.includes('mode_estudio'), 'emergency does not stamp a mode');

  const tinyPenalty = applyFocusSession(
    { ...rich, xp: 5 },
    { ...session('2026-10-17', 40), emergency: true },
    OFFSET,
  );
  check(tinyPenalty.state.xp === 0, 'a small balance is the whole penalty');
  check(tinyPenalty.state.days['2026-10-17'].xp === -5, 'the day records only what was taken');

  let resisted = applyResistedAttempts(fresh, 40, at('2026-10-16', 12), OFFSET);
  check(resisted.state.xp === 40 * XP_PER_RESISTED_ATTEMPT, 'each resisted attempt is 5 XP');
  check(resisted.state.days['2026-10-16'].resisted === 40, 'attempts land on that day');
  check(!resisted.unlocked.includes('resisted_100'), '40 is not 100');
  const sameTotal = applyResistedAttempts(resisted.state, 40, at('2026-10-16', 13), OFFSET);
  check(sameTotal.state === resisted.state, 'the same total does not pay twice');
  const junk = applyResistedAttempts(resisted.state, -3, at('2026-10-16', 13), OFFSET);
  check(junk.state === resisted.state, 'a bad total is ignored');
  resisted = applyResistedAttempts(resisted.state, 100, at('2026-10-16', 18), OFFSET);
  check(resisted.state.xp === 500, 'the delta from 40 to 100 is 60 attempts');
  check(resisted.unlocked.includes('resisted_100'), '100 resisted attempts unlock');
  check(resisted.state.resistedCounted === 100, 'the cursor remembers what was paid');

  const spark = levelProgress(0);
  check(spark.id === 'chispa' && spark.level === 1 && spark.ratio === 0, '0 XP is the first level');
  const halfway = levelProgress(50);
  check(halfway.id === 'chispa' && halfway.ratio === 0.5, '50 XP is half of the first span');
  const presente = levelProgress(100);
  check(presente.id === 'presente' && presente.ratio === 0 && presente.level === 2, 'a threshold starts the next level');
  const top = levelProgress(12_000);
  check(top.id === 'apartado' && top.ratio === 1 && top.nextXp == null, 'the last level is full');
  check(levelProgress(11_999).id === 'silencio', 'one XP short stays on the previous level');

  check(clampGoalMinutes(undefined) === DEFAULT_GOAL_MINUTES, 'the default goal is 60');
  check(clampGoalMinutes(10) === 15, 'the goal steps up to the minimum');
  check(clampGoalMinutes(250) === 240, 'the goal steps down to the maximum');
  check(stepGoalMinutes(60, -1) === 45, 'goal steps by 15');
  check(stepGoalMinutes(15, -1) === 15, 'the goal does not pass 15');
  check(stepGoalMinutes(240, 1) === 240, 'the goal does not pass 240');

  const mondayOnly = play([session('2026-10-12', 60)]);
  const tuesdayNoon = computeStreak(mondayOnly, at('2026-10-13', 12), OFFSET);
  check(tuesdayNoon.streak === 1, 'an open Tuesday keeps Monday');
  check(tuesdayNoon.todayMet === false && tuesdayNoon.todayMinutes === 0, 'Tuesday is still open');
  check(!tuesdayNoon.comodinUsedThisWeek, 'an open day does not spend the comodín');

  const monToWed = play([
    session('2026-10-12', 60),
    session('2026-10-13', 60),
    session('2026-10-14', 60),
  ]);

  const wednesday = computeStreak(monToWed, at('2026-10-14', 20), OFFSET);
  check(wednesday.streak === 3, 'three goal days');
  check(wednesday.comodinUsedThisWeek === false, 'no miss, comodín still free');

  const throughFriday = play([
    ...[session('2026-10-12', 60), session('2026-10-13', 60), session('2026-10-14', 60)],
    session('2026-10-16', 60),
  ]);
  const friday = computeStreak(throughFriday, at('2026-10-16', 18), OFFSET);
  check(friday.streak === 4, 'Thursday is bridged and Friday counts');
  check(friday.comodinUsedThisWeek, 'the week spent its comodín on Thursday');
  check(friday.comodinDay === '2026-10-15', 'the bridged day is Thursday');
  check(!friday.savedDays.includes('2026-10-16'), 'a met day is not a comodín');

  const emptyFriday = computeStreak(emptyGamification(), at('2026-10-16', 12), OFFSET);
  check(emptyFriday.streak === 0 && !emptyFriday.comodinUsedThisWeek, 'empty history does not burn comodines');

  const sunday = computeStreak(
    play([
      session('2026-10-12', 60),
      session('2026-10-13', 60),
      session('2026-10-14', 60),
      session('2026-10-16', 60),
    ]),
    at('2026-10-18', 10),
    OFFSET,
  );
  check(sunday.streak === 1, 'a second miss the same week keeps only Friday');
  check(sunday.comodinDay === '2026-10-17', 'the comodín moves to the miss that still connects');

  const acrossWeeks = play([
    session('2026-10-12', 60),
    session('2026-10-13', 60),
    session('2026-10-14', 60),
    session('2026-10-16', 60),
    session('2026-10-17', 60),
    session('2026-10-18', 60),
    session('2026-10-20', 60),
  ]);
  const tuesdayNext = computeStreak(acrossWeeks, at('2026-10-20', 18), OFFSET);
  check(tuesdayNext.streak === 7, 'one comodín per week bridges Thursday and Monday');
  check(tuesdayNext.savedDays.includes('2026-10-15'), 'week 42 bridged Thursday');
  check(tuesdayNext.savedDays.includes('2026-10-19'), 'week 43 bridged Monday');

  let streakRun = emptyGamification();
  let sawSeven = false;
  for (let day = 1; day <= 30; day += 1) {
    const key = `2026-09-${String(day).padStart(2, '0')}`;
    const applied = applyFocusSession(streakRun, session(key, 60), OFFSET);
    streakRun = applied.state;
    if (day === 7) {
      sawSeven = applied.unlocked.includes('streak_7');
      check(computeStreak(streakRun, at(key, 18), OFFSET).streak === 7, 'day 7 streak');
    }
  }
  check(sawSeven, 'seven goal days unlock the week badge');
  check(streakRun.unlocked.streak_30 != null, 'thirty goal days unlock the month badge');
  check(computeStreak(streakRun, at('2026-09-30', 18), OFFSET).streak === 30, 'the month streak is 30');

  const lowered = setGoalMinutes(play([session('2026-10-12', 30), session('2026-10-13', 30)]), 30, at('2026-10-13', 18), OFFSET);
  check(lowered.state.goalMinutes === 30, 'the goal can drop to 30');
  check(computeStreak(lowered.state, at('2026-10-13', 18), OFFSET).streak === 2, 'a lower goal recounts the days');
  const sameGoal = setGoalMinutes(lowered.state, 30, at('2026-10-13', 18), OFFSET);
  check(sameGoal.state === lowered.state, 'the same goal does nothing');

  const night = applyFocusSession(fresh, session('2026-10-16', 20, 'casa', 23), OFFSET);
  check(night.state.nightOwl && night.unlocked.includes('night_owl'), 'a 20 minute session at 23:00 is night owl');
  check(night.unlocked.includes('mode_casa'), 'casa badge');
  const almostNight = applyFocusSession(fresh, session('2026-10-16', 14, 'casa', 23), OFFSET);
  check(!almostNight.state.nightOwl, '14 night minutes are not enough');
  const evening = applyFocusSession(fresh, session('2026-10-16', 20, 'casa', 21), OFFSET);
  check(!evening.state.nightOwl, '21:00 is not night');
  const hourFour = applyFocusSession(fresh, session('2026-10-16', 15, 'gym', 4), OFFSET);
  check(hourFour.state.nightOwl && !hourFour.state.earlyBird, '04:00 is night, not early');
  const hourFive = applyFocusSession(fresh, session('2026-10-16', 15, 'estudio', 5), OFFSET);
  check(hourFive.state.earlyBird && hourFive.unlocked.includes('early_bird'), '05:00 is early bird');
  check(hourFive.unlocked.includes('mode_estudio'), 'estudio badge');
  check(!hourFive.state.nightOwl, '05:00 is not night');
  const hourEight = applyFocusSession(fresh, session('2026-10-16', 15, 'estudio', 8), OFFSET);
  check(!hourEight.state.earlyBird, '08:00 is not early');
  const nightEmergency = applyFocusSession(
    fresh,
    { ...session('2026-10-16', 40, 'gym', 23), emergency: true },
    OFFSET,
  );
  check(!nightEmergency.state.nightOwl && !nightEmergency.state.earlyBird, 'an emergency night session earns neither');
  check(hourFour.unlocked.includes('mode_gym'), 'deporte badge');

  const madridNight = applyFocusSession(fresh, session('2026-10-16', 20, 'trabajo', 23, madrid), madrid);
  check(localHour(madridNight.state ? session('2026-10-16', 20, 'trabajo', 23, madrid).startedAt : 0, madrid) === 23, 'madrid start hour');
  check(madridNight.state.nightOwl, 'night owl follows the offset, not UTC');
  check(madridNight.state.days['2026-10-16'].focusMinutes === 20, 'the session stays on the local end day');

  let packed = emptyGamification();
  for (let index = 0; index < DAY_HISTORY_CAP + 5; index += 1) {
    const startedAt = Date.UTC(2024, 0, 1) + index * 86_400_000;
    packed = applyFocusSession(
      packed,
      { mode: 'trabajo', startedAt, endedAt: startedAt + 60_000 },
      OFFSET,
    ).state;
  }
  check(Object.keys(packed.days).length === DAY_HISTORY_CAP, 'day history stays capped');
  check(packed.focusMinutes === DAY_HISTORY_CAP + 5, 'pruned days still count as lifetime minutes');

  const week = play([session('2026-10-12', 60), session('2026-10-14', 30)]);
  const withAttempts = applyResistedAttempts(week, 4, at('2026-10-14', 19), OFFSET).state;
  const summary = weeklySummary(withAttempts, at('2026-10-16', 12), OFFSET);
  check(summary.weekKey === '2026-W42', 'the summary is this ISO week');
  check(summary.focusMinutes === 90, 'weekly focus minutes');
  check(summary.resisted === 4, 'weekly resisted attempts');
  check(summary.daysMet === 1, 'only Monday met a 60 minute goal');
  check(summary.xp === 90 * XP_PER_FOCUS_MINUTE + 4 * XP_PER_RESISTED_ATTEMPT, 'weekly XP adds both sources');
  const penalizedWeek = applyFocusSession(
    withAttempts,
    { ...session('2026-10-16', 5), emergency: true },
    OFFSET,
  ).state;
  const afterPenalty = weeklySummary(penalizedWeek, at('2026-10-16', 21), OFFSET);
  check(
    afterPenalty.xp === 90 * XP_PER_FOCUS_MINUTE + 20 - EMERGENCY_XP_PENALTY,
    'the weekly card subtracts the emergency penalty',
  );
  const onlyPenalty = weeklySummary(
    applyFocusSession(fresh, { ...session('2026-10-16', 5), emergency: true }, OFFSET).state,
    at('2026-10-16', 21),
    OFFSET,
  );
  check(onlyPenalty.xp === 0, 'a penalty with no XP does not show a negative week');

  const newestFirst: FocusSessionEvent[] = [
    { ...session('2026-10-16', 1), emergency: true },
    session('2026-10-15', 10),
  ];
  const seeded = seedGamification(newestFirst, 11 * 60_000, OFFSET);
  check(seeded.xp === 100 - EMERGENCY_XP_PENALTY, 'replay applies the penalty after the earned XP');
  check(seeded.focusMinutes === 10, 'retained sessions set the minutes');
  check(seeded.unlocked.first_session != null, 'migration unlocks the first session quietly');
  check(seeded.sessionsCompleted === 1, 'the emergency is not a completed session');

  const fromRecovered = seedGamification([], 10 * 60 * 60_000, OFFSET);
  check(fromRecovered.focusMinutes === 600, 'recovered time beyond the session list still counts');
  check(fromRecovered.xp === 600 * XP_PER_FOCUS_MINUTE, 'that time pays XP');
  check(fromRecovered.unlocked.hour_10 != null, 'ten hours unlock from recovered time');
  check(fromRecovered.sessionsCompleted === 1, 'recovered time implies a completed session');
  check(Object.keys(fromRecovered.days).length === 0, 'recovered time does not invent streak days');

  const emergencyOnly = seedGamification([{ ...session('2026-10-16', 30), emergency: true }], 30 * 60_000, OFFSET);
  check(emergencyOnly.xp === 0 && emergencyOnly.focusMinutes === 0, 'emergency time is removed from recovered time');
  check(emergencyOnly.unlocked.first_session == null, 'emergency history does not unlock the first badge');

  const kept = sanitizeGamification({
    xp: 10,
    goalMinutes: 60,
    focusMinutes: 1,
    sessionsCompleted: 1,
    resistedCounted: 0,
    modes: ['trabajo'],
    nightOwl: false,
    earlyBird: false,
    unlocked: { first_session: 5 },
    days: {},
  });
  const resolved = resolveGamification(kept, [session('2026-10-12', 60)], 60 * 60_000, OFFSET);
  check(resolved.xp === 10, 'a stored blob is not replayed');
  check(resolved.focusMinutes === 1, 'stored minutes stay');
  const migrated = resolveGamification(undefined, [session('2026-10-12', 60, 'gym')], 0, OFFSET);
  check(migrated.xp === 600, 'a missing blob replays the sessions');
  check(migrated.unlocked.mode_gym != null, 'replay grants the mode badge');
  check(resolveGamification(null, [], 0, OFFSET).xp === 0, 'null also migrates, from nothing');

  const dirty = sanitizeGamification({
    xp: -5,
    goalMinutes: 10,
    focusMinutes: 1.9,
    sessionsCompleted: -2,
    resistedCounted: 3.2,
    modes: ['nope', 'gym', 'gym'],
    nightOwl: 'yes',
    earlyBird: 1,
    unlocked: { nope: 4, hour_1: 0, hour_10: 8 },
    days: {
      bad: { focusMinutes: 5, xp: 1, resisted: 1 },
      '2026-10-16': { focusMinutes: 9.8, xp: -4, resisted: 2 },
    },
  });
  check(dirty.xp === 0, 'negative XP becomes 0');
  check(dirty.goalMinutes === 15, 'a short goal clamps');
  check(dirty.focusMinutes === 1, 'minutes floor');
  check(dirty.sessionsCompleted === 0, 'negative sessions become 0');
  check(dirty.resistedCounted === 3, 'resisted count floors');
  check(dirty.modes.join() === 'gym', 'modes are known and unique');
  check(dirty.nightOwl === false && dirty.earlyBird === false, 'flags must be boolean');
  check(dirty.unlocked.hour_10 === 8 && dirty.unlocked.hour_1 == null, 'only positive known stamps survive');
  check(dirty.days.bad == null, 'bad day keys drop');
  check(dirty.days['2026-10-16'].focusMinutes === 9, 'day minutes floor');
  check(dirty.days['2026-10-16'].xp === -4, 'a day may keep a penalty');
  check(sanitizeGamification(null).goalMinutes === DEFAULT_GOAL_MINUTES, 'junk becomes the empty state');

  const previousSessions = [session('2026-10-16', 10)];
  const ended = { ...session('2026-10-16', 10), endedAt: at('2026-10-16', 10) + 20 * 60_000 };
  const after = [ended, ...previousSessions];
  const native = applyUnlockedSession(play(previousSessions), previousSessions, after, OFFSET);
  check(native.state.focusMinutes === 30, 'the new head session is the only one applied');
  const twice = applyUnlockedSession(native.state, after, after, OFFSET);
  check(twice.state === native.state, 'the same head session does not pay again');
  check(sessionFullMinutes(ended) === 20, 'full minutes ignore the leftover seconds');

  const tenHours = applyFocusSession(play([session('2026-10-01', 599)]), session('2026-10-02', 1), OFFSET);
  check(tenHours.unlocked.includes('hour_10'), '600 minutes unlock ten hours');
  check(!applyFocusSession(fresh, session('2026-10-01', 599), OFFSET).unlocked.includes('hour_10'), '599 minutes do not');
}

function applyEmergencyChain(startingXp: number): GamificationState {
  const base = { ...emptyGamification(), xp: startingXp };
  return applyFocusSession(base, { ...session('2026-10-16', 45), emergency: true }, OFFSET).state;
}
