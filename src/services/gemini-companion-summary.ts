import Constants from 'expo-constants';

import type { CompanionMessage } from '@/src/types/companion';
import { buildWenwenPrompt } from '@/src/services/wenwen-persona';

const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

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

export async function generateCompanionSummary(input: {
  dateKey: string;
  messages: CompanionMessage[];
}): Promise<CompanionSummaryResult> {
  const apiKey = Constants.manifest?.extra?.GEMINI_API_KEY ?? process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Missing Gemini API key. Configure GEMINI_API_KEY in app.config.js extra or EXPO_PUBLIC_GEMINI_API_KEY.');
  }

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

  const response = await fetch(GEMINI_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature: 0.65,
        responseMimeType: 'application/json',
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini request failed (${response.status}): ${errorText}`);
  }

  const payload = await response.json();
  const rawText =
    payload?.candidates?.[0]?.content?.parts
      ?.map((part: { text?: string }) => part?.text ?? '')
      .join('') ?? '';

  return normalizeSummary(JSON.parse(extractJsonObject(rawText)));
}
