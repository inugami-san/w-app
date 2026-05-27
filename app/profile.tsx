import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { BottomTabPlaceholder, type DashboardTabKey } from '@/src/components/home/BottomTabPlaceholder';
import { LocationVisitsCard } from '@/src/components/location/LocationVisitsCard';
import { GlowBalancePill } from '@/src/components/rewards/GlowBalancePill';
import { StepsSummaryCard } from '@/src/components/steps/StepsSummaryCard';
import { buildProfileAchievements, buildProfileStats } from '@/src/features/profile/profile-stats';
import {
  createFallbackProfileEncouragement,
  generateProfileEncouragement,
} from '@/src/services/profile-encouragement';
import { useCompanionStore } from '@/src/store/companion-store';
import { useJournalStore } from '@/src/store/journal-store';
import { usePreferencesStore } from '@/src/store/preferences-store';
import { useRewardStore } from '@/src/store/reward-store';
import { useTaskStore } from '@/src/store/task-store';
import { useWellnessReviewStore } from '@/src/store/wellness-review-store';
import { useAppTheme } from '@/src/theme/app-theme';
import type { ProfileAchievement } from '@/src/types/profile';
import type { WellnessReviewSummary } from '@/src/types/wellness-review';
import { getLocalDateKey } from '@/src/utils/date';

type ReviewPeriodParts = {
  type: string;
  startDateKey: string;
  endDateKey: string;
  dateKeys: string[];
};

function StatTile({ label, value }: { label: string; value: number | string }) {
  const theme = useAppTheme();

  return (
    <View style={[styles.statTile, { backgroundColor: theme.softSurface, borderColor: theme.softBorder }]}>
      <Text style={[styles.statValue, { color: theme.primaryStrong }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: theme.muted }]}>{label}</Text>
    </View>
  );
}

