import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { router, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import { APP_THEME } from '@/src/theme/app-theme';
import { generateWellnessReview } from '@/src/services/gemini-wellness-review';
import { getGentleReminderNotificationData } from '@/src/services/gentle-reminders';
import { getJournalNotificationData } from '@/src/services/journal-notifications';
import {
  getNightlyReviewNotificationData,
  syncNightlyReviewNotification,
} from '@/src/services/nightly-review-notifications';
import {
  buildWellnessReviewSource,
  buildWellnessReviewSourceWithMovement,
  createFallbackWellnessReview,
  getCompletedReviewPeriod,
  hasWellnessReviewActivity,
} from '@/src/services/wellness-review';
import { startLocationAutoSync, stopLocationAutoSync } from '@/src/services/location-sync';
import { useCompanionStore } from '@/src/store/companion-store';
import { useJournalStore } from '@/src/store/journal-store';
import { useLocationStore } from '@/src/store/location-store';
import { usePreferencesStore } from '@/src/store/preferences-store';
import {
  PERSONA_CHARGE_COST,
  PERSONA_CHARGE_HOURS,
  REWARD_CURRENCY_NAME,
  useRewardStore,
} from '@/src/store/reward-store';
import { useTaskStore } from '@/src/store/task-store';
import { useWellnessReviewStore } from '@/src/store/wellness-review-store';
import { getLocalDateKey } from '@/src/utils/date';
import type { WellnessReviewPeriod, WellnessReviewSummary } from '@/src/types/wellness-review';

export const unstable_settings = {
  initialRouteName: 'index',
};

const WELLNESS_REVIEW_TIMEOUT_MS = 8000;

function generateWellnessReviewSafely(source: ReturnType<typeof buildWellnessReviewSource>) {
  const fallback = createFallbackWellnessReview(source);

  return new Promise<ReturnType<typeof createFallbackWellnessReview>>((resolve) => {
    const timeoutId = setTimeout(() => {
      resolve(fallback);
    }, WELLNESS_REVIEW_TIMEOUT_MS);

    generateWellnessReview(source)
      .then(resolve)
      .catch(() => resolve(fallback))
      .finally(() => clearTimeout(timeoutId));
  });
}

function formatCompactNumber(value: number) {
  if (value >= 1000) return `${Math.round(value / 100) / 10}k`;
  return `${value}`;
}

export default function RootLayout() {
  const themeMode = usePreferencesStore((state) => state.themeMode);
  const reducedMotion = usePreferencesStore((state) => state.reducedMotion);
  const hasCompletedOnboarding = usePreferencesStore((state) => state.hasCompletedOnboarding);
  const preferencesHydrated = usePreferencesStore((state) => state.hasHydrated);
  const locationAutoSyncEnabled = usePreferencesStore((state) => state.locationAutoSyncEnabled);
  const setLocationAutoSyncEnabled = usePreferencesStore((state) => state.setLocationAutoSyncEnabled);
  const nightlyReviewEnabled = usePreferencesStore((state) => state.nightlyReviewEnabled);
  const nightlyReviewNotificationId = usePreferencesStore((state) => state.nightlyReviewNotificationId);
  const setReminderSettings = usePreferencesStore((state) => state.setReminderSettings);
  const evaluationFrequency = useJournalStore((state) => state.evaluationFrequency);
  const tasks = useTaskStore((state) => state.tasks);
  const tasksHydrated = useTaskStore((state) => state.hasHydrated);
  const resetDailyTasks = useTaskStore((state) => state.resetDailyTasks);
  const journalEntries = useJournalStore((state) => state.entries);
  const journalHydrated = useJournalStore((state) => state.hasHydrated);
  const lastFeelingScaleShownDateKey = useJournalStore((state) => state.lastFeelingScaleShownDateKey);
  const setFeelingScale = useJournalStore((state) => state.setFeelingScale);
  const companionEntries = useCompanionStore((state) => state.entries);
  const companionHydrated = useCompanionStore((state) => state.hasHydrated);
  const wellnessReviews = useWellnessReviewStore((state) => state.reviews);
  const lastShownWellnessPeriodKey = useWellnessReviewStore((state) => state.lastShownPeriodKey);
  const wellnessReviewHydrated = useWellnessReviewStore((state) => state.hasHydrated);
  const locationHydrated = useLocationStore((state) => state.hasHydrated);
  const rewardsHydrated = useRewardStore((state) => state.hasHydrated);
  const glowBalance = useRewardStore((state) => state.glowBalance);
  const personaChargeExpiresAt = useRewardStore((state) => state.personaChargeExpiresAt);
  const chargePersona = useRewardStore((state) => state.chargePersona);
  const autoSyncStatus = useLocationStore((state) => state.autoSyncStatus);
  const addWellnessReview = useWellnessReviewStore((state) => state.addReview);
  const setLastShownWellnessPeriodKey = useWellnessReviewStore((state) => state.setLastShownPeriodKey);
  const requestedWellnessPeriodKey = useWellnessReviewStore((state) => state.requestedPeriodKey);
  const clearRequestedReview = useWellnessReviewStore((state) => state.clearRequestedReview);
  const today = useMemo(() => getLocalDateKey(), []);
  const [activeWellnessPeriod, setActiveWellnessPeriod] = useState<WellnessReviewPeriod | null>(null);
  const [activeWellnessReview, setActiveWellnessReview] = useState<WellnessReviewSummary | null>(null);
  const [isWellnessReviewVisible, setIsWellnessReviewVisible] = useState(false);
  const [isWellnessReviewLoading, setIsWellnessReviewLoading] = useState(false);
  const [isFeelingScaleVisible, setIsFeelingScaleVisible] = useState(false);
  const [chargeClock, setChargeClock] = useState(() => Date.now());
  const [dismissedWellnessPeriodKey, setDismissedWellnessPeriodKey] = useState('');
  const syncedNightlyReviewSignatureRef = useRef('');
  const locationAutoSyncStartedRef = useRef(false);
  const nightlyReviewNotificationIdRef = useRef(nightlyReviewNotificationId);
  const activeWellnessPeriodKeyRef = useRef('');
  const wellnessReviewRequestIdRef = useRef(0);
  const isDark = themeMode === 'dark';
  const appTheme = APP_THEME[themeMode];
  const tabScreenOptions = useMemo(
    () => ({
      headerShown: false,
      animation: reducedMotion ? ('none' as const) : ('fade' as const),
      animationDuration: reducedMotion ? 0 : 120,
    }),
    [reducedMotion]
  );
  const loginScreenOptions = useMemo(
    () => ({
      headerShown: false,
      animation: reducedMotion ? ('none' as const) : ('fade' as const),
    }),
    [reducedMotion]
  );
  const storesHydrated =
    preferencesHydrated &&
    tasksHydrated &&
    journalHydrated &&
    companionHydrated &&
    wellnessReviewHydrated &&
    locationHydrated &&
    rewardsHydrated;
  const isPersonaCharged = useMemo(
    () => {
      const expiresAt = Date.parse(personaChargeExpiresAt);
      return Number.isFinite(expiresAt) && expiresAt > chargeClock;
    },
    [chargeClock, personaChargeExpiresAt]
  );
  const reviewActivitySignature = useMemo(() => {
    return JSON.stringify({
      tasks: tasks.map((task) => `${task.id}:${task.updatedAt}:${task.done}`).join('|'),
      journals: Object.values(journalEntries)
        .map((entry) => `${entry.dateKey}:${entry.updatedAt}`)
        .sort()
        .join('|'),
      companion: Object.values(companionEntries)
        .map((entry) => `${entry.dateKey}:${entry.updatedAt}`)
        .sort()
        .join('|'),
    });
  }, [companionEntries, journalEntries, tasks]);

  const pendingWellnessPeriod = useMemo(() => {
    if (!hasCompletedOnboarding || !storesHydrated) return null;
    if (!reviewActivitySignature) return null;

    const period = getCompletedReviewPeriod(evaluationFrequency, today);
    if (!period) return null;
    if (period.key === lastShownWellnessPeriodKey) return null;

    const source = buildWellnessReviewSource(period);
    if (!hasWellnessReviewActivity(source)) return null;

    return period;
  }, [
    evaluationFrequency,
    hasCompletedOnboarding,
    lastShownWellnessPeriodKey,
    reviewActivitySignature,
    storesHydrated,
    today,
  ]);

  useEffect(() => {
    nightlyReviewNotificationIdRef.current = nightlyReviewNotificationId;
  }, [nightlyReviewNotificationId]);

  useEffect(() => {
    const interval = setInterval(() => setChargeClock(Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!tasksHydrated || !journalHydrated) return;
    resetDailyTasks();
  }, [journalHydrated, resetDailyTasks, tasksHydrated]);

  useEffect(() => {
    if (!hasCompletedOnboarding || !storesHydrated) return;
    if (!locationAutoSyncEnabled) {
      locationAutoSyncStartedRef.current = false;
      if (autoSyncStatus === 'checking' || autoSyncStatus === 'ready') {
        stopLocationAutoSync().catch(() => undefined);
      }
      return;
    }
    if (locationAutoSyncStartedRef.current) return;
    if (autoSyncStatus === 'checking' || autoSyncStatus === 'ready') return;

    locationAutoSyncStartedRef.current = true;
    startLocationAutoSync()
      .then((result) => {
        if (result.status !== 'ready') {
          locationAutoSyncStartedRef.current = false;
          setLocationAutoSyncEnabled(false);
        }
      })
      .catch(() => {
        locationAutoSyncStartedRef.current = false;
        setLocationAutoSyncEnabled(false);
      });
  }, [autoSyncStatus, hasCompletedOnboarding, locationAutoSyncEnabled, setLocationAutoSyncEnabled, storesHydrated]);

  const nightlyReviewSignature = useMemo(() => {
    const journalEntry = journalEntries[today];
    const companionEntry = companionEntries[today];

    return JSON.stringify({
      tasks: tasks.map((task) => ({
        id: task.id,
        title: task.title,
        done: task.done,
        updatedAt: task.updatedAt,
      })),
      journalUpdatedAt: journalEntry?.updatedAt ?? '',
      journalMood: journalEntry?.mood ?? '',
      journalNote: journalEntry?.feelingNote ?? '',
      companionUpdatedAt: companionEntry?.updatedAt ?? '',
      companionMessages: companionEntry?.messages.length ?? 0,
    });
  }, [companionEntries, journalEntries, tasks, today]);

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const reminderData = getGentleReminderNotificationData(response);
      if (reminderData) {
        router.push('/dashboard');
        return;
      }

      const nightlyReviewData = getNightlyReviewNotificationData(response);
      if (nightlyReviewData) {
        router.push('/dashboard');
        return;
      }

      const data = getJournalNotificationData(response);
      if (!data) return;

      router.push({
        pathname: '/journal/[dateKey]',
        params: {
          dateKey: data.dateKey,
          summaryId: data.summaryId,
        },
      });
    });

    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (!nightlyReviewEnabled) return;
    if (!preferencesHydrated || !tasksHydrated || !companionHydrated) return;
    if (syncedNightlyReviewSignatureRef.current === nightlyReviewSignature) return;

    syncedNightlyReviewSignatureRef.current = nightlyReviewSignature;
    let isCurrent = true;

    syncNightlyReviewNotification({
      enabled: true,
      existingNotificationId: nightlyReviewNotificationIdRef.current,
    })
      .then((notificationId) => {
        if (!isCurrent) return;
        nightlyReviewNotificationIdRef.current = notificationId;
        setReminderSettings({ nightlyReviewNotificationId: notificationId });
      })
      .catch(() => undefined);

    return () => {
      isCurrent = false;
    };
  }, [
    companionHydrated,
    nightlyReviewEnabled,
    nightlyReviewSignature,
    preferencesHydrated,
    setReminderSettings,
    tasksHydrated,
  ]);

  const startWellnessReviewGeneration = useCallback(
    (period: WellnessReviewPeriod) => {
      setActiveWellnessReview(null);
      setIsWellnessReviewLoading(true);
      const requestId = wellnessReviewRequestIdRef.current + 1;
      wellnessReviewRequestIdRef.current = requestId;

      buildWellnessReviewSourceWithMovement(period)
        .then(generateWellnessReviewSafely)
        .then((reviewInput) => {
          if (wellnessReviewRequestIdRef.current !== requestId) return;
          const review = addWellnessReview(reviewInput);
          setActiveWellnessReview(review);
        })
        .finally(() => {
          if (wellnessReviewRequestIdRef.current !== requestId) return;
          setIsWellnessReviewLoading(false);
        });
    },
    [addWellnessReview]
  );

  useEffect(() => {
    if (!hasCompletedOnboarding) return;
    if (!storesHydrated) return;
    if (isWellnessReviewVisible || isWellnessReviewLoading) return;

    const period = pendingWellnessPeriod;
    if (!period) return;
    const wasRequested = requestedWellnessPeriodKey === period.key;
    if (!wasRequested && period.key === dismissedWellnessPeriodKey) return;
    if (period.key === activeWellnessPeriodKeyRef.current) return;

    const existingReview = wellnessReviews[period.key];
    activeWellnessPeriodKeyRef.current = period.key;
    setActiveWellnessPeriod(period);
    setIsWellnessReviewVisible(true);

    if (existingReview) {
      setActiveWellnessReview(existingReview);
      return;
    }

    setActiveWellnessReview(null);
    setIsWellnessReviewLoading(false);
    if (isPersonaCharged) {
      startWellnessReviewGeneration(period);
    }
  }, [
    dismissedWellnessPeriodKey,
    hasCompletedOnboarding,
    isPersonaCharged,
    isWellnessReviewLoading,
    isWellnessReviewVisible,
    pendingWellnessPeriod,
    requestedWellnessPeriodKey,
    startWellnessReviewGeneration,
    storesHydrated,
    wellnessReviews,
  ]);

  useEffect(() => {
    if (!hasCompletedOnboarding) return;
    if (!storesHydrated) return;
    if (pendingWellnessPeriod) return;
    if (isWellnessReviewVisible || isWellnessReviewLoading || isFeelingScaleVisible) return;
    if (lastFeelingScaleShownDateKey === today) return;

    const timer = setTimeout(() => {
      setIsFeelingScaleVisible(true);
    }, 450);

    return () => clearTimeout(timer);
  }, [
    hasCompletedOnboarding,
    isFeelingScaleVisible,
    isWellnessReviewLoading,
    isWellnessReviewVisible,
    lastFeelingScaleShownDateKey,
    pendingWellnessPeriod,
    storesHydrated,
    today,
  ]);

  const closeWellnessReview = () => {
    wellnessReviewRequestIdRef.current += 1;

    if (activeWellnessPeriod) {
      if (activeWellnessReview) {
        setLastShownWellnessPeriodKey(activeWellnessPeriod.key);
      } else {
        setDismissedWellnessPeriodKey(activeWellnessPeriod.key);
      }
      if (requestedWellnessPeriodKey === activeWellnessPeriod.key) {
        clearRequestedReview();
      }
    }

    activeWellnessPeriodKeyRef.current = '';
    setIsWellnessReviewVisible(false);
    setIsWellnessReviewLoading(false);
    setActiveWellnessPeriod(null);
    setActiveWellnessReview(null);
  };

  const handleChargeAndWriteWellnessReview = () => {
    if (!activeWellnessPeriod) return;

    if (!isPersonaCharged) {
      const didCharge = chargePersona();
      if (!didCharge) return;
      setChargeClock(Date.now());
    }

    startWellnessReviewGeneration(activeWellnessPeriod);
  };

  const closeFeelingScale = (score: number | null) => {
    setFeelingScale(today, score);
    setIsFeelingScaleVisible(false);
  };

  return (
    <GestureHandlerRootView style={styles.root}>
      <ThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="login" options={loginScreenOptions} />
          <Stack.Screen name="main" options={tabScreenOptions} />
          <Stack.Screen name="dashboard" options={tabScreenOptions} />
          <Stack.Screen name="journal" options={tabScreenOptions} />
          <Stack.Screen name="journal/[dateKey]" options={tabScreenOptions} />
          <Stack.Screen name="settings" options={tabScreenOptions} />
          <Stack.Screen name="companion" options={tabScreenOptions} />
          <Stack.Screen name="profile" options={tabScreenOptions} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        </Stack>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <Modal
          transparent
          animationType="fade"
          visible={isWellnessReviewVisible}
          onRequestClose={closeWellnessReview}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.reviewCard, { backgroundColor: appTheme.surface, borderColor: appTheme.border }]}>
              <View style={styles.reviewHeader}>
                <View style={styles.reviewHeaderText}>
                  <Text style={[styles.reviewKicker, { color: appTheme.subtle }]}>
                    {activeWellnessPeriod?.label ?? 'Review'}
                  </Text>
                  <Text style={[styles.reviewTitle, { color: appTheme.text }]}>
                    {activeWellnessPeriod?.title ?? 'Review'}
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Close review"
                  onPress={closeWellnessReview}
                  style={[styles.closeButton, { backgroundColor: appTheme.softSurface }]}
                >
                  <Ionicons name="close" size={19} color={appTheme.muted} />
                </Pressable>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.reviewScrollContent}>
                {isWellnessReviewLoading ? (
                  <View style={styles.loadingBlock}>
                    <ActivityIndicator color={appTheme.primaryStrong} />
                    <Text style={[styles.loadingText, { color: appTheme.muted }]}>Writing your review...</Text>
                  </View>
                ) : activeWellnessReview ? (
                  <>
                    <View style={[styles.summaryBlock, { backgroundColor: appTheme.primarySoft, borderColor: appTheme.softBorder }]}>
                      <Text style={[styles.summaryTitle, { color: appTheme.textStrong }]}>{activeWellnessReview.title}</Text>
                      <Text style={[styles.summaryBody, { color: appTheme.muted }]}>{activeWellnessReview.body}</Text>
                    </View>

                    <View style={styles.statsRow}>
                      <View style={[styles.statPill, { backgroundColor: appTheme.softSurface, borderColor: appTheme.softBorder }]}>
                        <Text style={[styles.statValue, { color: appTheme.primaryStrong }]}>
                          {activeWellnessReview.completedTaskCount}/{activeWellnessReview.taskCount}
                        </Text>
                        <Text style={[styles.statLabel, { color: appTheme.muted }]}>tasks</Text>
                      </View>
                      <View style={[styles.statPill, { backgroundColor: appTheme.softSurface, borderColor: appTheme.softBorder }]}>
                        <Text style={[styles.statValue, { color: appTheme.primaryStrong }]}>{activeWellnessReview.journalCount}</Text>
                        <Text style={[styles.statLabel, { color: appTheme.muted }]}>journals</Text>
                      </View>
                      <View style={[styles.statPill, { backgroundColor: appTheme.softSurface, borderColor: appTheme.softBorder }]}>
                        <Text style={[styles.statValue, { color: appTheme.primaryStrong }]}>{activeWellnessReview.companionMessageCount}</Text>
                        <Text style={[styles.statLabel, { color: appTheme.muted }]}>chats</Text>
                      </View>
                      <View style={[styles.statPill, { backgroundColor: appTheme.softSurface, borderColor: appTheme.softBorder }]}>
                        <Text style={[styles.statValue, { color: appTheme.primaryStrong }]}>
                          {typeof activeWellnessReview.stepCount === 'number'
                            ? formatCompactNumber(activeWellnessReview.stepCount)
                            : '-'}
                        </Text>
                        <Text style={[styles.statLabel, { color: appTheme.muted }]}>steps</Text>
                      </View>
                      <View style={[styles.statPill, { backgroundColor: appTheme.softSurface, borderColor: appTheme.softBorder }]}>
                        <Text style={[styles.statValue, { color: appTheme.primaryStrong }]}>
                          {activeWellnessReview.locationCount ?? 0}
                        </Text>
                        <Text style={[styles.statLabel, { color: appTheme.muted }]}>places</Text>
                      </View>
                    </View>
                  </>
                ) : (
                  <View style={[styles.emptyReviewBlock, { backgroundColor: appTheme.softSurface, borderColor: appTheme.softBorder }]}>
                    <View style={[styles.emptyReviewIcon, { backgroundColor: appTheme.primarySoft }]}>
                      <Ionicons name="flash-off-outline" size={22} color={appTheme.primaryStrong} />
                    </View>
                    <Text style={[styles.summaryTitle, { color: appTheme.textStrong }]}>Wenwen has no energy</Text>
                    <Text style={[styles.summaryBody, { color: appTheme.muted }]}>
                      Yesterday&apos;s activity is ready to review, but Wenwen needs energy before writing it.
                    </Text>
                    <TouchableOpacity
                      accessibilityRole="button"
                      accessibilityLabel="Use Energy to write review"
                      disabled={!isPersonaCharged && glowBalance < PERSONA_CHARGE_COST}
                      onPress={handleChargeAndWriteWellnessReview}
                      style={[
                        styles.primaryButton,
                        {
                          backgroundColor:
                            isPersonaCharged || glowBalance >= PERSONA_CHARGE_COST
                              ? appTheme.primary
                              : appTheme.softBorder,
                        },
                      ]}
                    >
                      <Text style={styles.primaryButtonText}>
                        {isPersonaCharged
                          ? 'Write review'
                          : glowBalance >= PERSONA_CHARGE_COST
                            ? `Use ${PERSONA_CHARGE_COST} ${REWARD_CURRENCY_NAME}`
                            : 'Earn Energy first'}
                      </Text>
                    </TouchableOpacity>
                    <Text style={[styles.emptyReviewHint, { color: appTheme.muted }]}>
                      {PERSONA_CHARGE_COST} {REWARD_CURRENCY_NAME} wakes Wenwen for {PERSONA_CHARGE_HOURS} hours.
                    </Text>
                  </View>
                )}
              </ScrollView>

              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Close review"
                onPress={closeWellnessReview}
                style={[styles.primaryButton, { backgroundColor: appTheme.primary }]}
              >
                <Text style={styles.primaryButtonText}>{activeWellnessReview ? 'Continue' : 'Not now'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
        <Modal
          transparent
          animationType="fade"
          visible={isFeelingScaleVisible}
          onRequestClose={() => closeFeelingScale(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.feelingCard, { backgroundColor: appTheme.surface, borderColor: appTheme.border }]}>
              <View style={[styles.feelingIcon, { backgroundColor: appTheme.primarySoft }]}>
                <Ionicons name="heart-outline" size={22} color={appTheme.primaryStrong} />
              </View>
              <Text style={[styles.reviewKicker, { color: appTheme.subtle }]}>Daily check-in</Text>
              <Text style={[styles.feelingTitle, { color: appTheme.text }]}>How are you feeling right now?</Text>
              <Text style={[styles.feelingBody, { color: appTheme.muted }]}>
                Choose a number from 1 to 10. 1 means very low, 10 means steady.
              </Text>

              <View style={styles.scaleGrid}>
                {Array.from({ length: 10 }, (_, index) => index + 1).map((score) => (
                  <Pressable
                    key={score}
                    accessibilityRole="button"
                    accessibilityLabel={`Rate feeling ${score} out of 10`}
                    onPress={() => closeFeelingScale(score)}
                    style={({ pressed }) => [
                      styles.scaleButton,
                      {
                        backgroundColor: appTheme.softSurface,
                        borderColor: appTheme.softBorder,
                      },
                      pressed && styles.scaleButtonPressed,
                    ]}
                  >
                    <Text style={[styles.scaleButtonText, { color: appTheme.textStrong }]}>{score}</Text>
                  </Pressable>
                ))}
              </View>

              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Skip feeling check-in today"
                onPress={() => closeFeelingScale(null)}
                style={[styles.skipFeelingButton, { backgroundColor: appTheme.softSurface }]}
              >
                <Text style={[styles.skipFeelingText, { color: appTheme.muted }]}>Not now</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(24, 36, 58, 0.32)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  reviewCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    maxHeight: '82%',
    shadowColor: '#28384E',
    shadowOpacity: 0.18,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 18 },
    elevation: 8,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  reviewHeaderText: {
    flex: 1,
  },
  reviewKicker: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  reviewTitle: {
    fontSize: 22,
    fontWeight: '900',
    marginTop: 2,
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewScrollContent: {
    gap: 12,
    paddingBottom: 2,
  },
  loadingBlock: {
    minHeight: 150,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
    textAlign: 'center',
  },
  summaryBlock: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 6,
  },
  summaryBody: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 21,
  },
  emptyReviewBlock: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    alignItems: 'center',
  },
  emptyReviewIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyReviewHint: {
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
    textAlign: 'center',
    marginTop: 10,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statPill: {
    flexGrow: 1,
    flexBasis: '30%',
    borderRadius: 14,
    borderWidth: 1,
    padding: 10,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '900',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '800',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  primaryButton: {
    minHeight: 46,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  feelingCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 18,
    shadowColor: '#28384E',
    shadowOpacity: 0.18,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 18 },
    elevation: 8,
  },
  feelingIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  feelingTitle: {
    fontSize: 24,
    fontWeight: '900',
    marginTop: 4,
  },
  feelingBody: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 21,
    marginTop: 8,
  },
  scaleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 18,
  },
  scaleButton: {
    width: 48,
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scaleButtonPressed: {
    opacity: 0.78,
    transform: [{ scale: 0.96 }],
  },
  scaleButtonText: {
    fontSize: 16,
    fontWeight: '900',
  },
  skipFeelingButton: {
    minHeight: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
  },
  skipFeelingText: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
});
