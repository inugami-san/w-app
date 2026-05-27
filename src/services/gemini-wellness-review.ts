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
    `Completed task signals: ${completed.map((task) => task.title).join(', ') || 'None'}`,
    `Journal entries: ${JSON.stringify(journals)}`,
    `Companion chats: ${JSON.stringify(companion)}`,
    `Steps in period: ${typeof source.movement.stepCount === 'number' ? source.movement.stepCount : 'Unknown'}`,
    `Saved places in period: ${source.movement.locationCount}`,
    `Place labels: ${source.movement.locationLabels.join(', ') || 'None'}`,
  ].join('\n');
}

export async function generateWellnessReview(
  source: WellnessReviewSource,
  options?: { onError?: GeminiErrorCallback }
): Promise<Omit<WellnessReviewSummary, 'id' | 'createdAt'>> {
  const fallback = createFallbackWellnessReview(source);
  const prompt = buildWenwenPrompt([
    'Task: Write one simple encouraging review for the user based on their recent signals.',
    'Review rules:',
    '- Do not write a report or recap list.',
    '- Do not start with "On [date]" or enumerate everything the user did.',
    '- Lead with warm encouragement about the effort they showed.',
    '- Weave in steps or places gently when present, without sounding like surveillance.',
    '- Mention journal or companion reflection only as self-care, not as a data summary.',
    '- End with one simple, kind next-step sentence.',
    '- Keep the body to one short paragraph with 2-3 sentences.',
    '- Use a short clear title.',
    '- Return only valid JSON with title and body.',
    '',
    summarizeSourceForPrompt(source),
    '',
    'JSON Format:',
    '{ "title": "A short title", "body": "One short encouraging paragraph, 2-3 sentences." }',
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
