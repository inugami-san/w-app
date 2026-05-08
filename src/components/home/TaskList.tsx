import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { TaskItem } from '@/src/types/task';

type TaskListProps = {
  tasks: TaskItem[];
  onToggleTask: (id: string) => void;
  onRequestDeleteTask: (task: TaskItem) => void;
};

export function TaskList({ tasks, onToggleTask, onRequestDeleteTask }: TaskListProps) {
  return (
    <View style={styles.list}>
      {tasks.map((task) => (
        <Pressable
          key={task.id}
          accessibilityRole="button"
          accessibilityLabel={`Toggle task ${task.title}`}
          accessibilityHint="Long press to delete this task"
          onPress={() => onToggleTask(task.id)}
          onLongPress={() => onRequestDeleteTask(task)}
          delayLongPress={420}
          style={({ pressed }) => [
            styles.todoCard,
            task.done && styles.todoCardDone,
            pressed && styles.todoCardPressed,
          ]}
        >
          <View style={[styles.statusDot, task.done ? styles.statusDone : styles.statusPending]} />
          <View style={styles.todoTextWrap}>
            <Text style={[styles.todoTitle, task.done && styles.todoTitleDone]}>{task.title}</Text>
            <Text style={styles.todoDetail}>{task.detail}</Text>
            <Text style={styles.todoDue}>{task.due}</Text>
          </View>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 10,
  },
  todoCard: {
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.11)',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    minHeight: 64,
  },
  todoCardDone: {
    opacity: 0.72,
  },
  todoCardPressed: {
    opacity: 0.88,
  },
  statusDot: {
    width: 11,
    height: 11,
    borderRadius: 5.5,
    marginTop: 6,
  },
  statusPending: {
    backgroundColor: '#F59E0B',
  },
  statusDone: {
    backgroundColor: '#22C55E',
  },
  todoTextWrap: {
    flex: 1,
  },
  todoTitle: {
    color: '#E2E8F0',
    fontSize: 16,
    fontWeight: '700',
  },
  todoTitleDone: {
    textDecorationLine: 'line-through',
  },
  todoDetail: {
    color: '#B7C4DB',
    marginTop: 3,
    fontSize: 13,
  },
  todoDue: {
    color: '#8AA0C1',
    marginTop: 6,
    fontSize: 12,
    fontWeight: '600',
  },
});
