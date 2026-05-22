import type { CompanionDayEntry } from '@/src/types/companion';
import type { JournalEntry } from '@/src/types/journal';
import type { TaskItem } from '@/src/types/task';
import { getLocalDateKey } from '@/src/utils/date';

export type MoodTrendInsight = {
  title: string;
  detail: string;
  scores: { dateKey: string; score: number | null }[];
  average: number | null;
};

export type SmartNextStepInsight = {
  title: string;
  detail: string;
  taskTitle: string;
  taskDetail: string;
  source: 'task' | 'journal' | 'companion' | 'planning';
};

export type DailyWrapInsight = {
  title: string;
  detail: string;
  stats: { label: string; value: string }[];
};

export type MemoryTimelineItem = {
  id: string;
  title: string;
  detail: string;
  meta: string;
  source: 'tasks' | 'journal' | 'companion';
  dateKey?: string;
};

export const MICRO_RESET_OPTIONS = [
  {
    id: 'breathing',
    title: '60-second breathing',
    detail: 'Inhale for 4, hold for 2, exhale for 6. Repeat until the timer feels done.',
    icon: 'leaf-outline' as const,
  },
  {
    id: 'stretch',
    title: 'Desk stretch',
    detail: 'Roll shoulders, loosen your neck, then stretch wrists for two minutes.',
    icon: 'body-outline' as const,
  },
  {
    id: 'name-three',
    title: 'Name three things',
    detail: 'Name three things you can see, two you can touch, and one sound nearby.',
    icon: 'scan-outline' as const,
  },
] as const;

function parseDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function formatDate(dateKey: string) {
  return parseDateKey(dateKey).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

export function getRecentDateKeys(days: number, today = getLocalDateKey()) {
  const [year, month, day] = today.split('-').map(Number);
  const start = new Date(year, month - 1, day);

  return Array.from({ length: days }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() - index);
    return getLocalDateKey(date);
  });
}

function trimText(value: string, maxLength = 96) {
  const clean = value.replace(/\s+/g, ' ').trim();
  if (clean.length <= maxLength) return clean;
  return `${clean.slice(0, maxLength - 3).trim()}...`;
}

function countUserMessages(entry?: CompanionDayEntry) {
  return entry?.messages.filter((message) => message.role === 'user').length ?? 0;
}

function hasJournalText(entry?: JournalEntry) {
  return Boolean(entry?.feelingNote.trim() || entry?.summaries.length || entry?.image);
}

export function buildMoodTrendInsight(entries: Record<string, JournalEntry>, today = getLocalDateKey()): MoodTrendInsight {
  const dateKeys = getRecentDateKeys(7, today).reverse();
  const scores = dateKeys.map((dateKey) => ({
    dateKey,
    score: entries[dateKey]?.feelingScale?.score ?? null,
  }));
  const numericScores = scores
    .map((item) => item.score)
    .filter((score): score is number => typeof score === 'number');

  if (numericScores.length === 0) {
    return {
      title: 'Feeling trend',
      detail: 'No ratings yet. Rate how today feels to start a simple trend.',
      scores,
      average: null,
    };
  }

  const average = Math.round((numericScores.reduce((sum, score) => sum + score, 0) / numericScores.length) * 10) / 10;
  const first = numericScores[0];
  const last = numericScores[numericScores.length - 1];
  const direction = last > first ? 'up' : last < first ? 'down' : 'steady';
  const detail =
    direction === 'steady'
      ? `Average ${average}/10. The recent ratings are steady.`
      : `Average ${average}/10. The latest rating moved ${direction}.`;

  return {
    title: 'Feeling trend',
    detail,
    scores,
    average,
  };
}

export function buildDailyWrapInsight(input: {
  tasks: TaskItem[];
  journalEntry?: JournalEntry;
  companionEntry?: CompanionDayEntry;
}): DailyWrapInsight {
  const completed = input.tasks.filter((task) => task.done).length;
  const total = input.tasks.length;
  const userMessages = countUserMessages(input.companionEntry);
  const hasJournal = hasJournalText(input.journalEntry);
  const feelingScore = input.journalEntry?.feelingScale?.score;

  const stats = [
    { label: 'tasks', value: total > 0 ? `${completed}/${total}` : '0' },
    { label: 'journal', value: hasJournal ? 'saved' : 'open' },
    { label: 'chat', value: `${userMessages}` },
  ];

  if (typeof feelingScore === 'number') {
    stats.push({ label: 'feeling', value: `${feelingScore}/10` });
  }

  const detailParts = [
    total > 0 ? `${completed} of ${total} tasks finished` : 'No tasks listed yet',
    hasJournal ? 'journal saved' : 'journal still open',
    userMessages > 0 ? `${userMessages} chat message${userMessages === 1 ? '' : 's'}` : 'no chat yet',
  ];

  return {
    title: 'Today snapshot',
    detail: detailParts.join(' · '),
    stats,
  };
}

