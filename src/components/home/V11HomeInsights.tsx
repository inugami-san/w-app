import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import {
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

  const moodTrend = useMemo(() => buildMoodTrendInsight(journalEntries, today), [journalEntries, today]);
  const smartStep = useMemo(
    () => buildSmartNextStepInsight({ tasks, journalEntry: journalEntries[today], companionEntry: companionEntries[today] }),
    [companionEntries, journalEntries, tasks, today]
  );
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
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: 12,
    marginBottom: 14,
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
  pressed: {
    opacity: 0.86,
  },
  disabled: {
    opacity: 0.72,
  },
});
