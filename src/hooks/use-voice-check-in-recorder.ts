import { useCallback, useEffect, useRef, useState } from 'react';
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
} from 'expo-audio';

type VoiceRecorderState = {
  durationMillis: number;
  isRecording: boolean;
  metering?: number;
};

export function useVoiceCheckInRecorder() {
  const latestUriRef = useRef<string | null>(null);
  const recordingStartedAtRef = useRef<number | null>(null);
  const isMountedRef = useRef(true);
  const [recorderState, setRecorderState] = useState<VoiceRecorderState>({
    durationMillis: 0,
    isRecording: false,
    metering: undefined,
  });
  const recorder = useAudioRecorder({
    ...RecordingPresets.LOW_QUALITY,
    isMeteringEnabled: true,
  }, (status) => {
    if (!isMountedRef.current) return;
    if (status.url) latestUriRef.current = status.url;
    if (status.isFinished || status.hasError) {
      recordingStartedAtRef.current = null;
      setRecorderState((current) => ({ ...current, isRecording: false }));
    }
  });
  const [isPreparing, setIsPreparing] = useState(false);

  const startRecording = useCallback(async () => {
    if (isPreparing || recorderState.isRecording) return;

    setIsPreparing(true);
    try {
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        throw new Error('Microphone permission was not granted.');
      }

      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
        interruptionMode: 'duckOthers',
        shouldPlayInBackground: false,
        shouldRouteThroughEarpiece: false,
      });
      await recorder.prepareToRecordAsync();
      recorder.record();
      latestUriRef.current = null;
      recordingStartedAtRef.current = Date.now();
      setRecorderState({
        durationMillis: 0,
        isRecording: true,
        metering: undefined,
      });
    } finally {
      if (isMountedRef.current) setIsPreparing(false);
    }
  }, [isPreparing, recorder, recorderState.isRecording]);

  const stopRecording = useCallback(async () => {
    if (!recorderState.isRecording && !recorder.isRecording) {
      return latestUriRef.current ?? recorder.uri;
    }

    try {
      await recorder.stop();
    } finally {
      await setAudioModeAsync({ allowsRecording: false });
      recordingStartedAtRef.current = null;
      if (isMountedRef.current) {
        setRecorderState((current) => ({ ...current, isRecording: false }));
      }
    }

    const uri = recorder.uri ?? latestUriRef.current;
    if (!uri) {
      throw new Error('No voice recording was saved.');
    }

    return uri;
  }, [recorder, recorderState.isRecording]);

  const cancelRecording = useCallback(async () => {
    try {
      if (recorderState.isRecording || recorder.isRecording) {
        await recorder.stop();
      }
    } finally {
      await setAudioModeAsync({ allowsRecording: false });
      latestUriRef.current = null;
      recordingStartedAtRef.current = null;
      if (isMountedRef.current) {
        setRecorderState({
          durationMillis: 0,
          isRecording: false,
          metering: undefined,
        });
      }
    }
  }, [recorder, recorderState.isRecording]);

  useEffect(() => {
    if (!recorderState.isRecording) return;

    const interval = setInterval(() => {
      const startedAt = recordingStartedAtRef.current;
      if (!startedAt) return;
      setRecorderState((current) => ({
        ...current,
        durationMillis: Date.now() - startedAt,
      }));
    }, 250);

    return () => clearInterval(interval);
  }, [recorderState.isRecording]);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      setAudioModeAsync({ allowsRecording: false }).catch(() => undefined);
    };
  }, []);

  return {
    durationMillis: recorderState.durationMillis,
    isPreparing,
    isRecording: recorderState.isRecording,
    metering: recorderState.metering,
    cancelRecording,
    startRecording,
    stopRecording,
  };
}
