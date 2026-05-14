import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { BottomTabPlaceholder, type DashboardTabKey } from '@/src/components/home/BottomTabPlaceholder';
import { useJournalStore } from '@/src/store/journal-store';
import { type AppThemeMode, usePreferencesStore } from '@/src/store/preferences-store';
import { useAppTheme } from '@/src/theme/app-theme';
import type { EvaluationFrequency } from '@/src/types/journal';

const FREQUENCY_OPTIONS: {
  value: EvaluationFrequency;
  title: string;
  detail: string;
}[] = [
  {
    value: 'daily',
    title: 'Daily',
    detail: 'Wenwen can evaluate each day from tasks and journal notes.',
  },
  {
    value: 'every3days',
    title: 'Every 3 days',
    detail: 'A calmer rhythm with a little more context between notes.',
  },
  {
    value: 'weekly',
    title: 'Weekly',
    detail: 'A broader reflection across the week.',
  },
];

const THEME_OPTIONS: {
  value: AppThemeMode;
  title: string;
  detail: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  {
    value: 'light',
    title: 'Light',
    detail: 'Default calm white appearance.',
    icon: 'sunny-outline',
  },
  {
    value: 'dark',
    title: 'Dark',
    detail: 'A softer low-light app shell.',
    icon: 'moon-outline',
  },
];

export default function SettingsScreen() {
  const frequency = useJournalStore((state) => state.evaluationFrequency);
  const setFrequency = useJournalStore((state) => state.setEvaluationFrequency);
  const themeMode = usePreferencesStore((state) => state.themeMode);
  const setThemeMode = usePreferencesStore((state) => state.setThemeMode);
  const theme = useAppTheme();

  const handleTabPress = (tab: DashboardTabKey) => {
    if (tab === 'settings') return;
    if (tab === 'home') {
      router.push('/dashboard');
      return;
    }
    if (tab === 'customize') {
      router.push('/main');
      return;
    }
    if (tab === 'journal') {
      router.push('/journal');
      return;
    }
    if (tab === 'companion') {
      router.push('/companion');
      return;
    }
    router.push('/modal');
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={[styles.screenTitle, { color: theme.subtle }]}>Settings</Text>
        <Text style={[styles.heroTitle, { color: theme.text }]}>Wenwen rhythm</Text>
        <Text style={[styles.heroSubtitle, { color: theme.muted }]}>
          Choose how often Wenwen reflects on tasks and notes.
        </Text>

        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.textStrong }]}>Appearance</Text>
          <Text style={[styles.cardCaption, { color: theme.muted }]}>
            Choose the app theme. Light is the default.
          </Text>

          <View style={styles.optionList}>
            {THEME_OPTIONS.map((option) => {
              const isActive = themeMode === option.value;
              return (
                <Pressable
                  key={option.value}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: isActive }}
                  accessibilityLabel={`${option.title} mode`}
                  onPress={() => setThemeMode(option.value)}
                  style={[
                    styles.optionRow,
                    {
                      backgroundColor: theme.softSurface,
                      borderColor: theme.softBorder,
                    },
                    isActive && {
                      backgroundColor: theme.primarySoft,
                      borderColor: theme.primary,
                    },
                  ]}
                >
                  <View style={[styles.optionIcon, { backgroundColor: theme.primarySoft }]}>
                    <Ionicons
                      name={option.icon}
                      size={18}
                      color={isActive ? theme.primaryStrong : theme.muted}
                    />
                  </View>
                  <View style={styles.optionTextWrap}>
                    <Text
                      style={[
                        styles.optionTitle,
                        { color: theme.textStrong },
                        isActive && { color: theme.primaryStrong },
                      ]}
                    >
                      {option.title}
                    </Text>
                    <Text style={[styles.optionDetail, { color: theme.muted }]}>
                      {option.detail}
                    </Text>
                  </View>
                  <Ionicons
                    name={isActive ? 'checkmark-circle' : 'ellipse-outline'}
                    size={22}
                    color={isActive ? theme.primary : theme.subtle}
                  />
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.textStrong }]}>Evaluation frequency</Text>
          <Text style={[styles.cardCaption, { color: theme.muted }]}>
            This controls when Wenwen should summarize finished tasks, unfinished tasks, and journal notes.
          </Text>

          <View style={styles.optionList}>
            {FREQUENCY_OPTIONS.map((option) => {
              const isActive = frequency === option.value;
              return (
                <Pressable
                  key={option.value}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: isActive }}
                  accessibilityLabel={option.title}
                  onPress={() => setFrequency(option.value)}
                  style={[
                    styles.optionRow,
                    {
                      backgroundColor: theme.softSurface,
                      borderColor: theme.softBorder,
                    },
                    isActive && {
                      backgroundColor: theme.primarySoft,
                      borderColor: theme.primary,
                    },
                  ]}
                >
                  <View style={styles.optionTextWrap}>
                    <Text
                      style={[
                        styles.optionTitle,
                        { color: theme.textStrong },
                        isActive && { color: theme.primaryStrong },
                      ]}
                    >
                      {option.title}
                    </Text>
                    <Text style={[styles.optionDetail, { color: theme.muted }]}>
                      {option.detail}
                    </Text>
                  </View>
                  <Ionicons
                    name={isActive ? 'checkmark-circle' : 'ellipse-outline'}
                    size={22}
                    color={isActive ? theme.primary : theme.subtle}
                  />
                </Pressable>
              );
            })}
          </View>
        </View>
      </ScrollView>

      <View style={styles.bottomTabWrap}>
        <BottomTabPlaceholder activeKey="settings" onTabPress={handleTabPress} />
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
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  cardCaption: {
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 18,
    marginTop: 4,
  },
  optionList: {
    marginTop: 12,
    gap: 10,
  },
  optionRow: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  optionTextWrap: {
    flex: 1,
  },
  optionIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  optionDetail: {
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 17,
    marginTop: 3,
  },
  bottomTabWrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
  },
});
