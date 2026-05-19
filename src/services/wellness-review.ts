import { getMoodLabel } from '@/src/features/journal/moods';
import { useCompanionStore } from '@/src/store/companion-store';
import { useJournalStore } from '@/src/store/journal-store';
import type { EvaluationFrequency } from '@/src/types/journal';
import type {
  WellnessReviewPeriod,
  WellnessReviewSource,
  WellnessReviewSummary,
} from '@/src/types/wellness-review';
import { getLocalDateKey } from '@/src/utils/date';

const DAY_MS = 24 * 60 * 60 * 1000;

function parseDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function addDays(dateKey: string, amount: number) {
  const date = parseDateKey(dateKey);
  date.setDate(date.getDate() + amount);
  return getLocalDateKey(date);
}

function getDayNumber(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number);
  return Math.floor(Date.UTC(year, month - 1, day) / DAY_MS);
}

function getDateKeyFromDayNumber(dayNumber: number) {
  const date = new Date(dayNumber * DAY_MS);
  const year = date.getUTCFullYear();
  const month = `${date.getUTCMonth() + 1}`.padStart(2, '0');
  const day = `${date.getUTCDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getDateKeys(startDateKey: string, endDateKey: string) {
  const keys: string[] = [];
  let cursor = startDateKey;

  while (cursor <= endDateKey) {
    keys.push(cursor);
    cursor = addDays(cursor, 1);
  }

  return keys;
}

function formatShortDate(dateKey: string) {
  return parseDateKey(dateKey).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

function createPeriod(
  type: EvaluationFrequency,
  startDateKey: string,
  endDateKey: string,
  title: string
): WellnessReviewPeriod {
  const label =
    startDateKey === endDateKey
      ? formatShortDate(startDateKey)
      : `${formatShortDate(startDateKey)} - ${formatShortDate(endDateKey)}`;

  return {
    key: `${type}:${startDateKey}:${endDateKey}`,
    type,
    title,
    label,
    startDateKey,
    endDateKey,
    dateKeys: getDateKeys(startDateKey, endDateKey),
  };
}

function getLatestCompletedThreeDayPeriod(today: string) {
  const yesterday = addDays(today, -1);
  const yesterdayDayNumber = getDayNumber(yesterday);
  let periodIndex = Math.floor(yesterdayDayNumber / 3);

  if (yesterdayDayNumber % 3 !== 2) {
    periodIndex -= 1;
  }

  if (periodIndex < 0) return null;

  return createPeriod(
    'every3days',
    getDateKeyFromDayNumber(periodIndex * 3),
    getDateKeyFromDayNumber((periodIndex * 3) + 2),
    'Three-day review'
  );
}

function getLatestCompletedWeek(today: string, type: EvaluationFrequency) {
  const todayDate = parseDateKey(today);
  const dayOfWeek = todayDate.getDay();
  const daysSinceMonday = (dayOfWeek + 6) % 7;
  const startOfCurrentWeek = addDays(today, -daysSinceMonday);
  const endDateKey = addDays(startOfCurrentWeek, -1);
  const startDateKey = addDays(endDateKey, -6);

  return createPeriod(type, startDateKey, endDateKey, 'Weekly review');
}

export function getCompletedReviewPeriod(
  frequency: EvaluationFrequency,
  today = getLocalDateKey()
): WellnessReviewPeriod | null {
  const todayDate = parseDateKey(today);
  const isMonday = todayDate.getDay() === 1;

  if (frequency === 'weekly') {
    return getLatestCompletedWeek(today, 'weekly');
  }

  if (frequency === 'every3days') {
    return getLatestCompletedThreeDayPeriod(today);
  }

  if (isMonday) {
    return getLatestCompletedWeek(today, 'daily');
  }

  const yesterday = addDays(today, -1);
  return createPeriod('daily', yesterday, yesterday, 'Daily review');
}

export function buildWellnessReviewSource(period: WellnessReviewPeriod): WellnessReviewSource {
  const journalEntries = useJournalStore.getState().entries;
  const companionEntries = useCompanionStore.getState().entries;

  const tasks = period.dateKeys.flatMap((dateKey) => journalEntries[dateKey]?.tasks ?? []);
  const journals = period.dateKeys
    .map((dateKey) => {
      const entry = journalEntries[dateKey];
      if (!entry) return null;
      const feelingNote = entry.feelingNote.trim();
      const feelingScore = entry.feelingScale?.score;
      if (!feelingNote && !entry.mood && typeof feelingScore !== 'number') return null;
      return {
        dateKey,
        feelingNote,
        feelingScore,
        mood: entry.mood,
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));

  const companionDays = period.dateKeys
    .map((dateKey) => {
      const entry = companionEntries[dateKey];
      const messages = entry?.messages.filter((message) => message.role !== 'assistant' || message.text.trim()) ?? [];
      const hasUserMessage = messages.some((message) => message.role === 'user');
      if (!hasUserMessage) return null;
      return {
        dateKey,
        messages,
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));

  return {
    period,
    tasks,
    journals,
    companionDays,
  };
}

export function hasWellnessReviewActivity(source: WellnessReviewSource) {
  return (
    source.tasks.length > 0 ||
    source.journals.length > 0 ||
    source.companionDays.some((day) => day.messages.some((message) => message.role === 'user'))
  );
}

export function createFallbackWellnessReview(source: WellnessReviewSource): Omit<WellnessReviewSummary, 'id' | 'createdAt'> {
  const completedTaskCount = source.tasks.filter((task) => task.done).length;
  const companionMessageCount = source.companionDays.reduce(
    (total, day) => total + day.messages.filter((message) => message.role === 'user').length,
    0
  );
  const moodLabels = source.journals
    .map((journal) => getMoodLabel(journal.mood))
    .filter((label): label is string => Boolean(label));
  const feelingScores = source.journals
    .map((journal) => journal.feelingScore)
    .filter((score): score is number => typeof score === 'number');

  const journalLine =
    source.journals.length > 0
      ? `${source.journals.length} journal check-in${source.journals.length === 1 ? '' : 's'}${moodLabels.length ? `, including ${moodLabels[0].toLowerCase()}` : ''}${feelingScores.length ? ` and a ${feelingScores[feelingScores.length - 1]}/10 feeling rating` : ''}.`
      : 'No journal note was logged for this period.';

  return {
    periodKey: source.period.key,
    title: source.period.title,
    body: `${completedTaskCount}/${source.tasks.length} tasks were completed. ${journalLine} There were ${companionMessageCount} companion message${companionMessageCount === 1 ? '' : 's'}. Keep the next step small and realistic.`,
    taskCount: source.tasks.length,
    completedTaskCount,
    journalCount: source.journals.length,
    companionMessageCount,
  };
}
