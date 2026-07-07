import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { router, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import { Ionicons } from '@expo/vector-icons';
import { Component, type ErrorInfo, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  REWARD_CURRENCY_NAME,
  WELLNESS_REVIEW_COST,
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

type AppErrorBoundaryProps = {
  children: ReactNode;
  theme: (typeof APP_THEME)[keyof typeof APP_THEME];
};

type AppErrorBoundaryState = {
  hasError: boolean;
  message: string;
};

class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = {
    hasError: false,
    message: '',
  };

  static getDerivedStateFromError(error: unknown): AppErrorBoundaryState {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : 'Something went wrong while opening this screen.',
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Screen render failed', error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, message: '' });
    router.replace('/dashboard');
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const { theme } = this.props;
    return (
      <View style={[styles.errorFallback, { backgroundColor: theme.background }]}>
        <View style={[styles.errorFallbackCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={[styles.errorFallbackIcon, { backgroundColor: theme.primarySoft }]}>
            <Ionicons name="warning-outline" size={24} color={theme.primaryStrong} />
          </View>
          <Text style={[styles.errorFallbackTitle, { color: theme.textStrong }]}>Wenwen needs a quick reset</Text>
          <Text style={[styles.errorFallbackBody, { color: theme.muted }]}>
            {this.state.message || 'This screen could not open cleanly.'}
          </Text>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Return home"
            onPress={this.handleReset}
            style={[styles.errorFallbackButton, { backgroundColor: theme.primary }]}
          >
            <Text style={styles.errorFallbackButtonText}>Return home</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }
}

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
  const spendEnergy = useRewardStore((state) => state.spendEnergy);
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
  }, [
    dismissedWellnessPeriodKey,
    hasCompletedOnboarding,
    isWellnessReviewLoading,
    isWellnessReviewVisible,
    pendingWellnessPeriod,
    requestedWellnessPeriodKey,
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

    if (useRewardStore.getState().glowBalance < WELLNESS_REVIEW_COST) {
      return;
    }

    const didSpend = spendEnergy(WELLNESS_REVIEW_COST);
    if (!didSpend) return;

    startWellnessReviewGeneration(activeWellnessPeriod);
  };

  const closeFeelingScale = (score: number | null) => {
    setFeelingScale(today, score);
    setIsFeelingScaleVisible(false);
  };

  return (
    <GestureHandlerRootView style={styles.root}>
      <ThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
        <AppErrorBoundary theme={appTheme}>
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
                        <Ionicons name="flash-off-outline" size={20} color={appTheme.primaryStrong} />
                      </View>
                      <Text style={[styles.emptyReviewTitle, { color: appTheme.textStrong }]}>Wenwen needs Energy</Text>
                      <Text style={[styles.emptyReviewBody, { color: appTheme.muted }]}>
                        Yesterday&apos;s activity is ready. Earn or use Energy when you want Wenwen to write the review.
                      </Text>
                      <TouchableOpacity
                        accessibilityRole="button"
                        accessibilityLabel="Spend Energy to write review"
                        disabled={glowBalance < WELLNESS_REVIEW_COST}
                        onPress={handleChargeAndWriteWellnessReview}
                        style={[
                          styles.emptyReviewActionButton,
                          {
                            backgroundColor:
                              glowBalance >= WELLNESS_REVIEW_COST
                                ? appTheme.primary
                                : appTheme.softBorder,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.emptyReviewActionText,
                            { color: glowBalance >= WELLNESS_REVIEW_COST ? '#FFFFFF' : appTheme.muted },
                          ]}
                        >
                          {glowBalance >= WELLNESS_REVIEW_COST
                            ? `Write review · ${WELLNESS_REVIEW_COST} ${REWARD_CURRENCY_NAME}`
                            : 'Earn Energy first'}
                        </Text>
                      </TouchableOpacity>
                      <Text style={[styles.emptyReviewHint, { color: appTheme.muted }]}>
                        Reviews use Energy only when Wenwen writes one.
                      </Text>
                    </View>
                  )}
                </ScrollView>

                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Close review"
                  onPress={closeWellnessReview}
                  style={[
                    styles.primaryButton,
                    activeWellnessReview
                      ? { backgroundColor: appTheme.primary }
                      : { backgroundColor: appTheme.softSurface, borderColor: appTheme.softBorder, borderWidth: 1 },
                  ]}
                >
                  <Text style={[styles.primaryButtonText, !activeWellnessReview && { color: appTheme.primaryStrong }]}>
                    {activeWellnessReview ? 'Continue' : 'Not now'}
                  </Text>
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
        </AppErrorBoundary>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  errorFallback: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  errorFallbackCard: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    borderRadius: 26,
    borderWidth: 1,
    padding: 22,
    alignItems: 'center',
    shadowColor: '#4F5B51',
    shadowOpacity: 0.12,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 14 },
    elevation: 8,
  },
  errorFallbackIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  errorFallbackTitle: {
    fontSize: 22,
    fontWeight: '900',
    lineHeight: 28,
    textAlign: 'center',
  },
  errorFallbackBody: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 21,
    textAlign: 'center',
    marginTop: 8,
  },
  errorFallbackButton: {
    minHeight: 50,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
    marginTop: 18,
  },
  errorFallbackButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(36, 50, 46, 0.34)',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  reviewCard: {
    width: '100%',
    maxWidth: 430,
    alignSelf: 'center',
    borderRadius: 28,
    borderWidth: 1,
    padding: 20,
    maxHeight: '78%',
    shadowColor: '#4F5B51',
    shadowOpacity: 0.16,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 16 },
    elevation: 8,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 14,
  },
  reviewHeaderText: {
    flex: 1,
  },
  reviewKicker: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  reviewTitle: {
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: 0,
    marginTop: 4,
  },
  closeButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewScrollContent: {
    gap: 14,
    paddingBottom: 4,
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
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 22,
    alignItems: 'center',
  },
  emptyReviewIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyReviewTitle: {
    fontSize: 20,
    fontWeight: '900',
    lineHeight: 25,
    textAlign: 'center',
  },
  emptyReviewBody: {
    maxWidth: 292,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 23,
    textAlign: 'center',
    marginTop: 10,
  },
  emptyReviewActionButton: {
    width: '100%',
    maxWidth: 260,
    minHeight: 50,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    marginTop: 20,
  },
  emptyReviewActionText: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.4,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  emptyReviewHint: {
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
    textAlign: 'center',
    marginTop: 12,
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
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    marginTop: 16,
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
