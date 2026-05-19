import { getMoodLabel } from '@/src/features/journal/moods';
import { type GeminiErrorCallback, requestGeminiWithFallback } from '@/src/services/gemini-client';
import { buildWenwenPrompt } from '@/src/services/wenwen-persona';
import type { JournalDailyContext, JournalTaskSnapshot, MoodKey } from '@/src/types/journal';

type JournalSummaryResult = {
  title: string;
  body: string;
};

function extractJsonObject(text: string): string {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end < 0 || end <= start) {
    throw new Error('AI did not return JSON output.');
  }
  return text.slice(start, end + 1);
}

function normalizeSummary(raw: unknown): JournalSummaryResult {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Invalid AI summary shape.');
  }

  const value = raw as Partial<JournalSummaryResult>;
  const title = `${value.title ?? ''}`.trim() || 'Today mattered';
  const body = `${value.body ?? ''}`.trim();
  if (!body) {
    throw new Error('Generated summary body is missing.');
  }

  return { title, body };
}

function trimText(value: string, maxLength = 140) {
  const clean = value.trim().replace(/\s+/g, ' ');
  if (clean.length <= maxLength) return clean;
  return `${clean.slice(0, maxLength - 3).trim()}...`;
}

function formatDailyContext(context?: JournalDailyContext) {
  const details: string[] = [];

  if (context?.sleep) {
    const sleepLabel = {
      low: 'low sleep',
      okay: 'okay sleep',
      rested: 'rested',
    }[context.sleep];
    details.push(`Sleep: ${sleepLabel}`);
  }

  if (context?.outside) {
    details.push('Went outside');
  }

  if (context?.movement) {
    details.push('Moved body');
  }

  return details.join(', ');
}

function createFallbackJournalSummary(input: {
  dateKey: string;
  tasks: JournalTaskSnapshot[];
  feelingNote: string;
  dailyContext?: JournalDailyContext;
  feelingScore?: number | null;
  mood?: MoodKey;
}): JournalSummaryResult {
  const completed = input.tasks.filter((task) => task.done);
  const unfinished = input.tasks.filter((task) => !task.done);
  const note = input.feelingNote.trim();
  const moodLabel = getMoodLabel(input.mood);
  const contextText = formatDailyContext(input.dailyContext);

  const title =
    completed.length > 0
      ? `${completed.length} task${completed.length === 1 ? '' : 's'} completed`
      : note
        ? 'Journal note saved'
        : 'Daily review saved';

  const bodyParts = [
    completed.length > 0
      ? `You completed ${completed.map((task) => task.title).join(', ')}.`
      : 'No completed tasks were recorded for this review.',
    unfinished.length > 0 ? `${unfinished.length} task${unfinished.length === 1 ? ' is' : 's are'} still open.` : '',
    moodLabel ? `Mood check-in: ${moodLabel}.` : '',
    typeof input.feelingScore === 'number' ? `Feeling rating: ${input.feelingScore}/10.` : '',
    contextText ? `Daily context: ${contextText}.` : '',
    note ? `Your note: "${trimText(note)}".` : '',
    'For the next step, keep it small and realistic.',
  ];

  return {
    title,
    body: bodyParts.filter(Boolean).join(' '),
  };
}

export async function generateJournalSummary(
  input: {
    dateKey: string;
    tasks: JournalTaskSnapshot[];
    feelingNote: string;
    dailyContext?: JournalDailyContext;
    feelingScore?: number | null;
    mood?: MoodKey;
  },
  options?: { onError?: GeminiErrorCallback }
): Promise<JournalSummaryResult> {
  const completed = input.tasks.filter((task) => task.done);
  const unfinished = input.tasks.filter((task) => !task.done);
  const contextText = formatDailyContext(input.dailyContext);
  const prompt = buildWenwenPrompt([
    'Task: Write a daily journal review for the user.',
    'Review rules:',
    '- Mention completed and unfinished tasks neutrally.',
    '- If there are no finished tasks, focus on what was recorded and one realistic next step.',
    '- Mention the user note, feeling rating, mood, or daily context only when useful.',
    '- If daily context suggests a useful pattern, say it carefully without diagnosing.',
    '- Keep the body to one short paragraph with 3-5 sentences.',
    '- Use a clear title, not a sentimental title.',
    'Return only valid JSON with title and body.',
    '',
    `Date: ${input.dateKey}`,
    `Finished tasks: ${completed.map((task) => task.title).join(', ') || 'None yet'}`,
    `Unfinished tasks: ${unfinished.map((task) => task.title).join(', ') || 'None'}`,
    `Mood check-in: ${getMoodLabel(input.mood) ?? 'Not selected'}`,
    `Feeling rating: ${typeof input.feelingScore === 'number' ? `${input.feelingScore}/10` : 'Not selected'}`,
    `Daily context: ${contextText || 'Not recorded'}`,
    `User note: ${input.feelingNote || 'No note written'}`,
    '',
    'JSON Format:',
    '{ "title": "A clear title", "body": "One short paragraph, 3-5 sentences." }',
  ]);

  return requestGeminiWithFallback({
    prompt,
    fallback: createFallbackJournalSummary(input),
    onError: options?.onError,
    generationConfig: {
      temperature: 0.65,
      responseMimeType: 'application/json',
    },
    parse: (rawText) => normalizeSummary(JSON.parse(extractJsonObject(rawText))),
  });
}
