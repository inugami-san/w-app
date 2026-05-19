import { getMoodLabel } from '@/src/features/journal/moods';
import { type GeminiErrorCallback, requestGeminiWithFallback } from '@/src/services/gemini-client';
import { buildWenwenPrompt } from '@/src/services/wenwen-persona';
import { createFallbackWellnessReview } from '@/src/services/wellness-review';
import type { WellnessReviewSource, WellnessReviewSummary } from '@/src/types/wellness-review';

type WellnessReviewResult = {
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

function normalizeSummary(raw: unknown): WellnessReviewResult {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Invalid wellness review shape.');
  }

  const value = raw as Partial<WellnessReviewResult>;
  const title = `${value.title ?? ''}`.trim() || 'Review';
  const body = `${value.body ?? ''}`.trim();
  if (!body) {
    throw new Error('Generated wellness review is missing.');
  }

  return { title, body };
}

function summarizeSourceForPrompt(source: WellnessReviewSource) {
  const completed = source.tasks.filter((task) => task.done);
  const unfinished = source.tasks.filter((task) => !task.done);
  const journals = source.journals.map((journal) => ({
    date: journal.dateKey,
    mood: getMoodLabel(journal.mood) ?? 'Not selected',
    feelingRating: typeof journal.feelingScore === 'number' ? `${journal.feelingScore}/10` : 'Not selected',
    note: journal.feelingNote || 'No note',
  }));
  const companion = source.companionDays.map((day) => ({
    date: day.dateKey,
    messages: day.messages
      .slice(-8)
      .map((message) => `${message.role === 'user' ? 'User' : 'Wenwen'}: ${message.text}`),
  }));

  return [
    `Period: ${source.period.label}`,
    `Finished tasks: ${completed.map((task) => task.title).join(', ') || 'None'}`,
    `Unfinished tasks: ${unfinished.map((task) => task.title).join(', ') || 'None'}`,
    `Journal entries: ${JSON.stringify(journals)}`,
    `Companion chats: ${JSON.stringify(companion)}`,
  ].join('\n');
}

export async function generateWellnessReview(
  source: WellnessReviewSource,
  options?: { onError?: GeminiErrorCallback }
): Promise<Omit<WellnessReviewSummary, 'id' | 'createdAt'>> {
  const fallback = createFallbackWellnessReview(source);
  const prompt = buildWenwenPrompt([
    'Task: Write one review for the user based on completed tasks, journal notes, and companion chat.',
    'Review rules:',
    '- Mention what was completed and what was recorded without guilt.',
    '- Include journal mood, feeling rating, or note only when useful.',
    '- Mention companion chat themes only at a high level.',
    '- End with one practical, encouraging note for the next period.',
    '- Keep the body to one short paragraph with 3-5 sentences.',
    '- Use a clear title, not a sentimental title.',
    '- Return only valid JSON with title and body.',
    '',
    summarizeSourceForPrompt(source),
    '',
    'JSON Format:',
    '{ "title": "A clear title", "body": "One short paragraph, 3-5 sentences." }',
  ]);

  return requestGeminiWithFallback({
    prompt,
    fallback,
    onError: options?.onError,
    generationConfig: {
      temperature: 0.65,
      responseMimeType: 'application/json',
    },
    parse: (rawText) => {
      const result = normalizeSummary(JSON.parse(extractJsonObject(rawText)));
      return {
        ...fallback,
        title: result.title,
        body: result.body,
      };
    },
  });
}
