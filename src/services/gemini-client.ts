import Constants from 'expo-constants';

export const GEMINI_MODEL = 'gemini-2.5-flash';

const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

export type GeminiErrorCallback = (error: Error) => void;

export type GeminiInlineImage = {
  mimeType: string;
  data: string;
};

type GeminiRequestOptions<T> = {
  prompt: string;
  images?: GeminiInlineImage[];
  fallback: T;
  parse: (text: string) => T;
  generationConfig?: Record<string, unknown>;
  onError?: GeminiErrorCallback;
};

type ExpoConfigExtra = {
  GEMINI_API_KEY?: string;
};

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error('Gemini request failed.');
}

function getGeminiApiKey() {
  const extra =
    (Constants.expoConfig?.extra as ExpoConfigExtra | undefined) ??
    ((Constants.manifest as { extra?: ExpoConfigExtra } | null)?.extra);

  return extra?.GEMINI_API_KEY ?? process.env.EXPO_PUBLIC_GEMINI_API_KEY;
}

export async function requestGeminiWithFallback<T>({
  prompt,
  images = [],
  fallback,
  parse,
  generationConfig,
  onError,
}: GeminiRequestOptions<T>): Promise<T> {
  const apiKey = getGeminiApiKey();

  if (!apiKey) {
    onError?.(
      new Error('Missing Gemini API key. Configure GEMINI_API_KEY in app config or EXPO_PUBLIC_GEMINI_API_KEY.')
    );
    return fallback;
  }

  try {
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
            parts: [
              { text: prompt },
              ...images.map((image) => ({
                inline_data: {
                  mime_type: image.mimeType,
                  data: image.data,
                },
              })),
            ],
          },
        ],
        generationConfig,
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

    return parse(rawText);
  } catch (error) {
    onError?.(toError(error));
    return fallback;
  }
}
