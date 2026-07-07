import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useStepSummary } from '@/src/hooks/use-step-summary';
import {
  REWARD_CURRENCY_NAME,
  STEP_ENERGY_THRESHOLD,
  useRewardStore,
} from '@/src/store/reward-store';
import { useAppTheme } from '@/src/theme/app-theme';

type StepsSummaryCardProps = {
  compact?: boolean;
};

function formatSteps(value: number | null, isLoading: boolean) {
  if (isLoading) return '...';
  if (value === null) return 'Start';
  return value.toLocaleString();
}

export function StepsSummaryCard({ compact = false }: StepsSummaryCardProps) {
  const theme = useAppTheme();
  const stepSummary = useStepSummary();
  const awardStepEnergy = useRewardStore((state) => state.awardStepEnergy);
  const todaySteps = stepSummary.todaySteps;
  const todayDateKey = stepSummary.days.find((day) => day.isToday)?.key ?? '';
  const maxSteps = Math.max(1, ...stepSummary.days.map((day) => day.steps ?? 0));
  const [earnedEnergy, setEarnedEnergy] = useState(0);
  const earnedEnergyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const statusText =
    stepSummary.status === 'disabled'
      ? 'Step tracking is turned off in Settings.'
      : stepSummary.status === 'permission-denied'
      ? 'Motion permission is off for step tracking.'
      : stepSummary.status === 'unavailable'
        ? 'Step tracking is not available on this device.'
        : stepSummary.status === 'error'
          ? stepSummary.errorMessage || 'Step tracking could not start.'
          : '';

  useEffect(() => {
    if (stepSummary.status !== 'ready' || typeof todaySteps !== 'number' || !todayDateKey) return;

    const awarded = awardStepEnergy(todayDateKey, todaySteps);
    if (awarded <= 0) return;

    setEarnedEnergy(awarded);
    if (earnedEnergyTimeoutRef.current) clearTimeout(earnedEnergyTimeoutRef.current);
    earnedEnergyTimeoutRef.current = setTimeout(() => setEarnedEnergy(0), 2200);
  }, [awardStepEnergy, stepSummary.status, todayDateKey, todaySteps]);

  useEffect(() => {
    return () => {
      if (earnedEnergyTimeoutRef.current) clearTimeout(earnedEnergyTimeoutRef.current);
    };
  }, []);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={stepSummary.status === 'disabled' ? 'Step tracking is off' : 'Start step tracking'}
      accessibilityHint={stepSummary.status === 'disabled' ? 'Enable steps in Settings' : 'Request motion permission and show weekly steps'}
      onPress={stepSummary.enable}
      style={({ pressed }) => [
        styles.container,
        compact && styles.compactContainer,
        { backgroundColor: theme.surface, borderColor: theme.border, shadowColor: theme.shadow },
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.headerRow}>
        <View style={styles.titleWrap}>
          <Text style={[styles.label, { color: theme.textStrong }]}>Steps</Text>
          <Text style={[styles.caption, { color: theme.muted }]}>
            {compact ? 'steps today' : stepSummary.label}
          </Text>
        </View>
        <View style={[styles.iconWrap, { backgroundColor: theme.primarySoft }]}>
          <Ionicons
            name={stepSummary.status === 'ready' ? 'walk' : 'walk-outline'}
            size={18}
            color={theme.primaryStrong}
          />
        </View>
      </View>

      <Text style={[styles.totalSteps, compact && styles.compactTotalSteps, { color: theme.primaryStrong }]}>
        {formatSteps(compact ? todaySteps : stepSummary.totalSteps, stepSummary.isLoading)}
      </Text>
      {!compact && (
        <View style={styles.stepMetricsRow}>
          <View style={[styles.stepMetric, { backgroundColor: theme.softSurface, borderColor: theme.softBorder }]}>
            <Text style={[styles.stepMetricLabel, { color: theme.muted }]}>Today</Text>
            <Text style={[styles.stepMetricValue, { color: theme.textStrong }]}>
              {formatSteps(todaySteps, stepSummary.isLoading)}
            </Text>
          </View>
          <View style={[styles.stepMetric, { backgroundColor: theme.primarySoft, borderColor: theme.softBorder }]}>
            <Text style={[styles.stepMetricLabel, { color: theme.muted }]}>This week</Text>
            <Text style={[styles.stepMetricValue, { color: theme.textStrong }]}>
              {formatSteps(stepSummary.totalSteps, stepSummary.isLoading)}
            </Text>
          </View>
        </View>
      )}
      <Text style={[styles.energyRule, { color: theme.muted }]}>
        {earnedEnergy > 0
          ? `+${earnedEnergy} ${REWARD_CURRENCY_NAME} from movement`
          : `${STEP_ENERGY_THRESHOLD.toLocaleString()} steps = 1 ${REWARD_CURRENCY_NAME}`}
      </Text>

      {!compact && (
        <View style={styles.chart}>
          {stepSummary.days.map((day) => (
            <View key={day.key} style={styles.chartItem}>
              <View style={[styles.barTrack, { backgroundColor: theme.softSurface }]}>
                <View
                  style={[
                    styles.barFill,
                    {
                      height: `${Math.max(day.steps === null ? 0 : 8, ((day.steps ?? 0) / maxSteps) * 100)}%`,
                      backgroundColor: day.isToday ? theme.primary : theme.softBorder,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.chartDayLabel, { color: day.isToday ? theme.primaryStrong : theme.muted }]}>
                {day.shortLabel}
              </Text>
              <Text style={[styles.chartValue, { color: theme.muted }]}>
                {day.steps === null ? '-' : day.steps.toLocaleString()}
              </Text>
            </View>
          ))}
        </View>
      )}

      {statusText ? <Text style={[styles.statusText, { color: theme.muted }]}>{statusText}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    shadowOpacity: 0.04,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 1,
  },
  compactContainer: {
    padding: 14,
  },
  pressed: {
    opacity: 0.86,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  titleWrap: {
    flex: 1,
    minWidth: 0,
  },
  label: {
    fontSize: 16,
    fontWeight: '900',
  },
  caption: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 3,
    textTransform: 'uppercase',
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  totalSteps: {
    fontSize: 34,
    fontWeight: '900',
    marginTop: 14,
  },
  compactTotalSteps: {
    fontSize: 30,
  },
  energyRule: {
    fontSize: 12,
    fontWeight: '800',
    marginTop: 4,
    textTransform: 'uppercase',
  },
  stepMetricsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  stepMetric: {
    flex: 1,
    minWidth: 0,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  stepMetricLabel: {
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  stepMetricValue: {
    fontSize: 18,
    fontWeight: '900',
    marginTop: 3,
  },
  chart: {
    minHeight: 142,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginTop: 12,
  },
  chartItem: {
    flex: 1,
    alignItems: 'center',
  },
  barTrack: {
    width: '100%',
    height: 92,
    borderRadius: 999,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    minHeight: 2,
    borderRadius: 999,
  },
  chartDayLabel: {
    fontSize: 11,
    fontWeight: '900',
    marginTop: 7,
  },
  chartValue: {
    fontSize: 10,
    fontWeight: '800',
    marginTop: 3,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
    marginTop: 10,
  },
});
