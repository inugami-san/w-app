import { Platform } from 'react-native';

const CANVASKIT_BASE_URL = 'https://cdn.jsdelivr.net/npm/canvaskit-wasm@0.40.0/bin/full';

type LoadSkiaWebModule = {
  LoadSkiaWeb: (options: { locateFile: (file: string) => string }) => Promise<void> | void;
};

export async function loadSkiaWebIfNeeded() {
  if (Platform.OS !== 'web') return;

  const { LoadSkiaWeb } = (await import(
    '@shopify/react-native-skia/lib/commonjs/web/LoadSkiaWeb'
  )) as LoadSkiaWebModule;

  await LoadSkiaWeb({
    locateFile: (file: string) => `${CANVASKIT_BASE_URL}/${file}`,
  });
}
