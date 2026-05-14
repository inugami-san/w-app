import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { BottomTabPlaceholder, type DashboardTabKey } from '@/src/components/home/BottomTabPlaceholder';
import { getMoodLabel } from '@/src/features/journal/moods';
import { useJournalStore } from '@/src/store/journal-store';
import { useTaskStore } from '@/src/store/task-store';
import { useAppTheme } from '@/src/theme/app-theme';
import { getLocalDateKey } from '@/src/utils/date';

function formatDateLabel(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function JournalScreen() {
  const today = useMemo(() => getLocalDateKey(), []);
  const entries = useJournalStore((state) => state.entries);
  const setTaskSnapshot = useJournalStore((state) => state.setTaskSnapshot);
  const tasks = useTaskStore((state) => state.tasks);
  const theme = useAppTheme();

  const dateKeys = useMemo(() => {
    const keys = new Set(Object.keys(entries));
    keys.add(today);
    return Array.from(keys).sort((a, b) => b.localeCompare(a));
  }, [entries, today]);

  const handleTabPress = (tab: DashboardTabKey) => {
    if (tab === 'journal') return;
    if (tab === 'home') {
      router.push('/dashboard');
      return;
    }
    if (tab === 'customize') {
      router.push('/main');
      return;
    }
    if (tab === 'settings') {
      router.push('/settings');
      return;
    }
    if (tab === 'companion') {
      router.push('/companion');
      return;
    }
    router.push('/modal');
  };

  const handleOpenDate = (dateKey: string) => {
    if (dateKey === today) {
      setTaskSnapshot(
        today,
        tasks.map((task) => ({
          id: task.id,
          title: task.title,
          detail: task.detail,
          done: task.done,
        }))
      );
    }

    router.push({
      pathname: '/journal/[dateKey]',
      params: { dateKey },
    });
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={[styles.screenTitle, { color: theme.subtle }]}>Journal</Text>
        <Text style={[styles.heroTitle, { color: theme.text }]}>Daily history</Text>
        <Text style={[styles.heroSubtitle, { color: theme.muted }]}>Open a day to see tasks, notes, and Wenwen reflections.</Text>

        <View style={styles.list}>
          {dateKeys.map((dateKey) => {
            const entry = entries[dateKey];
            const savedTasks = entry?.tasks ?? [];
            const sourceTasks = dateKey === today && savedTasks.length === 0
              ? tasks
              : savedTasks;
            const finishedCount = sourceTasks.filter((task) => task.done).length;
            const noteText = entry?.feelingNote?.trim();
            const moodLabel = getMoodLabel(entry?.mood);

            return (
              <Pressable
                key={dateKey}
                accessibilityRole="button"
                accessibilityLabel={`Open journal for ${formatDateLabel(dateKey)}`}
                onPress={() => handleOpenDate(dateKey)}
                style={({ pressed }) => [
                  styles.dateCard,
                  { backgroundColor: theme.surface, borderColor: theme.border, shadowColor: theme.shadow },
                  pressed && styles.dateCardPressed,
                ]}
              >
                <View style={[styles.dateIcon, { backgroundColor: theme.primarySoft }]}>
                  <Ionicons name="calendar-outline" size={20} color={theme.primaryStrong} />
                </View>
                <View style={styles.dateTextWrap}>
                  <Text style={[styles.dateTitle, { color: theme.textStrong }]}>
                    {formatDateLabel(dateKey)}
                    {dateKey === today ? ' · Today' : ''}
                  </Text>
                  <Text style={[styles.dateMeta, { color: theme.muted }]}>
                    {finishedCount}/{sourceTasks.length} tasks finished
                    {moodLabel ? ` · ${moodLabel}` : ''}
                    {noteText ? ' · Note added' : ' · No note yet'}
                  </Text>
                  {entry?.summaries[0] && (
                    <Text style={[styles.summaryPreview, { color: theme.primaryStrong }]}>{entry.summaries[0].title}</Text>
                  )}
                </View>
                <Ionicons name="chevron-forward" size={18} color={theme.subtle} />
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.bottomTabWrap}>
        <BottomTabPlaceholder activeKey="journal" onTabPress={handleTabPress} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
  screenTitle: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '800',
    marginTop: 8,
  },
  heroSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
    marginBottom: 16,
  },
  list: {
    gap: 10,
  },
  dateCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 1,
  },
  dateCardPressed: {
    opacity: 0.88,
  },
  dateIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateTextWrap: {
    flex: 1,
  },
  dateTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  dateMeta: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  summaryPreview: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 5,
  },
  bottomTabWrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
  },
});
