import type { TranslationKey } from '@/i18n/translate';
import type { AchievementId, LevelId } from '@/lib/gamification';

export const LEVEL_NAME: Record<LevelId, TranslationKey> = {
  chispa: 'gamification.levels.chispa',
  presente: 'gamification.levels.presente',
  foco: 'gamification.levels.foco',
  constante: 'gamification.levels.constante',
  guardian: 'gamification.levels.guardian',
  ritual: 'gamification.levels.ritual',
  silencio: 'gamification.levels.silencio',
  apartado: 'gamification.levels.apartado',
};

export const ACHIEVEMENT_TITLE: Record<AchievementId, TranslationKey> = {
  first_session: 'gamification.achievements.first_session.title',
  hour_1: 'gamification.achievements.hour_1.title',
  hour_10: 'gamification.achievements.hour_10.title',
  streak_7: 'gamification.achievements.streak_7.title',
  streak_30: 'gamification.achievements.streak_30.title',
  resisted_100: 'gamification.achievements.resisted_100.title',
  mode_trabajo: 'gamification.achievements.mode_trabajo.title',
  mode_estudio: 'gamification.achievements.mode_estudio.title',
  mode_casa: 'gamification.achievements.mode_casa.title',
  mode_gym: 'gamification.achievements.mode_gym.title',
  night_owl: 'gamification.achievements.night_owl.title',
  early_bird: 'gamification.achievements.early_bird.title',
};

export const ACHIEVEMENT_BODY: Record<AchievementId, TranslationKey> = {
  first_session: 'gamification.achievements.first_session.body',
  hour_1: 'gamification.achievements.hour_1.body',
  hour_10: 'gamification.achievements.hour_10.body',
  streak_7: 'gamification.achievements.streak_7.body',
  streak_30: 'gamification.achievements.streak_30.body',
  resisted_100: 'gamification.achievements.resisted_100.body',
  mode_trabajo: 'gamification.achievements.mode_trabajo.body',
  mode_estudio: 'gamification.achievements.mode_estudio.body',
  mode_casa: 'gamification.achievements.mode_casa.body',
  mode_gym: 'gamification.achievements.mode_gym.body',
  night_owl: 'gamification.achievements.night_owl.body',
  early_bird: 'gamification.achievements.early_bird.body',
};
