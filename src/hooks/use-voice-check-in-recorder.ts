import { useCallback, useState } from 'react';
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

    await recorder.stop();
    await setAudioModeAsync({ allowsRecording: false });

    const uri = recorder.uri ?? recorder.getStatus().url;
    if (!uri) {
      throw new Error('No voice recording was saved.');
    }

    return uri;
  }, [recorder, recorderState.isRecording]);

  return {
    durationMillis: recorderState.durationMillis,
    isPreparing,
    isRecording: recorderState.isRecording,
    metering: recorderState.metering,
    startRecording,
    stopRecording,
  };
}
