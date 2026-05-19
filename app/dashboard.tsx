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
import { BottomTabPlaceholder, type DashboardTabKey } from '@/src/components/home/BottomTabPlaceholder';
import { ProgressBar } from '@/src/components/home/ProgressBar';
import { QuoteCard } from '@/src/components/home/QuoteCard';
import { TaskComposer } from '@/src/components/home/TaskComposer';
import { TaskList } from '@/src/components/home/TaskList';
import { WeeklyProgressCard } from '@/src/components/home/WeeklyProgressCard';
import { generateGeminiTaskSuggestions } from '@/src/services/gemini-task-suggestions';
import {
  DEFAULT_AVATAR_COLORS,
  DEFAULT_AVATAR_PERSONA,
  type AvatarPersona,
  usePreferencesStore,
} from '@/src/store/preferences-store';
import { useTaskStore } from '@/src/store/task-store';
import { WELLNESS_CATEGORIES, type SuggestedTask, type WellnessCategory } from '@/src/types/ai-task';
import { useAppTheme } from '@/src/theme/app-theme';
import { getTimeGreeting } from '@/src/utils/greeting';
import { getDailyQuote } from '@/src/utils/quotes';

const TASK_COMPLETION_COOLDOWN_MS = 10_000;

function getParam(value: string | string[] | undefined, fallback: string): string {
  if (Array.isArray(value)) return value[0] ?? fallback;
  return value ?? fallback;
}

function getPersonaParam(value: string | string[] | undefined, fallback: AvatarPersona): AvatarPersona {
  const raw = getParam(value, fallback);
  return raw === 'cat' ? 'cat' : 'bot';
}

