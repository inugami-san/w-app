import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { buildMemoryTimeline } from '@/src/services/user-insights';
import { useCompanionStore } from '@/src/store/companion-store';
import { useJournalStore } from '@/src/store/journal-store';
import { useTaskStore } from '@/src/store/task-store';
import { useAppTheme } from '@/src/theme/app-theme';

function getIcon(source: 'tasks' | 'journal' | 'companion') {
  if (source === 'journal') return 'journal-outline';
  if (source === 'companion') return 'chatbubble-ellipses-outline';
  return 'checkmark-circle-outline';
}

export function MemoryTimelineCard() {
  const theme = useAppTheme();
  const tasks = useTaskStore((state) => state.tasks);
  const journalEntries = useJournalStore((state) => state.entries);
  const companionEntries = useCompanionStore((state) => state.entries);
  const items = useMemo(
    () => buildMemoryTimeline({ tasks, journalEntries, companionEntries }),
    [companionEntries, journalEntries, tasks]
  );

  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}> 
      <View style={styles.headerRow}>
        <View style={styles.titleWrap}>
          <Text style={[styles.cardTitle, { color: theme.textStrong }]}>Memory timeline</Text>
          <Text style={[styles.cardCaption, { color: theme.muted }]}>Recent local context Wenwen can use when memory is enabled.</Text>
        </View>
        <View style={[styles.iconWrap, { backgroundColor: theme.primarySoft }]}> 
          <Ionicons name="time-outline" size={18} color={theme.primaryStrong} />
        </View>
      </View>

      {items.length === 0 ? (
        <View style={[styles.emptyBox, { backgroundColor: theme.softSurface, borderColor: theme.softBorder }]}> 
          <Text style={[styles.emptyText, { color: theme.muted }]}>No memory items yet. Tasks, journals, and chats will appear here after use.</Text>
        </View>
      ) : (
        <View style={styles.list}>
          {items.map((item) => (
            <View key={item.id} style={[styles.memoryRow, { backgroundColor: theme.softSurface, borderColor: theme.softBorder }]}> 
              <View style={[styles.memoryIcon, { backgroundColor: theme.primarySoft }]}> 
                <Ionicons name={getIcon(item.source)} size={16} color={theme.primaryStrong} />
              </View>
              <View style={styles.memoryTextWrap}>
                <Text style={[styles.memoryTitle, { color: theme.textStrong }]}>{item.title}</Text>
                <Text style={[styles.memoryDetail, { color: theme.muted }]}>{item.detail}</Text>
                <Text style={[styles.memoryMeta, { color: theme.subtle }]}>{item.meta}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      <View style={styles.actionsRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open journal"
          onPress={() => router.replace('/journal')}
          style={({ pressed }) => [
            styles.actionButton,
            { backgroundColor: theme.softSurface, borderColor: theme.softBorder },
            pressed && styles.pressed,
          ]}
        >
          <Ionicons name="journal-outline" size={15} color={theme.primaryStrong} />
          <Text style={[styles.actionText, { color: theme.primaryStrong }]}>Journal</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open companion"
          onPress={() => router.replace('/companion')}
          style={({ pressed }) => [
            styles.actionButton,
            { backgroundColor: theme.softSurface, borderColor: theme.softBorder },
            pressed && styles.pressed,
          ]}
        >
          <Ionicons name="chatbubble-ellipses-outline" size={15} color={theme.primaryStrong} />
          <Text style={[styles.actionText, { color: theme.primaryStrong }]}>Companion</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 18,
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  titleWrap: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '900',
  },
  cardCaption: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
    marginTop: 5,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyBox: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginTop: 14,
  },
  emptyText: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
  },
  list: {
    gap: 8,
    marginTop: 14,
  },
  memoryRow: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    flexDirection: 'row',
    gap: 10,
  },
  memoryIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memoryTextWrap: {
    flex: 1,
  },
  memoryTitle: {
    fontSize: 13,
    fontWeight: '900',
  },
  memoryDetail: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
    marginTop: 3,
  },
  memoryMeta: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginTop: 5,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
  },
  actionButton: {
    flex: 1,
    minHeight: 40,
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '900',
  },
  pressed: {
    opacity: 0.86,
  },
});
