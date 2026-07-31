import { useCallback, useEffect, useRef, useState } from 'react';

type WebVoiceInputState = {
  /** Whether the browser supports SpeechRecognition. */
  isSupported: boolean;
  /** Whether the mic is currently listening. */
  isListening: boolean;
  /** Live partial transcript shown while the user speaks. */
  interimTranscript: string;
  /** Start listening. `onFinalResult` is called when speech ends with the final text. */
  startListening: (onFinalResult: (text: string) => void) => void;
  /** Stop listening immediately without triggering a result. */
  stopListening: () => void;
};

type AnyRecognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onresult: ((event: any) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

function getSpeechRecognition(): (new () => AnyRecognition) | null {
  if (typeof window === 'undefined') return null;
  return (
    (window as any).SpeechRecognition ??
    (window as any).webkitSpeechRecognition ??
    null
  );
}

/**
 * Web-only hook that uses the browser's SpeechRecognition API for real-time
 * speech-to-text. Gives instant results without Gemini transcription cost.
 *
 * On unsupported browsers, `isSupported` is false and all functions are no-ops.
 */
export function useWebVoiceInput(): WebVoiceInputState {
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const recognitionRef = useRef<AnyRecognition | null>(null);
  const onFinalResultRef = useRef<((text: string) => void) | null>(null);
  const isMountedRef = useRef(true);

  const SpeechRecognitionCtor = getSpeechRecognition();
  const isSupported = SpeechRecognitionCtor !== null;

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      recognitionRef.current?.abort();
    };
  }, []);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    if (isMountedRef.current) {
      setIsListening(false);
      setInterimTranscript('');
    }
  }, []);

  const startListening = useCallback(
    (onFinalResult: (text: string) => void) => {
      if (!SpeechRecognitionCtor || isListening) return;

      const recognition = new SpeechRecognitionCtor();
      recognition.lang = 'en-US';
      recognition.interimResults = true;
      recognition.continuous = false;
      recognition.maxAlternatives = 1;

      onFinalResultRef.current = onFinalResult;

      recognition.onstart = () => {
        if (isMountedRef.current) setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        let interim = '';
        let final = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript: string = event.results[i][0].transcript ?? '';
          if (event.results[i].isFinal) {
            final += transcript;
          } else {
            interim += transcript;
          }
        }

        if (isMountedRef.current) setInterimTranscript(interim);

        if (final.trim()) {
          if (isMountedRef.current) setInterimTranscript('');
          onFinalResultRef.current?.(final.trim());
        }
      };

      recognition.onerror = () => {
        if (isMountedRef.current) {
          setIsListening(false);
          setInterimTranscript('');
        }
      };

      recognition.onend = () => {
        if (isMountedRef.current) {
          setIsListening(false);
          setInterimTranscript('');
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    },
    [SpeechRecognitionCtor, isListening]
  );

  return {
    isSupported,
    isListening,
    interimTranscript,
    startListening,
    stopListening,
  };
}