export default function DashboardScreen() {
  const theme = useAppTheme();
  const params = useLocalSearchParams<{
    eyeColor?: string | string[];
    faceColor?: string | string[];
    bodyColor?: string | string[];
    persona?: string | string[];
  }>();

  const [avatarComponents, setAvatarComponents] =
    useState<Record<AvatarPersona, ComponentType<WenwenProps>> | null>(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskPendingDelete, setTaskPendingDelete] = useState<TaskItem | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<WellnessCategory>(WELLNESS_CATEGORIES[0]);
  const [isGeneratingSuggestion, setIsGeneratingSuggestion] = useState(false);
  const [suggestedTasks, setSuggestedTasks] = useState<SuggestedTask[]>([]);
  const [isSuggestionReviewOpen, setIsSuggestionReviewOpen] = useState(false);
  const [isStarterTasksPromptOpen, setIsStarterTasksPromptOpen] = useState(false);
  const [completionFeedback, setCompletionFeedback] = useState('');
  const [clockNow, setClockNow] = useState(() => Date.now());
  const avatarColors = usePreferencesStore((state) => state.avatarColors);
  const avatarPersona = usePreferencesStore((state) => state.avatarPersona);
  const setAvatarColors = usePreferencesStore((state) => state.setAvatarColors);
  const setAvatarPersona = usePreferencesStore((state) => state.setAvatarPersona);
  const paramEyeColor = getParam(params.eyeColor, '');
  const paramFaceColor = getParam(params.faceColor, '');
  const paramBodyColor = getParam(params.bodyColor, '');
  const hasParamPersona = Boolean(getParam(params.persona, ''));
  const selectedPersona = hasParamPersona
    ? getPersonaParam(params.persona, DEFAULT_AVATAR_PERSONA)
    : avatarPersona ?? DEFAULT_AVATAR_PERSONA;
  const eyeColor = paramEyeColor || avatarColors?.eyeColor || DEFAULT_AVATAR_COLORS.eyeColor;
  const faceColor = paramFaceColor || avatarColors?.faceColor || DEFAULT_AVATAR_COLORS.faceColor;
  const bodyColor = paramBodyColor || avatarColors?.bodyColor || DEFAULT_AVATAR_COLORS.bodyColor;
  const AvatarComponent = avatarComponents?.[selectedPersona] ?? null;

  const tasks = useTaskStore((state) => state.tasks);
  const hasHydrated = useTaskStore((state) => state.hasHydrated);
  const initializeTasks = useTaskStore((state) => state.initializeTasks);
  const hasDecidedStarterTasks = useTaskStore((state) => state.hasDecidedStarterTasks);
  const acceptStarterTasks = useTaskStore((state) => state.acceptStarterTasks);
  const declineStarterTasks = useTaskStore((state) => state.declineStarterTasks);
  const addTask = useTaskStore((state) => state.addTask);
  const toggleTask = useTaskStore((state) => state.toggleTask);
  const deleteTask = useTaskStore((state) => state.deleteTask);
  const completionCooldownUntil = useTaskStore((state) => state.completionCooldownUntil);
  const startCompletionCooldown = useTaskStore((state) => state.startCompletionCooldown);
  const resetDailyTasks = useTaskStore((state) => state.resetDailyTasks);
  const displayName = usePreferencesStore((state) => state.displayName);
  const homeGuide = usePreferencesStore((state) => state.homeGuide);
  const dismissHomeGuide = usePreferencesStore((state) => state.dismissHomeGuide);

  useEffect(() => {
    if (!paramEyeColor && !paramFaceColor && !paramBodyColor && !hasParamPersona) return;

    setAvatarColors({ eyeColor, faceColor, bodyColor });
    setAvatarPersona(selectedPersona);
  }, [
    bodyColor,
    eyeColor,
    faceColor,
    hasParamPersona,
    paramBodyColor,
    paramEyeColor,
    paramFaceColor,
    selectedPersona,
    setAvatarColors,
    setAvatarPersona,
  ]);

  useEffect(() => {
    const load = async () => {
      if (Platform.OS === 'web') {
        const { LoadSkiaWeb } = await import('@shopify/react-native-skia/lib/commonjs/web/LoadSkiaWeb');
        await (LoadSkiaWeb as Function)({
          locateFile: (file: string) =>
            `https://cdn.jsdelivr.net/npm/canvaskit-wasm@0.40.0/bin/full/${file}`,
        });
      }

      const [botMod, catMod] = await Promise.all([
        import('@/components/WenwenBase'),
        import('@/components/CatBase'),
      ]);
      setAvatarComponents({
        bot: botMod.WenwenBase as ComponentType<WenwenProps>,
        cat: catMod.CatBase as ComponentType<WenwenProps>,
      });
    };

    load().catch(() => {
      setAvatarComponents(null);
    });
  }, []);

  useEffect(() => {
    if (!hasHydrated) return;
    initializeTasks();
    resetDailyTasks();
  }, [hasHydrated, initializeTasks, resetDailyTasks]);

  useEffect(() => {
    if (!hasHydrated) return;
    const shouldPrompt = tasks.length === 0 && !hasDecidedStarterTasks;
    setIsStarterTasksPromptOpen(shouldPrompt);
  }, [hasHydrated, tasks.length, hasDecidedStarterTasks]);

  useEffect(() => {
    if (completionCooldownUntil <= Date.now()) return;

    setClockNow(Date.now());

    const interval = setInterval(() => {
      setClockNow(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, [completionCooldownUntil]);

  useEffect(() => {
    if (!completionFeedback) return;

    const timeout = setTimeout(() => {
      setCompletionFeedback('');
    }, 2800);

    return () => clearTimeout(timeout);
  }, [completionFeedback]);

  const completedCount = useMemo(() => tasks.filter((item) => item.done).length, [tasks]);
  const totalCount = tasks.length;
  const completionCooldownRemaining = Math.max(
    0,
    Math.ceil((completionCooldownUntil - clockNow) / 1000)
  );

  const greeting = useMemo(() => getTimeGreeting(), []);
  const quote = useMemo(() => getDailyQuote(), []);
  const progressLabel =
    totalCount === 0
      ? 'Start with one small task.'
      : completedCount === totalCount
        ? 'All set for today.'
        : `${Math.max(totalCount - completedCount, 0)} task${totalCount - completedCount === 1 ? '' : 's'} left today.`;
  const shouldShowHomeGuide =
    !homeGuide.dismissed && (!homeGuide.visitedJournal || !homeGuide.visitedCompanion);

  const handleCreateTask = (title: string, detail: string, isRoutine: boolean) => {
    addTask({
      title,
      detail,
      due: 'Today',
      isRoutine,
    });
    setIsTaskModalOpen(false);
  };

  const handleOpenGuideAction = (target: 'tasks' | 'journal' | 'companion') => {
    if (target === 'tasks') {
      setIsTaskModalOpen(true);
      return;
    }

    router.push(target === 'journal' ? '/journal' : '/companion');
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

  const handleToggleTask = (task: TaskItem) => {
    if (completionCooldownRemaining > 0) {
      return;
    }

    if (task.done) {
      toggleTask(task.id);
      return;
    }

    toggleTask(task.id);
    setCompletionFeedback(`Done: ${task.title}`);
    startCompletionCooldown(TASK_COMPLETION_COOLDOWN_MS);
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

  const handleToggleSuggestionRoutine = (indexToUpdate: number) => {
    setSuggestedTasks((prev) =>
      prev.map((task, index) =>
        index === indexToUpdate ? { ...task, isRoutine: !task.isRoutine } : task
      )
    );
  };

  const handleGenerateSuggestion = async (category: WellnessCategory, focusText: string) => {
    if (isGeneratingSuggestion) return;

    setIsGeneratingSuggestion(true);
    try {
      const existingTitles = tasks.map((task) => task.title);
      const suggestions = await generateGeminiTaskSuggestions(category, existingTitles, { focusText });
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

  const handleAcceptStarterTasks = () => {
    acceptStarterTasks();
    setIsStarterTasksPromptOpen(false);
  };

  const handleDeclineStarterTasks = () => {
    declineStarterTasks();
    setIsStarterTasksPromptOpen(false);
  };

  const handleConfirmAddSuggestions = () => {
    if (suggestedTasks.length === 0) return;
    suggestedTasks.forEach((task) => {
      addTask({
        title: task.title,
        detail: task.optional_detail,
        due: 'Today',
        isRoutine: Boolean(task.isRoutine),
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
        <View style={styles.heroSection}>
          <View style={styles.heroTextWrap}>
            <Text style={[styles.screenTitle, { color: theme.subtle }]}>Today</Text>
            <Text style={[styles.heroTitle, { color: theme.text }]}>
              {greeting}, {displayName || 'Friend'}
            </Text>
            <Text style={[styles.heroSubtitle, { color: theme.muted }]}>{progressLabel}</Text>
          </View>
          <View style={[styles.heroMark, { backgroundColor: theme.primarySoft, borderColor: theme.softBorder }]}>
            <Text style={[styles.heroMarkText, { color: theme.primaryStrong }]}>
              {selectedPersona === 'cat' ? 'C' : 'W'}
            </Text>
          </View>
        </View>

        <View style={[styles.characterCard, { backgroundColor: theme.surface, borderColor: theme.border, shadowColor: theme.shadow }]}>
          <View style={styles.characterArea}>
            {AvatarComponent && (
              <AvatarComponent
                eyeColor={eyeColor}
                faceColor={faceColor}
                bodyColor={bodyColor}
                presentation="peek"
              />
            )}
          </View>
        </View>

        <View style={styles.topCards}>
          <ProgressBar completed={completedCount} total={totalCount} />
          <WeeklyProgressCard />
        </View>

        <QuoteCard quote={quote} />

        {shouldShowHomeGuide && (
          <View
            style={[
              styles.guideCard,
              { backgroundColor: theme.surface, borderColor: theme.border, shadowColor: theme.shadow },
            ]}
          >
            <View style={styles.guideHeader}>
              <View style={styles.guideTitleWrap}>
                <Text style={[styles.guideKicker, { color: theme.subtle }]}>New here?</Text>
                <Text style={[styles.guideTitle, { color: theme.textStrong }]}>What can Wenwen help with?</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Dismiss Wenwen guide"
                onPress={dismissHomeGuide}
                style={[styles.guideCloseButton, { backgroundColor: theme.softSurface }]}
              >
                <Ionicons name="close" size={16} color={theme.muted} />
              </Pressable>
            </View>

            <View style={styles.guideList}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Add a small task"
                onPress={() => handleOpenGuideAction('tasks')}
                style={({ pressed }) => [
                  styles.guideItem,
                  { backgroundColor: theme.softSurface, borderColor: theme.softBorder },
                  pressed && styles.guideItemPressed,
                ]}
              >
                <View style={[styles.guideIcon, { backgroundColor: theme.primarySoft }]}>
                  <Ionicons name="checkmark-circle-outline" size={18} color={theme.primaryStrong} />
                </View>
                <View style={styles.guideTextWrap}>
                  <Text style={[styles.guideItemTitle, { color: theme.textStrong }]}>Tasks</Text>
                  <Text style={[styles.guideItemBody, { color: theme.muted }]}>Choose one small action for today.</Text>
                </View>
              </Pressable>

              {!homeGuide.visitedJournal && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Open journal"
                  onPress={() => handleOpenGuideAction('journal')}
                  style={({ pressed }) => [
                    styles.guideItem,
                    { backgroundColor: theme.softSurface, borderColor: theme.softBorder },
                    pressed && styles.guideItemPressed,
                  ]}
                >
                  <View style={[styles.guideIcon, { backgroundColor: theme.primarySoft }]}>
                    <Ionicons name="journal-outline" size={18} color={theme.primaryStrong} />
                  </View>
                  <View style={styles.guideTextWrap}>
                    <Text style={[styles.guideItemTitle, { color: theme.textStrong }]}>Journal</Text>
                    <Text style={[styles.guideItemBody, { color: theme.muted }]}>Unload thoughts when your mind feels full.</Text>
                  </View>
                </Pressable>
              )}

              {!homeGuide.visitedCompanion && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Open companion"
                  onPress={() => handleOpenGuideAction('companion')}
                  style={({ pressed }) => [
                    styles.guideItem,
                    { backgroundColor: theme.softSurface, borderColor: theme.softBorder },
                    pressed && styles.guideItemPressed,
                  ]}
                >
                  <View style={[styles.guideIcon, { backgroundColor: theme.primarySoft }]}>
                    <Ionicons name="chatbubble-ellipses-outline" size={18} color={theme.primaryStrong} />
                  </View>
                  <View style={styles.guideTextWrap}>
                    <Text style={[styles.guideItemTitle, { color: theme.textStrong }]}>Companion</Text>
                    <Text style={[styles.guideItemBody, { color: theme.muted }]}>Talk with Wenwen when you want support.</Text>
                  </View>
                </Pressable>
              )}
            </View>
          </View>
        )}

        <View style={styles.taskHeaderRow}>
          <Text style={[styles.sectionTitle, { color: theme.textStrong }]}>Today&apos;s Tasks</Text>
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
          <Text style={[styles.suggestText, { color: theme.muted }]}>Add your own task</Text>
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
              Next completion available in {completionCooldownRemaining}s.
            </Text>
          </View>
        )}

        {Boolean(completionFeedback) && (
          <View
            accessibilityLiveRegion="polite"
            style={[styles.feedbackNotice, { backgroundColor: theme.primarySoft, borderColor: theme.primary }]}
          >
            <View style={[styles.feedbackIcon, { backgroundColor: theme.primary }]}>
              <Ionicons name="checkmark" size={13} color="#FFFFFF" />
            </View>
            <Text style={[styles.feedbackText, { color: theme.primaryStrong }]}>{completionFeedback}</Text>
          </View>
        )}

        {!hasHydrated ? (
          <View style={[styles.loadingCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.loadingText, { color: theme.muted }]}>Loading tasks...</Text>
          </View>
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
        visible={isStarterTasksPromptOpen}
        transparent
        animationType="fade"
        onRequestClose={handleDeclineStarterTasks}
      >
        <Pressable style={styles.modalOverlay} onPress={handleDeclineStarterTasks}>
          <Pressable style={[styles.confirmCard, { backgroundColor: theme.surface, borderColor: theme.border }]} onPress={() => undefined}>
            <Text style={[styles.confirmTitle, { color: theme.text }]}>Start with suggested tasks?</Text>
            <Text style={[styles.confirmBody, { color: theme.muted }]}>
              We can add 3 starter tasks to help you begin. You can also skip and keep your task list empty.
            </Text>
            <View style={styles.confirmActions}>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Skip starter tasks"
                onPress={handleDeclineStarterTasks}
                style={[styles.confirmCancelButton, { backgroundColor: theme.softSurface }]}
              >
                <Text style={[styles.confirmCancelText, { color: theme.muted }]}>Skip for now</Text>
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Add starter tasks"
                onPress={handleAcceptStarterTasks}
                style={[styles.starterPrimaryButton, { backgroundColor: theme.primary }]}
              >
                <Text style={styles.starterPrimaryText}>Add starter tasks</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={isTaskModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsTaskModalOpen(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setIsTaskModalOpen(false)}>
          <Pressable style={[styles.modalCard, { backgroundColor: theme.surface, borderColor: theme.border }]} onPress={() => undefined}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Add task</Text>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Close add task modal"
                onPress={() => setIsTaskModalOpen(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={18} color={theme.muted} />
              </TouchableOpacity>
            </View>
            <ScrollView
              contentContainerStyle={styles.taskComposerScroll}
              showsVerticalScrollIndicator={false}
            >
              <TaskComposer
                onCreateTask={handleCreateTask}
                selectedCategory={selectedCategory}
                onSelectCategory={setSelectedCategory}
                onGenerateSuggestion={handleGenerateSuggestion}
                isGeneratingSuggestion={isGeneratingSuggestion}
                suggestedTasks={suggestedTasks}
              />
            </ScrollView>
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
                    <TouchableOpacity
                      accessibilityRole="checkbox"
                      accessibilityLabel={`${task.title} repeats daily`}
                      accessibilityState={{ checked: Boolean(task.isRoutine) }}
                      onPress={() => handleToggleSuggestionRoutine(index)}
                      style={styles.suggestionRoutineRow}
                    >
                      <View
                        style={[
                          styles.suggestionRoutineCheck,
                          {
                            backgroundColor: task.isRoutine ? theme.primary : theme.surface,
                            borderColor: task.isRoutine ? theme.primary : theme.softBorder,
                          },
                        ]}
                      >
                        {task.isRoutine && <Ionicons name="checkmark" size={12} color="#FFFFFF" />}
                      </View>
                      <View style={styles.suggestionRoutineTextWrap}>
                        <Text style={[styles.suggestionRoutineTitle, { color: theme.textStrong }]}>Daily routine</Text>
                        <Text style={[styles.suggestionRoutineCaption, { color: theme.muted }]}>
                          {task.isRoutine ? 'Repeats tomorrow.' : 'Today only.'}
                        </Text>
                      </View>
                    </TouchableOpacity>
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
    paddingTop: 48,
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
  heroSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
    marginBottom: 18,
  },
  heroTextWrap: {
    flex: 1,
  },
  screenTitle: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  heroTitle: {
    fontSize: 30,
    fontWeight: '900',
    marginTop: 6,
  },
  heroSubtitle: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
    marginTop: 6,
  },
  heroMark: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroMarkText: {
    fontSize: 20,
    fontWeight: '900',
  },
  topCards: {
    gap: 12,
    marginBottom: 12,
  },
  guideCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 14,
    marginBottom: 16,
    shadowOpacity: 0.05,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 1,
  },
  guideHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  guideTitleWrap: {
    flex: 1,
  },
  guideKicker: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  guideTitle: {
    fontSize: 18,
    fontWeight: '900',
    marginTop: 3,
  },
  guideCloseButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guideList: {
    gap: 8,
  },
  guideItem: {
    minHeight: 68,
    borderRadius: 18,
    borderWidth: 1,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  guideItemPressed: {
    opacity: 0.86,
  },
  guideIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guideTextWrap: {
    flex: 1,
  },
  guideItemTitle: {
    fontSize: 14,
    fontWeight: '900',
  },
  guideItemBody: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
    marginTop: 3,
  },
  characterCard: {
    borderRadius: 28,
    borderWidth: 1,
    marginBottom: 14,
    overflow: 'hidden',
    shadowOpacity: 0.05,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 2,
  },
  characterArea: {
    height: 168,
    justifyContent: 'center',
    alignItems: 'center',
  },
  taskHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
  },
  resetButton: {
    minHeight: 34,
    minWidth: 64,
    paddingHorizontal: 14,
    borderRadius: 17,
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
    fontWeight: '700',
  },
  loadingCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginTop: 4,
  },
  suggestRow: {
    marginBottom: 12,
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
    minHeight: 42,
    borderRadius: 21,
    paddingHorizontal: 14,
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
  feedbackNotice: {
    marginBottom: 10,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  feedbackIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedbackText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '800',
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
    maxHeight: '88%',
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
  taskComposerScroll: {
    paddingBottom: 2,
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
  starterPrimaryButton: {
    minHeight: 36,
    borderRadius: 10,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  starterPrimaryText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
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
  suggestionRoutineRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  suggestionRoutineCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestionRoutineTextWrap: {
    flex: 1,
  },
  suggestionRoutineTitle: {
    fontSize: 12,
    fontWeight: '800',
  },
  suggestionRoutineCaption: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 1,
  },
  bottomTabWrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
  },
});
