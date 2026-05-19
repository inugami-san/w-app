import * as FileSystem from 'expo-file-system/legacy';

import type { GeminiInlineImage } from '@/src/services/gemini-client';
import type { JournalImageAttachment } from '@/src/types/journal';

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
    return { mimeType: image.mimeType, data: directBase64 };
  }

  try {
    if (image.uri.startsWith('blob:')) {
      const response = await fetch(image.uri);
      const blob = await response.blob();
      const data = await readBlobAsBase64(blob);
      return { mimeType: image.mimeType || blob.type || 'image/jpeg', data };
    }

    const data = await FileSystem.readAsStringAsync(image.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return { mimeType: image.mimeType, data };
  } catch {
    return undefined;
  }
}
