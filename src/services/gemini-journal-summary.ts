import Constants from 'expo-constants';

import { getMoodLabel } from '@/src/features/journal/moods';
import type { JournalTaskSnapshot, MoodKey } from '@/src/types/journal';

const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

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

export async function generateJournalSummary(input: {
  dateKey: string;
  tasks: JournalTaskSnapshot[];
  feelingNote: string;
  mood?: MoodKey;
}): Promise<JournalSummaryResult> {
  const apiKey = Constants.manifest?.extra?.GEMINI_API_KEY ?? process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Missing Gemini API key. Configure GEMINI_API_KEY in app.config.js extra or EXPO_PUBLIC_GEMINI_API_KEY.');
  }

  const completed = input.tasks.filter((task) => task.done);
  const unfinished = input.tasks.filter((task) => !task.done);
  const prompt = [
    'Write a short, warm Wenwen journal note for the user.',
    'This is wellness support, not therapy.',
    'Tone: gentle, encouraging, concise, emotionally safe.',
    'Mention effort without guilt. Do not shame unfinished tasks.',
    'Return only valid JSON with title and body.',
    '',
    `Date: ${input.dateKey}`,
    `Finished tasks: ${completed.map((task) => task.title).join(', ') || 'None yet'}`,
    `Unfinished tasks: ${unfinished.map((task) => task.title).join(', ') || 'None'}`,
    `Mood check-in: ${getMoodLabel(input.mood) ?? 'Not selected'}`,
    `User feeling note: ${input.feelingNote || 'No note written'}`,
    '',
    'JSON Format:',
    '{ "title": "A gentle title", "body": "One short paragraph, 3-5 sentences." }',
  ].join('\n');

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
