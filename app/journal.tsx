import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { BottomTabPlaceholder, type DashboardTabKey } from '@/src/components/home/BottomTabPlaceholder';
import { getMoodLabel } from '@/src/features/journal/moods';
import { generateJournalSummary } from '@/src/services/gemini-journal-summary';
import { scheduleJournalSummaryNotification } from '@/src/services/journal-notifications';
import { useJournalStore } from '@/src/store/journal-store';
import { useTaskStore } from '@/src/store/task-store';
import { useAppTheme } from '@/src/theme/app-theme';
import type { JournalEntry, JournalSummary, JournalTaskSnapshot } from '@/src/types/journal';
import { getLocalDateKey } from '@/src/utils/date';

function formatDateLabel(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function getPreviousDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() - 1);
  return getLocalDateKey(date);
}

function hasHistoryContent(entry: JournalEntry | undefined, dateKey: string, today: string) {
  if (!entry) return false;

  const hasNote = entry.feelingNote.trim().length > 0;
  const hasSummary = entry.summaries.length > 0;
  const hasTaskSnapshot = dateKey !== today && entry.tasks.length > 0;

  return hasNote || hasSummary || hasTaskSnapshot;
}

function getVisibleTasks(entry: JournalEntry | undefined, dateKey: string, today: string): JournalTaskSnapshot[] {
  if (!entry || dateKey === today) return [];
  return entry.tasks;
}