function AchievementIconButton({
  achievement,
  onPress,
}: {
  achievement: ProfileAchievement;
  onPress: (achievement: ProfileAchievement) => void;
}) {
  const theme = useAppTheme();
  const progressPercent =
    achievement.goal <= 0 ? 0 : Math.round((achievement.progress / achievement.goal) * 100);
  const stars = Array.from({ length: achievement.maxLevel }, (_, index) => index < achievement.level);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${achievement.title}, ${achievement.progress} of ${achievement.goal}`}
      accessibilityHint="Show achievement details"
      onPress={() => onPress(achievement)}
      style={[
        styles.achievementIconButton,
        {
          backgroundColor: achievement.unlocked ? theme.primarySoft : theme.softSurface,
          borderColor: achievement.unlocked ? theme.primary : theme.softBorder,
        },
      ]}
    >
      <View
        style={[
          styles.achievementIcon,
          { backgroundColor: achievement.unlocked ? theme.primary : theme.surface },
        ]}
      >
        <Ionicons
          name={achievement.icon}
          size={22}
          color={achievement.unlocked ? '#FFFFFF' : theme.primaryStrong}
        />
      </View>
      <View style={[styles.iconProgressTrack, { backgroundColor: theme.surface }]}>
        <View
          style={[
            styles.iconProgressFill,
            {
              backgroundColor: achievement.unlocked ? theme.primary : theme.softBorder,
              width: `${progressPercent}%`,
            },
          ]}
        />
      </View>
      <View style={styles.iconStarRow}>
        {stars.map((isFilled, index) => (
          <Ionicons
            key={`${achievement.id}-star-${index}`}
            name={isFilled ? 'star' : 'star-outline'}
            size={8}
            color={isFilled ? theme.primaryStrong : theme.subtle}
          />
        ))}
      </View>
    </Pressable>
  );
}

function parseDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function addDays(dateKey: string, amount: number) {
  const date = parseDateKey(dateKey);
  date.setDate(date.getDate() + amount);
  return getLocalDateKey(date);
}

function getDateKeys(startDateKey: string, endDateKey: string) {
  const keys: string[] = [];
  let cursor = startDateKey;
  while (cursor <= endDateKey) {
    keys.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return keys;
}

function parseReviewPeriodKey(periodKey: string): ReviewPeriodParts {
  const [type = 'daily', startDateKey = '', endDateKey = ''] = periodKey.split(':');
  const start = startDateKey || endDateKey;
  const end = endDateKey || startDateKey;
  return {
    type,
    startDateKey: start,
    endDateKey: end,
    dateKeys: start && end ? getDateKeys(start, end) : [],
  };
}

function formatReviewDateRange(review: WellnessReviewSummary) {
  const period = parseReviewPeriodKey(review.periodKey);
  if (!period.startDateKey) return new Date(review.createdAt).toLocaleDateString();

  const start = parseDateKey(period.startDateKey).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const end = parseDateKey(period.endDateKey).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return period.startDateKey === period.endDateKey ? start : `${start} - ${end}`;
}

export default function ProfileScreen() {
  const theme = useAppTheme();
  const displayName = usePreferencesStore((state) => state.displayName);
  const profileEncouragementCache = usePreferencesStore((state) => state.profileEncouragementCache);
  const setProfileEncouragementCache = usePreferencesStore((state) => state.setProfileEncouragementCache);
  const locationAutoSyncEnabled = usePreferencesStore((state) => state.locationAutoSyncEnabled);
  const aiTaskContextEnabled = usePreferencesStore((state) => state.aiTaskContextEnabled);
  const aiJournalContextEnabled = usePreferencesStore((state) => state.aiJournalContextEnabled);
  const aiCompanionContextEnabled = usePreferencesStore((state) => state.aiCompanionContextEnabled);
  const aiLocationContextEnabled = usePreferencesStore((state) => state.aiLocationContextEnabled);
  const tasks = useTaskStore((state) => state.tasks);
  const tasksHydrated = useTaskStore((state) => state.hasHydrated);
  const journalEntries = useJournalStore((state) => state.entries);
  const journalHydrated = useJournalStore((state) => state.hasHydrated);
  const companionEntries = useCompanionStore((state) => state.entries);
  const companionHydrated = useCompanionStore((state) => state.hasHydrated);
  const wellnessReviews = useWellnessReviewStore((state) => state.reviews);
  const wellnessReviewHydrated = useWellnessReviewStore((state) => state.hasHydrated);
  const rewardedTaskIds = useRewardStore((state) => state.rewardedTaskIds);
  const rewardedJournalDateKeys = useRewardStore((state) => state.rewardedJournalDateKeys);
  const rewardedCompanionDateKeys = useRewardStore((state) => state.rewardedCompanionDateKeys);
  const rewardsHydrated = useRewardStore((state) => state.hasHydrated);
  const [encouragingNote, setEncouragingNote] = useState('');
  const [isNoteLoading, setIsNoteLoading] = useState(false);
  const [selectedAchievement, setSelectedAchievement] = useState<ProfileAchievement | null>(null);
  const [selectedReview, setSelectedReview] = useState<WellnessReviewSummary | null>(null);

  const profileSource = useMemo(
    () => ({
      tasks,
      journalEntries,
      companionEntries,
      totalEnergyEarned:
        rewardedTaskIds.length + rewardedJournalDateKeys.length + rewardedCompanionDateKeys.length,
    }),
    [companionEntries, journalEntries, rewardedCompanionDateKeys.length, rewardedJournalDateKeys.length, rewardedTaskIds.length, tasks]
  );

  const achievements = useMemo(() => buildProfileAchievements(profileSource), [profileSource]);
  const stats = useMemo(() => buildProfileStats(profileSource), [profileSource]);
  const recentReviews = useMemo(
    () => Object.values(wellnessReviews)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 5),
    [wellnessReviews]
  );
  const selectedReviewPeriod = useMemo(
    () => selectedReview ? parseReviewPeriodKey(selectedReview.periodKey) : null,
    [selectedReview]
  );
  const selectedReviewTasks = useMemo(() => {
    if (!selectedReviewPeriod) return [];

    return selectedReviewPeriod.dateKeys.flatMap((dateKey) => {
      const entry = journalEntries[dateKey];
      return (entry?.tasks ?? []).map((task) => ({ ...task, dateKey }));
    });
  }, [journalEntries, selectedReviewPeriod]);
  const selectedReviewJournals = useMemo(() => {
    if (!selectedReviewPeriod) return [];

    return selectedReviewPeriod.dateKeys
      .map((dateKey) => journalEntries[dateKey])
      .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));
  }, [journalEntries, selectedReviewPeriod]);
  const selectedReviewCompanionDays = useMemo(() => {
    if (!selectedReviewPeriod) return [];

    return selectedReviewPeriod.dateKeys
      .map((dateKey) => companionEntries[dateKey])
      .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));
  }, [companionEntries, selectedReviewPeriod]);
  const storesHydrated = tasksHydrated && journalHydrated && companionHydrated && rewardsHydrated && wellnessReviewHydrated;
  const selectedAchievementProgressPercent =
    !selectedAchievement || selectedAchievement.goal <= 0
      ? 0
      : Math.round((selectedAchievement.progress / selectedAchievement.goal) * 100);
  const selectedAchievementStars = selectedAchievement
    ? Array.from({ length: selectedAchievement.maxLevel }, (_, index) => index < selectedAchievement.level)
    : [];
  const canUseAiProfileContext =
    aiTaskContextEnabled || aiJournalContextEnabled || aiCompanionContextEnabled || aiLocationContextEnabled;

  useEffect(() => {
    if (!storesHydrated) return;

    const todayKey = getLocalDateKey();
    if (!canUseAiProfileContext) {
      setEncouragingNote(createFallbackProfileEncouragement({ displayName, stats, achievements }));
      setIsNoteLoading(false);
      return;
    }

    if (profileEncouragementCache?.dateKey === todayKey && profileEncouragementCache.note) {
      setEncouragingNote(profileEncouragementCache.note);
      setIsNoteLoading(false);
      return;
    }

    let isCurrent = true;
    setIsNoteLoading(true);

    generateProfileEncouragement({ displayName, stats, achievements })
      .then((note) => {
        if (!isCurrent) return;
        setEncouragingNote(note);
        setProfileEncouragementCache({
          dateKey: todayKey,
          note,
        });
      })
      .finally(() => {
        if (isCurrent) setIsNoteLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [
    achievements,
    canUseAiProfileContext,
    displayName,
    profileEncouragementCache?.dateKey,
    profileEncouragementCache?.note,
    setProfileEncouragementCache,
    stats,
    storesHydrated,
  ]);

  const handleTabPress = (tab: DashboardTabKey) => {
    if (tab === 'profile') return;
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

  const handleShareAchievement = async () => {
    if (!selectedAchievement) return;

    const progressLine = selectedAchievement.nextGoal
      ? `${selectedAchievement.totalProgress} progress so far`
      : 'Hardcore complete';
    const message = selectedAchievement.unlocked
      ? `I reached ${selectedAchievement.tierName} ${selectedAchievement.title} in Wenwen. ${progressLine}.`
      : `I am working toward ${selectedAchievement.title} in Wenwen. ${selectedAchievement.progress}/${selectedAchievement.goal} until the first star.`;

    try {
      await Share.share({
        title: `${selectedAchievement.title} in Wenwen`,
        message,
      });
    } catch (error) {
      const messageText = error instanceof Error ? error.message : 'Unable to open sharing right now.';
      Alert.alert('Share failed', messageText);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.contentColumn}>
          <View style={styles.headerRow}>
            <View style={styles.headerTextWrap}>
              <Text style={[styles.screenTitle, { color: theme.subtle }]}>Profile</Text>
              <Text style={[styles.heroTitle, { color: theme.text }]}>
                {displayName ? `${displayName}'s progress` : 'Your progress'}
              </Text>
              <Text style={[styles.heroSubtitle, { color: theme.muted }]}>
                Achievements, journals, and task history.
              </Text>
            </View>
            <View style={styles.headerActions}>
              <GlowBalancePill />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Open settings"
                onPress={() => router.push('/settings')}
                style={({ pressed }) => [
                  styles.settingsButton,
                  { backgroundColor: theme.surface, borderColor: theme.border },
                  pressed && styles.pressed,
                ]}
              >
                <Ionicons name="settings-outline" size={19} color={theme.primaryStrong} />
              </Pressable>
            </View>
          </View>

          <View style={[styles.noteCard, { backgroundColor: theme.surface, borderColor: theme.border, shadowColor: theme.shadow }]}>
            <View style={[styles.noteIcon, { backgroundColor: theme.primarySoft }]}>
              <Ionicons name="sparkles-outline" size={18} color={theme.primaryStrong} />
            </View>
            <View style={styles.noteTextWrap}>
              <Text style={[styles.noteTitle, { color: theme.textStrong }]}>Wenwen says</Text>
              <Text style={[styles.noteBody, { color: theme.muted }]}>
                {isNoteLoading && !encouragingNote ? 'Reading your progress...' : encouragingNote}
              </Text>
            </View>
          </View>

          <View style={styles.statsGrid}>
            <StatTile label="tasks completed" value={stats.totalTasksCompleted} />
            <StatTile label="days used" value={stats.daysUsed} />
            <StatTile label="journals" value={stats.journalCount} />
            <StatTile label="achievements" value={`${stats.achievementsUnlocked}/${stats.achievementsTotal}`} />
          </View>

          <View style={styles.stepsCardWrap}>
            <StepsSummaryCard />
          </View>

          {recentReviews.length > 0 && (
            <View style={styles.reviewsSection}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: theme.textStrong }]}>Recent reviews</Text>
                <Text style={[styles.sectionCaption, { color: theme.muted }]}>
                  Latest Wenwen daily and weekly reviews.
                </Text>
              </View>
              <ScrollView
                nestedScrollEnabled
                showsVerticalScrollIndicator={recentReviews.length >= 5}
                style={styles.reviewListScroll}
                contentContainerStyle={styles.reviewListContent}
              >
                {recentReviews.map((review) => (
                  <Pressable
                    key={review.id}
                    accessibilityRole="button"
                    accessibilityLabel={`Open ${review.title} review`}
                    onPress={() => setSelectedReview(review)}
                    style={({ pressed }) => [
                      styles.reviewListItem,
                      { backgroundColor: theme.surface, borderColor: theme.border },
                      pressed && styles.pressed,
                    ]}
                  >
                    <View style={[styles.reviewListIcon, { backgroundColor: theme.primarySoft }]}>
                      <Ionicons name="document-text-outline" size={17} color={theme.primaryStrong} />
                    </View>
                    <View style={styles.reviewListTextWrap}>
                      <Text style={[styles.reviewListTitle, { color: theme.textStrong }]} numberOfLines={1}>
                        {review.title}
                      </Text>
                      <Text style={[styles.reviewListMeta, { color: theme.muted }]}>
                        {formatReviewDateRange(review)} · {review.completedTaskCount}/{review.taskCount} tasks · {review.journalCount} journals
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={17} color={theme.subtle} />
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}

          {locationAutoSyncEnabled && (
            <View style={styles.optionalContextWrap}>
              <View style={styles.optionalContextHeader}>
                <Text style={[styles.optionalContextTitle, { color: theme.textStrong }]}>Optional place context</Text>
                <Text style={[styles.optionalContextCaption, { color: theme.muted }]}>
                  Used only when you turn on place auto-sync.
                </Text>
              </View>
              <LocationVisitsCard />
            </View>
          )}

          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.textStrong }]}>Achievements</Text>
            <Text style={[styles.sectionCaption, { color: theme.muted }]}>
              Progress unlocks from real app activity.
            </Text>
          </View>

          <View style={styles.achievementList}>
            {achievements.map((achievement) => (
              <AchievementIconButton
                key={achievement.id}
                achievement={achievement}
                onPress={setSelectedAchievement}
              />
            ))}
          </View>
        </View>
      </ScrollView>

      <Modal
        visible={Boolean(selectedAchievement)}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedAchievement(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setSelectedAchievement(null)}>
          <Pressable
            style={[styles.achievementModalCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
            onPress={() => undefined}
          >
            {selectedAchievement && (
              <>
                <View style={styles.modalHeader}>
                  <View
                    style={[
                      styles.modalAchievementIcon,
                      { backgroundColor: selectedAchievement.unlocked ? theme.primary : theme.softSurface },
                    ]}
                  >
                    <Ionicons
                      name={selectedAchievement.icon}
                      size={26}
                      color={selectedAchievement.unlocked ? '#FFFFFF' : theme.primaryStrong}
                    />
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Close achievement details"
                    onPress={() => setSelectedAchievement(null)}
                    style={[styles.modalCloseButton, { backgroundColor: theme.softSurface }]}
                  >
                    <Ionicons name="close" size={18} color={theme.muted} />
                  </Pressable>
                </View>
                <Text style={[styles.modalAchievementTitle, { color: theme.textStrong }]}>
                  {selectedAchievement.title}
                </Text>
                <View style={styles.modalTierRow}>
                  <Text style={[styles.modalTierText, { color: theme.primaryStrong }]}>
                    {selectedAchievement.tierName}
                  </Text>
                  <View style={styles.modalStars}>
                    {selectedAchievementStars.map((isFilled, index) => (
                      <Ionicons
                        key={`${selectedAchievement.id}-modal-star-${index}`}
                        name={isFilled ? 'star' : 'star-outline'}
                        size={16}
                        color={isFilled ? theme.primaryStrong : theme.subtle}
                      />
                    ))}
                  </View>
                </View>
                <Text style={[styles.modalAchievementDetail, { color: theme.muted }]}>
                  {selectedAchievement.detail}
                </Text>
                <View style={styles.modalProgressRow}>
                  <Text style={[styles.modalProgressText, { color: theme.primaryStrong }]}>
                    {selectedAchievement.progress}/{selectedAchievement.goal}
                  </Text>
                  <Text style={[styles.modalStatusText, { color: theme.muted }]}>
                    {selectedAchievement.nextGoal ? 'Next star' : 'Hardcore complete'}
                  </Text>
                </View>
                <View style={[styles.modalProgressTrack, { backgroundColor: theme.softSurface }]}>
                  <View
                    style={[
                      styles.modalProgressFill,
                      {
                        backgroundColor: selectedAchievement.unlocked ? theme.primary : theme.softBorder,
                        width: `${selectedAchievementProgressPercent}%`,
                      },
                    ]}
                  />
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Share ${selectedAchievement.title} achievement`}
                  onPress={handleShareAchievement}
                  style={({ pressed }) => [
                    styles.shareButton,
                    { backgroundColor: theme.primary, borderColor: theme.primary },
                    pressed && styles.pressed,
                  ]}
                >
                  <Ionicons name="share-social-outline" size={17} color="#FFFFFF" />
                  <Text style={styles.shareButtonText}>Share</Text>
                </Pressable>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={Boolean(selectedReview)}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedReview(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setSelectedReview(null)}>
          <Pressable
            style={[styles.reviewModalCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
            onPress={() => undefined}
          >
            {selectedReview && (
              <>
                <View style={styles.modalHeader}>
                  <View style={[styles.modalAchievementIcon, { backgroundColor: theme.primarySoft }]}>
                    <Ionicons name="document-text-outline" size={26} color={theme.primaryStrong} />
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Close review details"
                    onPress={() => setSelectedReview(null)}
                    style={[styles.modalCloseButton, { backgroundColor: theme.softSurface }]}
                  >
                    <Ionicons name="close" size={18} color={theme.muted} />
                  </Pressable>
                </View>

                <Text style={[styles.modalAchievementTitle, { color: theme.textStrong }]}>
                  {selectedReview.title}
                </Text>
                <Text style={[styles.reviewModalDate, { color: theme.primaryStrong }]}>
                  {formatReviewDateRange(selectedReview)}
                </Text>
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.reviewModalScroll}>
                  <View style={[styles.reviewSummaryBox, { backgroundColor: theme.primarySoft, borderColor: theme.softBorder }]}>
                    <Text style={[styles.reviewSummaryText, { color: theme.muted }]}>{selectedReview.body}</Text>
                  </View>

                  <View style={styles.reviewStatsGrid}>
                    <StatTile label="tasks done" value={`${selectedReview.completedTaskCount}/${selectedReview.taskCount}`} />
                    <StatTile label="journals" value={selectedReview.journalCount} />
                    <StatTile label="chats" value={selectedReview.companionMessageCount} />
                    <StatTile label="steps" value={selectedReview.stepCount?.toLocaleString() ?? '-'} />
                  </View>

                  <View style={[styles.reviewDetailSection, { borderColor: theme.softBorder }]}>
                    <Text style={[styles.reviewDetailTitle, { color: theme.textStrong }]}>What you did</Text>
                    {selectedReviewTasks.length === 0 ? (
                      <Text style={[styles.reviewDetailEmpty, { color: theme.muted }]}>No task snapshot was saved for this period.</Text>
                    ) : (
                      selectedReviewTasks.slice(0, 8).map((task) => (
                        <View key={`${task.dateKey}-${task.id}`} style={styles.reviewTaskRow}>
                          <Ionicons
                            name={task.done ? 'checkmark-circle' : 'ellipse-outline'}
                            size={17}
                            color={task.done ? '#56BA88' : theme.subtle}
                          />
                          <View style={styles.reviewTaskTextWrap}>
                            <Text style={[styles.reviewTaskTitle, { color: theme.textStrong }]}>{task.title}</Text>
                            <Text style={[styles.reviewTaskMeta, { color: theme.muted }]}>
                              {formatReviewDateRange({ ...selectedReview, periodKey: `daily:${task.dateKey}:${task.dateKey}` })} · {task.done ? 'Finished' : 'Still open'}
                            </Text>
                          </View>
                        </View>
                      ))
                    )}
                  </View>

                  <View style={[styles.reviewDetailSection, { borderColor: theme.softBorder }]}>
                    <Text style={[styles.reviewDetailTitle, { color: theme.textStrong }]}>Journal and chat</Text>
                    {selectedReviewJournals.length === 0 && selectedReviewCompanionDays.length === 0 ? (
                      <Text style={[styles.reviewDetailEmpty, { color: theme.muted }]}>No journal or companion activity was saved for this period.</Text>
                    ) : (
                      <>
                        {selectedReviewJournals.map((entry) => (
                          <Text key={`journal-${entry.dateKey}`} style={[styles.reviewDetailEmpty, { color: theme.muted }]}>
                            {formatReviewDateRange({ ...selectedReview, periodKey: `daily:${entry.dateKey}:${entry.dateKey}` })}: {entry.feelingNote.trim() || 'Journal/check-in saved.'}
                          </Text>
                        ))}
                        {selectedReviewCompanionDays.map((entry) => {
                          const userMessages = entry.messages.filter((message) => message.role === 'user').length;
                          return (
                            <Text key={`companion-${entry.dateKey}`} style={[styles.reviewDetailEmpty, { color: theme.muted }]}>
                              {formatReviewDateRange({ ...selectedReview, periodKey: `daily:${entry.dateKey}:${entry.dateKey}` })}: {userMessages} companion message{userMessages === 1 ? '' : 's'}
                            </Text>
                          );
                        })}
                      </>
                    )}
                  </View>
                </ScrollView>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>

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
    alignItems: 'center',
  },
  contentColumn: {
    width: '100%',
    maxWidth: 640,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    marginBottom: 16,
  },
  headerTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  headerActions: {
    alignItems: 'flex-end',
    gap: 8,
  },
  screenTitle: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  heroTitle: {
    fontSize: 30,
    fontWeight: '900',
    marginTop: 6,
  },
  heroSubtitle: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
    marginTop: 6,
  },
  settingsButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.86,
  },
  noteCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 14,
    flexDirection: 'row',
    gap: 12,
    shadowOpacity: 0.04,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 1,
  },
  noteIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noteTextWrap: {
    flex: 1,
  },
  noteTitle: {
    fontSize: 14,
    fontWeight: '900',
  },
  noteBody: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 14,
  },
  statTile: {
    width: '48%',
    minHeight: 86,
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '900',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '800',
    lineHeight: 15,
    marginTop: 4,
    textTransform: 'uppercase',
  },
  stepsCardWrap: {
    marginTop: 14,
  },
  reviewsSection: {
    marginTop: 18,
  },
  reviewListScroll: {
    maxHeight: 360,
  },
  reviewListContent: {
    gap: 10,
  },
  reviewListItem: {
    minHeight: 64,
    borderRadius: 16,
    borderWidth: 1,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  reviewListIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewListTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  reviewListTitle: {
    fontSize: 14,
    fontWeight: '900',
  },
  reviewListMeta: {
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
    marginTop: 3,
  },
  optionalContextWrap: {
    marginTop: 18,
  },
  optionalContextHeader: {
    marginBottom: 10,
  },
  optionalContextTitle: {
    fontSize: 16,
    fontWeight: '900',
  },
  optionalContextCaption: {
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
    marginTop: 3,
  },
  sectionHeader: {
    marginTop: 22,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
  },
  sectionCaption: {
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
    marginTop: 3,
  },
  achievementList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
  },
  achievementIconButton: {
    width: 70,
    height: 88,
    borderRadius: 18,
    borderWidth: 1,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  achievementIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconProgressTrack: {
    width: '100%',
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 7,
  },
  iconProgressFill: {
    height: 4,
    borderRadius: 2,
  },
  iconStarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
    marginTop: 5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(8, 12, 20, 0.58)',
    justifyContent: 'center',
    padding: 24,
  },
  achievementModalCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
  },
  reviewModalCard: {
    maxHeight: '84%',
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalAchievementIcon: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalAchievementTitle: {
    fontSize: 22,
    fontWeight: '900',
    lineHeight: 27,
    marginTop: 16,
  },
  reviewModalDate: {
    fontSize: 12,
    fontWeight: '900',
    marginTop: 4,
    textTransform: 'uppercase',
  },
  reviewModalScroll: {
    gap: 12,
    paddingTop: 14,
    paddingBottom: 2,
  },
  reviewSummaryBox: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  reviewSummaryText: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 21,
  },
  reviewStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  reviewDetailSection: {
    borderTopWidth: 1,
    paddingTop: 12,
  },
  reviewDetailTitle: {
    fontSize: 14,
    fontWeight: '900',
    marginBottom: 8,
  },
  reviewDetailEmpty: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
    marginBottom: 8,
  },
  reviewTaskRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 9,
  },
  reviewTaskTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  reviewTaskTitle: {
    fontSize: 13,
    fontWeight: '900',
  },
  reviewTaskMeta: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  modalTierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 8,
  },
  modalTierText: {
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  modalStars: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  modalAchievementDetail: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
    marginTop: 8,
  },
  modalProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 18,
  },
  modalProgressText: {
    fontSize: 18,
    fontWeight: '900',
  },
  modalStatusText: {
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  modalProgressTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: 10,
  },
  modalProgressFill: {
    height: 8,
    borderRadius: 4,
  },
  shareButton: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    marginTop: 16,
  },
  shareButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  bottomTabWrap: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 26,
  },
});
