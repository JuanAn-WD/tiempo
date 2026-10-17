import {
  TREE_MINUTES,
  applyFocusSession,
  emptyGamification,
  sanitizeGamification,
  setPlant,
  surprisesAt,
  type FocusSessionEvent,
  type GamificationState,
} from './gamification';
import { opaqueCount, rasterScene, type RasterInput } from './tree-pixels';
import {
  SUBSTAGES,
  describeTree,
  fruitWeekCount,
  isDormant,
  modeMarks,
  seasonFromMonth,
  skyFromHour,
  stretchProgress,
  stretchStep,
  visibleSky,
} from './tree-growth';

function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const OFFSET = 0;

function at(day: string, hour: number, minute = 0): number {
  const [year, month, date] = day.split('-').map(Number);
  return Date.UTC(year, month - 1, date, hour, minute) - OFFSET * 60_000;
}

function session(day: string, minutes: number, mode = 'trabajo'): FocusSessionEvent {
  const startedAt = at(day, 10);
  return { mode, startedAt, endedAt: startedAt + minutes * 60_000 };
}

function play(items: FocusSessionEvent[], base: GamificationState = emptyGamification()): GamificationState {
  return items.reduce((state, item) => applyFocusSession(state, item, OFFSET).state, base);
}

const quiet: RasterInput = {
  species: 'default',
  stage: 0,
  substage: 0,
  season: 'summer',
  fruits: 0,
  sleeping: false,
  surprises: [],
  marks: [],
  sway: 0,
};

