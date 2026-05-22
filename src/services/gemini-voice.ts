import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';

import { type GeminiErrorCallback, requestGeminiWithFallback } from '@/src/services/gemini-client';
import { buildWenwenPrompt } from '@/src/services/wenwen-persona';
import { clampText, INPUT_LIMITS } from '@/src/utils/input-limits';

export type VoiceCheckInMode = 'journal' | 'companion';

type VoiceCheckInInput = {
  uri: string;
  mode: VoiceCheckInMode;
};

function extractJsonObject(text: string): string {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end < 0 || end <= start) {
    throw new Error('AI did not return JSON output.');
  }
  return text.slice(start, end + 1);
}

function normalizeVoiceText(raw: unknown, mode: VoiceCheckInMode) {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Invalid voice transcription shape.');
  }

  const value = raw as { text?: unknown };
  const limit = mode === 'journal' ? INPUT_LIMITS.journalNote : INPUT_LIMITS.companionMessage;
  return clampText(`${value.text ?? ''}`.trim(), limit).trim();
}

function getMimeType(uri: string) {
  const cleanUri = uri.split('?')[0]?.toLowerCase() ?? uri.toLowerCase();

  if (cleanUri.endsWith('.3gp')) return 'audio/3gpp';
  if (cleanUri.endsWith('.aac')) return 'audio/aac';
  if (cleanUri.endsWith('.caf')) return 'audio/x-caf';
  if (cleanUri.endsWith('.wav')) return 'audio/wav';
  if (cleanUri.endsWith('.webm')) return 'audio/webm';
  if (cleanUri.endsWith('.mp3')) return 'audio/mpeg';
  return 'audio/mp4';
}

function blobToBase64(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Unable to read the voice recording.'));
    reader.onloadend = () => {
      const result = `${reader.result ?? ''}`;
      resolve(result.includes(',') ? result.split(',').pop() ?? '' : result);
    };
    reader.readAsDataURL(blob);
  });
}

async function readVoiceRecording(uri: string) {
  if (Platform.OS === 'web') {
    const response = await fetch(uri);
    if (!response.ok) throw new Error('Unable to load the voice recording.');
    return blobToBase64(await response.blob());
  }

  return FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
}

function buildVoicePrompt(mode: VoiceCheckInMode) {
  const target =
    mode === 'journal'
      ? 'Transcribe the audio into a concise first-person journal note.'
      : 'Transcribe the audio into one concise user chat message.';

  return buildWenwenPrompt([
    'Task: Convert the attached voice recording into clean text.',
    target,
    'Rules:',
    '- Preserve the user meaning.',
    '- Do not add advice, analysis, or new facts.',
    '- Remove filler words only when they make the text hard to read.',
    '- If the audio is empty or unclear, return an empty text value.',
    '- Return only valid JSON.',
    '',
    'JSON Format:',
    '{ "text": "transcribed user words" }',
  ]);
}

export async function transcribeVoiceCheckIn(
  input: VoiceCheckInInput,
  options?: { onError?: GeminiErrorCallback }
) {
  const data = await readVoiceRecording(input.uri);

  if (!data) {
    throw new Error('Voice recording was empty.');
  }

  return requestGeminiWithFallback({
    prompt: buildVoicePrompt(input.mode),
    inlineData: [
      {
        mimeType: getMimeType(input.uri),
        data,
      },
    ],
    fallback: '',
    onError: options?.onError,
    timeoutMs: 30000,
    generationConfig: {
      temperature: 0.2,
      responseMimeType: 'application/json',
    },
    parse: (rawText) => normalizeVoiceText(JSON.parse(extractJsonObject(rawText)), input.mode),
  });
}
