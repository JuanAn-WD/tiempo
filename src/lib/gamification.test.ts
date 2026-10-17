import {
  BADGE_IDS,
  DAY_HISTORY_CAP,
  DEFAULT_GOAL_MINUTES,
  LEVELS,
  MIN_COUNTED_MINUTES,
  QUIET_WINDOW_MS,
  TREE_MINUTES,
  addDays,
  applyFocusSession,
  applyUnlockedSession,
  challengeSnapshot,
  clampGoalMinutes,
  computeStreak,
  countedSessionMinutes,
  dominantMode,
  emptyGamification,
  evaluateProgress,
  isoWeekKeyFromDay,
  levelProgress,
  localDayKey,
  localHour,
  noteAttempts,
  resolveGamification,
  rewardSnapshot,
  sanitizeGamification,
  seedGamification,
  sessionFullMinutes,
  setChallenge,
  setGoalMinutes,
  setPurpose,
  setReward,
  stepGoalMinutes,
  weeklyProgress,
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

function play(items: FocusSessionEvent[], base: GamificationState = emptyGamification()): GamificationState {
  return items.reduce((state, item) => applyFocusSession(state, item, OFFSET).state, base);
}

export function testGamification(): void {
  const fresh = emptyGamification();
  check(fresh.v === 3, 'progress is version 3');
  check(fresh.goalMinutes === DEFAULT_GOAL_MINUTES, 'default goal is 60');
  check(fresh.recoveredMinutes === 0 && fresh.reward == null, 'a new profile is empty');
  check(BADGE_IDS.length === 8, 'eight badges');
  check(LEVELS.length === 6, 'six levels');
  check(LEVELS[0].id === 'semilla' && LEVELS[0].minMinutes === 0, 'seed starts at 0');
  check(LEVELS[1].minMinutes === 300, 'sprout is 5 hours');
  check(LEVELS[2].id === 'planton' && LEVELS[2].minMinutes === 1200, 'sapling is 20 hours');
  check(LEVELS[3].id === 'joven' && LEVELS[3].minMinutes === 3600, 'young tree is 60 hours');
  check(LEVELS[4].id === 'arbol' && LEVELS[4].minMinutes === 9000, 'tree is 150 hours');
  check(LEVELS[5].id === 'maduro' && LEVELS[5].minMinutes === 14400, 'mature tree is 240 hours');
  check(TREE_MINUTES === 18000, 'a tree is complete at 300 hours');

  check(isoWeekKeyFromDay('2026-01-01') === '2026-W01', '1 Jan 2026 is week 1');
  check(isoWeekKeyFromDay('2025-12-29') === '2026-W01', '29 Dec 2025 is week 1 of 2026');
  check(isoWeekKeyFromDay('2026-10-16') === '2026-W42', '16 Oct 2026 is week 42');
  check(isoWeekKeyFromDay('2026-10-19') === '2026-W43', '19 Oct 2026 is week 43');
  check(localDayKey(Date.UTC(2026, 9, 16, 22, 0), 120) === '2026-10-17', 'positive offset rolls the local day');
  check(localHour(Date.UTC(2026, 9, 16, 22, 0), 120) === 0, 'positive offset rolls the local hour');
  check(addDays('2026-10-16', 3) === '2026-10-19', 'add days');

  const short = session('2026-10-16', MIN_COUNTED_MINUTES - 1);
  check(sessionFullMinutes(short) === 4, 'four whole minutes');
  check(countedSessionMinutes(short) === 0, 'under five minutes does not count');
  const ignored = applyFocusSession(fresh, short, OFFSET);
  check(ignored.state === fresh, 'a short session does not change progress');
  check(ignored.badges.length === 0 && ignored.levelUp == null, 'a short session celebrates nothing');

  const five = applyFocusSession(fresh, session('2026-10-16', 5), OFFSET);
  check(five.state.recoveredMinutes === 5, 'five minutes count');
  check(five.state.days['2026-10-16'].focusMinutes === 5, 'the day keeps the minutes');
  check(five.state.days['2026-10-16'].modes.trabajo === 5, 'the mode keeps the minutes');
  check(five.badges.includes('first_lock'), 'the first counted session is the first lock');
  check(five.levelUp == null, 'five minutes stays a seed');
  check(five.state.startedAt === session('2026-10-16', 5).startedAt, 'the quiet window starts with the session');

  const pause = applyFocusSession(five.state, { ...session('2026-10-16', 40), emergency: true }, OFFSET);
  check(pause.state.recoveredMinutes === 5, 'a justified pause does not remove time');
  check(pause.state.days['2026-10-16'].focusMinutes === 5, 'a pause does not count toward the day');
  check(pause.state.days['2026-10-16'].pause === true, 'a pause is marked on that day');
  check(pause.badges.length === 0 && pause.treesCompleted === 0, 'a pause earns no badge and no tree');
  check(pause.state.quietSince === session('2026-10-16', 40).endedAt, 'a pause restarts the quiet window');
  check(pause.state.unlocked.first_lock != null, 'a pause does not revoke a badge');

  const again = applyUnlockedSession(five.state, [session('2026-10-16', 5)], [session('2026-10-16', 5)], OFFSET);
  check(again.state === five.state, 'the same session cannot be counted twice');

  let attempts = noteAttempts(fresh, 100, at('2026-10-16', 12), OFFSET, { baseline: true });
  check(attempts.state.attemptsNoted === 100, 'a baseline moves the cursor');
  check(attempts.state.days['2026-10-16'] == null, 'a baseline is not written onto today');
  check(attempts.state.recoveredMinutes === 0 && attempts.badges.length === 0, 'attempts are not progress');
  attempts = noteAttempts(attempts.state, 100, at('2026-10-16', 13), OFFSET);
  check(attempts.state.attemptsNoted === 100, 'the same total is a no-op');
  attempts = noteAttempts(attempts.state, 107, at('2026-10-16', 18), OFFSET);
  check(attempts.state.days['2026-10-16'].attempts === 7, 'only the new attempts land on today');
  check(attempts.state.recoveredMinutes === 0, 'attempts still add no time');
  const yesterday = noteAttempts(attempts.state, 112, at('2026-10-15', 18), OFFSET);
  check(yesterday.state.days['2026-10-15'].attempts === 5, 'an older day can hold its own count');

  const mid = levelProgress(10 * 60);
  check(mid.id === 'brote', '10 hours is still a sprout');
  check(mid.forest === 0 && mid.into === 600, '10 hours sits inside the first tree');
  check(Math.abs(mid.overall - 600 / TREE_MINUTES) < 1e-12, 'growth is the fraction of the tree');
  check(Math.abs(mid.ratio - (600 - 300) / (1200 - 300)) < 1e-12, 'growth is smooth inside the stage');
  const sapling = levelProgress(57 * 60);
  check(sapling.id === 'planton', '57 hours is a sapling');
  check(sapling.remainingMinutes === 3 * 60, 'three hours left until the young tree');
  const mature = levelProgress(299 * 60);
  check(mature.id === 'maduro' && mature.forest === 0, '299 hours is a mature tree, still growing');
  check(mature.remainingMinutes === 60, 'one hour left before the forest');
  const planted = levelProgress(TREE_MINUTES);
  check(planted.forest === 1 && planted.into === 0 && planted.id === 'semilla', '300 hours plants a new seed');
  check(planted.overall === 0, 'a completed tree does not stay stuck at mature');
  check(levelProgress(0).id === 'semilla' && levelProgress(0).forest === 0, 'nothing planted is still a seed count of zero');

  const hour = applyFocusSession(fresh, session('2026-10-01', 60), OFFSET);
  check(hour.badges.includes('hour_1') && hour.levelUp == null, 'the first hour is a badge, still a seed');
  const sprout = applyFocusSession(hour.state, session('2026-10-02', 240), OFFSET);
  check(sprout.state.recoveredMinutes === 300 && sprout.levelUp === 'brote', 'five hours reaches sprout');

  check(clampGoalMinutes(7) === 15 && clampGoalMinutes(999) === 240, 'the goal stays in range');
  check(stepGoalMinutes(60, -1) === 45 && stepGoalMinutes(15, -1) === 15, 'the goal steps by 15');

  const monday = '2026-10-12';
  let week = fresh;
  for (let index = 0; index < 5; index += 1) {
    const day = addDays(monday, index);
    const applied = applyFocusSession(week, session(day, 60), OFFSET);
    week = applied.state;
    if (index < 4) check(!applied.badges.includes('week_5'), 'four days are not a full week');
    else check(applied.badges.includes('week_5'), 'the fifth day completes the week');
  }
  const friday = weeklyProgress(week, at('2026-10-16', 18), OFFSET);
  check(friday.daysMet === 5 && friday.weekKey === '2026-W42', '5 of 7 on Friday');
  check(friday.days[5].status === 'open' && friday.days[6].status === 'open', 'Saturday and Sunday are still ahead');
  const saturday = weeklyProgress(week, at('2026-10-17', 12), OFFSET);
  check(saturday.days[5].status === 'today' && saturday.daysMet === 5, 'today is not a miss while it is open');
  const missed = weeklyProgress(week, at('2026-10-18', 12), OFFSET);
  check(missed.days[5].status === 'grace', 'the one missed day of a living week is the comodín');

  const nextMonday = weeklyProgress(week, at('2026-10-19', 9), OFFSET);
  check(nextMonday.daysMet === 0, 'a new week starts its own 5 of 7');

  let goals = fresh;
  for (let index = 0; index < 7; index += 1) {
    goals = applyFocusSession(goals, session(addDays('2026-09-01', index * 2), 60), OFFSET).state;
  }
  check(goals.goalDays === 7 && goals.unlocked.goal_7 != null, 'seven goal days need not be consecutive');
  const raised = setGoalMinutes(goals, 120, at('2026-10-01', 8));
  check(raised.state.goalDays === 7 && raised.state.unlocked.goal_7 != null, 'raising the goal does not take days back');
  const lowDays = play(['2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09'].map((day) => session(day, 30)));
  check(lowDays.goalDays === 0, 'thirty minutes misses a sixty-minute goal');
  const lowered = setGoalMinutes(lowDays, 30, at('2026-10-10', 8));
  check(lowered.state.goalDays === 5, 'lowering the goal counts the days already stored');

  const quietStart = applyFocusSession(fresh, session('2026-09-01', 30), OFFSET).state;
  const tooSoon = evaluateProgress(quietStart, quietStart.quietSince! + QUIET_WINDOW_MS - 1);
  check(tooSoon.state === quietStart && tooSoon.badges.length === 0, '29 days is not a quiet month');
  const month = evaluateProgress(quietStart, quietStart.quietSince! + QUIET_WINDOW_MS);
  check(month.badges.includes('month_quiet'), '30 quiet days earn the badge once');
  const paused = applyFocusSession(month.state, { ...session('2026-10-16', 10), emergency: true }, OFFSET).state;
  check(paused.unlocked.month_quiet != null, 'a later pause does not revoke the month');
  check(paused.quietSince !== quietStart.quietSince, 'the pause starts a new quiet window');
  const second = evaluateProgress(paused, paused.quietSince! + QUIET_WINDOW_MS);
  check(second.badges.length === 0, 'the month badge does not fire twice');

  const rewardBase = applyFocusSession(fresh, session('2026-10-01', 600), OFFSET).state;
  const reward = setReward(rewardBase, { hours: 1, text: '  ese libro  ' }, at('2026-10-02', 9));
  check(reward.state.reward?.baselineMinutes === 600, 'the reward starts from now, not from lifetime');
  check(reward.state.reward?.text === 'ese libro', 'reward text is trimmed');
  check(rewardSnapshot(reward.state)?.completed === false, 'one new hour is not already done');
  const rewarded = applyFocusSession(reward.state, session('2026-10-02', 60), OFFSET);
  check(rewarded.rewardCompleted === true, 'the new hour completes the reward');
  check(rewarded.state.reward?.completedAt != null, 'the reward remembers when it was met');
  check(setReward(fresh, { hours: 0, text: 'nada' }, 1).state === fresh, 'a zero-hour reward is ignored');

  let challenged = setChallenge(fresh, { text: 'cenas', mode: 'casa', target: 3 }).state;
  challenged = play([session('2026-10-12', 20, 'casa'), session('2026-10-13', 20, 'trabajo'), session('2026-10-14', 20, 'casa')], challenged);
  const challenge = challengeSnapshot(challenged, at('2026-10-16', 12), OFFSET);
  check(challenge?.days === 2 && challenge.met === false, 'the challenge counts distinct days of that mode');
  const done = challengeSnapshot(
    play([session('2026-10-15', 10, 'casa')], challenged),
    at('2026-10-16', 12),
    OFFSET,
  );
  check(done?.days === 3 && done.met === true, 'the third home day meets the challenge');
  check(setChallenge(fresh, { text: 'no', mode: 'casa', target: 8 }).state.challenge == null, 'a challenge target stays inside the week');

  const named = setPurpose(fresh, 'leer');
  check(named.state.purpose === 'leer', 'purpose is stored');
  check(setPurpose(named.state, 'nope' as 'leer').state.purpose == null, 'an unknown purpose clears');

  const garden = play([session('2026-10-12', 40, 'casa'), session('2026-10-13', 10, 'trabajo')]);
  check(dominantMode(garden, at('2026-10-16', 12), OFFSET) === 'casa', 'the tree follows this week’s main mode');
  const quietLater = levelProgress(garden.recoveredMinutes);
  check(quietLater.into === 50 && quietLater.forest === 0, 'a quiet day does not shrink the tree');

  const legacy = {
    xp: 90 * 10 + 4 * 5 - 20,
    focusMinutes: 90,
    resistedCounted: 4,
    goalMinutes: 60,
    sessionsCompleted: 2,
    nightOwl: true,
    earlyBird: true,
    modes: ['casa'],
    unlocked: {
      first_session: 11,
      hour_1: 12,
      hour_10: 13,
      streak_7: 14,
      streak_30: 15,
      resisted_100: 16,
      mode_casa: 17,
      night_owl: 18,
      early_bird: 19,
    },
    days: {
      '2026-10-12': { focusMinutes: 60, xp: 600, resisted: 4 },
      '2026-10-13': { focusMinutes: 30, xp: -20, resisted: 0 },
    },
  };
  const migrated = resolveGamification(
    legacy,
    [{ ...session('2026-10-13', 30, 'estudio'), emergency: true }, session('2026-10-12', 60, 'casa')],
    0,
    OFFSET,
    at('2026-10-16', 12),
  );
  check(migrated.recoveredMinutes === 90, 'migration keeps focus minutes and ignores XP');
  check(migrated.unlocked.first_lock === 11, 'the first session becomes the first lock');
  check(migrated.unlocked.hour_1 === 12, 'the one-hour badge is kept');
  check(migrated.unlocked.hour_10 === 13, 'the ten-hour badge is kept even if the minutes are lower');
  check(migrated.unlocked.goal_7 === 14, 'the seven-day streak becomes the goal badge');
  check(migrated.unlocked.month_quiet == null, 'a streak of 30 is not a quiet month');
  check(!('resisted_100' in migrated.unlocked), 'attempt badges are dropped');
  check(migrated.attemptsNoted === 4, 'the attempt cursor is kept so they are not counted again');
  check(migrated.days['2026-10-12'].attempts === 0, 'old attempt points are not a day count');
  check(migrated.days['2026-10-12'].modes.casa === 60, 'kept sessions fill the mode chart without adding minutes');
  check(migrated.days['2026-10-12'].focusMinutes === 60, 'mode replay does not double the day');
  check(migrated.quietSince === session('2026-10-13', 30, 'estudio').endedAt, 'the latest pause starts the quiet window');
  check(migrated.days['2026-10-13'].pause === true, 'a kept pause is stamped onto its day');
  check(migrated.days['2026-10-13'].focusMinutes === 30, 'stamping a pause does not change the stored minutes');
  check(migrated.v === 3, 'a legacy profile becomes version 3');

  const stored = { ...five.state, recoveredMinutes: 5 };
  const replayed = resolveGamification(stored, [session('2026-10-16', 90)], 90 * 60_000, OFFSET);
  check(replayed.recoveredMinutes === 5, 'a stored profile is not replayed');

  const seeded = seedGamification(
    [session('2026-10-16', 10), session('2026-10-16', 3), { ...session('2026-10-16', 20), emergency: true }],
    33 * 60_000,
    OFFSET,
  );
  check(seeded.recoveredMinutes === 13, 'recovered time tops up after pauses are removed');
  check(seeded.days['2026-10-16'].focusMinutes === 10, 'the top-up does not invent a goal day');
  check(seeded.unlocked.first_lock != null, 'seeded time still opens the first lock');

  const junk = sanitizeGamification({ v: 2, days: 'nope', reward: 4, plant: 'gold', goalMinutes: 3 });
  check(junk.recoveredMinutes === 0 && junk.plant === 'default' && junk.goalMinutes === 15, 'a broken profile repairs');
  check(junk.v === 3, 'a version 2 profile upgrades without replay');
  check(sanitizeGamification(null).v === 3, 'null sanitizes to empty progress');
  check(resolveGamification(undefined, [session('2026-10-16', 10)], 0, OFFSET).recoveredMinutes === 10, 'a missing profile seeds');

  let packed = fresh;
  for (let index = 0; index < DAY_HISTORY_CAP + 5; index += 1) {
    packed = applyFocusSession(packed, session(addDays('2024-01-01', index), 60), OFFSET).state;
  }
  check(Object.keys(packed.days).length === DAY_HISTORY_CAP, 'day history stays capped');
  check(packed.goalDays > DAY_HISTORY_CAP, 'pruned days still count toward the goal total');

  const hundred = levelProgress(100 * 60);
  check(hundred.id === 'joven', '100 hours is a young tree');
  check(applyFocusSession(play([session('2026-10-01', 100 * 60 - 5)]), session('2026-10-02', 5), OFFSET).badges.includes('hour_100'), '100 hours earns the badge');

  const near = play([session('2026-10-01', TREE_MINUTES - 10)]);
  const finished = applyFocusSession(near, session('2026-10-02', 10), OFFSET);
  check(finished.treesCompleted === 1 && finished.levelUp == null, 'finishing a tree plants a seed and does not also level it');
  check(levelProgress(finished.state.recoveredMinutes).forest === 1, 'the finished tree is in the forest');
  const carried = applyFocusSession(near, session('2026-10-02', 400), OFFSET);
  check(carried.treesCompleted === 1 && carried.levelUp === 'brote', 'minutes past 300 hours grow the new seed');

  let chain = fresh;
  for (const day of ['2026-10-12', '2026-10-13', '2026-10-15']) {
    chain = applyFocusSession(chain, session(day, 60), OFFSET).state;
  }
  const pausedDay = applyFocusSession(chain, { ...session('2026-10-14', 30), emergency: true }, OFFSET);
  check(pausedDay.state.recoveredMinutes === 180, 'the pause in the middle adds no growth');
  const held = computeStreak(pausedDay.state, at('2026-10-16', 12), OFFSET);
  check(held.streak === 3 && held.graceAvailable && held.graceDay == null, 'a pause keeps the streak and does not spend the comodín');
  const pauseWeek = weeklyProgress(pausedDay.state, at('2026-10-16', 12), OFFSET);
  check(pauseWeek.days[2].status === 'pause' && pauseWeek.daysMet === 3, 'the pause day is marked and is not a goal day');

  const bridgedState = play([session('2026-10-12', 60), session('2026-10-14', 60)]);
  const bridged = computeStreak(bridgedState, at('2026-10-15', 12), OFFSET);
  check(bridged.streak === 2 && bridged.graceDay === '2026-10-13' && !bridged.graceAvailable, 'one miss in the week is bridged');
  const bridgeWeek = weeklyProgress(bridgedState, at('2026-10-15', 12), OFFSET);
  check(bridgeWeek.days[1].status === 'grace' && bridgeWeek.daysMet === 2, 'the bridged day is not a fifth goal day');

  const openToday = computeStreak(play([session('2026-10-12', 60)]), at('2026-10-13', 10), OFFSET);
  check(openToday.streak === 1 && openToday.graceAvailable && openToday.graceDay == null, 'today, still short, does not spend the comodín');
  check(weeklyProgress(play([session('2026-10-12', 60)]), at('2026-10-13', 10), OFFSET).days[1].status === 'today', 'today stays open');

  const twoMisses = computeStreak(play([session('2026-10-12', 60), session('2026-10-15', 60)]), at('2026-10-16', 12), OFFSET);
  check(twoMisses.streak === 1 && twoMisses.graceAvailable, 'a second miss in the same week breaks the chain');
  const brokenWeek = weeklyProgress(play([session('2026-10-12', 60), session('2026-10-15', 60)]), at('2026-10-16', 12), OFFSET);
  check(brokenWeek.days[1].status === 'missed' && brokenWeek.days[2].status === 'missed', 'two misses stay misses');

  const upgraded = resolveGamification(
    { v: 2, recoveredMinutes: 90, goalMinutes: 60, days: { '2026-10-12': { focusMinutes: 90, modes: { trabajo: 90 }, attempts: 0 } } },
    [{ ...session('2026-10-13', 20), emergency: true }],
    0,
    OFFSET,
  );
  check(upgraded.v === 3 && upgraded.recoveredMinutes === 90, 'a stored profile keeps its minutes');
  check(upgraded.days['2026-10-12'].focusMinutes === 90, 'the upgrade does not replay sessions into the total');
  check(upgraded.days['2026-10-13'].pause === true && upgraded.days['2026-10-13'].focusMinutes === 0, 'the upgrade stamps the pause day');
  check(noteAttempts(upgraded, 3, at('2026-10-16', 12), OFFSET).state.recoveredMinutes === 90, 'attempts do not move the tree');
}
