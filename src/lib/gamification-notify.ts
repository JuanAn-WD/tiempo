import { Platform } from 'react-native';

const CHANNEL_ID = 'apartag-logros';
let handlerReady = false;

/**
 * Local notification for a new badge. Never asks for permission and never throws:
 * the unlock has already finished by the time this runs.
 */
export async function notifyAchievement(input: {
  title: string;
  body: string;
  channelName: string;
}): Promise<void> {
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') return;
  try {
    const Notifications = await import('expo-notifications');
    if (!handlerReady) {
      handlerReady = true;
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
        }),
      });
    }
    const status = await Notifications.getPermissionsAsync();
    const provisional = status.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
    if (!status.granted && !provisional) return;
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
        name: input.channelName,
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }
    await Notifications.scheduleNotificationAsync({
      content: {
        title: input.title,
        body: input.body,
        sound: 'default',
        data: { kind: 'achievement' },
      },
      trigger:
        Platform.OS === 'android'
          ? {
              type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
              seconds: 1,
              channelId: CHANNEL_ID,
            }
          : null,
    });
  } catch {
    /* a missed banner must not surface */
  }
}
