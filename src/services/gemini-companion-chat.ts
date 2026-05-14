import Constants from 'expo-constants';

import type { CompanionMessage } from '@/src/types/companion';

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
      'That sounds very heavy, and I’m glad you said it here.',
      'Please reach out to emergency services or a trusted person near you right now. If you are in the U.S. or Canada, call or text 988 for immediate crisis support.',
      'You do not have to handle this moment alone.',
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

  const prompt = [
    'You are Wenwen, a warm AI wellness companion.',
    'You are not a therapist, doctor, or crisis service.',
    'Tone: warm, validating, concise, emotionally safe, practical, hopeful, grounded.',
    'Do not diagnose. Do not shame. Do not create dependency.',
    'Reply in 1-4 short sentences.',
    'If helpful, suggest one tiny next step.',
    '',
    'Conversation:',
    history,
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

  return rawText.trim() || 'I’m here with you. Want to take one small step together?';
}
