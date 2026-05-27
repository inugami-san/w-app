import { useCallback, useEffect, useState } from 'react';
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';

export function useVoiceCheckInRecorder() {
  const recorder = useAudioRecorder({
    ...RecordingPresets.LOW_QUALITY,
    isMeteringEnabled: true,
  });
  const recorderState = useAudioRecorderState(recorder, 250);
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
    } finally {
      setIsPreparing(false);
    }
  }, [isPreparing, recorder, recorderState.isRecording]);

  const stopRecording = useCallback(async () => {
    if (!recorderState.isRecording && !recorder.isRecording) {
      return recorder.uri ?? recorder.getStatus().url;
    }

    try {
      await recorder.stop();
    } finally {
      await setAudioModeAsync({ allowsRecording: false });
    }

    const uri = recorder.uri ?? recorder.getStatus().url;
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
    }
  }, [recorder, recorderState.isRecording]);

  useEffect(() => {
    return () => {
      if (recorder.isRecording) {
        recorder.stop().catch(() => undefined);
      }
      setAudioModeAsync({ allowsRecording: false }).catch(() => undefined);
    };
  }, [recorder]);

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