export function testTreeGrowth(): void {
  check(SUBSTAGES === 8, 'eight substages');
  const seed = stretchProgress(0);
  check(seed.id === 'semilla' && seed.substage === 0 && seed.segments[0] === 0, 'a new tree is an empty seed');
  check(seed.stageNumber === 1 && seed.remainingMinutes > 0, 'the first stretch is still ahead');

  const almost = stretchProgress(5 * 60 - 1);
  check(almost.id === 'semilla' && almost.substage === 7, 'the last minute of the seed is the eighth step');
  check(stretchProgress(5 * 60).id === 'brote' && stretchProgress(5 * 60).substage === 0, 'five hours opens the sprout');
  check(stretchProgress(20 * 60).id === 'planton', 'twenty hours is the sapling');
  check(stretchProgress(60 * 60).id === 'joven', 'sixty hours stays the young tree from the saved rules');
  check(stretchProgress(150 * 60).id === 'arbol', 'one hundred fifty hours is the tree');
  check(stretchProgress(240 * 60).id === 'maduro', 'two hundred forty hours is mature');
  check(stretchProgress(TREE_MINUTES).id === 'semilla' && stretchProgress(TREE_MINUTES).forest === 1, 'three hundred hours plants a new seed');

  let previous = -1;
  for (let minutes = 0; minutes < TREE_MINUTES; minutes += 37) {
    const step = stretchStep(minutes);
    check(step >= previous, 'inside one tree the picture only moves forward');
    previous = step;
  }
  check(stretchStep(TREE_MINUTES) > stretchStep(TREE_MINUTES - 1), 'finishing the tree is a new step, not a loss');

  const mid = stretchProgress(60 * 60 + 100);
  check(mid.segments.length === 8, 'the bar has eight segments');
  check(mid.segments.filter((fill) => fill === 1).length === mid.substage, 'full segments match the steps already taken');

  check(seasonFromMonth(4) === 'spring' && seasonFromMonth(7) === 'summer', 'spring and summer follow the month');
  check(seasonFromMonth(10) === 'autumn' && seasonFromMonth(1) === 'winter', 'autumn and winter follow the month');
  check(skyFromHour(6) === 'dawn' && skyFromHour(12) === 'day', 'morning and noon');
  check(skyFromHour(19) === 'dusk' && skyFromHour(23) === 'night', 'evening and night');
  check(visibleSky('dusk', false, 12) === 'day', 'without Pro the sky follows the hour');
  check(visibleSky('dusk', true, 12) === 'dusk', 'Pro can keep a fixed sky');
  check(visibleSky('default', true, 23) === 'night', 'the default sky still follows the hour');

  const quietDays = play([session('2026-10-01', 60)]);
  check(!isDormant(quietDays, '2026-10-07'), 'six days later the bird is still awake');
  check(isDormant(quietDays, '2026-10-08'), 'a week without a session puts the bird to sleep');
  check(!isDormant(play([session('2026-10-01', 60), session('2026-10-08', 30)]), '2026-10-08'), 'a new session wakes the bird');

  check(surprisesAt(9 * 60).length === 0, 'surprises wait for their hour');
  check(surprisesAt(10 * 60).includes('mushroom'), 'mushrooms at 10 hours');
  check(surprisesAt(40 * 60).includes('butterfly'), 'a butterfly at 40 hours');
  check(surprisesAt(90 * 60).includes('bird'), 'a bird at 90 hours');
  check(surprisesAt(180 * 60).includes('squirrel'), 'a squirrel at 180 hours');

  const marked = play([session('2026-10-01', 10 * 60)]);
  check(modeMarks(marked).some((mark) => mark.mode === 'trabajo' && mark.count === 1), 'ten hours in a mode leave one mark');
  check(modeMarks(play([session('2026-10-01', 40 * 60)]))[0].count === 3, 'marks stop at three so the scene stays small');

  const goalWeek = play([
    session('2026-10-12', 60),
    session('2026-10-13', 60),
    session('2026-10-14', 60),
    session('2026-10-15', 60),
    session('2026-10-16', 60),
  ]);
  check(fruitWeekCount(goalWeek) === 1, 'five goal days in a week grow one fruit');
  check(fruitWeekCount(play([session('2026-10-12', 60)])) === 0, 'one day is not a fruit week');
  const early = describeTree(play([session('2026-10-12', 60)]), at('2026-10-12', 18), OFFSET, false);
  check(early.fruits === 0, 'fruit waits until the tree stage');
  check(early.fireflies === 1, 'a goal day lights one firefly');

  const chosen = setPlant(emptyGamification(), 'clay');
  check(chosen.state.plant === 'clay' && chosen.state.sprout === 'default', 'the species waits for the next seed');
  check(chosen.state.recoveredMinutes === 0, 'picking a species does not add time');
  const finished = applyFocusSession(chosen.state, session('2026-10-01', TREE_MINUTES), OFFSET);
  check(finished.treesCompleted === 1, 'the tree still completes at 300 hours');
  check(finished.state.grove.length === 1 && finished.state.grove[0].plant === 'default', 'the planted tree keeps the species it grew');
  check(finished.state.sprout === 'clay' && finished.state.plant === 'clay', 'the new seed uses the chosen species');
  check(finished.state.recoveredMinutes === TREE_MINUTES, 'species does not change the minutes');

  const legacy = sanitizeGamification({ v: 3, recoveredMinutes: TREE_MINUTES, goalMinutes: 60, plant: 'olive' });
  check(legacy.recoveredMinutes === TREE_MINUTES && legacy.sprout === 'olive', 'an old save keeps its minutes and species');
  check(legacy.grove.length === 1 && legacy.grove[0].at === 0, 'a finished tree without a date still joins the forest');

  const counts = [0, 1, 2, 3, 4, 5].map((stage) => opaqueCount(rasterScene({ ...quiet, stage, substage: 7 })));
  for (let stage = 1; stage < counts.length; stage += 1) {
    check(counts[stage] > counts[stage - 1], 'each stage adds pixels');
  }
  const young = [0, 1, 2, 3, 4, 5, 6, 7].map((substage) =>
    opaqueCount(rasterScene({ ...quiet, stage: 3, substage })),
  );
  for (let sub = 1; sub < young.length; sub += 1) {
    check(young[sub] >= young[sub - 1], 'a substage never removes pixels');
  }
  const oak = rasterScene({ ...quiet, stage: 5, substage: 7 });
  const pine = rasterScene({ ...quiet, species: 'fern', stage: 5, substage: 7 });
  check(oak.some((value, index) => value !== pine[index]), 'the pine is not the oak');
  const summer = rasterScene({ ...quiet, stage: 4, substage: 4, season: 'summer' });
  const autumn = rasterScene({ ...quiet, stage: 4, substage: 4, season: 'autumn' });
  check(summer.some((value, index) => value !== autumn[index]), 'the season recolors the leaves');
  check(oak[3] === 0, 'the sky stays clear');
  let ground = false;
  for (let y = 50; y < 64; y += 1) {
    if (oak[(y * 64 + 32) * 4 + 3] > 0) ground = true;
  }
  check(ground, 'the ground is painted');
}
