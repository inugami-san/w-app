import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import {
  MICRO_RESET_OPTIONS,
  buildDailyWrapInsight,
  buildMoodTrendInsight,
  buildSmartNextStepInsight,
} from '@/src/services/user-insights';
import { useCompanionStore } from '@/src/store/companion-store';
import { useJournalStore } from '@/src/store/journal-store';
import { useTaskStore } from '@/src/store/task-store';
import { useAppTheme } from '@/src/theme/app-theme';
import { getLocalDateKey } from '@/src/utils/date';

export function V11HomeInsights() {
  const theme = useAppTheme();
  const today = useMemo(() => getLocalDateKey(), []);
  const tasks = useTaskStore((state) => state.tasks);
  const addTask = useTaskStore((state) => state.addTask);
  const journalEntries = useJournalStore((state) => state.entries);
  const companionEntries = useCompanionStore((state) => state.entries);
  const [selectedResetId, setSelectedResetId] = useState<(typeof MICRO_RESET_OPTIONS)[number]['id']>('breathing');

  const moodTrend = useMemo(() => buildMoodTrendInsight(journalEntries, today), [journalEntries, today]);
  const dailyWrap = useMemo(
    () => buildDailyWrapInsight({ tasks, journalEntry: journalEntries[today], companionEntry: companionEntries[today] }),
    [companionEntries, journalEntries, tasks, today]
  );
  const smartStep = useMemo(
    () => buildSmartNextStepInsight({ tasks, journalEntry: journalEntries[today], companionEntry: companionEntries[today] }),
    [companionEntries, journalEntries, tasks, today]
  );
  const selectedReset = MICRO_RESET_OPTIONS.find((option) => option.id === selectedResetId) ?? MICRO_RESET_OPTIONS[0];
  const canAddSmartStep = smartStep.source !== 'task';

  const handleAddSmartStep = () => {
    if (!canAddSmartStep) return;
    addTask({
      title: smartStep.taskTitle,
      detail: smartStep.taskDetail,
      due: 'Today',
      isRoutine: smartStep.source === 'journal' || smartStep.source === 'companion',
    });
  };

  return (
    <View style={styles.stack}>
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border, shadowColor: theme.shadow }]}> 
        <View style={styles.cardHeaderRow}>
          <View style={styles.cardTitleWrap}>
            <Text style={[styles.kicker, { color: theme.subtle }]}>v1.1</Text>
            <Text style={[styles.cardTitle, { color: theme.textStrong }]}>{dailyWrap.title}</Text>
          </View>
          <View style={[styles.iconWrap, { backgroundColor: theme.primarySoft }]}> 
            <Ionicons name="analytics-outline" size={18} color={theme.primaryStrong} />
          </View>
        </View>
        <Text style={[styles.cardBody, { color: theme.muted }]}>{dailyWrap.detail}</Text>
        <View style={styles.statGrid}>
          {dailyWrap.stats.map((stat) => (
            <View key={stat.label} style={[styles.statPill, { backgroundColor: theme.softSurface }]}> 
              <Text style={[styles.statValue, { color: theme.primaryStrong }]}>{stat.value}</Text>
              <Text style={[styles.statLabel, { color: theme.muted }]}>{stat.label}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.twoColumnGrid}>
        <View style={[styles.compactCard, { backgroundColor: theme.surface, borderColor: theme.border }]}> 
          <View style={styles.compactHeader}>
            <Text style={[styles.compactTitle, { color: theme.textStrong }]}>{moodTrend.title}</Text>
            {moodTrend.average !== null && (
              <Text style={[styles.averageText, { color: theme.primaryStrong }]}>{moodTrend.average}/10</Text>
            )}
          </View>
          <View style={styles.moodBars}>
            {moodTrend.scores.map((item) => {
              const height = item.score ? Math.max(8, item.score * 6) : 8;
              return (
                <View key={item.dateKey} style={[styles.moodBarTrack, { backgroundColor: theme.softSurface }]}> 
                  <View
                    style={[
                      styles.moodBarFill,
                      {
                        height,
                        backgroundColor: item.score ? theme.primary : theme.softBorder,
                      },
                    ]}
                  />
                </View>
              );
            })}
          </View>
          <Text style={[styles.compactBody, { color: theme.muted }]}>{moodTrend.detail}</Text>
        </View>

        <View style={[styles.compactCard, { backgroundColor: theme.surface, borderColor: theme.border }]}> 
          <Text style={[styles.compactTitle, { color: theme.textStrong }]}>{smartStep.title}</Text>
          <Text style={[styles.compactBody, { color: theme.muted }]}>{smartStep.detail}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={canAddSmartStep ? 'Add smart next step as task' : 'Smart next step is already in task list'}
            disabled={!canAddSmartStep}
            onPress={handleAddSmartStep}
            style={({ pressed }) => [
              styles.smartStepButton,
              { backgroundColor: canAddSmartStep ? theme.primary : theme.softSurface },
              pressed && styles.pressed,
              !canAddSmartStep && styles.disabled,
            ]}
          >
            <Ionicons name={canAddSmartStep ? 'add' : 'checkmark'} size={15} color={canAddSmartStep ? '#FFFFFF' : theme.subtle} />
            <Text style={[styles.smartStepButtonText, { color: canAddSmartStep ? '#FFFFFF' : theme.subtle }]}> 
              {canAddSmartStep ? 'Add step' : 'In list'}
            </Text>
          </Pressable>
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border, shadowColor: theme.shadow }]}> 
        <View style={styles.cardHeaderRow}>
          <View style={styles.cardTitleWrap}>
            <Text style={[styles.kicker, { color: theme.subtle }]}>Quick reset</Text>
            <Text style={[styles.cardTitle, { color: theme.textStrong }]}>Pick a short reset</Text>
          </View>
          <View style={[styles.iconWrap, { backgroundColor: theme.primarySoft }]}> 
            <Ionicons name={selectedReset.icon} size={18} color={theme.primaryStrong} />
          </View>
        </View>
        <View style={styles.resetGrid}>
          {MICRO_RESET_OPTIONS.map((option) => {
            const isActive = selectedResetId === option.id;
            return (
              <Pressable
                key={option.id}
                accessibilityRole="button"
                accessibilityLabel={option.title}
                onPress={() => setSelectedResetId(option.id)}
                style={({ pressed }) => [
                  styles.resetButton,
                  {
                    backgroundColor: isActive ? theme.primarySoft : theme.softSurface,
                    borderColor: isActive ? theme.primary : theme.softBorder,
                  },
                  pressed && styles.pressed,
                ]}
              >
                <Ionicons name={option.icon} size={15} color={isActive ? theme.primaryStrong : theme.muted} />
                <Text style={[styles.resetButtonText, { color: isActive ? theme.primaryStrong : theme.muted }]}> 
                  {option.title}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={[styles.cardBody, { color: theme.muted }]}>{selectedReset.detail}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: 12,
    marginBottom: 14,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    shadowOpacity: 0.04,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 1,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'flex-start',
  },
  cardTitleWrap: {
    flex: 1,
  },
  kicker: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '900',
    marginTop: 3,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: {
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
    marginTop: 10,
  },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  statPill: {
    minWidth: 74,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '900',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '800',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  twoColumnGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  compactCard: {
    flex: 1,
    minHeight: 184,
    borderRadius: 20,
    borderWidth: 1,
    padding: 14,
  },
  compactHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  compactTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '900',
  },
  averageText: {
    fontSize: 12,
    fontWeight: '900',
  },
  compactBody: {
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
    marginTop: 10,
  },
  moodBars: {
    height: 68,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 5,
    marginTop: 12,
  },
  moodBarTrack: {
    flex: 1,
    height: 64,
    borderRadius: 999,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  moodBarFill: {
    width: '100%',
    borderRadius: 999,
  },
  smartStepButton: {
    marginTop: 'auto',
    minHeight: 36,
    borderRadius: 18,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 5,
  },
  smartStepButtonText: {
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  resetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  resetButton: {
    minHeight: 36,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  resetButtonText: {
    fontSize: 11,
    fontWeight: '900',
  },
  pressed: {
    opacity: 0.86,
  },
  disabled: {
    opacity: 0.72,
  },
});
