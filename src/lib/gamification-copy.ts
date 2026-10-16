import type { Translate } from '@/i18n';

import { minuteParts, type BadgeId, type LevelId, type PlantId, type PurposeId, type SkyId } from '@/lib/gamification';

export const LEVEL_NAME: Record<LevelId, 'gamification.levels.semilla' | 'gamification.levels.brote' | 'gamification.levels.raiz' | 'gamification.levels.arbol' | 'gamification.levels.bosque' | 'gamification.levels.ambar'> = {
  semilla: 'gamification.levels.semilla',
  brote: 'gamification.levels.brote',
  raiz: 'gamification.levels.raiz',
  arbol: 'gamification.levels.arbol',
  bosque: 'gamification.levels.bosque',
  ambar: 'gamification.levels.ambar',
};

export const BADGE_TITLE: Record<BadgeId, `gamification.achievements.${BadgeId}.title`> = {
  first_lock: 'gamification.achievements.first_lock.title',
  hour_1: 'gamification.achievements.hour_1.title',
  goal_7: 'gamification.achievements.goal_7.title',
  week_5: 'gamification.achievements.week_5.title',
  hour_10: 'gamification.achievements.hour_10.title',
  hour_50: 'gamification.achievements.hour_50.title',
  hour_100: 'gamification.achievements.hour_100.title',
  month_quiet: 'gamification.achievements.month_quiet.title',
};

export const BADGE_BODY: Record<BadgeId, `gamification.achievements.${BadgeId}.body`> = {
  first_lock: 'gamification.achievements.first_lock.body',
  hour_1: 'gamification.achievements.hour_1.body',
  goal_7: 'gamification.achievements.goal_7.body',
  week_5: 'gamification.achievements.week_5.body',
  hour_10: 'gamification.achievements.hour_10.body',
  hour_50: 'gamification.achievements.hour_50.body',
  hour_100: 'gamification.achievements.hour_100.body',
  month_quiet: 'gamification.achievements.month_quiet.body',
};

export const PURPOSE_NAME: Record<PurposeId, `gamification.purposes.${PurposeId}`> = {
  leer: 'gamification.purposes.leer',
  familia: 'gamification.purposes.familia',
  deporte: 'gamification.purposes.deporte',
  descansar: 'gamification.purposes.descansar',
  otro: 'gamification.purposes.otro',
};

export const PLANT_NAME: Record<PlantId, `gamification.plants.${PlantId}`> = {
  default: 'gamification.plants.default',
  olive: 'gamification.plants.olive',
  fern: 'gamification.plants.fern',
  clay: 'gamification.plants.clay',
};

export const SKY_NAME: Record<SkyId, `gamification.skies.${SkyId}`> = {
  default: 'gamification.skies.default',
  dawn: 'gamification.skies.dawn',
  dusk: 'gamification.skies.dusk',
  night: 'gamification.skies.night',
};

export function formatRecovered(t: Translate, minutes: number): string {
  const parts = minuteParts(minutes);
  if (parts.hours <= 0) return t('gamification.timeMinutes', { count: parts.minutes });
  if (parts.minutes === 0) return t('gamification.timeHours', { hours: parts.hours });
  return t('gamification.timeHoursMinutes', { hours: parts.hours, minutes: parts.minutes });
}
