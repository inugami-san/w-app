import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { Pedometer } from 'expo-sensors';

import { usePreferencesStore } from '@/src/store/preferences-store';

export type StepTrackingStatus = 'disabled' | 'idle' | 'checking' | 'ready' | 'unavailable' | 'permission-denied' | 'error';

export type StepDay = {
  key: string;
  label: string;
  shortLabel: string;
  steps: number | null;
  isToday: boolean;
};

type UseStepSummaryResult = {
  totalSteps: number | null;
  todaySteps: number | null;
  days: StepDay[];
  status: StepTrackingStatus;
  label: string;
  errorMessage: string;
  isLoading: boolean;
  enable: () => Promise<void>;
};

const DAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function getDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getStartOfDay(date: Date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start;
}

function getEndOfDay(date: Date) {
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return end;
}

function getCurrentWeekDays(): StepDay[] {
  const today = getStartOfDay(new Date());
  const mondayOffset = today.getDay() === 0 ? -6 : 1 - today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset);

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    const label = DAY_LABELS[date.getDay()];

    return {
      key: getDateKey(date),
      label,
      shortLabel: label.slice(0, 3),
      steps: null,
      isToday: getDateKey(date) === getDateKey(today),
    };
  });
}

function sumKnownSteps(days: StepDay[]) {
  const knownDays = days.filter((day) => typeof day.steps === 'number');
  if (knownDays.length === 0) return null;
  return knownDays.reduce((total, day) => total + (day.steps ?? 0), 0);
}

export function useStepSummary(): UseStepSummaryResult {
  const stepTrackingEnabled = usePreferencesStore((state) => state.stepTrackingEnabled);
  const initialDays = useMemo(() => getCurrentWeekDays(), []);
  const [days, setDays] = useState<StepDay[]>(initialDays);
  const [totalSteps, setTotalSteps] = useState<number | null>(null);
  const [status, setStatus] = useState<StepTrackingStatus>(stepTrackingEnabled ? 'idle' : 'disabled');
  const [label, setLabel] = useState('weekly steps');
  const [errorMessage, setErrorMessage] = useState('');
  const subscriptionRef = useRef<ReturnType<typeof Pedometer.watchStepCount> | null>(null);
  const didAutoLoadRef = useRef(false);
  const todaySteps = days.find((day) => day.isToday)?.steps ?? null;

  const clearSubscription = useCallback(() => {
    subscriptionRef.current?.remove();
    subscriptionRef.current = null;
  }, []);

  const setTodaySteps = useCallback((steps: number) => {
    setDays((currentDays) => {
      const nextDays = currentDays.map((day) => (day.isToday ? { ...day, steps } : day));
      setTotalSteps(sumKnownSteps(nextDays));
      return nextDays;
    });
  }, []);

  const enable = useCallback(async () => {
    if (!stepTrackingEnabled) {
      clearSubscription();
      setStatus('disabled');
      setLabel('steps off');
      setTotalSteps(null);
      setDays(getCurrentWeekDays());
      return;
    }

    clearSubscription();
    setStatus('checking');
    setErrorMessage('');

    if (Platform.OS === 'web') {
      setStatus('unavailable');
      setLabel('steps unavailable');
      setTotalSteps(null);
      return;
    }

    try {
      const isAvailable = await Pedometer.isAvailableAsync();
      if (!isAvailable) {
        setStatus('unavailable');
        setLabel('steps unavailable');
        setTotalSteps(null);
        return;
      }

      const currentPermission = await Pedometer.getPermissionsAsync();
      const permission = currentPermission.granted
        ? currentPermission
        : await Pedometer.requestPermissionsAsync();

      if (!permission.granted) {
        setStatus('permission-denied');
        setLabel('permission needed');
        setTotalSteps(null);
        return;
      }

      const weekDays = getCurrentWeekDays();
      let canReadHistory = true;
      const measuredDays = await Promise.all(
        weekDays.map(async (day) => {
          const date = new Date(`${day.key}T00:00:00`);
          const end = day.isToday ? new Date() : getEndOfDay(date);

          try {
            const result = await Pedometer.getStepCountAsync(getStartOfDay(date), end);
            return { ...day, steps: result.steps };
          } catch {
            canReadHistory = false;
            return day;
          }
        })
      );

      setDays(measuredDays);
      setTotalSteps(sumKnownSteps(measuredDays));
      setLabel(canReadHistory ? 'weekly steps' : 'steps tracked');

      const todayBaseline = measuredDays.find((day) => day.isToday)?.steps ?? 0;
      subscriptionRef.current = Pedometer.watchStepCount((result) => {
        setTodaySteps(todayBaseline + result.steps);
      });
      setStatus('ready');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Step tracking could not start.';
      setStatus('error');
      setLabel('steps unavailable');
      setErrorMessage(message);
      setTotalSteps(null);
    }
  }, [clearSubscription, setTodaySteps, stepTrackingEnabled]);

  useEffect(() => {
    if (stepTrackingEnabled) {
      if (status === 'disabled') {
        setStatus('idle');
        setLabel('weekly steps');
      }
      return;
    }

    clearSubscription();
    didAutoLoadRef.current = false;
    setStatus('disabled');
    setLabel('steps off');
    setErrorMessage('');
    setTotalSteps(null);
    setDays(getCurrentWeekDays());
  }, [clearSubscription, status, stepTrackingEnabled]);

  useEffect(() => {
    if (!stepTrackingEnabled || didAutoLoadRef.current || status !== 'idle') return;
    didAutoLoadRef.current = true;

    if (Platform.OS === 'web') return;

    Pedometer.getPermissionsAsync()
      .then((permission) => {
        if (permission.granted) {
          enable().catch(() => undefined);
        }
      })
      .catch(() => undefined);
  }, [enable, status, stepTrackingEnabled]);

  useEffect(() => clearSubscription, [clearSubscription]);

  return {
    totalSteps,
    todaySteps,
    days,
    status,
    label,
    errorMessage,
    isLoading: status === 'checking',
    enable,
  };
}
