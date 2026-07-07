import Constants from 'expo-constants';

export const GEMINI_MODEL = 'gemini-2.5-flash';

const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
const GEMINI_REQUEST_TIMEOUT_MS = 20000;
const MAX_GEMINI_PROMPT_CHARS = 18000;

export type GeminiErrorCallback = (error: Error) => void;

export type GeminiInlineData = {
  mimeType: string;
  data: string;
};

export type GeminiInlineImage = GeminiInlineData;

type GeminiRequestOptions<T> = {
  prompt: string;
  images?: GeminiInlineData[];
  inlineData?: GeminiInlineData[];
  fallback: T;
  parse: (text: string) => T;
  generationConfig?: Record<string, unknown>;
  onError?: GeminiErrorCallback;
  timeoutMs?: number;
};

type ExpoConfigExtra = {
  EXPO_PUBLIC_GEMINI_API_KEY?: string;
  EXPO_PUBLIC_GEMINI_API_KEY_FALLBACK?: string;
};

function toError(error: unknown): Error {
  if (error instanceof Error && error.name === 'AbortError') {
    return new Error('Gemini request timed out. Using the local fallback.');
  }

  return error instanceof Error ? error : new Error('Gemini request failed.');
}

function createHttpError(status: number): Error {
  if (status === 401 || status === 403) {
    return new Error('Gemini request was not authorized. Check the public API key configuration.');
  }

  if (status === 429) {
    return new Error('Gemini rate limit reached. Using the local fallback.');
  }

  if (status >= 500) {
    return new Error('Gemini is temporarily unavailable. Using the local fallback.');
  }

  return new Error(`Gemini request failed with status ${status}. Using the local fallback.`);
}

function limitPromptSize(prompt: string) {
  if (prompt.length <= MAX_GEMINI_PROMPT_CHARS) return prompt;
  return `${prompt.slice(0, MAX_GEMINI_PROMPT_CHARS)}\n\n[Prompt truncated for client safety.]`;
}

function getGeminiApiKeys() {
  const extra =
    (Constants.expoConfig?.extra as ExpoConfigExtra | undefined) ??
    ((Constants.manifest as { extra?: ExpoConfigExtra } | null)?.extra);

  return [
    process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? extra?.EXPO_PUBLIC_GEMINI_API_KEY,
    process.env.EXPO_PUBLIC_GEMINI_API_KEY_FALLBACK ?? extra?.EXPO_PUBLIC_GEMINI_API_KEY_FALLBACK,
  ]
    .map((key) => key?.trim())
    .filter((key, index, keys): key is string => Boolean(key) && keys.indexOf(key) === index);
}

function shouldTryNextGeminiKey(status: number) {
  return status === 429;
}

export async function requestGeminiWithFallback<T>({
  prompt,
  images = [],
  inlineData = [],
  fallback,
  parse,
  generationConfig,
  onError,
  timeoutMs = GEMINI_REQUEST_TIMEOUT_MS,
}: GeminiRequestOptions<T>): Promise<T> {
  const apiKeys = getGeminiApiKeys();

  if (apiKeys.length === 0) {
    onError?.(
      new Error('Missing Gemini API key. Configure EXPO_PUBLIC_GEMINI_API_KEY for local AI features.')
    );
    return fallback;
  }

  const mediaParts = [...images, ...inlineData];
  let lastError: Error | undefined;

  for (const [index, apiKey] of apiKeys.entries()) {
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), timeoutMs);

    try {
      const response = await fetch(GEMINI_ENDPOINT, {
        method: 'POST',
        signal: abortController.signal,
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                { text: limitPromptSize(prompt) },
                ...mediaParts.map((item) => ({
                  inline_data: {
                    mime_type: item.mimeType,
                    data: item.data,
                  },
                })),
              ],
            },
          ],
          generationConfig,
        }),
      });

      if (!response.ok) {
        const error = createHttpError(response.status);
        lastError = error;

        if (shouldTryNextGeminiKey(response.status) && index < apiKeys.length - 1) {
          continue;
        }

        throw error;
      }

      const payload = await response.json();
      const rawText =
        payload?.candidates?.[0]?.content?.parts
          ?.map((part: { text?: string }) => part?.text ?? '')
          .join('') ?? '';

      return parse(rawText);
    } catch (error) {
      lastError = toError(error);
      break;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  onError?.(lastError ?? new Error('Gemini request failed.'));
  return fallback;
}
