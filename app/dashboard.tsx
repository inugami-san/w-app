import React, { ComponentType, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import type { WenwenProps } from '@/components/WenwenBase';
import type { TaskItem } from '@/src/types/task';
import { AvatarSection } from '@/src/components/home/AvatarSection';
import { BottomTabPlaceholder, type DashboardTabKey } from '@/src/components/home/BottomTabPlaceholder';
import { ProgressBar } from '@/src/components/home/ProgressBar';
import { QuoteCard } from '@/src/components/home/QuoteCard';
import { TaskComposer } from '@/src/components/home/TaskComposer';
import { TaskList } from '@/src/components/home/TaskList';
import { MOOD_OPTIONS } from '@/src/features/journal/moods';
import { generateGeminiTaskSuggestions } from '@/src/services/gemini-task-suggestions';
import { useJournalStore } from '@/src/store/journal-store';
import { useTaskStore } from '@/src/store/task-store';
import { WELLNESS_CATEGORIES, type SuggestedTask, type WellnessCategory } from '@/src/types/ai-task';
import type { MoodKey } from '@/src/types/journal';
import { useAppTheme } from '@/src/theme/app-theme';
import { getLocalDateKey } from '@/src/utils/date';
import { getTimeGreeting } from '@/src/utils/greeting';
import { getDailyQuote } from '@/src/utils/quotes';

const TASK_COMPLETION_COOLDOWN_MS = 30_000;

function getParam(value: string | string[] | undefined, fallback: string): string {
  if (Array.isArray(value)) return value[0] ?? fallback;
  return value ?? fallback;
}

export default function DashboardScreen() {
  const theme = useAppTheme();
  const params = useLocalSearchParams<{
    eyeColor?: string | string[];
    faceColor?: string | string[];
    bodyColor?: string | string[];
  }>();

  const [WenwenComponent, setWenwenComponent] = useState<ComponentType<WenwenProps> | null>(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskPendingDelete, setTaskPendingDelete] = useState<TaskItem | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<WellnessCategory>(WELLNESS_CATEGORIES[0]);
  const [isGeneratingSuggestion, setIsGeneratingSuggestion] = useState(false);
  const [suggestedTasks, setSuggestedTasks] = useState<SuggestedTask[]>([]);
  const [isSuggestionReviewOpen, setIsSuggestionReviewOpen] = useState(false);
  const [completionCooldownUntil, setCompletionCooldownUntil] = useState(0);
  const [clockNow, setClockNow] = useState(() => Date.now());
  const eyeColor = getParam(params.eyeColor, '#00D4C2');
  const faceColor = getParam(params.faceColor, '#E2E8F0');
  const bodyColor = getParam(params.bodyColor, '#F0F2F5');
  const today = useMemo(() => getLocalDateKey(), []);

  const tasks = useTaskStore((state) => state.tasks);
  const hasHydrated = useTaskStore((state) => state.hasHydrated);
  const initializeTasks = useTaskStore((state) => state.initializeTasks);
  const addTask = useTaskStore((state) => state.addTask);
  const toggleTask = useTaskStore((state) => state.toggleTask);
  const deleteTask = useTaskStore((state) => state.deleteTask);
  const resetDailyTasks = useTaskStore((state) => state.resetDailyTasks);
  const todayMood = useJournalStore((state) => state.entries[today]?.mood);
  const setMood = useJournalStore((state) => state.setMood);

  useEffect(() => {
    const load = async () => {
      if (Platform.OS === 'web') {
        const { LoadSkiaWeb } = await import('@shopify/react-native-skia/lib/commonjs/web/LoadSkiaWeb');
        await (LoadSkiaWeb as Function)({
          locateFile: (file: string) =>
            `https://cdn.jsdelivr.net/npm/canvaskit-wasm@0.40.0/bin/full/${file}`,
        });
      }

      const mod = await import('@/components/WenwenBase');
      setWenwenComponent(() => mod.WenwenBase as ComponentType<WenwenProps>);
    };

    load().catch(() => {
      setWenwenComponent(null);
    });
  }, []);

  useEffect(() => {
    if (!hasHydrated) return;
    initializeTasks();
    resetDailyTasks();
  }, [hasHydrated, initializeTasks, resetDailyTasks]);

  useEffect(() => {
    if (completionCooldownUntil <= Date.now()) return;

    const interval = setInterval(() => {
      setClockNow(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, [clockNow, completionCooldownUntil]);

  const completedCount = useMemo(() => tasks.filter((item) => item.done).length, [tasks]);
  const totalCount = tasks.length;
  const completionCooldownRemaining = Math.max(
    0,
    Math.ceil((completionCooldownUntil - clockNow) / 1000)
  );

  const greeting = useMemo(() => getTimeGreeting(), []);
  const quote = useMemo(() => getDailyQuote(), []);

  const handleCreateTask = (title: string, detail: string) => {
    addTask({
      title,
      detail,
      due: 'Today',
    });
    setIsTaskModalOpen(false);
  };

  const handleTabPress = (tab: DashboardTabKey) => {
    if (tab === 'home') return;
    if (tab === 'customize') {
      router.push('/main');
      return;
    }
    if (tab === 'journal') {
      router.push('/journal');
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

  const handleRequestDeleteTask = (task: TaskItem) => {
    setTaskPendingDelete(task);
  };

  const handleSelectMood = (mood: MoodKey) => {
    setMood(today, mood);
  };

  const handleToggleTask = (task: TaskItem) => {
    if (task.done) {
      toggleTask(task.id);
      return;
    }

    if (completionCooldownRemaining > 0) {
      return;
    }

    toggleTask(task.id);
    const nextCooldownUntil = Date.now() + TASK_COMPLETION_COOLDOWN_MS;
    setCompletionCooldownUntil(nextCooldownUntil);
    setClockNow(Date.now());
  };

  const handleConfirmDeleteTask = () => {
    if (!taskPendingDelete) return;
    deleteTask(taskPendingDelete.id);
    setTaskPendingDelete(null);
  };

  const handleRemoveSuggestion = (indexToRemove: number) => {
    setSuggestedTasks((prev) => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleGenerateSuggestion = async (category: WellnessCategory) => {
    if (isGeneratingSuggestion) return;

    setIsGeneratingSuggestion(true);
    try {
      const suggestions = await generateGeminiTaskSuggestions(category);
      setSuggestedTasks(suggestions);
      setIsTaskModalOpen(false);
      setIsSuggestionReviewOpen(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to generate suggestion.';
      Alert.alert('Suggestion failed', message);
    } finally {
      setIsGeneratingSuggestion(false);
    }
  };

  const handleConfirmAddSuggestions = () => {
    if (suggestedTasks.length === 0) return;
    suggestedTasks.forEach((task) => {
      addTask({
        title: task.title,
        detail: task.optional_detail,
        due: 'Today',
      });
    });

    setSuggestedTasks([]);
    setIsSuggestionReviewOpen(false);
    setIsTaskModalOpen(false);
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.screenTitle, { color: theme.subtle }]}>Home</Text>

        <AvatarSection greeting={greeting} name="Christian" />

        <View style={styles.topCards}>
          <ProgressBar completed={completedCount} total={totalCount} />
          <QuoteCard quote={quote} />
        </View>

        <View style={[styles.moodCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.moodTitle, { color: theme.textStrong }]}>How are you feeling?</Text>
          <View style={styles.moodOptions}>
            {MOOD_OPTIONS.map((mood) => {
              const isActive = todayMood === mood.key;
              return (
                <Pressable
                  key={mood.key}
                  accessibilityRole="button"
                  accessibilityLabel={`Mood ${mood.label}`}
                  onPress={() => handleSelectMood(mood.key)}
                  style={({ pressed }) => [
                    styles.moodChip,
                    {
                      backgroundColor: isActive ? theme.primarySoft : theme.softSurface,
                      borderColor: isActive ? theme.primary : theme.softBorder,
                    },
                    pressed && styles.moodChipPressed,
                  ]}
                >
                  <Text
                    style={[
                      styles.moodChipText,
                      { color: isActive ? theme.primaryStrong : theme.muted },
                    ]}
                  >
                    {mood.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.characterArea}>
          {WenwenComponent && (
            <WenwenComponent eyeColor={eyeColor} faceColor={faceColor} bodyColor={bodyColor} />
          )}
        </View>

        <View style={styles.taskHeaderRow}>
          <Text style={[styles.sectionTitle, { color: theme.textStrong }]}>Today&apos;s Gentle Tasks</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Reset daily tasks"
            onPress={() => resetDailyTasks(true)}
            style={({ pressed }) => [
              styles.resetButton,
              {
                backgroundColor: theme.softSurface,
                borderColor: theme.softBorder,
              },
              pressed && styles.resetButtonPressed,
            ]}
          >
            <Text style={[styles.resetButtonText, { color: theme.muted }]}>Reset</Text>
          </Pressable>
        </View>

        <View style={styles.suggestRow}>
          <Text style={[styles.suggestText, { color: theme.muted }]}>Have something specific in mind?</Text>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Add task"
            onPress={() => setIsTaskModalOpen(true)}
            style={[styles.suggestButton, { backgroundColor: theme.primary, borderColor: theme.primary }]}
          >
            <Ionicons name="add" size={17} color="#FFFFFF" />
            <Text style={styles.suggestButtonText}>New Task</Text>
          </TouchableOpacity>
        </View>

        {completionCooldownRemaining > 0 && (
          <View style={[styles.cooldownNotice, { backgroundColor: theme.primarySoft, borderColor: theme.primary }]}>
            <Ionicons name="time-outline" size={15} color={theme.primaryStrong} />
            <Text style={[styles.cooldownText, { color: theme.primaryStrong }]}>
              Take a short pause. Another task can be completed in {completionCooldownRemaining}s.
            </Text>
          </View>
        )}

        {!hasHydrated ? (
          <Text style={[styles.loadingText, { color: theme.muted }]}>Loading your tasks...</Text>
        ) : (
          <TaskList
            tasks={tasks}
            onToggleTask={handleToggleTask}
            onRequestDeleteTask={handleRequestDeleteTask}
            completionCooldownRemaining={completionCooldownRemaining}
          />
        )}
      </ScrollView>

      <Modal
        visible={isTaskModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsTaskModalOpen(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setIsTaskModalOpen(false)}>
          <Pressable style={[styles.modalCard, { backgroundColor: theme.surface, borderColor: theme.border }]} onPress={() => undefined}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Add a gentle task</Text>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Close add task modal"
                onPress={() => setIsTaskModalOpen(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={18} color={theme.muted} />
              </TouchableOpacity>
            </View>
            <TaskComposer
              onCreateTask={handleCreateTask}
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
              onGenerateSuggestion={handleGenerateSuggestion}
              isGeneratingSuggestion={isGeneratingSuggestion}
              suggestedTasks={suggestedTasks}
            />
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={isSuggestionReviewOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsSuggestionReviewOpen(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setIsSuggestionReviewOpen(false)}>
          <Pressable style={[styles.confirmCard, { backgroundColor: theme.surface, borderColor: theme.border }]} onPress={() => undefined}>
            <Text style={[styles.confirmTitle, { color: theme.text }]}>Add suggested tasks?</Text>
            <Text style={[styles.confirmBody, { color: theme.muted }]}>Review these suggestions before adding to your list.</Text>

            <ScrollView
              style={styles.suggestionList}
              contentContainerStyle={styles.suggestionListContent}
              showsVerticalScrollIndicator={false}
            >
              {suggestedTasks.length === 0 ? (
                <Text style={[styles.emptySuggestionText, { color: theme.muted }]}>No suggestions yet.</Text>
              ) : (
                suggestedTasks.map((task, index) => (
                  <View
                    key={`${task.title}-${index}`}
                    style={[
                      styles.suggestionItem,
                      { backgroundColor: theme.softSurface, borderColor: theme.softBorder },
                    ]}
                  >
                    <View style={styles.suggestionItemHeader}>
                      <Text style={[styles.suggestionItemTitle, { color: theme.textStrong }]}>{task.title}</Text>
                      <TouchableOpacity
                        accessibilityRole="button"
                        accessibilityLabel={`Remove ${task.title}`}
                        onPress={() => handleRemoveSuggestion(index)}
                        style={styles.removeSuggestionButton}
                      >
                        <Ionicons name="trash-outline" size={15} color="#C33B3B" />
                      </TouchableOpacity>
                    </View>
                    <Text style={[styles.suggestionItemDetail, { color: theme.muted }]}>{task.optional_detail}</Text>
                  </View>
                ))
              )}
            </ScrollView>

            <View style={styles.confirmActions}>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Cancel suggested tasks"
                onPress={() => setIsSuggestionReviewOpen(false)}
                style={[styles.confirmCancelButton, { backgroundColor: theme.softSurface }]}
              >
                <Text style={[styles.confirmCancelText, { color: theme.muted }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Confirm add suggested tasks"
                onPress={handleConfirmAddSuggestions}
                style={[
                  styles.confirmDeleteButton,
                  suggestedTasks.length === 0 && styles.confirmDisabledButton,
                ]}
                disabled={suggestedTasks.length === 0}
              >
                <Text style={styles.confirmDeleteText}>Add Tasks</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={Boolean(taskPendingDelete)}
        transparent
        animationType="fade"
        onRequestClose={() => setTaskPendingDelete(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setTaskPendingDelete(null)}>
          <Pressable style={[styles.confirmCard, { backgroundColor: theme.surface, borderColor: theme.border }]} onPress={() => undefined}>
            <Text style={[styles.confirmTitle, { color: theme.text }]}>Delete this task?</Text>
            <Text style={[styles.confirmBody, { color: theme.muted }]}>
              {taskPendingDelete
                ? `"${taskPendingDelete.title}" will be removed from your list.`
                : ''}
            </Text>
            <View style={styles.confirmActions}>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Cancel delete task"
                onPress={() => setTaskPendingDelete(null)}
                style={[styles.confirmCancelButton, { backgroundColor: theme.softSurface }]}
              >
                <Text style={[styles.confirmCancelText, { color: theme.muted }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Confirm delete task"
                onPress={handleConfirmDeleteTask}
                style={styles.confirmDeleteButton}
              >
                <Text style={styles.confirmDeleteText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <View style={styles.bottomTabWrap}>
        <BottomTabPlaceholder activeKey="home" onTabPress={handleTabPress} />
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
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  topCards: {
    gap: 10,
  },
  moodCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    marginTop: 10,
  },
  moodTitle: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 10,
  },
  moodOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  moodChip: {
    minHeight: 34,
    borderRadius: 17,
    borderWidth: 1,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moodChipPressed: {
    opacity: 0.86,
  },
  moodChipText: {
    fontSize: 12,
    fontWeight: '800',
  },
  characterArea: {
    height: 245,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  taskHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  resetButton: {
    minHeight: 36,
    minWidth: 66,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resetButtonPressed: {
    opacity: 0.85,
  },
  resetButtonText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  loadingText: {
    fontSize: 13,
    marginTop: 8,
  },
  suggestRow: {
    marginTop: 10,
    marginBottom: 10,
    paddingHorizontal: 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  suggestText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
  },
  suggestButton: {
    minHeight: 38,
    borderRadius: 12,
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 5,
    borderWidth: 1,
  },
  suggestButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  cooldownNotice: {
    marginBottom: 10,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cooldownText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(24, 36, 58, 0.32)',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  modalCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 16,
    shadowColor: '#28384E',
    shadowOpacity: 0.18,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 18 },
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  modalCloseButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F4F7FA',
  },
  confirmCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    maxHeight: '82%',
    shadowColor: '#28384E',
    shadowOpacity: 0.16,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 16 },
    elevation: 7,
  },
  confirmTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 8,
  },
  confirmBody: {
    fontSize: 13,
    lineHeight: 20,
  },
  confirmActions: {
    marginTop: 14,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  confirmCancelButton: {
    minHeight: 36,
    borderRadius: 10,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  confirmCancelText: {
    fontSize: 12,
    fontWeight: '700',
  },
  confirmDeleteButton: {
    minHeight: 36,
    borderRadius: 10,
    paddingHorizontal: 12,
    justifyContent: 'center',
    backgroundColor: '#FFF0F0',
    borderWidth: 1,
    borderColor: '#FFD3D3',
  },
  confirmDeleteText: {
    color: '#C33B3B',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  confirmDisabledButton: {
    opacity: 0.45,
  },
  suggestionList: {
    marginTop: 12,
    flexShrink: 1,
    maxHeight: 430,
  },
  suggestionListContent: {
    gap: 8,
    paddingBottom: 2,
  },
  emptySuggestionText: {
    fontSize: 13,
  },
  suggestionItem: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  suggestionItemHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  suggestionItemTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
  },
  removeSuggestionButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF0F0',
    borderWidth: 1,
    borderColor: '#FFD3D3',
  },
  suggestionItemDetail: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 18,
  },
  bottomTabWrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
  },
});
