import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

import type { ReminderTimeKey } from '@/src/store/preferences-store';

export const REMINDER_TIME_OPTIONS: {
  value: ReminderTimeKey;
  title: string;
  detail: string;
  hour: number;
  minute: number;
}[] = [
  {
    value: 'morning',
    title: 'Morning',
    detail: '9:00 AM',
    hour: 9,
    minute: 0,
  },
  {
    value: 'afternoon',
    title: 'Afternoon',
    detail: '2:00 PM',
    hour: 14,
    minute: 0,
  },
  {
    value: 'evening',
    title: 'Evening',
    detail: '7:00 PM',
    hour: 19,
    minute: 0,
  },
];

export type GentleReminderNotificationData = {
  type: 'gentle-reminder';
};

async function ensureNotificationPermission() {
  if (Platform.OS === 'web') return false;

  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;

  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

function getReminderOption(time: ReminderTimeKey) {
  return REMINDER_TIME_OPTIONS.find((option) => option.value === time) ?? REMINDER_TIME_OPTIONS[0];
}

export async function cancelGentleReminder(notificationId: string | null) {
  if (!notificationId || Platform.OS === 'web') return;
  await Notifications.cancelScheduledNotificationAsync(notificationId);
}

export async function scheduleGentleReminder(time: ReminderTimeKey) {
  if (Platform.OS === 'web') return null;

  const hasPermission = await ensureNotificationPermission();
  if (!hasPermission) return null;

  const option = getReminderOption(time);
  return Notifications.scheduleNotificationAsync({
    content: {
      title: 'Daily check-in',
      body: 'Open Wenwen to review today’s tasks.',
      data: {
        type: 'gentle-reminder',
      } satisfies GentleReminderNotificationData,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: option.hour,
      minute: option.minute,
    },
  });
}

export function getGentleReminderNotificationData(
  response: Notifications.NotificationResponse
): GentleReminderNotificationData | null {
  const data = response.notification.request.content.data;
  if (data?.type === 'gentle-reminder') {
    return { type: 'gentle-reminder' };
  }

  return null;
}

export async function syncGentleReminder(input: {
  enabled: boolean;
  time: ReminderTimeKey;
  existingNotificationId: string | null;
}) {
  await cancelGentleReminder(input.existingNotificationId);

  if (!input.enabled) return null;
  return scheduleGentleReminder(input.time);
}
