import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import type { TaskItem } from '@/src/types/task';
import { useAppTheme } from '@/src/theme/app-theme';

type TaskListProps = {
  tasks: TaskItem[];
  onToggleTask: (task: TaskItem) => void;
  onRequestDeleteTask: (task: TaskItem) => void;
  completionCooldownRemaining: number;
};

export function TaskList({
  tasks,
  onToggleTask,
  onRequestDeleteTask,
  completionCooldownRemaining,
}: TaskListProps) {
  const theme = useAppTheme();

  if (tasks.length === 0) {
    return (
      <View style={[styles.emptyCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={[styles.emptyIcon, { backgroundColor: theme.primarySoft }]}>
          <Ionicons name="add-circle-outline" size={20} color={theme.primaryStrong} />
        </View>
        <Text style={[styles.emptyTitle, { color: theme.textStrong }]}>No tasks yet</Text>
        <Text style={[styles.emptyBody, { color: theme.muted }]}>
          Add a task for today.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.list}>
      {tasks.map((task) => {
        const isWaiting = completionCooldownRemaining > 0;

        return (
          <Pressable
            key={task.id}
            accessibilityRole="button"
            accessibilityLabel={`${task.title}, ${task.done ? 'finished' : 'open'}`}
            accessibilityHint={isWaiting ? 'Please wait for cooldown to finish' : 'Long press to delete this task'}
            accessibilityState={{ checked: task.done, disabled: isWaiting }}
            onPress={isWaiting ? undefined : () => onToggleTask(task)}
            onLongPress={isWaiting ? undefined : () => onRequestDeleteTask(task)}
            disabled={isWaiting}
            delayLongPress={420}
            style={({ pressed }) => [
              styles.todoCard,
              {
                backgroundColor: task.done ? theme.activeSurface : theme.surface,
                borderColor: task.done ? theme.primary : theme.border,
                shadowColor: theme.shadow,
              },
              task.done && styles.todoCardDone,
              isWaiting && styles.todoCardWaiting,
              pressed && styles.todoCardPressed,
            ]}
          >
            <View
              style={[
                styles.statusMark,
                {
                  backgroundColor: task.done ? theme.primary : theme.softSurface,
                  borderColor: task.done ? theme.primary : theme.softBorder,
                },
              ]}
            >
              {task.done && <Ionicons name="checkmark" size={13} color="#FFFFFF" />}
            </View>
            <View style={styles.todoTextWrap}>
              <Text style={[styles.todoTitle, { color: theme.textStrong }, task.done && styles.todoTitleDone]}>
                {task.title}
              </Text>
              <Text style={[styles.todoDetail, { color: theme.muted }]}>{task.detail}</Text>
              <View style={styles.metaRow}>
                <View style={[styles.duePill, { backgroundColor: theme.softSurface }]}>
                  <Text style={[styles.todoDue, { color: theme.subtle }]}>{task.due}</Text>
                </View>
                {task.isRoutine && (
                  <View style={[styles.routinePill, { backgroundColor: theme.primarySoft }]}>
                    <Ionicons name="repeat-outline" size={12} color={theme.primaryStrong} />
                    <Text style={[styles.routineText, { color: theme.primaryStrong }]}>Daily</Text>
                  </View>
                )}
              </View>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 9,
  },
  todoCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    minHeight: 72,
    shadowOpacity: 0.035,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 1,
  },
  todoCardDone: {
    opacity: 0.84,
  },
  todoCardWaiting: {
    opacity: 0.86,
  },
  todoCardPressed: {
    opacity: 0.88,
  },
  statusMark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginTop: 1,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  todoTextWrap: {
    flex: 1,
  },
  todoTitle: {
    fontSize: 15,
    fontWeight: '900',
    lineHeight: 20,
  },
  todoTitleDone: {
    textDecorationLine: 'line-through',
  },
  todoDetail: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 19,
  },
  metaRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  duePill: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  todoDue: {
    fontSize: 12,
    fontWeight: '800',
  },
  routinePill: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  routineText: {
    fontSize: 11,
    fontWeight: '900',
  },
  emptyCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
    alignItems: 'center',
    gap: 8,
  },
  emptyIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  emptyBody: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 19,
  },
});
