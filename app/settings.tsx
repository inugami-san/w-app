import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { BottomTabPlaceholder, type DashboardTabKey } from '@/src/components/home/BottomTabPlaceholder';
import { REMINDER_TIME_OPTIONS, syncGentleReminder } from '@/src/services/gentle-reminders';
import { NIGHTLY_REVIEW_TIME, syncNightlyReviewNotification } from '@/src/services/nightly-review-notifications';
import { useJournalStore } from '@/src/store/journal-store';
import { type AppThemeMode, type ReminderTimeKey, usePreferencesStore } from '@/src/store/preferences-store';
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

export default function SettingsScreen() {
  const [isReminderBusy, setIsReminderBusy] = useState(false);
  const [isNightlyReviewBusy, setIsNightlyReviewBusy] = useState(false);
  const frequency = useJournalStore((state) => state.evaluationFrequency);
  const setFrequency = useJournalStore((state) => state.setEvaluationFrequency);
  const themeMode = usePreferencesStore((state) => state.themeMode);
  const setThemeMode = usePreferencesStore((state) => state.setThemeMode);
  const displayName = usePreferencesStore((state) => state.displayName);
  const setDisplayName = usePreferencesStore((state) => state.setDisplayName);
  const remindersEnabled = usePreferencesStore((state) => state.remindersEnabled);
  const reminderTime = usePreferencesStore((state) => state.reminderTime);
  const reminderNotificationId = usePreferencesStore((state) => state.reminderNotificationId);
  const nightlyReviewEnabled = usePreferencesStore((state) => state.nightlyReviewEnabled);
  const nightlyReviewNotificationId = usePreferencesStore((state) => state.nightlyReviewNotificationId);
  const setReminderSettings = usePreferencesStore((state) => state.setReminderSettings);
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
          <View style={styles.dataRow}>
            <View style={[styles.dataIcon, { backgroundColor: theme.primarySoft }]}>
              <Ionicons name="shield-checkmark-outline" size={18} color={theme.primaryStrong} />
            </View>
            <View style={styles.optionTextWrap}>
              <Text style={[styles.cardTitle, { color: theme.textStrong }]}>Data safety</Text>
              <Text style={[styles.cardCaption, { color: theme.muted }]}>
                Tasks, journals, chat history, and preferences are stored on this device. AI summaries only use the text needed to write the review.
              </Text>
            </View>
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
  bottomTabWrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
  },
});
