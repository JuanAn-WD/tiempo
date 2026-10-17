import { Platform } from 'react-native';

const CHANNEL_ID = 'apartag-progreso';
const SUNDAY_ID = 'apartag-sunday-summary';
let handlerReady = false;

/**
 * One local note for Sunday 18:00. The text is a snapshot from the last time
 * the app was open: the phone cannot refresh it while Apartag is closed.
 * Never asks for permission and never throws.
 */
export async function syncSundaySummary(input: {
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
          shouldPlaySound: false,
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
    await Notifications.cancelScheduledNotificationAsync(SUNDAY_ID).catch(() => undefined);
    await Notifications.scheduleNotificationAsync({
      identifier: SUNDAY_ID,
      content: {
        title: input.title,
        body: input.body,
        sound: false,
        data: { kind: 'sunday-summary' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: 1,
        hour: 18,
        minute: 0,
        channelId: CHANNEL_ID,
      },
    });
  } catch {
    /* a missed Sunday note must not surface */
  }
}
