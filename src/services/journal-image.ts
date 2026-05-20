import * as FileSystem from 'expo-file-system/legacy';

import type { GeminiInlineImage } from '@/src/services/gemini-client';
import type { JournalImageAttachment } from '@/src/types/journal';

const MAX_IMAGE_BASE64_CHARS = 5_500_000;
const SUPPORTED_IMAGE_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif']);

function normalizeMimeType(value = '') {
  const mimeType = value.toLowerCase().trim();
  return SUPPORTED_IMAGE_TYPES.has(mimeType) ? mimeType : 'image/jpeg';
}

function createGeminiImage(mimeType: string, data: string): GeminiInlineImage | undefined {
  const cleanData = data.replace(/\s/g, '');
  if (!cleanData || cleanData.length > MAX_IMAGE_BASE64_CHARS) return undefined;

  return {
    mimeType: normalizeMimeType(mimeType),
    data: cleanData,
  };
}

function readBlobAsBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Unable to read image data.'));
    reader.onloadend = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      if (!base64) {
        reject(new Error('Image data was empty.'));
        return;
      }
      resolve(base64);
    };
    reader.readAsDataURL(blob);
  });
}

function readDataUri(uri: string): string {
  if (!uri.startsWith('data:')) return '';
  return uri.includes(',') ? uri.split(',')[1] ?? '' : '';
}

export async function getJournalImageForGemini(
  image: JournalImageAttachment | null | undefined,
  selectedBase64 = ''
): Promise<GeminiInlineImage | undefined> {
  if (!image) return undefined;

  const directBase64 = selectedBase64 || readDataUri(image.uri);
  if (directBase64) {
    return createGeminiImage(image.mimeType, directBase64);
  }

  try {
    if (image.uri.startsWith('blob:')) {
      const response = await fetch(image.uri);
      const blob = await response.blob();
      const data = await readBlobAsBase64(blob);
      return createGeminiImage(image.mimeType || blob.type || 'image/jpeg', data);
    }

    const data = await FileSystem.readAsStringAsync(image.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return createGeminiImage(image.mimeType, data);
  } catch {
    return undefined;
  }
}
