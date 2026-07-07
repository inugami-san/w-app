import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { BottomTabPlaceholder, type DashboardTabKey } from '@/src/components/home/BottomTabPlaceholder';
import { REMINDER_TIME_OPTIONS, syncGentleReminder } from '@/src/services/gentle-reminders';
import { NIGHTLY_REVIEW_TIME, syncNightlyReviewNotification } from '@/src/services/nightly-review-notifications';
import { startLocationAutoSync, stopLocationAutoSync } from '@/src/services/location-sync';
import { useCompanionStore } from '@/src/store/companion-store';
import { useJournalStore } from '@/src/store/journal-store';
import { useLocationStore } from '@/src/store/location-store';
import { type AppThemeMode, type ReminderTimeKey, usePreferencesStore } from '@/src/store/preferences-store';
import { useRewardStore } from '@/src/store/reward-store';
import { useTaskStore } from '@/src/store/task-store';
import { useWellnessReviewStore } from '@/src/store/wellness-review-store';
import { useAppTheme } from '@/src/theme/app-theme';
import type { EvaluationFrequency } from '@/src/types/journal';
import { INPUT_LIMITS } from '@/src/utils/input-limits';

const FREQUENCY_OPTIONS: {
  value: EvaluationFrequency;
  title: string;
  detail: string;
}[] = [
  {
    value: 'daily',
    title: 'Daily',
    detail: 'Reviews yesterday. On Mondays, reviews the previous week.',
  },
  {
    value: 'every3days',
    title: 'Every 3 days',
    detail: 'Reviews the latest completed 3-day period.',
  },
  {
    value: 'weekly',
    title: 'Weekly',
    detail: 'Reviews the latest completed week.',
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
    detail: 'Default white appearance.',
    icon: 'sunny-outline',
  },
  {
    value: 'dark',
    title: 'Dark',
    detail: 'Low-light app shell.',
    icon: 'moon-outline',
  },
];

const STEP_TRACKING_OPTIONS: {
  value: boolean;
  title: string;
  detail: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  {
    value: true,
    title: 'Enabled',
    detail: 'Show step counts on Home, Profile, and reviews when motion permission is available.',
    icon: 'walk-outline',
  },
  {
    value: false,
    title: 'Disabled',
    detail: 'Hide step loading and stop Wenwen from reading step counts.',
    icon: 'remove-circle-outline',
  },
];

type AiPrivacyKey = 'tasks' | 'journal' | 'companion' | 'images' | 'locations';

const AI_PRIVACY_OPTIONS: {
  key: AiPrivacyKey;
  title: string;
  detail: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  {
    key: 'tasks',
    title: 'Tasks',
    detail: 'Let AI use task titles and completion status for suggestions, companion context, and reviews.',
    icon: 'checkmark-circle-outline',
  },
  {
    key: 'journal',
    title: 'Journal entries',
    detail: 'Let AI use journal notes, moods, feeling ratings, and daily context.',
    icon: 'journal-outline',
  },
  {
    key: 'companion',
    title: 'Companion chats',
    detail: 'Let AI use previous companion messages when writing reviews or memory-aware replies.',
    icon: 'chatbubble-ellipses-outline',
  },
  {
    key: 'images',
    title: 'Journal photos',
    detail: 'Let AI receive attached journal image data when creating journal summaries.',
    icon: 'image-outline',
  },
  {
    key: 'locations',
    title: 'Saved places',
    detail: 'Let AI use saved place counts and labels when writing daily or weekly reviews.',
    icon: 'location-outline',
  },
];

