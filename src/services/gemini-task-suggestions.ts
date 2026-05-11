import Constants from 'expo-constants';
import type { SuggestedTask, WellnessCategory } from '@/src/types/ai-task';

const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const BASE_PROMPT = [
  'Generate 1 simple, realistic, low-pressure task based on the selected wellness category:',
  'Feel calmer, Build routines, Stay motivated, Improve focus, Better sleep, Boost mood, Get healthier, Feel supported.',
  '',
  'Task must be:',
  'Easy to complete in 5–15 minutes',
  'Positive and encouraging',
  'Practical for everyday life',
  'Suitable for beginners',
  'No extreme advice',
  'Return only valid JSON',
  '',
  'JSON Format:',
  '{',
  '  "title": "Drink Water",',
  '  "optional_detail": "Drink one glass of water to refresh your body.",',
  '  "datetime_added": ""',
  '}',
].join('\n');

function extractJsonObject(text: string): string {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end < 0 || end <= start) {
    throw new Error('AI did not return JSON output.');
  }
  return text.slice(start, end + 1);
}

function normalizeSuggestion(raw: unknown): SuggestedTask {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Invalid AI response shape.');
  }

  const value = raw as Partial<SuggestedTask>;
  const title = `${value.title ?? ''}`.trim();
  if (!title) {
    throw new Error('Generated task title is missing.');
  }

  const optionalDetail = `${value.optional_detail ?? ''}`.trim() || 'A gentle 5–15 minute task.';
  const datetimeAdded = `${value.datetime_added ?? ''}`.trim() || new Date().toISOString();

  return {
    title,
    optional_detail: optionalDetail,
    datetime_added: datetimeAdded,
  };
}

export async function generateGeminiTaskSuggestion(category: WellnessCategory): Promise<SuggestedTask> {
  const apiKey = Constants.manifest?.extra?.GEMINI_API_KEY ?? process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Missing Gemini API key. Configure GEMINI_API_KEY in app.config.js extra or EXPO_PUBLIC_GEMINI_API_KEY.');
  }

  const prompt = `${BASE_PROMPT}\n\nSelected wellness category: ${category}`;
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
        temperature: 0.7,
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

  const jsonText = extractJsonObject(rawText);
  const parsed = JSON.parse(jsonText);
  return normalizeSuggestion(parsed);
}
