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
          <Ionicons name="leaf-outline" size={20} color={theme.primaryStrong} />
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
        const isWaiting = !task.done && completionCooldownRemaining > 0;

        return (
          <Pressable
            key={task.id}
            accessibilityRole="button"
            accessibilityLabel={`${task.title}, ${task.done ? 'finished' : 'open'}`}
            accessibilityHint={isWaiting ? 'Please wait before completing another task' : 'Long press to delete this task'}
            accessibilityState={{ checked: task.done, disabled: isWaiting }}
            onPress={() => onToggleTask(task)}
            onLongPress={() => onRequestDeleteTask(task)}
            delayLongPress={420}
            style={({ pressed }) => [
              styles.todoCard,
              { backgroundColor: theme.surface, borderColor: theme.border, shadowColor: theme.shadow },
              task.done && styles.todoCardDone,
              isWaiting && styles.todoCardWaiting,
              pressed && styles.todoCardPressed,
            ]}
          >
            <View style={[styles.statusMark, task.done ? styles.statusDone : styles.statusPending]}>
              {task.done && <Ionicons name="checkmark" size={13} color="#FFFFFF" />}
            </View>
            <View style={styles.todoTextWrap}>
              <Text style={[styles.todoTitle, { color: theme.textStrong }, task.done && styles.todoTitleDone]}>
                {task.title}
              </Text>
              <Text style={[styles.todoDetail, { color: theme.muted }]}>{task.detail}</Text>
              <Text style={[styles.todoDue, { color: theme.subtle }]}>{task.due}</Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 10,
  },
  todoCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    minHeight: 64,
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 1,
  },
  todoCardDone: {
    opacity: 0.72,
  },
  todoCardWaiting: {
    opacity: 0.86,
  },
  todoCardPressed: {
    opacity: 0.88,
  },
  statusMark: {
    width: 22,
    height: 22,
    borderRadius: 11,
    marginTop: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusPending: {
    backgroundColor: '#F8B84E',
  },
  statusDone: {
    backgroundColor: '#56BA88',
  },
  todoTextWrap: {
    flex: 1,
  },
  todoTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  todoTitleDone: {
    textDecorationLine: 'line-through',
  },
  todoDetail: {
    marginTop: 3,
    fontSize: 13,
  },
  todoDue: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: '600',
  },
  emptyCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    alignItems: 'flex-start',
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
