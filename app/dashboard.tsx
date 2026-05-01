import React, { ComponentType, useEffect, useMemo, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import type { WenwenProps } from '@/components/WenwenBase';

type TodoItem = {
  id: string;
  title: string;
  detail: string;
  due: string;
  done: boolean;
};

const SAMPLE_TODOS: TodoItem[] = [
  {
    id: 'todo-1',
    title: 'Morning check-in',
    detail: 'Log mood and energy before 10:00 AM.',
    due: 'Today, 9:30 AM',
    done: false,
  },
  {
    id: 'todo-2',
    title: 'Drink water',
    detail: 'Complete 8 glasses target for the day.',
    due: 'Today, 6:00 PM',
    done: false,
  },
  {
    id: 'todo-3',
    title: 'Breathing exercise',
    detail: 'Do a 5-minute calm breathing cycle.',
    due: 'Today, 3:00 PM',
    done: true,
  },
  {
    id: 'todo-4',
    title: 'Evening reflection',
    detail: 'Write one win and one gratitude note.',
    due: 'Tonight, 8:30 PM',
    done: false,
  },
];

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

  const eyeColor = getParam(params.eyeColor, '#00D4C2');
  const faceColor = getParam(params.faceColor, '#E2E8F0');
  const bodyColor = getParam(params.bodyColor, '#F0F2F5');

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

  const todoSummary = useMemo(
    () => `${SAMPLE_TODOS.filter((item) => !item.done).length} pending • ${SAMPLE_TODOS.length} total`,
    []
  );

  return (
    <View style={styles.root}>
      <Text style={styles.title}>Dashboard</Text>
      <Text style={styles.subtitle}>{todoSummary}</Text>

      <View style={styles.characterArea}>
        {WenwenComponent && (
          <WenwenComponent eyeColor={eyeColor} faceColor={faceColor} bodyColor={bodyColor} />
        )}
      </View>

      <ScrollView contentContainerStyle={styles.todoList} showsVerticalScrollIndicator={false}>
        {SAMPLE_TODOS.map((todo) => (
          <View key={todo.id} style={[styles.todoCard, todo.done && styles.todoCardDone]}>
            <View style={[styles.statusDot, todo.done ? styles.statusDone : styles.statusPending]} />
            <View style={styles.todoTextWrap}>
              <Text style={[styles.todoTitle, todo.done && styles.todoTitleDone]}>{todo.title}</Text>
              <Text style={styles.todoDetail}>{todo.detail}</Text>
              <Text style={styles.todoDue}>{todo.due}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#1A1A2E',
    paddingTop: 56,
    paddingHorizontal: 20,
  },
  title: {
    color: '#F8FAFC',
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  subtitle: {
    color: '#9FB0CC',
    marginTop: 4,
    marginBottom: 6,
    fontSize: 14,
    fontWeight: '600',
  },
  characterArea: {
    height: 270,
    justifyContent: 'center',
    alignItems: 'center',
  },
  todoList: {
    paddingTop: 4,
    paddingBottom: 24,
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
  },
  todoCardDone: {
    opacity: 0.72,
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
