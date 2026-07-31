/**
 * Web-specific TTS using window.speechSynthesis directly.
 * This overrides src/services/wenwen-speech.ts on web via Metro's
 * platform extension resolution (.web.ts takes priority over .ts on web).
 *
 * Uses speechSynthesis API for robotic Wenwen voice with precise control
 * over pitch and rate — bypassing expo-speech's async loading quirks on web.
 */

const WENWEN_PITCH = 1.3;
const WENWEN_RATE = 0.88;
const WENWEN_LANG = 'en-US';

function getEnglishVoice(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find((v) => v.lang === WENWEN_LANG && !v.localService) ??
    voices.find((v) => v.lang === WENWEN_LANG) ??
    voices.find((v) => v.lang.startsWith('en')) ??
    voices[0] ??
    null
  );
}

/**
 * Speaks text as Wenwen. Cancels any current speech first.
 * Safe to call even before voices are loaded — retries after voiceschanged.
 */
export function speakAsWenwen(text: string): Promise<void> {
  if (!text.trim() || typeof window === 'undefined' || !window.speechSynthesis) {
    return Promise.resolve();
  }

  window.speechSynthesis.cancel();

  return new Promise<void>((resolve) => {
    function doSpeak() {
      const utterance = new SpeechSynthesisUtterance(text.trim());
      utterance.pitch = WENWEN_PITCH;
      utterance.rate = WENWEN_RATE;
      utterance.lang = WENWEN_LANG;

      const voice = getEnglishVoice();
      if (voice) utterance.voice = voice;

      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();

      // Chrome bug workaround: speechSynthesis can pause after ~15s on some versions
      const resumeTimer = setInterval(() => {
        if (window.speechSynthesis.paused) window.speechSynthesis.resume();
      }, 5000);

      utterance.onend = () => {
        clearInterval(resumeTimer);
        resolve();
      };
      utterance.onerror = () => {
        clearInterval(resumeTimer);
        resolve();
      };

      window.speechSynthesis.speak(utterance);
    }

    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      doSpeak();
    } else {
      // Voices load asynchronously on first call — wait for them
      window.speechSynthesis.addEventListener('voiceschanged', doSpeak, { once: true });
    }
  });
}

/** Immediately stops Wenwen from speaking. */
export function stopWenwen(): Promise<void> {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
  return Promise.resolve();
}

/** Returns whether Wenwen is currently speaking. */
export function isWenwenSpeaking(): Promise<boolean> {
  if (typeof window === 'undefined' || !window.speechSynthesis) return Promise.resolve(false);
  return Promise.resolve(window.speechSynthesis.speaking);
}
