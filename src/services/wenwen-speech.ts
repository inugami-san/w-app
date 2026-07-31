import * as Speech from 'expo-speech';

// Wenwen's robotic voice settings — slightly high pitch, slightly deliberate pace
const WENWEN_VOICE_OPTIONS: Speech.SpeechOptions = {
  language: 'en-US',
  pitch: 1.3,
  rate: 0.88,
};

/**
 * Speaks the given text as Wenwen.
 * Stops any currently playing speech before starting a new one.
 */
export async function speakAsWenwen(text: string): Promise<void> {
  if (!text.trim()) return;

  const isSpeaking = await Speech.isSpeakingAsync();
  if (isSpeaking) {
    await Speech.stop();
  }

  return new Promise((resolve) => {
    Speech.speak(text.trim(), {
      ...WENWEN_VOICE_OPTIONS,
      onDone: resolve,
      onError: () => resolve(),
      onStopped: () => resolve(),
    });
  });
}

/**
 * Stops Wenwen from speaking immediately.
 */
export async function stopWenwen(): Promise<void> {
  const isSpeaking = await Speech.isSpeakingAsync();
  if (isSpeaking) {
    await Speech.stop();
  }
}

/**
 * Returns true if Wenwen is currently speaking.
 */
export function isWenwenSpeaking(): Promise<boolean> {
  return Speech.isSpeakingAsync();
}
