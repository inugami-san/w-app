import React, { useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';

import { BottomTabPlaceholder, type DashboardTabKey } from '@/src/components/home/BottomTabPlaceholder';
import { getMoodLabel } from '@/src/features/journal/moods';
import { generateJournalSummary } from '@/src/services/gemini-journal-summary';
import { scheduleJournalSummaryNotification } from '@/src/services/journal-notifications';
import { useJournalStore } from '@/src/store/journal-store';
import { useAppTheme } from '@/src/theme/app-theme';
import type { JournalSummary, JournalTaskSnapshot } from '@/src/types/journal';
import { getLocalDateKey } from '@/src/utils/date';

function getParam(value: string | string[] | undefined, fallback: string): string {
  if (Array.isArray(value)) return value[0] ?? fallback;
  return value ?? fallback;
}

function formatDateLabel(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function JournalDateScreen() {
  const params = useLocalSearchParams<{ dateKey?: string | string[]; summaryId?: string | string[] }>();
  const today = useMemo(() => getLocalDateKey(), []);
  const dateKey = getParam(params.dateKey, today);
  const entry = useJournalStore((state) => state.entries[dateKey]);
  const setFeelingNote = useJournalStore((state) => state.setFeelingNote);
  const addSummary = useJournalStore((state) => state.addSummary);
  const theme = useAppTheme();
  const [note, setNote] = useState(entry?.feelingNote ?? '');
  const [isSummarizing, setIsSummarizing] = useState(false);
  const initialSummaryId = getParam(params.summaryId, '');
  const [activeSummary, setActiveSummary] = useState<JournalSummary | null>(
    entry?.summaries.find((summary) => summary.id === initialSummaryId) ?? entry?.summaries[0] ?? null
  );
  const moodLabel = getMoodLabel(entry?.mood);

  const taskSnapshot: JournalTaskSnapshot[] = useMemo(() => {
    if (dateKey === today) return [];
    return entry?.tasks ?? [];
  }, [dateKey, entry?.tasks, today]);

  const completedCount = taskSnapshot.filter((task) => task.done).length;

  const handleTabPress = (tab: DashboardTabKey) => {
    if (tab === 'journal') {
      router.push('/journal');
      return;
    }
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

  const handleSaveNote = () => {
    setFeelingNote(dateKey, note);
  };

  const handleGenerateSummary = async () => {
    if (isSummarizing) return;

    setIsSummarizing(true);
    try {
      const result = await generateJournalSummary({
        dateKey,
        tasks: taskSnapshot,
        feelingNote: note.trim(),
        mood: entry?.mood,
      });
      const summary = addSummary({
        dateKey,
        title: result.title,
        body: result.body,
        tasks: taskSnapshot,
        feelingNote: note.trim(),
        mood: entry?.mood,
      });
      setActiveSummary(summary);
      await scheduleJournalSummaryNotification(summary);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to summarize this day.';
      Alert.alert('Could not create note', message);
    } finally {
      setIsSummarizing(false);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to journal history"
          onPress={() => router.push('/journal')}
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={18} color={theme.primaryStrong} />
          <Text style={[styles.backText, { color: theme.primaryStrong }]}>History</Text>
        </Pressable>

        <Text style={[styles.screenTitle, { color: theme.subtle }]}>Journal</Text>
        <Text style={[styles.heroTitle, { color: theme.text }]}>{formatDateLabel(dateKey)}</Text>
        <Text style={[styles.heroSubtitle, { color: theme.muted }]}>
          {taskSnapshot.length > 0 ? `${completedCount}/${taskSnapshot.length} tasks finished` : 'Journal note'}
          {moodLabel ? ` · ${moodLabel}` : ''}
        </Text>

        {activeSummary && (
          <View style={[styles.noteCard, { backgroundColor: theme.primarySoft, borderColor: theme.softBorder }]}>
            <Text style={[styles.noteKicker, { color: theme.primaryStrong }]}>Wenwen Note</Text>
            <Text style={[styles.noteTitle, { color: theme.text }]}>{activeSummary.title}</Text>
            <Text style={[styles.noteBody, { color: theme.muted }]}>{activeSummary.body}</Text>
          </View>
        )}

        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border, shadowColor: theme.shadow }]}>
          <Text style={[styles.cardTitle, { color: theme.textStrong }]}>Tasks from this day</Text>
          <View style={styles.taskList}>
            {taskSnapshot.length === 0 ? (
              <Text style={[styles.emptyText, { color: theme.muted }]}>
                {dateKey === today
                  ? "Today's tasks are saved here after the day ends."
                  : 'No task snapshot saved for this day yet.'}
              </Text>
            ) : (
              taskSnapshot.map((task) => (
                <View key={task.id} style={styles.taskRow}>
                  <Ionicons
                    name={task.done ? 'checkmark-circle' : 'ellipse-outline'}
                    size={20}
                    color={task.done ? '#56BA88' : theme.subtle}
                  />
                  <View style={styles.taskTextWrap}>
                    <Text style={[styles.taskTitle, { color: theme.textStrong }]}>{task.title}</Text>
                    <Text style={[styles.taskState, { color: theme.muted }]}>{task.done ? 'Finished' : 'Still open'}</Text>
                  </View>
                </View>
              ))
            )}
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border, shadowColor: theme.shadow }]}>
          <Text style={[styles.cardTitle, { color: theme.textStrong }]}>Daily note</Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="Write notes about this day..."
            placeholderTextColor={theme.subtle}
            multiline
            style={[
              styles.noteInput,
              {
                backgroundColor: theme.softSurface,
                borderColor: theme.softBorder,
                color: theme.text,
              },
            ]}
          />
          <View style={styles.actionRow}>
            <TouchableOpacity style={[styles.secondaryButton, { backgroundColor: theme.softSurface }]} onPress={handleSaveNote}>
              <Text style={[styles.secondaryButtonText, { color: theme.muted }]}>Save Note</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: theme.primary }]}
              onPress={handleGenerateSummary}
              disabled={isSummarizing || (taskSnapshot.length === 0 && note.trim().length === 0)}
            >
              <Ionicons name="sparkles-outline" size={16} color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>
                {isSummarizing ? 'Writing...' : 'Summarize'}
              </Text>
            </TouchableOpacity>
          </View>
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
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 12,
  },
  backText: {
    fontSize: 13,
    fontWeight: '800',
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
  noteCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  noteKicker: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  noteTitle: {
    fontSize: 22,
    fontWeight: '800',
    marginTop: 8,
  },
  noteBody: {
    fontSize: 15,
    lineHeight: 23,
    fontWeight: '600',
    marginTop: 10,
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  taskList: {
    marginTop: 10,
    gap: 10,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  taskTextWrap: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  taskState: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  emptyText: {
    fontSize: 13,
    fontWeight: '600',
  },
  noteInput: {
    minHeight: 130,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    textAlignVertical: 'top',
    marginTop: 12,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 12,
  },
  secondaryButton: {
    minHeight: 40,
    borderRadius: 12,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontSize: 12,
    fontWeight: '800',
  },
  primaryButton: {
    minHeight: 40,
    borderRadius: 12,
    paddingHorizontal: 14,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  bottomTabWrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
  },
});
