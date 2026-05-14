import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

import type { JournalSummary } from '@/src/types/journal';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export type JournalNotificationData = {
  type: 'journal-summary';
  dateKey: string;
  summaryId: string;
};

async function ensureNotificationPermission() {
  if (Platform.OS === 'web') return false;

  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;

  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

export async function scheduleJournalSummaryNotification(summary: JournalSummary) {
  const hasPermission = await ensureNotificationPermission();
  if (!hasPermission) return null;

  return Notifications.scheduleNotificationAsync({
    content: {
      title: 'Wenwen note is ready',
      body: summary.title,
      data: {
        type: 'journal-summary',
        dateKey: summary.dateKey,
        summaryId: summary.id,
      } satisfies JournalNotificationData,
    },
    trigger: null,
  });
}

export function getJournalNotificationData(
  response: Notifications.NotificationResponse
): JournalNotificationData | null {
  const data = response.notification.request.content.data;
  if (
    data?.type === 'journal-summary' &&
    typeof data.dateKey === 'string' &&
    typeof data.summaryId === 'string'
  ) {
    return {
      type: 'journal-summary',
      dateKey: data.dateKey,
      summaryId: data.summaryId,
    };
  }

  return null;
}