export default function JournalScreen() {
  const today = useMemo(() => getLocalDateKey(), []);
  const yesterday = useMemo(() => getPreviousDateKey(today), [today]);
  const entries = useJournalStore((state) => state.entries);
  const lastDailyReviewShownDateKey = useJournalStore((state) => state.lastDailyReviewShownDateKey);
  const setDailyReviewShownDateKey = useJournalStore((state) => state.setDailyReviewShownDateKey);
  const setFeelingNote = useJournalStore((state) => state.setFeelingNote);
  const setTaskSnapshot = useJournalStore((state) => state.setTaskSnapshot);
  const addSummary = useJournalStore((state) => state.addSummary);
  const hasHydratedTasks = useTaskStore((state) => state.hasHydrated);
  const resetDailyTasks = useTaskStore((state) => state.resetDailyTasks);
  const theme = useAppTheme();
  const [isJournalModalVisible, setIsJournalModalVisible] = useState(false);
  const [journalNote, setJournalNote] = useState('');
  const [isSavingJournal, setIsSavingJournal] = useState(false);
  const [reviewDateKey, setReviewDateKey] = useState('');
  const [isReviewModalVisible, setIsReviewModalVisible] = useState(false);
  const [isReviewLoading, setIsReviewLoading] = useState(false);
  const [reviewSummary, setReviewSummary] = useState<JournalSummary | null>(null);
  const [reviewError, setReviewError] = useState('');
  const autoReviewAttemptedRef = useRef(false);

  const dateKeys = useMemo(() => {
    return Object.keys(entries)
      .filter((dateKey) => hasHistoryContent(entries[dateKey], dateKey, today))
      .sort((a, b) => b.localeCompare(a));
  }, [entries, today]);

  const yesterdayEntry = entries[yesterday];
  const hasYesterdayReview = hasHistoryContent(yesterdayEntry, yesterday, today);
  const reviewEntry = reviewDateKey ? entries[reviewDateKey] : undefined;
  const reviewTasks = getVisibleTasks(reviewEntry, reviewDateKey, today);
  const reviewFeelingNote = reviewEntry?.feelingNote.trim() ?? '';
  const reviewMoodLabel = getMoodLabel(reviewEntry?.mood);

  useEffect(() => {
    if (hasHydratedTasks) {
      resetDailyTasks();
    }
  }, [hasHydratedTasks, resetDailyTasks]);

  useEffect(() => {
    if ((entries[today]?.tasks.length ?? 0) > 0) {
      setTaskSnapshot(today, []);
    }
  }, [entries, setTaskSnapshot, today]);

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
    router.push({
      pathname: '/journal/[dateKey]',
      params: { dateKey },
    });
  };

  const openJournalComposer = () => {
    setJournalNote(entries[today]?.feelingNote ?? '');
    setIsJournalModalVisible(true);
  };

  const openReviewForDate = useCallback(
    async (dateKey: string, options?: { markShownToday?: boolean }) => {
      const entry = useJournalStore.getState().entries[dateKey];
      if (!hasHistoryContent(entry, dateKey, today)) return;

      const tasks = getVisibleTasks(entry, dateKey, today);
      const feelingNote = entry?.feelingNote.trim() ?? '';

      if (options?.markShownToday) {
        setDailyReviewShownDateKey(today);
      }

      setReviewDateKey(dateKey);
      setIsReviewModalVisible(true);
      setReviewError('');

      const existingSummary =
        entry?.summaries.find((summary) => summary.tasks.length === tasks.length && summary.feelingNote.trim() === feelingNote) ??
        null;
      if (existingSummary) {
        setReviewSummary(existingSummary);
        return;
      }

      setReviewSummary(null);
      setIsReviewLoading(true);
      try {
        const result = await generateJournalSummary({
          dateKey,
          tasks,
          feelingNote,
          mood: entry?.mood,
        });
        const summary = addSummary({
          dateKey,
          title: result.title,
          body: result.body,
          tasks,
          feelingNote,
          mood: entry?.mood,
        });
        setReviewSummary(summary);
        await scheduleJournalSummaryNotification(summary);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Wenwen could not write this note yet.';
        setReviewError(message);
      } finally {
        setIsReviewLoading(false);
      }
    },
    [addSummary, setDailyReviewShownDateKey, today]
  );

  useEffect(() => {
    if (autoReviewAttemptedRef.current) return;
    if (lastDailyReviewShownDateKey === today) return;
    if (!hasYesterdayReview) return;

    autoReviewAttemptedRef.current = true;
    void openReviewForDate(yesterday, { markShownToday: true });
  }, [hasYesterdayReview, lastDailyReviewShownDateKey, openReviewForDate, today, yesterday]);

  const handleSaveJournal = async () => {
    const cleanNote = journalNote.trim();
    if (!cleanNote) {
      Alert.alert('Write a note first', 'Add today’s note before saving this journal.');
      return;
    }

    setIsSavingJournal(true);
    setFeelingNote(today, cleanNote);
    setTaskSnapshot(today, []);

    try {
      const result = await generateJournalSummary({
        dateKey: today,
        tasks: [],
        feelingNote: cleanNote,
        mood: entries[today]?.mood,
      });
      const summary = addSummary({
        dateKey: today,
        title: result.title,
        body: result.body,
        tasks: [],
        feelingNote: cleanNote,
        mood: entries[today]?.mood,
      });
      setReviewDateKey(today);
      setReviewSummary(summary);
      setReviewError('');
      setIsReviewModalVisible(true);
      await scheduleJournalSummaryNotification(summary);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Your journal was saved, but Wenwen could not summarize it yet.';
      Alert.alert('Journal saved', message);
    } finally {
      setIsSavingJournal(false);
      setIsJournalModalVisible(false);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={[styles.screenTitle, { color: theme.subtle }]}>Journal</Text>
        <Text style={[styles.heroTitle, { color: theme.text }]}>Daily history</Text>
        <Text style={[styles.heroSubtitle, { color: theme.muted }]}>
          Daily notes, task history, and AI reviews.
        </Text>

        <View style={styles.actionRow}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Add journal note"
            style={[styles.addJournalButton, { backgroundColor: theme.primary }]}
            onPress={openJournalComposer}
          >
            <Ionicons name="create-outline" size={18} color="#FFFFFF" />
            <Text style={styles.addJournalButtonText}>Add Journal</Text>
          </TouchableOpacity>
          {hasYesterdayReview && (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Show yesterday review"
              style={[styles.reviewButton, { backgroundColor: theme.surface, borderColor: theme.border }]}
              onPress={() => openReviewForDate(yesterday)}
            >
              <Ionicons name="sparkles-outline" size={17} color={theme.primaryStrong} />
              <Text style={[styles.reviewButtonText, { color: theme.primaryStrong }]}>Yesterday</Text>
            </TouchableOpacity>
          )}
        </View>

        {dateKeys.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Ionicons name="journal-outline" size={24} color={theme.primaryStrong} />
            <Text style={[styles.emptyTitle, { color: theme.textStrong }]}>No journal history yet</Text>
            <Text style={[styles.emptyBody, { color: theme.muted }]}>
              Add a journal note today to create a daily review.
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {dateKeys.map((dateKey) => {
              const entry = entries[dateKey];
              const sourceTasks = getVisibleTasks(entry, dateKey, today);
              const finishedCount = sourceTasks.filter((task) => task.done).length;
              const noteText = entry?.feelingNote?.trim();
              const moodLabel = getMoodLabel(entry?.mood);
              const summary = entry?.summaries[0];
              const hasTasks = sourceTasks.length > 0;

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
                      {hasTasks ? `${finishedCount}/${sourceTasks.length} tasks finished` : 'Journal note'}
                      {moodLabel ? ` · ${moodLabel}` : ''}
                      {noteText ? ' · Note added' : ''}
                    </Text>
                    {summary && (
                      <Text style={[styles.summaryPreview, { color: theme.primaryStrong }]}>{summary.title}</Text>
                    )}
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={theme.subtle} />
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>

      <Modal
        animationType="fade"
        transparent
        visible={isJournalModalVisible}
        onRequestClose={() => setIsJournalModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalKicker, { color: theme.subtle }]}>Today</Text>
                <Text style={[styles.modalTitle, { color: theme.text }]}>Add journal</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close add journal"
                onPress={() => setIsJournalModalVisible(false)}
                style={[styles.closeButton, { backgroundColor: theme.softSurface }]}
              >
                <Ionicons name="close" size={20} color={theme.muted} />
              </Pressable>
            </View>
            <Text style={[styles.modalBody, { color: theme.muted }]}>Add today&apos;s note.</Text>
            <TextInput
              value={journalNote}
              onChangeText={setJournalNote}
              placeholder="Write your note..."
              placeholderTextColor={theme.subtle}
              multiline
              editable={!isSavingJournal}
              style={[
                styles.journalInput,
                {
                  backgroundColor: theme.softSurface,
                  borderColor: theme.softBorder,
                  color: theme.text,
                },
              ]}
            />
            <TouchableOpacity
              style={[styles.modalPrimaryButton, { backgroundColor: theme.primary }]}
              onPress={handleSaveJournal}
              disabled={isSavingJournal}
            >
              {isSavingJournal ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="sparkles-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.modalPrimaryButtonText}>Save & Summarize</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="fade"
        transparent
        visible={isReviewModalVisible}
        onRequestClose={() => setIsReviewModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.reviewModalCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.modalHeader}>
              <View style={styles.reviewTitleWrap}>
                <Text style={[styles.modalKicker, { color: theme.subtle }]}>
                  {reviewDateKey ? formatDateLabel(reviewDateKey) : 'Daily review'}
                </Text>
                <Text style={[styles.modalTitle, { color: theme.text }]}>Daily review</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close daily review"
                onPress={() => setIsReviewModalVisible(false)}
                style={[styles.closeButton, { backgroundColor: theme.softSurface }]}
              >
                <Ionicons name="close" size={20} color={theme.muted} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.reviewScrollContent}>
              {isReviewLoading ? (
                <View style={styles.loadingBlock}>
                  <ActivityIndicator color={theme.primaryStrong} />
                  <Text style={[styles.loadingText, { color: theme.muted }]}>Writing the review...</Text>
                </View>
              ) : reviewSummary ? (
                <View style={[styles.summaryCard, { backgroundColor: theme.primarySoft, borderColor: theme.softBorder }]}>
                  <Text style={[styles.summaryTitle, { color: theme.text }]}>{reviewSummary.title}</Text>
                  <Text style={[styles.summaryBody, { color: theme.muted }]}>{reviewSummary.body}</Text>
                </View>
              ) : (
                <View style={[styles.summaryCard, { backgroundColor: theme.softSurface, borderColor: theme.softBorder }]}>
                  <Text style={[styles.summaryTitle, { color: theme.text }]}>Saved for later</Text>
                  <Text style={[styles.summaryBody, { color: theme.muted }]}>
                    {reviewError || 'The AI review could not be written yet, but this day is still saved.'}
                  </Text>
                </View>
              )}

              <View style={[styles.reviewSection, { borderColor: theme.softBorder }]}>
                <Text style={[styles.reviewSectionTitle, { color: theme.textStrong }]}>Tasks</Text>
                {reviewTasks.length === 0 ? (
                  <Text style={[styles.reviewMutedText, { color: theme.muted }]}>No task snapshot saved for this day.</Text>
                ) : (
                  reviewTasks.map((task) => (
                    <View key={task.id} style={styles.reviewTaskRow}>
                      <Ionicons
                        name={task.done ? 'checkmark-circle' : 'ellipse-outline'}
                        size={18}
                        color={task.done ? '#56BA88' : theme.subtle}
                      />
                      <View style={styles.reviewTaskTextWrap}>
                        <Text style={[styles.reviewTaskTitle, { color: theme.textStrong }]}>{task.title}</Text>
                        <Text style={[styles.reviewMutedText, { color: theme.muted }]}>
                          {task.done ? 'Finished' : 'Still open'}
                        </Text>
                      </View>
                    </View>
                  ))
                )}
              </View>

              <View style={[styles.reviewSection, { borderColor: theme.softBorder }]}>
                <Text style={[styles.reviewSectionTitle, { color: theme.textStrong }]}>Daily note</Text>
                <Text style={[styles.reviewMutedText, { color: theme.muted }]}>
                  {reviewFeelingNote || 'No note was written for this day.'}
                </Text>
                {reviewMoodLabel && (
                  <Text style={[styles.moodLine, { color: theme.primaryStrong }]}>Mood: {reviewMoodLabel}</Text>
                )}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

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
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  addJournalButton: {
    minHeight: 46,
    borderRadius: 16,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    flex: 1,
  },
  addJournalButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  reviewButton: {
    minHeight: 46,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  reviewButtonText: {
    fontSize: 13,
    fontWeight: '900',
  },
  list: {
    gap: 10,
  },
  emptyCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  emptyBody: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(8, 12, 18, 0.58)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 18,
  },
  reviewModalCard: {
    maxHeight: '82%',
    borderRadius: 24,
    borderWidth: 1,
    padding: 18,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  reviewTitleWrap: {
    flex: 1,
  },
  modalKicker: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '900',
    marginTop: 4,
  },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBody: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 12,
  },
  journalInput: {
    minHeight: 150,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    textAlignVertical: 'top',
    marginTop: 12,
  },
  modalPrimaryButton: {
    minHeight: 48,
    borderRadius: 16,
    marginTop: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  modalPrimaryButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  reviewScrollContent: {
    paddingTop: 14,
    gap: 12,
  },
  loadingBlock: {
    minHeight: 118,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    fontWeight: '700',
  },
  summaryCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '900',
  },
  summaryBody: {
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '600',
    marginTop: 8,
  },
  reviewSection: {
    borderTopWidth: 1,
    paddingTop: 12,
  },
  reviewSectionTitle: {
    fontSize: 14,
    fontWeight: '900',
    marginBottom: 8,
  },
  reviewTaskRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 9,
  },
  reviewTaskTextWrap: {
    flex: 1,
  },
  reviewTaskTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  reviewMutedText: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
  },
  moodLine: {
    fontSize: 13,
    fontWeight: '800',
    marginTop: 8,
  },
  bottomTabWrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
  },
});
