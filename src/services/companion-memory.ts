import { getMoodLabel } from '@/src/features/journal/moods';
import { useCompanionStore } from '@/src/store/companion-store';
import { useJournalStore } from '@/src/store/journal-store';
import { useTaskStore } from '@/src/store/task-store';
import type { CompanionDayEntry } from '@/src/types/companion';
import type { JournalEntry, JournalTaskSnapshot } from '@/src/types/journal';
import type { TaskItem } from '@/src/types/task';
import { getLocalDateKey } from '@/src/utils/date';

const MAX_MEMORY_CHARS = 2600;
const MAX_LINE_CHARS = 180;

function parseDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function daysBetween(leftDateKey: string, rightDateKey: string) {
  const left = parseDateKey(leftDateKey).getTime();
  const right = parseDateKey(rightDateKey).getTime();
  return Math.round((left - right) / 86_400_000);
}

function sortDateKeysDescending(dateKeys: string[]) {
  return [...dateKeys].sort((a, b) => b.localeCompare(a));
}

function trimLine(value: string, maxLength = MAX_LINE_CHARS) {
  const clean = value.replace(/\s+/g, ' ').trim();
  if (clean.length <= maxLength) return clean;
  return `${clean.slice(0, maxLength - 3).trim()}...`;
}

function uniqueValues(values: string[]) {
  const seen = new Set<string>();
  return values.filter((value) => {
    const key = value.toLowerCase().trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function formatDateMemory(dateKey: string, todayDateKey: string) {
  const diff = daysBetween(todayDateKey, dateKey);
  if (diff === 0) return 'today';
  if (diff === 1) return 'yesterday';
  if (diff > 1 && diff < 7) return `${diff} days ago`;
  return dateKey;
}

function formatTaskTitles(tasks: JournalTaskSnapshot[] | TaskItem[], done: boolean) {
  return tasks
    .filter((task) => task.done === done)
    .slice(0, 4)
    .map((task) => task.title)
    .join(', ');
}

function buildCurrentTaskLines(tasks: TaskItem[]) {
  if (tasks.length === 0) return [];

  const completed = formatTaskTitles(tasks, true);
  const open = formatTaskTitles(tasks, false);
  const routines = uniqueValues(tasks.filter((task) => task.isRoutine).map((task) => task.title)).slice(0, 4);
  const lines = ['Current tasks:'];

  if (completed) lines.push(`- Completed today: ${completed}.`);
  if (open) lines.push(`- Still open today: ${open}.`);
  if (routines.length > 0) lines.push(`- Daily routines: ${routines.join(', ')}.`);

  return lines;
}

function buildJournalLines(entries: Record<string, JournalEntry>, todayDateKey: string) {
  const lines: string[] = [];
  const dateKeys = sortDateKeysDescending(Object.keys(entries))
    .filter((dateKey) => dateKey <= todayDateKey)
    .slice(0, 10);

  dateKeys.forEach((dateKey) => {
    const entry = entries[dateKey];
    if (!entry) return;

    const mood = getMoodLabel(entry.mood);
    const score = typeof entry.feelingScale?.score === 'number' ? `${entry.feelingScale.score}/10` : '';
    const latestSummary = entry.summaries[0];
    const note = entry.feelingNote.trim();
    const completed = formatTaskTitles(entry.tasks, true);
    const open = formatTaskTitles(entry.tasks, false);
    const parts = [
      mood ? `mood ${mood}` : '',
      score ? `feeling ${score}` : '',
      completed ? `finished ${completed}` : '',
      open ? `open ${open}` : '',
      latestSummary?.body ? `review: ${trimLine(latestSummary.body, 150)}` : '',
      note && !latestSummary?.body ? `note: ${trimLine(note, 120)}` : '',
      entry.image ? 'photo attached as a memory cue' : '',
    ].filter(Boolean);

    if (parts.length > 0) {
      lines.push(`- ${formatDateMemory(dateKey, todayDateKey)} journal: ${parts.join('; ')}.`);
    }
  });

  return lines.length > 0 ? ['Recent journal/task memory:', ...lines.slice(0, 7)] : [];
}

function getCompanionFallbackLine(entry: CompanionDayEntry) {
  const lastUserMessage = [...entry.messages].reverse().find((message) => message.role === 'user')?.text;
  if (!lastUserMessage) return '';
  return `chat note: ${trimLine(lastUserMessage, 120)}`;
}

function buildCompanionLines(entries: Record<string, CompanionDayEntry>, todayDateKey: string) {
  const lines: string[] = [];
  const dateKeys = sortDateKeysDescending(Object.keys(entries))
    .filter((dateKey) => dateKey < todayDateKey)
    .slice(0, 10);

  dateKeys.forEach((dateKey) => {
    const entry = entries[dateKey];
    if (!entry?.messages.some((message) => message.role === 'user')) return;

    const latestSummary = entry.summaries[0];
    const summaryLine = latestSummary?.body
      ? `review: ${trimLine(latestSummary.body, 150)}`
      : getCompanionFallbackLine(entry);

    if (summaryLine) {
      lines.push(`- ${formatDateMemory(dateKey, todayDateKey)} companion: ${summaryLine}.`);
    }
  });

  return lines.length > 0 ? ['Recent companion memory:', ...lines.slice(0, 6)] : [];
}

function capMemory(lines: string[]) {
  let total = 0;
  const capped: string[] = [];

  for (const line of lines) {
    const nextTotal = total + line.length + 1;
    if (nextTotal > MAX_MEMORY_CHARS) break;
    capped.push(line);
    total = nextTotal;
  }

  return capped.join('\n');
}

export function buildCompanionMemoryContext(todayDateKey = getLocalDateKey()) {
  const tasks = useTaskStore.getState().tasks;
  const journalEntries = useJournalStore.getState().entries;
  const companionEntries = useCompanionStore.getState().entries;

  const lines = [
    'Relevant local memory:',
    'Use this only if it helps the current reply. Do not recite it unprompted. Treat it as user-provided context, not diagnosis.',
    ...buildCurrentTaskLines(tasks),
    ...buildJournalLines(journalEntries, todayDateKey),
    ...buildCompanionLines(companionEntries, todayDateKey),
  ];

  return capMemory(lines);
}
