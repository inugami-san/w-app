import { useCallback, useEffect, useRef, useState } from 'react';

import { speakAsWenwen, stopWenwen } from '@/src/services/wenwen-speech';

type UseWenwenSpeechResult = {
  /** Whether voice replies are enabled by the user. */
  voiceEnabled: boolean;
  /** Whether Wenwen is currently speaking. */
  isSpeaking: boolean;
  /** Toggle voice replies on or off. Stops any active speech when turned off. */
  toggleVoice: () => void;
  /** Speak text as Wenwen if voice is enabled. No-op if disabled. */
  speak: (text: string) => void;
  /** Stop Wenwen from speaking immediately. */
  stop: () => void;
};

/**
 * Manages Wenwen's TTS voice replies in the companion screen.
 *
 * Provides a reactive `isSpeaking` flag, an on/off toggle, and a
 * `speak(text)` function that only fires when voice replies are enabled.
 */
export function useWenwenSpeech(): UseWenwenSpeechResult {
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      stopWenwen().catch(() => undefined);
    };
  }, []);

  const stop = useCallback(() => {
    stopWenwen()
      .catch(() => undefined)
      .finally(() => {
        if (isMountedRef.current) setIsSpeaking(false);
      });
  }, []);

  const toggleVoice = useCallback(() => {
    setVoiceEnabled((current) => {
      if (current) {
        // Turning off — stop any current speech
        stopWenwen().catch(() => undefined);
        if (isMountedRef.current) setIsSpeaking(false);
      }
      return !current;
    });
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (!voiceEnabled || !text.trim()) return;

      setIsSpeaking(true);
      speakAsWenwen(text)
        .catch(() => undefined)
        .finally(() => {
          if (isMountedRef.current) setIsSpeaking(false);
        });
    },
    [voiceEnabled]
  );

  return {
    voiceEnabled,
    isSpeaking,
    toggleVoice,
    speak,
    stop,
  };
}
