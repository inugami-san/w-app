import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import type { TaskItem } from '@/src/types/task';
import { useAppTheme } from '@/src/theme/app-theme';

const REFLECTION_COMPLETION_THRESHOLD = 3;

type TaskCompletionCardProps = {
  tasks: TaskItem[];
  onOpenJournal: () => void;
  onOpenCompanion: () => void;
};

function formatTaskTitles(tasks: TaskItem[]) {
  const titles = tasks.slice(0, 2).map((task) => task.title);
  if (tasks.length > 2) return `${titles.join(', ')} and ${tasks.length - 2} more`;
  return titles.join(' and ');
}

export function TaskCompletionCard({ tasks, onOpenJournal, onOpenCompanion }: TaskCompletionCardProps) {
  const theme = useAppTheme();
  const completedTasks = tasks.filter((task) => task.done);
  const completedCount = completedTasks.length;
  const totalCount = tasks.length;
  const hasCompletedHeavyTask = completedTasks.some((task) => task.energy === 'heavy');

  if (!hasCompletedHeavyTask && completedCount < REFLECTION_COMPLETION_THRESHOLD) return null;

  const isComplete = totalCount > 0 && completedCount === totalCount;
  const handledText = formatTaskTitles(completedTasks);

  return (
    <View
      accessibilityRole="summary"
      accessibilityLabel="Reflection prompt"
      style={[styles.tooltipCard, { backgroundColor: theme.surface, borderColor: theme.border, shadowColor: theme.shadow }]}
    >
      <View style={[styles.tooltipArrow, { backgroundColor: theme.surface, borderColor: theme.border }]} />
      <View style={styles.tooltipHeader}>
        <View style={[styles.iconWrap, { backgroundColor: theme.primarySoft }]}>
          <Ionicons name={isComplete ? 'checkmark-done-outline' : 'checkmark-circle-outline'} size={17} color={theme.primaryStrong} />
        </View>
        <View style={styles.textWrap}>
          <Text style={[styles.title, { color: theme.textStrong }]}>
            {isComplete ? 'Close today?' : 'Reflect on this win'}
          </Text>
          <Text style={[styles.body, { color: theme.muted }]}>
            {`You handled ${completedCount} ${completedCount === 1 ? 'thing' : 'things'}${handledText ? `: ${handledText}` : ''}.`}
          </Text>
        </View>
      </View>

      <Text style={[styles.promptText, { color: theme.textStrong }]}>
        {isComplete ? 'This day now has something worth remembering.' : 'What made this possible today?'}
      </Text>
      <View style={styles.actionsRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Write a journal note"
          onPress={onOpenJournal}
          style={({ pressed }) => [
            styles.actionButton,
            { backgroundColor: theme.primary },
            pressed && styles.pressed,
          ]}
        >
          <Ionicons name="journal-outline" size={15} color="#FFFFFF" />
          <Text style={styles.primaryActionText}>Write note</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Ask Wenwen to reflect"
          onPress={onOpenCompanion}
          style={({ pressed }) => [
            styles.secondaryButton,
            { backgroundColor: theme.surface, borderColor: theme.softBorder },
            pressed && styles.pressed,
          ]}
        >
          <Ionicons name="chatbubble-ellipses-outline" size={15} color={theme.primaryStrong} />
          <Text style={[styles.secondaryActionText, { color: theme.primaryStrong }]}>Ask Wenwen</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tooltipCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
    shadowOpacity: 0.04,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 1,
  },
  tooltipArrow: {
    position: 'absolute',
    top: -6,
    right: 42,
    width: 12,
    height: 12,
    borderLeftWidth: 1,
    borderTopWidth: 1,
    transform: [{ rotate: '45deg' }],
  },
  tooltipHeader: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '900',
  },
  body: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
  },
  promptText: {
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 17,
    marginTop: 12,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  actionButton: {
    minHeight: 38,
    borderRadius: 19,
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  secondaryButton: {
    minHeight: 38,
    borderRadius: 19,
    borderWidth: 1,
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  primaryActionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },
  secondaryActionText: {
    fontSize: 12,
    fontWeight: '900',
  },
  pressed: {
    opacity: 0.86,
  },
});
