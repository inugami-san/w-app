import Constants from 'expo-constants';

import type { CompanionMessage } from '@/src/types/companion';
import { buildWenwenPrompt } from '@/src/services/wenwen-persona';

const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const CRISIS_PATTERN = /\b(kill myself|suicide|self harm|self-harm|hurt myself|end my life|want to die)\b/i;

function isCrisisMessage(text: string) {
  return CRISIS_PATTERN.test(text);
}

export async function generateCompanionReply(messages: CompanionMessage[]): Promise<string> {
  const latestUserMessage = [...messages].reverse().find((message) => message.role === 'user')?.text ?? '';

  if (isCrisisMessage(latestUserMessage)) {
    return [
      'That sounds urgent, and I am glad you said it here.',
      'Please contact emergency services or a trusted person near you right now.',
      'If you are in the U.S. or Canada, call or text 988 for immediate crisis support.',
    ].join(' ');
  }

  const apiKey = Constants.manifest?.extra?.GEMINI_API_KEY ?? process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Missing Gemini API key. Configure GEMINI_API_KEY in app.config.js extra or EXPO_PUBLIC_GEMINI_API_KEY.');
  }

  const history = messages
    .slice(-8)
    .map((message) => `${message.role === 'user' ? 'User' : 'Wenwen'}: ${message.text}`)
    .join('\n');

  const prompt = buildWenwenPrompt([
    'Task: Reply to the latest user message using the recent conversation.',
    'Response rules:',
    '- Reply in 1-4 short sentences.',
    '- If emotion is present, acknowledge it once without overexplaining it.',
    '- If useful, suggest one concrete next action the user can do today.',
    '- Do not end every reply with a question.',
    '',
    'Recent conversation:',
    history,
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

  return rawText.trim() || 'I’m here. What would you like to work through?';
}
