import type { CompanionMessage } from '@/src/types/companion';
import { type GeminiErrorCallback, requestGeminiWithFallback } from '@/src/services/gemini-client';
import { buildWenwenPrompt } from '@/src/services/wenwen-persona';

type CompanionSummaryResult = {
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

function normalizeSummary(raw: unknown): CompanionSummaryResult {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Invalid AI summary shape.');
  }

  const value = raw as Partial<CompanionSummaryResult>;
  const title = `${value.title ?? ''}`.trim() || 'Conversation summary';
  const body = `${value.body ?? ''}`.trim();
  if (!body) {
    throw new Error('Generated companion summary is missing.');
  }

  return { title, body };
}

function trimText(value: string, maxLength = 120) {
  const clean = value.trim().replace(/\s+/g, ' ');
  if (clean.length <= maxLength) return clean;
  return `${clean.slice(0, maxLength - 3).trim()}...`;
}

function createFallbackCompanionSummary(input: {
  dateKey: string;
  messages: CompanionMessage[];
}): CompanionSummaryResult {
  const userMessages = input.messages.filter((message) => message.role === 'user');
  const lastUserMessage = userMessages[userMessages.length - 1]?.text ?? '';

  if (userMessages.length === 0) {
    return {
      title: 'Companion check-in',
      body: 'This chat was opened, but there was not much to summarize yet. You can return anytime and use this space to sort one thought or choose one small next step.',
    };
  }

  return {
    title: 'Conversation saved',
    body: [
      `You used Wenwen to sort through ${userMessages.length} message${userMessages.length === 1 ? '' : 's'}.`,
      lastUserMessage ? `The latest note was: "${trimText(lastUserMessage)}".` : '',
      'For the next step, keep it practical and choose one thing that can be handled in a few minutes.',
    ]
      .filter(Boolean)
      .join(' '),
  };
}

export async function generateCompanionSummary(
  input: {
    dateKey: string;
    messages: CompanionMessage[];
  },
  options?: { onError?: GeminiErrorCallback }
): Promise<CompanionSummaryResult> {
  const conversation = input.messages
    .map((message) => `${message.role === 'user' ? 'User' : 'Wenwen'}: ${message.text}`)
    .join('\n');

  const prompt = buildWenwenPrompt([
    'Task: Write a daily companion review for the user based on this Wenwen chat.',
    'Review rules:',
    '- Mention what the user talked through without diagnosing, overpraising, or overpromising.',
    '- Note one practical takeaway when the conversation supports it.',
    '- Keep the body to one short paragraph with 3-5 sentences.',
    '- Use a clear title, not a sentimental title.',
    'Return only valid JSON with title and body.',
    '',
    `Date: ${input.dateKey}`,
    'Conversation:',
    conversation,
    '',
    'JSON Format:',
    '{ "title": "A clear title", "body": "One short paragraph, 3-5 sentences." }',
  ]);

  return requestGeminiWithFallback({
    prompt,
    fallback: createFallbackCompanionSummary(input),
    onError: options?.onError,
    generationConfig: {
      temperature: 0.65,
      responseMimeType: 'application/json',
    },
    parse: (rawText) => normalizeSummary(JSON.parse(extractJsonObject(rawText))),
  });
}
