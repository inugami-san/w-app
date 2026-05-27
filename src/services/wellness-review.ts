import { Pedometer } from 'expo-sensors';
import { useCompanionStore } from '@/src/store/companion-store';
import { useJournalStore } from '@/src/store/journal-store';
import { useLocationStore } from '@/src/store/location-store';
import { usePreferencesStore } from '@/src/store/preferences-store';
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

function getEndOfDateKey(dateKey: string) {
  const date = parseDateKey(dateKey);
  date.setHours(23, 59, 59, 999);
  return date;
}

async function getStepCountForPeriod(period: WellnessReviewPeriod) {
  try {
    const isAvailable = await Pedometer.isAvailableAsync();
    if (!isAvailable) return null;

    const permission = await Pedometer.getPermissionsAsync();
    if (!permission.granted) return null;

    const result = await Pedometer.getStepCountAsync(
      parseDateKey(period.startDateKey),
      getEndOfDateKey(period.endDateKey)
    );
    return result.steps;
  } catch {
    return null;
  }
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
  const locationVisits = useLocationStore.getState().visits;
  const {
    aiTaskContextEnabled,
    aiJournalContextEnabled,
    aiCompanionContextEnabled,
    aiLocationContextEnabled,
  } = usePreferencesStore.getState();

  const tasks = aiTaskContextEnabled
    ? period.dateKeys.flatMap((dateKey) => journalEntries[dateKey]?.tasks ?? [])
    : [];
  const journals = aiJournalContextEnabled
    ? period.dateKeys
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
        .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
    : [];

  const companionDays = aiCompanionContextEnabled
    ? period.dateKeys
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
        .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
    : [];
  const locations = aiLocationContextEnabled
    ? locationVisits.filter((visit) => {
        const dateKey = getLocalDateKey(new Date(visit.createdAt));
        return period.dateKeys.includes(dateKey);
      })
    : [];

  return {
    period,
    tasks,
    journals,
    companionDays,
    movement: {
      stepCount: null,
      locationCount: locations.length,
      locationLabels: locations.map((visit) => visit.label).slice(0, 5),
    },
  };
}

export async function buildWellnessReviewSourceWithMovement(period: WellnessReviewPeriod): Promise<WellnessReviewSource> {
  const source = buildWellnessReviewSource(period);
  const stepCount = await getStepCountForPeriod(period);

  return {
    ...source,
    movement: {
      ...source.movement,
      stepCount,
    },
  };
}

export function hasWellnessReviewActivity(source: WellnessReviewSource) {
  return (
    source.tasks.length > 0 ||
    source.journals.length > 0 ||
    source.companionDays.some((day) => day.messages.some((message) => message.role === 'user')) ||
    Boolean(source.movement.stepCount && source.movement.stepCount > 0) ||
    source.movement.locationCount > 0
  );
}

export function createFallbackWellnessReview(source: WellnessReviewSource): Omit<WellnessReviewSummary, 'id' | 'createdAt'> {
  const completedTaskCount = source.tasks.filter((task) => task.done).length;
  const companionMessageCount = source.companionDays.reduce(
    (total, day) => total + day.messages.filter((message) => message.role === 'user').length,
    0
  );
  const movementParts: string[] = [];
  if (completedTaskCount > 0) {
    movementParts.push(`${completedTaskCount} finished task${completedTaskCount === 1 ? '' : 's'}`);
  }
  if (typeof source.movement.stepCount === 'number' && source.movement.stepCount > 0) {
    movementParts.push(`${source.movement.stepCount.toLocaleString()} step${source.movement.stepCount === 1 ? '' : 's'}`);
  }
  if (source.movement.locationCount > 0) {
    movementParts.push(`${source.movement.locationCount} saved place${source.movement.locationCount === 1 ? '' : 's'}`);
  }
  const movementLine =
    movementParts.length > 0
      ? `That effort showed up through ${movementParts.join(', ')}.`
      : 'That still counts as care for yourself.';
  const reflectionLine =
    source.journals.length > 0 || companionMessageCount > 0
      ? 'You also gave yourself space to check in, which matters.'
      : 'Let today stay simple.';

  return {
    periodKey: source.period.key,
    title: source.period.title,
    body: `You showed up in small, steady ways. ${movementLine} ${reflectionLine} One kind next step is enough.`,
    taskCount: source.tasks.length,
    completedTaskCount,
    journalCount: source.journals.length,
    companionMessageCount,
    stepCount: source.movement.stepCount,
    locationCount: source.movement.locationCount,
  };
}
