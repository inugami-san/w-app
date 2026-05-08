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

import type { WenwenProps } from '@/components/WenwenBase';
import type { TaskItem } from '@/src/types/task';
import { AvatarSection } from '@/src/components/home/AvatarSection';
import { BottomTabPlaceholder, type DashboardTabKey } from '@/src/components/home/BottomTabPlaceholder';
import { ProgressBar } from '@/src/components/home/ProgressBar';
import { QuoteCard } from '@/src/components/home/QuoteCard';
import { TaskComposer } from '@/src/components/home/TaskComposer';
import { TaskList } from '@/src/components/home/TaskList';
import { generateGeminiTaskSuggestion } from '@/src/services/gemini-task-suggestions';
import { useTaskStore } from '@/src/store/task-store';
import { WELLNESS_CATEGORIES, type SuggestedTask, type WellnessCategory } from '@/src/types/ai-task';
import { getTimeGreeting } from '@/src/utils/greeting';
import { getDailyQuote } from '@/src/utils/quotes';

function getParam(value: string | string[] | undefined, fallback: string): string {
  if (Array.isArray(value)) return value[0] ?? fallback;
  return value ?? fallback;
}

export default function DashboardScreen() {
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

  const eyeColor = getParam(params.eyeColor, '#00D4C2');
  const faceColor = getParam(params.faceColor, '#E2E8F0');
  const bodyColor = getParam(params.bodyColor, '#F0F2F5');

  const tasks = useTaskStore((state) => state.tasks);
  const hasHydrated = useTaskStore((state) => state.hasHydrated);
  const initializeTasks = useTaskStore((state) => state.initializeTasks);
  const addTask = useTaskStore((state) => state.addTask);
  const toggleTask = useTaskStore((state) => state.toggleTask);
  const deleteTask = useTaskStore((state) => state.deleteTask);
  const resetDailyTasks = useTaskStore((state) => state.resetDailyTasks);

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

  const completedCount = useMemo(() => tasks.filter((item) => item.done).length, [tasks]);
  const totalCount = tasks.length;

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
      router.push('/modal');
      return;
    }
    router.push('/modal');
  };

  const handleRequestDeleteTask = (task: TaskItem) => {
    setTaskPendingDelete(task);
  };

  const handleConfirmDeleteTask = () => {
    if (!taskPendingDelete) return;
    deleteTask(taskPendingDelete.id);
    setTaskPendingDelete(null);
  };

  const handleGenerateSuggestion = async (category: WellnessCategory) => {
    if (isGeneratingSuggestion) return;
    if (suggestedTasks.length >= 5) {
      Alert.alert('Suggestion limit reached', 'You can keep up to 5 suggestions before confirming.');
      return;
    }

    setIsGeneratingSuggestion(true);
    try {
      const suggestion = await generateGeminiTaskSuggestion(category);
      setSuggestedTasks((prev) => [...prev, suggestion].slice(0, 5));
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
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.screenTitle}>Home</Text>

        <AvatarSection greeting={greeting} name="Christian" />

        <View style={styles.topCards}>
          <ProgressBar completed={completedCount} total={totalCount} />
          <QuoteCard quote={quote} />
        </View>

        <View style={styles.characterArea}>
          {WenwenComponent && (
            <WenwenComponent eyeColor={eyeColor} faceColor={faceColor} bodyColor={bodyColor} />
          )}
        </View>

        <View style={styles.taskHeaderRow}>
          <Text style={styles.sectionTitle}>Today&apos;s Gentle Tasks</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Reset daily tasks"
            onPress={() => resetDailyTasks(true)}
            style={({ pressed }) => [styles.resetButton, pressed && styles.resetButtonPressed]}
          >
            <Text style={styles.resetButtonText}>Reset</Text>
          </Pressable>
        </View>

        <View style={styles.suggestRow}>
          <Text style={styles.suggestText}>Have something specific in mind?</Text>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Add task"
            onPress={() => setIsTaskModalOpen(true)}
            style={styles.suggestButton}
          >
            <Text style={styles.suggestButtonText}>Suggest A Task</Text>
          </TouchableOpacity>
        </View>

        {!hasHydrated ? (
          <Text style={styles.loadingText}>Loading your tasks...</Text>
        ) : (
          <TaskList
            tasks={tasks}
            onToggleTask={toggleTask}
            onRequestDeleteTask={handleRequestDeleteTask}
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
          <Pressable style={styles.modalCard} onPress={() => undefined}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add a gentle task</Text>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Close add task modal"
                onPress={() => setIsTaskModalOpen(false)}
                style={styles.modalCloseButton}
              >
                <Text style={styles.modalCloseText}>Close</Text>
              </TouchableOpacity>
            </View>
            <TaskComposer
              onCreateTask={handleCreateTask}
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
              onGenerateSuggestion={handleGenerateSuggestion}
              isGeneratingSuggestion={isGeneratingSuggestion}
              suggestedTasks={suggestedTasks}
              onReviewSuggestions={() => setIsSuggestionReviewOpen(true)}
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
          <Pressable style={styles.confirmCard} onPress={() => undefined}>
            <Text style={styles.confirmTitle}>Add suggested tasks?</Text>
            <Text style={styles.confirmBody}>Review these suggestions before adding to your list.</Text>

            <View style={styles.suggestionList}>
              {suggestedTasks.length === 0 ? (
                <Text style={styles.emptySuggestionText}>No suggestions yet.</Text>
              ) : (
                suggestedTasks.map((task, index) => (
                  <View key={`${task.title}-${index}`} style={styles.suggestionItem}>
                    <Text style={styles.suggestionItemTitle}>{task.title}</Text>
                    <Text style={styles.suggestionItemDetail}>{task.optional_detail}</Text>
                  </View>
                ))
              )}
            </View>

            <View style={styles.confirmActions}>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Cancel suggested tasks"
                onPress={() => setIsSuggestionReviewOpen(false)}
                style={styles.confirmCancelButton}
              >
                <Text style={styles.confirmCancelText}>Cancel</Text>
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
          <Pressable style={styles.confirmCard} onPress={() => undefined}>
            <Text style={styles.confirmTitle}>Delete this task?</Text>
            <Text style={styles.confirmBody}>
              {taskPendingDelete
                ? `"${taskPendingDelete.title}" will be removed from your list.`
                : ''}
            </Text>
            <View style={styles.confirmActions}>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Cancel delete task"
                onPress={() => setTaskPendingDelete(null)}
                style={styles.confirmCancelButton}
              >
                <Text style={styles.confirmCancelText}>Cancel</Text>
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
    backgroundColor: '#1A1A2E',
  },
  scrollContent: {
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
  screenTitle: {
    color: '#AFC3E8',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  topCards: {
    gap: 10,
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
    color: '#DCE8FC',
    fontSize: 15,
    fontWeight: '700',
  },
  resetButton: {
    minHeight: 36,
    minWidth: 66,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  resetButtonPressed: {
    opacity: 0.85,
  },
  resetButtonText: {
    color: '#D7E6FF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  loadingText: {
    color: '#A8B8D7',
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
    color: '#B8C9E8',
    fontSize: 13,
    fontWeight: '600',
  },
  suggestButton: {
    minHeight: 38,
    borderRadius: 12,
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(52,211,195,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(52,211,195,0.45)',
  },
  suggestButtonText: {
    color: '#D5FCF8',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(7, 10, 24, 0.72)',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  modalCard: {
    borderRadius: 18,
    backgroundColor: '#131D3C',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    padding: 14,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  modalTitle: {
    color: '#E7F0FF',
    fontSize: 15,
    fontWeight: '800',
  },
  modalCloseButton: {
    minHeight: 30,
    paddingHorizontal: 10,
    borderRadius: 10,
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  modalCloseText: {
    color: '#CFE0FF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  confirmCard: {
    borderRadius: 18,
    backgroundColor: '#1A2347',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    padding: 16,
  },
  confirmTitle: {
    color: '#EEF6FF',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 8,
  },
  confirmBody: {
    color: '#B8C9E8',
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
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  confirmCancelText: {
    color: '#D6E4FF',
    fontSize: 12,
    fontWeight: '700',
  },
  confirmDeleteButton: {
    minHeight: 36,
    borderRadius: 10,
    paddingHorizontal: 12,
    justifyContent: 'center',
    backgroundColor: 'rgba(239,68,68,0.22)',
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.45)',
  },
  confirmDeleteText: {
    color: '#FECACA',
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
    maxHeight: 240,
    gap: 8,
  },
  emptySuggestionText: {
    color: '#AFC2E6',
    fontSize: 13,
  },
  suggestionItem: {
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  suggestionItemTitle: {
    color: '#EAF3FF',
    fontSize: 13,
    fontWeight: '700',
  },
  suggestionItemDetail: {
    color: '#B7C8E6',
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