export default function SettingsScreen() {
  const [isReminderBusy, setIsReminderBusy] = useState(false);
  const [isNightlyReviewBusy, setIsNightlyReviewBusy] = useState(false);
  const [isLocationSyncBusy, setIsLocationSyncBusy] = useState(false);
  const frequency = useJournalStore((state) => state.evaluationFrequency);
  const setFrequency = useJournalStore((state) => state.setEvaluationFrequency);
  const clearJournalData = useJournalStore((state) => state.clearJournalData);
  const clearCompanionData = useCompanionStore((state) => state.clearCompanionData);
  const clearLocationVisits = useLocationStore((state) => state.clearVisits);
  const clearRewards = useRewardStore((state) => state.clearRewards);
  const clearTasks = useTaskStore((state) => state.clearTasks);
  const clearWellnessReviews = useWellnessReviewStore((state) => state.clearWellnessReviews);
  const themeMode = usePreferencesStore((state) => state.themeMode);
  const setThemeMode = usePreferencesStore((state) => state.setThemeMode);
  const reducedMotion = usePreferencesStore((state) => state.reducedMotion);
  const setReducedMotion = usePreferencesStore((state) => state.setReducedMotion);
  const displayName = usePreferencesStore((state) => state.displayName);
  const setDisplayName = usePreferencesStore((state) => state.setDisplayName);
  const remindersEnabled = usePreferencesStore((state) => state.remindersEnabled);
  const reminderTime = usePreferencesStore((state) => state.reminderTime);
  const reminderNotificationId = usePreferencesStore((state) => state.reminderNotificationId);
  const nightlyReviewEnabled = usePreferencesStore((state) => state.nightlyReviewEnabled);
  const nightlyReviewNotificationId = usePreferencesStore((state) => state.nightlyReviewNotificationId);
  const companionMemoryEnabled = usePreferencesStore((state) => state.companionMemoryEnabled);
  const setCompanionMemoryEnabled = usePreferencesStore((state) => state.setCompanionMemoryEnabled);
  const aiTaskContextEnabled = usePreferencesStore((state) => state.aiTaskContextEnabled);
  const setAiTaskContextEnabled = usePreferencesStore((state) => state.setAiTaskContextEnabled);
  const aiJournalContextEnabled = usePreferencesStore((state) => state.aiJournalContextEnabled);
  const setAiJournalContextEnabled = usePreferencesStore((state) => state.setAiJournalContextEnabled);
  const aiCompanionContextEnabled = usePreferencesStore((state) => state.aiCompanionContextEnabled);
  const setAiCompanionContextEnabled = usePreferencesStore((state) => state.setAiCompanionContextEnabled);
  const aiJournalImageContextEnabled = usePreferencesStore((state) => state.aiJournalImageContextEnabled);
  const setAiJournalImageContextEnabled = usePreferencesStore((state) => state.setAiJournalImageContextEnabled);
  const aiLocationContextEnabled = usePreferencesStore((state) => state.aiLocationContextEnabled);
  const setAiLocationContextEnabled = usePreferencesStore((state) => state.setAiLocationContextEnabled);
  const locationAutoSyncEnabled = usePreferencesStore((state) => state.locationAutoSyncEnabled);
  const setLocationAutoSyncEnabled = usePreferencesStore((state) => state.setLocationAutoSyncEnabled);
  const stepTrackingEnabled = usePreferencesStore((state) => state.stepTrackingEnabled);
  const setStepTrackingEnabled = usePreferencesStore((state) => state.setStepTrackingEnabled);
  const resetHomeGuide = usePreferencesStore((state) => state.resetHomeGuide);
  const resetPreferences = usePreferencesStore((state) => state.resetPreferences);
  const setReminderSettings = usePreferencesStore((state) => state.setReminderSettings);
  const theme = useAppTheme();

  const handleTabPress = (tab: DashboardTabKey) => {
    if (tab === 'profile') {
      router.replace('/profile');
      return;
    }
    if (tab === 'home') {
      router.replace('/dashboard');
      return;
    }
    if (tab === 'customize') {
      router.replace('/main');
      return;
    }
    if (tab === 'journal') {
      router.replace('/journal');
      return;
    }
    if (tab === 'companion') {
      router.replace('/companion');
      return;
    }
    router.push('/modal');
  };

  const handleUpdateReminder = async (enabled: boolean, time: ReminderTimeKey = reminderTime) => {
    if (isReminderBusy) return;

    setIsReminderBusy(true);
    try {
      const notificationId = await syncGentleReminder({
        enabled,
        time,
        existingNotificationId: reminderNotificationId,
      });

      if (enabled && !notificationId) {
        Alert.alert('Reminder not enabled', 'Notifications are not available or permission was not granted.');
        setReminderSettings({
          remindersEnabled: false,
          reminderTime: time,
          reminderNotificationId: null,
        });
        return;
      }

      setReminderSettings({
        remindersEnabled: enabled,
        reminderTime: time,
        reminderNotificationId: notificationId,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to update reminders right now.';
      Alert.alert('Reminder update failed', message);
    } finally {
      setIsReminderBusy(false);
    }
  };

  const handleUpdateNightlyReview = async (enabled: boolean) => {
    if (isNightlyReviewBusy) return;

    setIsNightlyReviewBusy(true);
    try {
      const notificationId = await syncNightlyReviewNotification({
        enabled,
        existingNotificationId: nightlyReviewNotificationId,
      });

      if (enabled && !notificationId) {
        Alert.alert('Nightly review not enabled', 'Notifications are not available or permission was not granted.');
        setReminderSettings({
          nightlyReviewEnabled: false,
          nightlyReviewNotificationId: null,
        });
        return;
      }

      setReminderSettings({
        nightlyReviewEnabled: enabled,
        nightlyReviewNotificationId: notificationId,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to update the nightly review right now.';
      Alert.alert('Nightly review update failed', message);
    } finally {
      setIsNightlyReviewBusy(false);
    }
  };

  const handleUpdateLocationAutoSync = async (enabled: boolean) => {
    if (isLocationSyncBusy) return;

    setIsLocationSyncBusy(true);
    try {
      if (!enabled) {
        await stopLocationAutoSync();
        setLocationAutoSyncEnabled(false);
        return;
      }

      setLocationAutoSyncEnabled(true);
      const result = await startLocationAutoSync();
      if (result.status !== 'ready') {
        Alert.alert('Place auto-sync not enabled', result.message);
        setLocationAutoSyncEnabled(false);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to update place auto-sync.';
      Alert.alert('Place auto-sync failed', message);
      setLocationAutoSyncEnabled(false);
    } finally {
      setIsLocationSyncBusy(false);
    }
  };

  const confirmAction = (title: string, message: string, onConfirm: () => void | Promise<void>) => {
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Continue',
        style: 'destructive',
        onPress: () => {
          void onConfirm();
        },
      },
    ]);
  };

  const handleReplayGuide = () => {
    resetHomeGuide();
    Alert.alert('Guide restored', 'The Home guide will appear again on the dashboard.');
    router.replace('/dashboard');
  };

  const handleExportData = async () => {
    const preferenceState = usePreferencesStore.getState();
    const journalState = useJournalStore.getState();
    const taskState = useTaskStore.getState();
    const companionState = useCompanionStore.getState();
    const reviewState = useWellnessReviewStore.getState();
    const locationState = useLocationStore.getState();

    const exportPayload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      profile: {
        displayName: preferenceState.displayName,
        themeMode: preferenceState.themeMode,
        avatarPersona: preferenceState.avatarPersona,
        avatarColors: preferenceState.avatarColors,
      },
      settings: {
        evaluationFrequency: journalState.evaluationFrequency,
        remindersEnabled: preferenceState.remindersEnabled,
        reminderTime: preferenceState.reminderTime,
        nightlyReviewEnabled: preferenceState.nightlyReviewEnabled,
        companionMemoryEnabled: preferenceState.companionMemoryEnabled,
        aiTaskContextEnabled: preferenceState.aiTaskContextEnabled,
        aiJournalContextEnabled: preferenceState.aiJournalContextEnabled,
        aiCompanionContextEnabled: preferenceState.aiCompanionContextEnabled,
        aiJournalImageContextEnabled: preferenceState.aiJournalImageContextEnabled,
        aiLocationContextEnabled: preferenceState.aiLocationContextEnabled,
        stepTrackingEnabled: preferenceState.stepTrackingEnabled,
        reducedMotion: preferenceState.reducedMotion,
      },
      tasks: taskState.tasks,
      journalEntries: journalState.entries,
      companionEntries: companionState.entries,
      wellnessReviews: reviewState.reviews,
      locationVisits: locationState.visits,
    };

    try {
      await Share.share({
        title: 'Wenwen data export',
        message: JSON.stringify(exportPayload, null, 2),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to open the export sheet.';
      Alert.alert('Export failed', message);
    }
  };

  const handleClearCompanionMemory = () => {
    confirmAction(
      'Clear companion memory?',
      'This removes saved companion chats and summaries from this device.',
      clearCompanionData
    );
  };

  const handleClearJournalData = () => {
    confirmAction(
      'Clear journals and reviews?',
      'This removes journal entries, feeling check-ins, attached photo references, and wellness reviews from this device.',
      () => {
        clearJournalData();
        clearWellnessReviews();
      }
    );
  };

  const handleClearTasks = () => {
    confirmAction(
      'Clear tasks?',
      'This removes your current task list and resets the starter-task prompt.',
      clearTasks
    );
  };

  const handleClearLocationVisits = () => {
    confirmAction(
      'Clear saved places?',
      'This removes location check-ins saved on this device.',
      async () => {
        await stopLocationAutoSync();
        setLocationAutoSyncEnabled(false);
        clearLocationVisits();
      }
    );
  };

  const handleClearAllData = () => {
    confirmAction(
      'Clear all Wenwen data?',
      'This removes tasks, journals, companion chats, reviews, saved places, preferences, reminders, and onboarding state from this device.',
      async () => {
        await syncGentleReminder({
          enabled: false,
          time: reminderTime,
          existingNotificationId: reminderNotificationId,
        });
        await syncNightlyReviewNotification({
          enabled: false,
          existingNotificationId: nightlyReviewNotificationId,
        });
        await stopLocationAutoSync();

        clearTasks();
        clearJournalData();
        clearCompanionData();
        clearWellnessReviews();
        clearLocationVisits();
        clearRewards();
        setFrequency('daily');
        resetPreferences();
        router.replace('/login');
      }
    );
  };

  const aiPrivacyState = {
    tasks: aiTaskContextEnabled,
    journal: aiJournalContextEnabled,
    companion: aiCompanionContextEnabled,
    images: aiJournalImageContextEnabled,
    locations: aiLocationContextEnabled,
  };

  const handleToggleAiPrivacy = (key: AiPrivacyKey) => {
    if (key === 'tasks') {
      setAiTaskContextEnabled(!aiTaskContextEnabled);
      return;
    }
    if (key === 'journal') {
      setAiJournalContextEnabled(!aiJournalContextEnabled);
      return;
    }
    if (key === 'companion') {
      setAiCompanionContextEnabled(!aiCompanionContextEnabled);
      return;
    }
    if (key === 'locations') {
      setAiLocationContextEnabled(!aiLocationContextEnabled);
      return;
    }
    setAiJournalImageContextEnabled(!aiJournalImageContextEnabled);
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={[styles.screenTitle, { color: theme.subtle }]}>Settings</Text>
        <Text style={[styles.heroTitle, { color: theme.text }]}>Preferences</Text>
        <Text style={[styles.heroSubtitle, { color: theme.muted }]}>
          Choose how often the app reviews tasks and notes.
        </Text>

        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.textStrong }]}>Profile</Text>
          <Text style={[styles.cardCaption, { color: theme.muted }]}>
            Update the name shown on Home.
          </Text>
          <TextInput
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Name"
            placeholderTextColor={theme.subtle}
            autoCapitalize="words"
            maxLength={INPUT_LIMITS.displayName}
            style={[
              styles.profileInput,
              {
                backgroundColor: theme.softSurface,
                borderColor: theme.softBorder,
                color: theme.text,
              },
            ]}
          />
        </View>

        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.dataRow}>
            <View style={[styles.dataIcon, { backgroundColor: theme.primarySoft }]}>
              <Ionicons name="map-outline" size={18} color={theme.primaryStrong} />
            </View>
            <View style={styles.optionTextWrap}>
              <Text style={[styles.cardTitle, { color: theme.textStrong }]}>How Wenwen works</Text>
              <Text style={[styles.cardCaption, { color: theme.muted }]}>
                Tasks help you choose one action, Journal stores daily notes, and Companion helps sort thoughts into a next step.
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Replay Wenwen guide"
                onPress={handleReplayGuide}
                style={({ pressed }) => [
                  styles.secondaryActionButton,
                  { backgroundColor: theme.softSurface, borderColor: theme.softBorder },
                  pressed && styles.actionPressed,
                ]}
              >
                <Ionicons name="refresh-outline" size={16} color={theme.primaryStrong} />
                <Text style={[styles.secondaryActionText, { color: theme.primaryStrong }]}>Replay guide</Text>
              </Pressable>
            </View>
          </View>
        </View>

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

          <View style={[styles.inlineSetting, { borderTopColor: theme.border }]}>
            <View style={styles.optionTextWrap}>
              <Text style={[styles.optionTitle, { color: theme.textStrong }]}>Reduced motion</Text>
              <Text style={[styles.optionDetail, { color: theme.muted }]}>
                Minimizes screen and tab movement for a steadier app feel.
              </Text>
            </View>
            <Pressable
              accessibilityRole="switch"
              accessibilityState={{ checked: reducedMotion }}
              accessibilityLabel="Enable reduced motion"
              onPress={() => setReducedMotion(!reducedMotion)}
              style={[
                styles.switchTrack,
                {
                  backgroundColor: reducedMotion ? theme.primary : theme.softSurface,
                  borderColor: reducedMotion ? theme.primary : theme.softBorder,
                },
              ]}
            >
              <View
                style={[
                  styles.switchThumb,
                  {
                    backgroundColor: reducedMotion ? '#FFFFFF' : theme.subtle,
                    transform: [{ translateX: reducedMotion ? 18 : 0 }],
                  },
                ]}
              />
            </Pressable>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.textStrong }]}>Evaluation frequency</Text>
          <Text style={[styles.cardCaption, { color: theme.muted }]}>
            This controls when the app summarizes tasks, journal notes, and companion chats.
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

        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.optionTextWrap}>
              <Text style={[styles.cardTitle, { color: theme.textStrong }]}>Reminders</Text>
              <Text style={[styles.cardCaption, { color: theme.muted }]}>
                Daily reminder for tasks and check-ins.
              </Text>
            </View>
            <Pressable
              accessibilityRole="switch"
              accessibilityState={{ checked: remindersEnabled, disabled: isReminderBusy }}
              accessibilityLabel="Enable reminders"
              disabled={isReminderBusy}
              onPress={() => handleUpdateReminder(!remindersEnabled)}
              style={[
                styles.switchTrack,
                {
                  backgroundColor: remindersEnabled ? theme.primary : theme.softSurface,
                  borderColor: remindersEnabled ? theme.primary : theme.softBorder,
                },
                isReminderBusy && styles.optionDisabled,
              ]}
            >
              <View
                style={[
                  styles.switchThumb,
                  {
                    backgroundColor: remindersEnabled ? '#FFFFFF' : theme.subtle,
                    transform: [{ translateX: remindersEnabled ? 18 : 0 }],
                  },
                ]}
              />
            </Pressable>
          </View>

          <View style={styles.timeGrid}>
            {REMINDER_TIME_OPTIONS.map((option) => {
              const isActive = reminderTime === option.value;
              return (
                <Pressable
                  key={option.value}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: isActive, disabled: isReminderBusy }}
                  accessibilityLabel={`${option.title} reminder`}
                  disabled={isReminderBusy}
                  onPress={() => handleUpdateReminder(remindersEnabled, option.value)}
                  style={[
                    styles.timeOption,
                    {
                      backgroundColor: theme.softSurface,
                      borderColor: theme.softBorder,
                    },
                    isActive && {
                      backgroundColor: theme.primarySoft,
                      borderColor: theme.primary,
                    },
                    isReminderBusy && styles.optionDisabled,
                  ]}
                >
                  <Text style={[styles.timeTitle, { color: isActive ? theme.primaryStrong : theme.textStrong }]}>
                    {option.title}
                  </Text>
                  <Text style={[styles.timeDetail, { color: theme.muted }]}>{option.detail}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.optionTextWrap}>
              <Text style={[styles.cardTitle, { color: theme.textStrong }]}>Nightly review</Text>
              <Text style={[styles.cardCaption, { color: theme.muted }]}>
                At 9:30 PM, Wenwen summarizes tasks, journal notes, and companion chat activity with a short encouraging note.
              </Text>
            </View>
            <Pressable
              accessibilityRole="switch"
              accessibilityState={{ checked: nightlyReviewEnabled, disabled: isNightlyReviewBusy }}
              accessibilityLabel="Enable nightly review"
              disabled={isNightlyReviewBusy}
              onPress={() => handleUpdateNightlyReview(!nightlyReviewEnabled)}
              style={[
                styles.switchTrack,
                {
                  backgroundColor: nightlyReviewEnabled ? theme.primary : theme.softSurface,
                  borderColor: nightlyReviewEnabled ? theme.primary : theme.softBorder,
                },
                isNightlyReviewBusy && styles.optionDisabled,
              ]}
            >
              <View
                style={[
                  styles.switchThumb,
                  {
                    backgroundColor: nightlyReviewEnabled ? '#FFFFFF' : theme.subtle,
                    transform: [{ translateX: nightlyReviewEnabled ? 18 : 0 }],
                  },
                ]}
              />
            </Pressable>
          </View>

          <View style={[styles.fixedTimeRow, { backgroundColor: theme.softSurface, borderColor: theme.softBorder }]}>
            <Ionicons name="moon-outline" size={16} color={theme.primaryStrong} />
            <Text style={[styles.fixedTimeText, { color: theme.muted }]}>
              {NIGHTLY_REVIEW_TIME.hour - 12}:{String(NIGHTLY_REVIEW_TIME.minute).padStart(2, '0')} PM every night
            </Text>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.textStrong }]}>Step tracking</Text>
          <Text style={[styles.cardCaption, { color: theme.muted }]}>
            Controls whether Wenwen reads motion step counts for Home, Profile, Energy rewards, and reviews.
          </Text>

          <View style={styles.optionList}>
            {STEP_TRACKING_OPTIONS.map((option) => {
              const isActive = stepTrackingEnabled === option.value;
              return (
                <Pressable
                  key={option.title}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: isActive }}
                  accessibilityLabel={`Step tracking ${option.title.toLowerCase()}`}
                  onPress={() => setStepTrackingEnabled(option.value)}
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
                    <Text style={[styles.optionDetail, { color: theme.muted }]}>{option.detail}</Text>
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
          <View style={styles.cardHeaderRow}>
            <View style={styles.optionTextWrap}>
              <Text style={[styles.cardTitle, { color: theme.textStrong }]}>Place auto-sync</Text>
              <Text style={[styles.cardCaption, { color: theme.muted }]}>
                Automatically saves recent places for review context and the Places card on Home.
              </Text>
            </View>
            <Pressable
              accessibilityRole="switch"
              accessibilityState={{ checked: locationAutoSyncEnabled, disabled: isLocationSyncBusy }}
              accessibilityLabel="Enable place auto-sync"
              disabled={isLocationSyncBusy}
              onPress={() => handleUpdateLocationAutoSync(!locationAutoSyncEnabled)}
              style={[
                styles.switchTrack,
                {
                  backgroundColor: locationAutoSyncEnabled ? theme.primary : theme.softSurface,
                  borderColor: locationAutoSyncEnabled ? theme.primary : theme.softBorder,
                },
                isLocationSyncBusy && styles.optionDisabled,
              ]}
            >
              <View
                style={[
                  styles.switchThumb,
                  {
                    backgroundColor: locationAutoSyncEnabled ? '#FFFFFF' : theme.subtle,
                    transform: [{ translateX: locationAutoSyncEnabled ? 18 : 0 }],
                  },
                ]}
              />
            </Pressable>
          </View>

          <View style={[styles.fixedTimeRow, { backgroundColor: theme.softSurface, borderColor: theme.softBorder }]}>
            <Ionicons name="location-outline" size={16} color={theme.primaryStrong} />
            <Text style={[styles.fixedTimeText, { color: theme.muted }]}>
              When off, background place syncing stops and the Home Places card is hidden.
            </Text>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.optionTextWrap}>
              <Text style={[styles.cardTitle, { color: theme.textStrong }]}>Companion memory</Text>
              <Text style={[styles.cardCaption, { color: theme.muted }]}>
                Let Wenwen use recent tasks, journals, check-ins, and previous chats to answer with more context.
              </Text>
            </View>
            <Pressable
              accessibilityRole="switch"
              accessibilityState={{ checked: companionMemoryEnabled }}
              accessibilityLabel="Enable companion memory"
              onPress={() => setCompanionMemoryEnabled(!companionMemoryEnabled)}
              style={[
                styles.switchTrack,
                {
                  backgroundColor: companionMemoryEnabled ? theme.primary : theme.softSurface,
                  borderColor: companionMemoryEnabled ? theme.primary : theme.softBorder,
                },
              ]}
            >
              <View
                style={[
                  styles.switchThumb,
                  {
                    backgroundColor: companionMemoryEnabled ? '#FFFFFF' : theme.subtle,
                    transform: [{ translateX: companionMemoryEnabled ? 18 : 0 }],
                  },
                ]}
              />
            </Pressable>
          </View>
          <View style={[styles.fixedTimeRow, { backgroundColor: theme.softSurface, borderColor: theme.softBorder }]}>
            <Ionicons name="information-circle-outline" size={16} color={theme.primaryStrong} />
            <Text style={[styles.fixedTimeText, { color: theme.muted }]}>
              When enabled, relevant local memory is included with companion AI requests.
            </Text>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.textStrong }]}>AI privacy</Text>
          <Text style={[styles.cardCaption, { color: theme.muted }]}>
            Choose which local content Wenwen can include with AI requests. Voice transcription still sends the recording you choose to transcribe.
          </Text>

          <View style={styles.optionList}>
            {AI_PRIVACY_OPTIONS.map((option) => {
              const isEnabled = aiPrivacyState[option.key];
              return (
                <View
                  key={option.key}
                  style={[
                    styles.optionRow,
                    {
                      backgroundColor: theme.softSurface,
                      borderColor: theme.softBorder,
                    },
                  ]}
                >
                  <View style={[styles.optionIcon, { backgroundColor: theme.primarySoft }]}>
                    <Ionicons name={option.icon} size={18} color={theme.primaryStrong} />
                  </View>
                  <View style={styles.optionTextWrap}>
                    <Text style={[styles.optionTitle, { color: theme.textStrong }]}>
                      {option.title}
                    </Text>
                    <Text style={[styles.optionDetail, { color: theme.muted }]}>
                      {option.detail}
                    </Text>
                  </View>
                  <Pressable
                    accessibilityRole="switch"
                    accessibilityState={{ checked: isEnabled }}
                    accessibilityLabel={`Allow AI to use ${option.title.toLowerCase()}`}
                    onPress={() => handleToggleAiPrivacy(option.key)}
                    style={[
                      styles.switchTrack,
                      {
                        backgroundColor: isEnabled ? theme.primary : theme.softSurface,
                        borderColor: isEnabled ? theme.primary : theme.softBorder,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.switchThumb,
                        {
                          backgroundColor: isEnabled ? '#FFFFFF' : theme.subtle,
                          transform: [{ translateX: isEnabled ? 18 : 0 }],
                        },
                      ]}
                    />
                  </Pressable>
                </View>
              );
            })}
          </View>

          {!aiJournalContextEnabled && (
            <View style={[styles.fixedTimeRow, { backgroundColor: theme.softSurface, borderColor: theme.softBorder }]}>
              <Ionicons name="lock-closed-outline" size={16} color={theme.primaryStrong} />
              <Text style={[styles.fixedTimeText, { color: theme.muted }]}>
                Journal summaries use a local fallback while journal access is off.
              </Text>
            </View>
          )}
        </View>

        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.dataRow}>
            <View style={[styles.dataIcon, { backgroundColor: theme.primarySoft }]}>
              <Ionicons name="shield-checkmark-outline" size={18} color={theme.primaryStrong} />
            </View>
            <View style={styles.optionTextWrap}>
              <Text style={[styles.cardTitle, { color: theme.textStrong }]}>Data safety</Text>
              <Text style={[styles.cardCaption, { color: theme.muted }]}>
                Tasks, journals, chat history, and preferences are stored on this device. AI features only send the context needed for the current request.
              </Text>
              <View style={styles.dataActions}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Export Wenwen data"
                  onPress={handleExportData}
                  style={({ pressed }) => [
                    styles.secondaryActionButton,
                    { backgroundColor: theme.softSurface, borderColor: theme.softBorder },
                    pressed && styles.actionPressed,
                  ]}
                >
                  <Ionicons name="download-outline" size={16} color={theme.primaryStrong} />
                  <Text style={[styles.secondaryActionText, { color: theme.primaryStrong }]}>Export data</Text>
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Clear companion memory"
                  onPress={handleClearCompanionMemory}
                  style={({ pressed }) => [
                    styles.secondaryActionButton,
                    { backgroundColor: theme.softSurface, borderColor: theme.softBorder },
                    pressed && styles.actionPressed,
                  ]}
                >
                  <Ionicons name="chatbubble-ellipses-outline" size={16} color={theme.primaryStrong} />
                  <Text style={[styles.secondaryActionText, { color: theme.primaryStrong }]}>Clear chats</Text>
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Clear journals and reviews"
                  onPress={handleClearJournalData}
                  style={({ pressed }) => [
                    styles.secondaryActionButton,
                    { backgroundColor: theme.softSurface, borderColor: theme.softBorder },
                    pressed && styles.actionPressed,
                  ]}
                >
                  <Ionicons name="journal-outline" size={16} color={theme.primaryStrong} />
                  <Text style={[styles.secondaryActionText, { color: theme.primaryStrong }]}>Clear journals</Text>
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Clear tasks"
                  onPress={handleClearTasks}
                  style={({ pressed }) => [
                    styles.secondaryActionButton,
                    { backgroundColor: theme.softSurface, borderColor: theme.softBorder },
                    pressed && styles.actionPressed,
                  ]}
                >
                  <Ionicons name="checkmark-circle-outline" size={16} color={theme.primaryStrong} />
                  <Text style={[styles.secondaryActionText, { color: theme.primaryStrong }]}>Clear tasks</Text>
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Clear saved places"
                  onPress={handleClearLocationVisits}
                  style={({ pressed }) => [
                    styles.secondaryActionButton,
                    { backgroundColor: theme.softSurface, borderColor: theme.softBorder },
                    pressed && styles.actionPressed,
                  ]}
                >
                  <Ionicons name="location-outline" size={16} color={theme.primaryStrong} />
                  <Text style={[styles.secondaryActionText, { color: theme.primaryStrong }]}>Clear places</Text>
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Clear all Wenwen data"
                  onPress={handleClearAllData}
                  style={({ pressed }) => [
                    styles.dangerActionButton,
                    pressed && styles.actionPressed,
                  ]}
                >
                  <Ionicons name="trash-outline" size={16} color="#C33B3B" />
                  <Text style={styles.dangerActionText}>Clear all data</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={styles.bottomTabWrap}>
        <BottomTabPlaceholder activeKey="profile" onTabPress={handleTabPress} />
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
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
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
  profileInput: {
    minHeight: 46,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    fontWeight: '700',
    marginTop: 12,
  },
  optionRow: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  inlineSetting: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  optionDisabled: {
    opacity: 0.56,
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
  switchTrack: {
    width: 52,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    padding: 3,
    justifyContent: 'center',
  },
  switchThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  timeGrid: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
  },
  timeOption: {
    flex: 1,
    minHeight: 68,
    borderRadius: 14,
    borderWidth: 1,
    padding: 10,
    justifyContent: 'center',
  },
  timeTitle: {
    fontSize: 12,
    fontWeight: '900',
  },
  timeDetail: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
  },
  fixedTimeRow: {
    minHeight: 42,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 14,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fixedTimeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  dataRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  dataIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dataActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  secondaryActionButton: {
    minHeight: 38,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  secondaryActionText: {
    fontSize: 12,
    fontWeight: '900',
  },
  dangerActionButton: {
    minHeight: 38,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#FFD3D3',
    backgroundColor: '#FFF0F0',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  dangerActionText: {
    color: '#C33B3B',
    fontSize: 12,
    fontWeight: '900',
  },
  actionPressed: {
    opacity: 0.84,
  },
  bottomTabWrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
  },
});