export function buildSmartNextStepInsight(input: {
  tasks: TaskItem[];
  journalEntry?: JournalEntry;
  companionEntry?: CompanionDayEntry;
}): SmartNextStepInsight {
  const openTask = input.tasks.find((task) => !task.done);
  if (openTask) {
    return {
      title: 'Next step',
      detail: `Start with "${openTask.title}". Keep the scope to 5-15 minutes.`,
      taskTitle: openTask.title,
      taskDetail: openTask.detail,
      source: 'task',
    };
  }

  if (!hasJournalText(input.journalEntry)) {
    return {
      title: 'Next step',
      detail: 'Write one sentence about what you want to remember from today.',
      taskTitle: 'Write One Sentence',
      taskDetail: 'Open Journal and write one sentence about today.',
      source: 'journal',
    };
  }

  if (countUserMessages(input.companionEntry) === 0) {
    return {
      title: 'Next step',
      detail: 'Ask Wenwen to help sort one thing that still feels unresolved.',
      taskTitle: 'Sort One Thought',
      taskDetail: 'Open Companion and write one thing you want to sort out.',
      source: 'companion',
    };
  }

  return {
    title: 'Next step',
    detail: 'Set one small plan for tomorrow while the day is still clear.',
    taskTitle: 'Plan Tomorrow in 5 Minutes',
    taskDetail: 'Write one small thing you want to do tomorrow.',
    source: 'planning',
  };
}

export function buildMemoryTimeline(input: {
  tasks: TaskItem[];
  journalEntries: Record<string, JournalEntry>;
  companionEntries: Record<string, CompanionDayEntry>;
  today?: string;
}): MemoryTimelineItem[] {
  const today = input.today ?? getLocalDateKey();
  const items: MemoryTimelineItem[] = [];
  const completedTasks = input.tasks.filter((task) => task.done).length;
  const openTasks = input.tasks.length - completedTasks;

  if (input.tasks.length > 0) {
    items.push({
      id: 'current-tasks',
      source: 'tasks',
      title: 'Current task context',
      detail: `${completedTasks} finished · ${openTasks} open`,
      meta: 'Today',
      dateKey: today,
    });
  }

  Object.keys(input.journalEntries)
    .sort((a, b) => b.localeCompare(a))
    .slice(0, 8)
    .forEach((dateKey) => {
      const entry = input.journalEntries[dateKey];
      if (!hasJournalText(entry) && typeof entry?.feelingScale?.score !== 'number') return;

      const summary = entry.summaries[0];
      const detail = summary?.title
        ? summary.title
        : entry.feelingNote
          ? trimText(entry.feelingNote)
          : typeof entry.feelingScale?.score === 'number'
            ? `Feeling ${entry.feelingScale.score}/10`
            : 'Journal memory saved';

      items.push({
        id: `journal-${dateKey}`,
        source: 'journal',
        title: `${formatDate(dateKey)} journal`,
        detail,
        meta: dateKey === today ? 'Today' : dateKey,
        dateKey,
      });
    });

  Object.keys(input.companionEntries)
    .sort((a, b) => b.localeCompare(a))
    .slice(0, 8)
    .forEach((dateKey) => {
      const entry = input.companionEntries[dateKey];
      const userMessages = countUserMessages(entry);
      if (userMessages === 0) return;

      items.push({
        id: `companion-${dateKey}`,
        source: 'companion',
        title: `${formatDate(dateKey)} companion`,
        detail: entry.summaries[0]?.title ?? `${userMessages} message${userMessages === 1 ? '' : 's'} from you`,
        meta: dateKey === today ? 'Today' : dateKey,
        dateKey,
      });
    });

  return items.slice(0, 8);
}
