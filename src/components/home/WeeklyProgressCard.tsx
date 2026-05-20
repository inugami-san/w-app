import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useCompanionStore } from '@/src/store/companion-store';
import { useJournalStore } from '@/src/store/journal-store';
import { useTaskStore } from '@/src/store/task-store';
import { useAppTheme } from '@/src/theme/app-theme';
import { getLocalDateKey } from '@/src/utils/date';

function getRecentDateKeys(days: number) {
  return Array.from({ length: days }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - index);
    return getLocalDateKey(date);
  });
}

export function WeeklyProgressCard() {
  const theme = useAppTheme();
  const journalEntries = useJournalStore((state) => state.entries);
  const companionEntries = useCompanionStore((state) => state.entries);
  const tasks = useTaskStore((state) => state.tasks);

  const stats = useMemo(() => {
    const today = getLocalDateKey();
    const dateKeys = getRecentDateKeys(7);
    let completedTasks = 0;
    let journalDays = 0;
    let companionDays = 0;
    let activeDays = 0;

    dateKeys.forEach((dateKey) => {
      const journalEntry = journalEntries[dateKey];
      const companionEntry = companionEntries[dateKey];
      const taskSnapshot = dateKey === today ? tasks : journalEntry?.tasks ?? [];
      const dayCompletedTasks = taskSnapshot.filter((task) => task.done).length;
      const hasJournal = Boolean(journalEntry?.feelingNote.trim() || journalEntry?.summaries.length);
      const hasCompanion = companionEntry?.messages.some((message) => message.role === 'user') ?? false;

      completedTasks += dayCompletedTasks;
      journalDays += hasJournal ? 1 : 0;
      companionDays += hasCompanion ? 1 : 0;
      activeDays += dayCompletedTasks > 0 || hasJournal || hasCompanion ? 1 : 0;
    });

    return {
      activeDays,
      completedTasks,
      journalDays,
      companionDays,
      insight:
        activeDays === 0
          ? 'No pattern yet. One action today starts the record.'
          : completedTasks >= 5
            ? 'Tasks are your strongest signal this week.'
            : journalDays + companionDays > completedTasks
              ? 'Reflection is showing up more than task completion.'
              : 'You have activity logged. Keep the next step small.',
    };
  }, [companionEntries, journalEntries, tasks]);

  return (
    <View style={[styles.container, { backgroundColor: theme.surface, borderColor: theme.border, shadowColor: theme.shadow }]}>
      <View style={styles.headerRow}>
        <View>
          <Text style={[styles.label, { color: theme.textStrong }]}>7-day rhythm</Text>
          <Text style={[styles.caption, { color: theme.muted }]}>Small activity signals</Text>
        </View>
        <View style={[styles.iconWrap, { backgroundColor: '#FFF4D8' }]}>
          <Ionicons name="pulse-outline" size={18} color="#B7791F" />
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: theme.primaryStrong }]}>{stats.activeDays}</Text>
          <Text style={[styles.statLabel, { color: theme.muted }]}>active days</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: theme.primaryStrong }]}>{stats.completedTasks}</Text>
          <Text style={[styles.statLabel, { color: theme.muted }]}>tasks done</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: theme.primaryStrong }]}>{stats.journalDays + stats.companionDays}</Text>
          <Text style={[styles.statLabel, { color: theme.muted }]}>reviews</Text>
        </View>
      </View>

      <View style={[styles.insightRow, { backgroundColor: theme.softSurface }]}>
        <Ionicons name="bulb-outline" size={16} color={theme.primaryStrong} />
        <Text style={[styles.insightText, { color: theme.muted }]}>{stats.insight}</Text>
      </View>
    </View>
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  label: {
    fontSize: 16,
    fontWeight: '900',
  },
  caption: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 3,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  statItem: {
    flex: 1,
    minHeight: 58,
    borderRadius: 16,
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '900',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  insightRow: {
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  insightText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
  },
});
