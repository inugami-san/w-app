import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

import { MOOD_OPTIONS } from '@/src/features/journal/moods';
import { useCompanionStore } from '@/src/store/companion-store';
import { useJournalStore } from '@/src/store/journal-store';
import { useTaskStore } from '@/src/store/task-store';
import { getLocalDateKey } from '@/src/utils/date';

export const NIGHTLY_REVIEW_TIME = {
  hour: 21,
  minute: 30,
};

export type NightlyReviewNotificationData = {
  type: 'nightly-review';
  dateKey: string;
};

async function ensureNotificationPermission() {
  if (Platform.OS === 'web') return false;

  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;

  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

function getMoodLabel(moodKey?: string) {
  return MOOD_OPTIONS.find((option) => option.key === moodKey)?.label;
}

export function buildNightlyReviewBody(dateKey = getLocalDateKey()) {
  const tasks = useTaskStore.getState().tasks;
  const journalEntry = useJournalStore.getState().entries[dateKey];
  const companionEntry = useCompanionStore.getState().entries[dateKey];

  const completedTasks = tasks.filter((task) => task.done).length;
  const taskLine =
    tasks.length > 0
      ? `${completedTasks}/${tasks.length} tasks done`
      : 'No tasks logged yet';

  const moodLabel = getMoodLabel(journalEntry?.mood);
  const hasJournalNote = Boolean(journalEntry?.feelingNote.trim());
  const journalLine = moodLabel
    ? `mood: ${moodLabel}`
    : hasJournalNote
      ? 'journal checked in'
      : 'no journal note yet';

  const userChatCount =
    companionEntry?.messages.filter((message) => message.role === 'user').length ?? 0;
  const chatLine =
    userChatCount > 0
      ? `${userChatCount} companion message${userChatCount === 1 ? '' : 's'}`
      : 'no companion chat yet';

  const encouragement =
    completedTasks > 0 || hasJournalNote || userChatCount > 0
      ? 'You showed up today. Let tonight be lighter.'
      : 'That is okay. One small note before bed is enough.';

  return `${taskLine}; ${journalLine}; ${chatLine}. ${encouragement}`;
}

export async function cancelNightlyReviewNotification(notificationId: string | null) {
  if (!notificationId || Platform.OS === 'web') return;
  await Notifications.cancelScheduledNotificationAsync(notificationId);
}

export async function scheduleNightlyReviewNotification() {
  if (Platform.OS === 'web') return null;

  const hasPermission = await ensureNotificationPermission();
  if (!hasPermission) return null;

  const dateKey = getLocalDateKey();
  return Notifications.scheduleNotificationAsync({
    content: {
      title: "Tonight's Wenwen review",
      body: buildNightlyReviewBody(dateKey),
      data: {
        type: 'nightly-review',
        dateKey,
      } satisfies NightlyReviewNotificationData,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: NIGHTLY_REVIEW_TIME.hour,
      minute: NIGHTLY_REVIEW_TIME.minute,
    },
  });
}

export async function syncNightlyReviewNotification(input: {
  enabled: boolean;
  existingNotificationId: string | null;
}) {
  await cancelNightlyReviewNotification(input.existingNotificationId);

  if (!input.enabled) return null;
  return scheduleNightlyReviewNotification();
}

export function getNightlyReviewNotificationData(
  response: Notifications.NotificationResponse
): NightlyReviewNotificationData | null {
  const data = response.notification.request.content.data;
  if (data?.type === 'nightly-review' && typeof data.dateKey === 'string') {
    return {
      type: 'nightly-review',
      dateKey: data.dateKey,
    };
  }

  return null;
}
