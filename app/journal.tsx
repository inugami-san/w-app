import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';

import { BottomTabPlaceholder, type DashboardTabKey } from '@/src/components/home/BottomTabPlaceholder';
import { getMoodLabel } from '@/src/features/journal/moods';
import { useVoiceCheckInRecorder } from '@/src/hooks/use-voice-check-in-recorder';
import { generateJournalSummary } from '@/src/services/gemini-journal-summary';
import { transcribeVoiceCheckIn } from '@/src/services/gemini-voice';
import { scheduleJournalSummaryNotification } from '@/src/services/journal-notifications';
import { getJournalImageForGemini } from '@/src/services/journal-image';
import { useKeyboardState } from '@/src/hooks/use-keyboard-state';
import { useJournalStore } from '@/src/store/journal-store';
import { usePreferencesStore } from '@/src/store/preferences-store';
import { useTaskStore } from '@/src/store/task-store';
import { useAppTheme } from '@/src/theme/app-theme';
import type {
  JournalDailyContext,
  JournalEntry,
  JournalImageAttachment,
  JournalSummary,
  JournalTaskSnapshot,
} from '@/src/types/journal';
import { getLocalDateKey } from '@/src/utils/date';
import { clampText, INPUT_LIMITS } from '@/src/utils/input-limits';

function formatDateLabel(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function getPreviousDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() - 1);
  return getLocalDateKey(date);
}

function hasDailyContext(context: JournalDailyContext | undefined) {
  return Boolean(context?.sleep || context?.outside || context?.movement);
}

function getDailyContextKey(context: JournalDailyContext | undefined) {
  return JSON.stringify({
    sleep: context?.sleep ?? '',
    outside: Boolean(context?.outside),
    movement: Boolean(context?.movement),
  });
}

function getSleepContextLabel(sleep: JournalDailyContext['sleep']) {
  if (sleep === 'low') return 'Low sleep';
  if (sleep === 'okay') return 'Okay sleep';
  if (sleep === 'rested') return 'Rested';
  return '';
}

function getDailyContextLabels(context: JournalDailyContext | undefined) {
  const labels: string[] = [];

  const sleepLabel = getSleepContextLabel(context?.sleep);
  if (sleepLabel) labels.push(`Sleep: ${sleepLabel}`);
  if (context?.outside) labels.push('Went outside');
  if (context?.movement) labels.push('Moved body');

  return labels;
}

function getFeelingScoreLabel(score: number | null | undefined) {
  return typeof score === 'number' ? `Feeling ${score}/10` : '';
}

function getJournalImageKey(image: JournalImageAttachment | undefined) {
  return image?.uri ?? '';
}

function hasHistoryContent(entry: JournalEntry | undefined, dateKey: string, today: string) {
  if (!entry) return false;
  if (dateKey === today) return false;

  const hasNote = entry.feelingNote.trim().length > 0;
  const hasSummary = entry.summaries.length > 0;
  const hasTaskSnapshot = entry.tasks.length > 0;
  const hasContext = hasDailyContext(entry.dailyContext);
  const hasFeelingScore = typeof entry.feelingScale?.score === 'number';

  return hasNote || hasSummary || hasTaskSnapshot || hasContext || hasFeelingScore;
}

function getVisibleTasks(entry: JournalEntry | undefined, dateKey: string, today: string): JournalTaskSnapshot[] {
  if (!entry || dateKey === today) return [];
  return entry.tasks;
}

export default function JournalScreen() {
  const today = useMemo(() => getLocalDateKey(), []);
  const yesterday = useMemo(() => getPreviousDateKey(today), [today]);
  const entries = useJournalStore((state) => state.entries);
  const setFeelingNote = useJournalStore((state) => state.setFeelingNote);
  const setImageAttachment = useJournalStore((state) => state.setImageAttachment);
  const setEntryDailyContext = useJournalStore((state) => state.setDailyContext);
  const setTaskSnapshot = useJournalStore((state) => state.setTaskSnapshot);
  const addSummary = useJournalStore((state) => state.addSummary);
  const markHomeGuideFeatureVisited = usePreferencesStore((state) => state.markHomeGuideFeatureVisited);
  const hasHydratedTasks = useTaskStore((state) => state.hasHydrated);
  const resetDailyTasks = useTaskStore((state) => state.resetDailyTasks);
  const theme = useAppTheme();
  const [isJournalModalVisible, setIsJournalModalVisible] = useState(false);
  const [journalNote, setJournalNote] = useState('');
  const [journalImage, setJournalImage] = useState<JournalImageAttachment | null>(null);
  const [journalImageBase64, setJournalImageBase64] = useState('');
  const [isSavingJournal, setIsSavingJournal] = useState(false);
  const [isTranscribingVoice, setIsTranscribingVoice] = useState(false);
  const [reviewDateKey, setReviewDateKey] = useState('');
  const [isReviewModalVisible, setIsReviewModalVisible] = useState(false);
  const [isReviewLoading, setIsReviewLoading] = useState(false);
  const [reviewSummary, setReviewSummary] = useState<JournalSummary | null>(null);
  const [reviewError, setReviewError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const { isVisible: isKeyboardVisible } = useKeyboardState();
  const voiceRecorder = useVoiceCheckInRecorder();
  const historyDateKeys = useMemo(() => {
    return Object.keys(entries)
      .filter((dateKey) => hasHistoryContent(entries[dateKey], dateKey, today))
      .sort((a, b) => b.localeCompare(a));
  }, [entries, today]);
  const filteredDateKeys = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return historyDateKeys;

    return historyDateKeys.filter((dateKey) => {
      const entry = entries[dateKey];
      const tasks = getVisibleTasks(entry, dateKey, today);
      const fields = [
        formatDateLabel(dateKey),
        dateKey,
        entry?.feelingNote ?? '',
        getMoodLabel(entry?.mood) ?? '',
        getFeelingScoreLabel(entry?.feelingScale?.score),
        ...getDailyContextLabels(entry?.dailyContext),
        ...(entry?.summaries.flatMap((summary) => [summary.title, summary.body]) ?? []),
        ...tasks.flatMap((task) => [task.title, task.detail]),
      ];

      return fields.some((field) => field.toLowerCase().includes(query));
    });
  }, [entries, historyDateKeys, searchQuery, today]);

  const yesterdayEntry = entries[yesterday];
  const hasYesterdayReview = hasHistoryContent(yesterdayEntry, yesterday, today);
  const reviewEntry = reviewDateKey ? entries[reviewDateKey] : undefined;
  const reviewTasks = getVisibleTasks(reviewEntry, reviewDateKey, today);
  const reviewFeelingNote = reviewEntry?.feelingNote.trim() ?? '';
  const reviewMoodLabel = getMoodLabel(reviewEntry?.mood);
  const reviewImage = reviewEntry?.image;
  const reviewDailyContextLabels = getDailyContextLabels(reviewEntry?.dailyContext);
  const reviewFeelingScoreLabel = getFeelingScoreLabel(reviewEntry?.feelingScale?.score);

  useEffect(() => {
    markHomeGuideFeatureVisited('journal');
  }, [markHomeGuideFeatureVisited]);

  useEffect(() => {
    if (hasHydratedTasks) {
      resetDailyTasks();
    }
  }, [hasHydratedTasks, resetDailyTasks]);

  useEffect(() => {
    if ((entries[today]?.tasks.length ?? 0) > 0) {
      setTaskSnapshot(today, []);
    }
  }, [entries, setTaskSnapshot, today]);

  const handleTabPress = (tab: DashboardTabKey) => {
    if (tab === 'journal') return;
    if (tab === 'home') {
      router.replace('/dashboard');
      return;
    }
    if (tab === 'customize') {
      router.replace('/main');
      return;
    }
    if (tab === 'settings') {
      router.replace('/settings');
      return;
    }
    if (tab === 'companion') {
      router.replace('/companion');
      return;
    }
    router.push('/modal');
  };

  const handleOpenDate = (dateKey: string) => {
    router.push({
      pathname: '/journal/[dateKey]',
      params: { dateKey },
    });
  };

  const openJournalComposer = () => {
    setJournalNote(entries[today]?.feelingNote ?? '');
    setJournalImage(entries[today]?.image ?? null);
    setJournalImageBase64('');
    setIsJournalModalVisible(true);
  };

  const handlePickJournalImage = async () => {
    if (isSavingJournal) return;

    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync(false);
      if (!permission.granted) {
        Alert.alert('Photo access needed', 'Allow photo access to attach an image to your journal.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        quality: 0.72,
        base64: true,
      });

      if (result.canceled || !result.assets?.[0]) return;

      const asset = result.assets[0];
      setJournalImage({
        uri: asset.uri,
        mimeType: asset.mimeType || 'image/jpeg',
        width: asset.width || undefined,
        height: asset.height || undefined,
        fileName: asset.fileName ?? null,
      });
      setJournalImageBase64(asset.base64 ?? '');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to attach this image.';
      Alert.alert('Image not attached', message);
    }
  };

  const handleRemoveJournalImage = () => {
    setJournalImage(null);
    setJournalImageBase64('');
  };

  const handleToggleVoiceJournal = async () => {
    if (isSavingJournal || isTranscribingVoice) return;

    try {
      if (!voiceRecorder.isRecording) {
        await voiceRecorder.startRecording();
        return;
      }

      setIsTranscribingVoice(true);
      const uri = await voiceRecorder.stopRecording();
      if (!uri) {
        throw new Error('No voice recording was saved.');
      }

      const transcription = await transcribeVoiceCheckIn(
        { uri, mode: 'journal' },
        {
          onError: () => undefined,
        }
      );

      if (!transcription) {
        Alert.alert('Voice not added', 'Wenwen could not read that voice note clearly.');
        return;
      }

      setJournalNote((current) => {
        const separator = current.trim() ? '\n\n' : '';
        return clampText(`${current}${separator}${transcription}`, INPUT_LIMITS.journalNote);
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to record voice right now.';
      Alert.alert('Voice check-in failed', message);
    } finally {
      setIsTranscribingVoice(false);
    }
  };

  const openReviewForDate = useCallback(
    async (dateKey: string) => {
      const entry = useJournalStore.getState().entries[dateKey];
      if (!hasHistoryContent(entry, dateKey, today)) return;

      const tasks = getVisibleTasks(entry, dateKey, today);
      const feelingNote = entry?.feelingNote.trim() ?? '';
      const entryDailyContext = entry?.dailyContext ?? {};
      const feelingScore = entry?.feelingScale?.score;

      setReviewDateKey(dateKey);
      setIsReviewModalVisible(true);
      setReviewError('');

      const existingSummary =
        entry?.summaries.find(
          (summary) =>
            summary.tasks.length === tasks.length &&
            summary.feelingNote.trim() === feelingNote &&
            summary.feelingScore === feelingScore &&
            getJournalImageKey(summary.image) === getJournalImageKey(entry?.image) &&
            getDailyContextKey(summary.dailyContext) === getDailyContextKey(entryDailyContext)
        ) ??
        null;
      if (existingSummary) {
        setReviewSummary(existingSummary);
        return;
      }

      setReviewSummary(null);
      setIsReviewLoading(true);
      try {
        const geminiImage = await getJournalImageForGemini(entry?.image);
        const result = await generateJournalSummary({
          dateKey,
          tasks,
          feelingNote,
          dailyContext: entryDailyContext,
          feelingScore,
          image: geminiImage,
          hasImage: Boolean(entry?.image),
          mood: entry?.mood,
        });
        const summary = addSummary({
          dateKey,
          title: result.title,
          body: result.body,
          tasks,
          feelingNote,
          dailyContext: entryDailyContext,
          feelingScore,
          image: entry?.image,
          mood: entry?.mood,
        });
        setReviewSummary(summary);
        await scheduleJournalSummaryNotification(summary);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Wenwen could not write this note yet.';
        setReviewError(message);
      } finally {
        setIsReviewLoading(false);
      }
    },
    [addSummary, today]
  );

  const handleSaveJournal = async () => {
    const cleanNote = clampText(journalNote, INPUT_LIMITS.journalNote).trim();
    if (!cleanNote && !journalImage) {
      Alert.alert('Add something first', 'Write a note or attach a photo before saving.');
      return;
    }

    setIsSavingJournal(true);
    setFeelingNote(today, cleanNote);
    setImageAttachment(today, journalImage ?? undefined);
    setEntryDailyContext(today, {});
    setTaskSnapshot(today, []);

    try {
      const geminiImage = await getJournalImageForGemini(journalImage, journalImageBase64);
      const result = await generateJournalSummary({
        dateKey: today,
        tasks: [],
        feelingNote: cleanNote,
        dailyContext: {},
        feelingScore: entries[today]?.feelingScale?.score,
        image: geminiImage,
        hasImage: Boolean(journalImage),
        mood: entries[today]?.mood,
      });
      const summary = addSummary({
        dateKey: today,
        title: result.title,
        body: result.body,
        tasks: [],
        feelingNote: cleanNote,
        dailyContext: {},
        feelingScore: entries[today]?.feelingScale?.score,
        image: journalImage ?? undefined,
        mood: entries[today]?.mood,
      });
      setReviewDateKey(today);
      setReviewSummary(summary);
      setReviewError('');
      setIsReviewModalVisible(true);
      await scheduleJournalSummaryNotification(summary);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Your journal was saved, but Wenwen could not summarize it yet.';
      Alert.alert('Journal saved', message);
    } finally {
      setIsSavingJournal(false);
      setIsJournalModalVisible(false);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.screenTitle, { color: theme.subtle }]}>Journal</Text>
        <Text style={[styles.heroTitle, { color: theme.text }]}>Daily history</Text>
        <Text style={[styles.heroSubtitle, { color: theme.muted }]}>
          Daily notes, task history, and AI reviews.
        </Text>

        <View style={styles.actionRow}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Add journal note"
            style={[styles.addJournalButton, { backgroundColor: theme.primary }]}
            onPress={openJournalComposer}
          >
            <Ionicons name="create-outline" size={18} color="#FFFFFF" />
            <Text style={styles.addJournalButtonText}>Add Journal</Text>
          </TouchableOpacity>
          {hasYesterdayReview && (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Show yesterday review"
              style={[styles.reviewButton, { backgroundColor: theme.surface, borderColor: theme.border }]}
              onPress={() => openReviewForDate(yesterday)}
            >
              <Ionicons name="sparkles-outline" size={17} color={theme.primaryStrong} />
              <Text style={[styles.reviewButtonText, { color: theme.primaryStrong }]}>Yesterday</Text>
            </TouchableOpacity>
          )}
        </View>

        {historyDateKeys.length > 0 && (
          <View style={[styles.searchBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Ionicons name="search-outline" size={17} color={theme.subtle} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              accessibilityLabel="Search journal history"
              placeholder="Search notes, moods, summaries..."
              placeholderTextColor={theme.subtle}
              style={[styles.searchInput, { color: theme.text }]}
            />
            {Boolean(searchQuery) && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Clear journal search"
                onPress={() => setSearchQuery('')}
                style={styles.clearSearchButton}
              >
                <Ionicons name="close" size={16} color={theme.muted} />
              </Pressable>
            )}
          </View>
        )}

        {historyDateKeys.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Ionicons name="journal-outline" size={24} color={theme.primaryStrong} />
            <Text style={[styles.emptyTitle, { color: theme.textStrong }]}>No journal history yet</Text>
            <Text style={[styles.emptyBody, { color: theme.muted }]}>
              Use this space to unload thoughts, reflect, or note how today felt.
            </Text>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Write a short journal note"
              onPress={openJournalComposer}
              style={[styles.emptyActionButton, { backgroundColor: theme.primary }]}
            >
              <Text style={styles.emptyActionText}>Write a short note</Text>
            </TouchableOpacity>
          </View>
        ) : filteredDateKeys.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Ionicons name="search-outline" size={24} color={theme.primaryStrong} />
            <Text style={[styles.emptyTitle, { color: theme.textStrong }]}>No matching entries</Text>
            <Text style={[styles.emptyBody, { color: theme.muted }]}>
              Try a mood, task name, date, or word from a note.
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {filteredDateKeys.map((dateKey) => {
              const entry = entries[dateKey];
              const sourceTasks = getVisibleTasks(entry, dateKey, today);
              const finishedCount = sourceTasks.filter((task) => task.done).length;
              const noteText = entry?.feelingNote?.trim();
              const moodLabel = getMoodLabel(entry?.mood);
              const feelingScoreLabel = getFeelingScoreLabel(entry?.feelingScale?.score);
              const summary = entry?.summaries[0];
              const hasTasks = sourceTasks.length > 0;
              const hasContext = hasDailyContext(entry?.dailyContext);
              const hasImage = Boolean(entry?.image);

              return (
                <Pressable
                  key={dateKey}
                  accessibilityRole="button"
                  accessibilityLabel={`Open journal for ${formatDateLabel(dateKey)}`}
                  onPress={() => handleOpenDate(dateKey)}
                  style={({ pressed }) => [
                    styles.dateCard,
                    { backgroundColor: theme.surface, borderColor: theme.border, shadowColor: theme.shadow },
                    pressed && styles.dateCardPressed,
                  ]}
                >
                  <View style={[styles.dateIcon, { backgroundColor: theme.primarySoft }]}>
                    <Ionicons name="calendar-outline" size={20} color={theme.primaryStrong} />
                  </View>
                  <View style={styles.dateTextWrap}>
                    <Text style={[styles.dateTitle, { color: theme.textStrong }]}>
                      {formatDateLabel(dateKey)}
                      {dateKey === today ? ' · Today' : ''}
                    </Text>
                    <Text style={[styles.dateMeta, { color: theme.muted }]}>
                      {hasTasks ? `${finishedCount}/${sourceTasks.length} tasks finished` : 'Journal note'}
                      {feelingScoreLabel ? ` · ${feelingScoreLabel}` : ''}
                      {moodLabel ? ` · ${moodLabel}` : ''}
                      {noteText ? ' · Note added' : ''}
                      {hasImage ? ' · Photo added' : ''}
                      {hasContext ? ' · Context added' : ''}
                    </Text>
                    {summary && (
                      <Text style={[styles.summaryPreview, { color: theme.primaryStrong }]}>{summary.title}</Text>
                    )}
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={theme.subtle} />
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>

      <Modal
        animationType="fade"
        transparent
        visible={isJournalModalVisible}
        onRequestClose={() => setIsJournalModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
          style={styles.modalKeyboardAvoidingView}
        >
        <View style={[styles.modalOverlay, isKeyboardVisible && styles.modalOverlayKeyboard]}>
          <View style={[styles.modalCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalKicker, { color: theme.subtle }]}>Today</Text>
                <Text style={[styles.modalTitle, { color: theme.text }]}>Add journal</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close add journal"
                onPress={() => setIsJournalModalVisible(false)}
                style={[styles.closeButton, { backgroundColor: theme.softSurface }]}
              >
                <Ionicons name="close" size={20} color={theme.muted} />
              </Pressable>
            </View>
            <ScrollView
              keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={[
                styles.composerScrollContent,
                isKeyboardVisible && styles.composerScrollContentKeyboard,
              ]}
            >
              <Text style={[styles.modalBody, { color: theme.muted }]}>
                Write freely. No format required.
              </Text>

              <View style={[styles.imageAttachCard, { backgroundColor: theme.softSurface, borderColor: theme.softBorder }]}>
                {journalImage ? (
                  <View style={styles.imagePreviewRow}>
                    <Image source={{ uri: journalImage.uri }} style={styles.imagePreview} />
                    <View style={styles.imagePreviewTextWrap}>
                      <Text style={[styles.imagePreviewTitle, { color: theme.textStrong }]}>Photo attached</Text>
                      <Text style={[styles.imagePreviewBody, { color: theme.muted }]}>
                        This can help Wenwen summarize the memory if the image data is available.
                      </Text>
                      <TouchableOpacity
                        accessibilityRole="button"
                        accessibilityLabel="Remove attached journal photo"
                        onPress={handleRemoveJournalImage}
                        disabled={isSavingJournal}
                        style={styles.removeImageButton}
                      >
                        <Ionicons name="trash-outline" size={14} color="#C33B3B" />
                        <Text style={styles.removeImageText}>Remove photo</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel="Attach a photo to this journal"
                    onPress={handlePickJournalImage}
                    disabled={isSavingJournal}
                    style={styles.attachImageButton}
                  >
                    <View style={[styles.attachImageIcon, { backgroundColor: theme.primarySoft }]}>
                      <Ionicons name="image-outline" size={18} color={theme.primaryStrong} />
                    </View>
                    <View style={styles.imagePreviewTextWrap}>
                      <Text style={[styles.imagePreviewTitle, { color: theme.textStrong }]}>Attach photo</Text>
                      <Text style={[styles.imagePreviewBody, { color: theme.muted }]}>
                        Optional memory cue for this journal.
                      </Text>
                    </View>
                    <Ionicons name="add" size={18} color={theme.primaryStrong} />
                  </TouchableOpacity>
                )}
              </View>

              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={voiceRecorder.isRecording ? 'Stop voice journal recording' : 'Record voice journal note'}
                onPress={handleToggleVoiceJournal}
                disabled={isSavingJournal || isTranscribingVoice || voiceRecorder.isPreparing}
                style={[
                  styles.voiceButton,
                  {
                    backgroundColor: voiceRecorder.isRecording ? theme.primarySoft : theme.softSurface,
                    borderColor: voiceRecorder.isRecording ? theme.primary : theme.softBorder,
                  },
                  (isSavingJournal || isTranscribingVoice || voiceRecorder.isPreparing) && styles.voiceButtonDisabled,
                ]}
              >
                <View style={[styles.voiceButtonIcon, { backgroundColor: theme.primarySoft }]}>
                  {isTranscribingVoice || voiceRecorder.isPreparing ? (
                    <ActivityIndicator color={theme.primaryStrong} />
                  ) : (
                    <Ionicons
                      name={voiceRecorder.isRecording ? 'stop-circle-outline' : 'mic-outline'}
                      size={18}
                      color={theme.primaryStrong}
                    />
                  )}
                </View>
                <View style={styles.voiceButtonTextWrap}>
                  <Text style={[styles.voiceButtonTitle, { color: theme.textStrong }]}>
                    {isTranscribingVoice
                      ? 'Transcribing voice note'
                      : voiceRecorder.isRecording
                        ? `Stop recording (${Math.floor(voiceRecorder.durationMillis / 1000)}s)`
                        : 'Record voice note'}
                  </Text>
                  <Text style={[styles.voiceButtonBody, { color: theme.muted }]}>
                    Speak freely. Wenwen will add the text into this journal.
                  </Text>
                </View>
              </TouchableOpacity>

              <TextInput
                value={journalNote}
                onChangeText={setJournalNote}
                maxLength={INPUT_LIMITS.journalNote}
                accessibilityLabel="Journal note"
                placeholder="Write anything you want to remember about today..."
                placeholderTextColor={theme.subtle}
                multiline
                autoFocus
                editable={!isSavingJournal}
                style={[
                  styles.journalInput,
                  {
                    backgroundColor: theme.softSurface,
                    borderColor: theme.softBorder,
                    color: theme.text,
                  },
                ]}
              />
              <TouchableOpacity
                style={[styles.modalPrimaryButton, { backgroundColor: theme.primary }]}
                onPress={handleSaveJournal}
                disabled={isSavingJournal}
              >
                {isSavingJournal ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="sparkles-outline" size={18} color="#FFFFFF" />
                    <Text style={styles.modalPrimaryButtonText}>Save & Summarize</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        animationType="fade"
        transparent
        visible={isReviewModalVisible}
        onRequestClose={() => setIsReviewModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.reviewModalCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.modalHeader}>
              <View style={styles.reviewTitleWrap}>
                <Text style={[styles.modalKicker, { color: theme.subtle }]}>
                  {reviewDateKey ? formatDateLabel(reviewDateKey) : 'Daily review'}
                </Text>
                <Text style={[styles.modalTitle, { color: theme.text }]}>Daily review</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close daily review"
                onPress={() => setIsReviewModalVisible(false)}
                style={[styles.closeButton, { backgroundColor: theme.softSurface }]}
              >
                <Ionicons name="close" size={20} color={theme.muted} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.reviewScrollContent}>
              {isReviewLoading ? (
                <View style={styles.loadingBlock}>
                  <ActivityIndicator color={theme.primaryStrong} />
                  <Text style={[styles.loadingText, { color: theme.muted }]}>Writing the review...</Text>
                </View>
              ) : reviewSummary ? (
                <View style={[styles.summaryCard, { backgroundColor: theme.primarySoft, borderColor: theme.softBorder }]}>
                  <Text style={[styles.summaryTitle, { color: theme.text }]}>{reviewSummary.title}</Text>
                  <Text style={[styles.summaryBody, { color: theme.muted }]}>{reviewSummary.body}</Text>
                </View>
              ) : (
                <View style={[styles.summaryCard, { backgroundColor: theme.softSurface, borderColor: theme.softBorder }]}>
                  <Text style={[styles.summaryTitle, { color: theme.text }]}>Saved for later</Text>
                  <Text style={[styles.summaryBody, { color: theme.muted }]}>
                    {reviewError || 'The AI review could not be written yet, but this day is still saved.'}
                  </Text>
                </View>
              )}

              <View style={[styles.reviewSection, { borderColor: theme.softBorder }]}>
                <Text style={[styles.reviewSectionTitle, { color: theme.textStrong }]}>Tasks</Text>
                {reviewTasks.length === 0 ? (
                  <Text style={[styles.reviewMutedText, { color: theme.muted }]}>No task snapshot saved for this day.</Text>
                ) : (
                  reviewTasks.map((task) => (
                    <View key={task.id} style={styles.reviewTaskRow}>
                      <Ionicons
                        name={task.done ? 'checkmark-circle' : 'ellipse-outline'}
                        size={18}
                        color={task.done ? '#56BA88' : theme.subtle}
                      />
                      <View style={styles.reviewTaskTextWrap}>
                        <Text style={[styles.reviewTaskTitle, { color: theme.textStrong }]}>{task.title}</Text>
                        <Text style={[styles.reviewMutedText, { color: theme.muted }]}>
                          {task.done ? 'Finished' : 'Still open'}
                        </Text>
                      </View>
                    </View>
                  ))
                )}
              </View>

              <View style={[styles.reviewSection, { borderColor: theme.softBorder }]}>
                <Text style={[styles.reviewSectionTitle, { color: theme.textStrong }]}>Daily note</Text>
                {reviewImage && <Image source={{ uri: reviewImage.uri }} style={styles.reviewImage} />}
                <Text style={[styles.reviewMutedText, { color: theme.muted }]}>
                  {reviewFeelingNote || 'No note was written for this day.'}
                </Text>
                {reviewMoodLabel && (
                  <Text style={[styles.moodLine, { color: theme.primaryStrong }]}>Mood: {reviewMoodLabel}</Text>
                )}
                {reviewFeelingScoreLabel ? (
                  <Text style={[styles.moodLine, { color: theme.primaryStrong }]}>{reviewFeelingScoreLabel}</Text>
                ) : null}
              </View>

              {reviewDailyContextLabels.length > 0 && (
                <View style={[styles.reviewSection, { borderColor: theme.softBorder }]}>
                  <Text style={[styles.reviewSectionTitle, { color: theme.textStrong }]}>Daily context</Text>
                  <View style={styles.contextReviewList}>
                    {reviewDailyContextLabels.map((label) => (
                      <View key={label} style={[styles.contextReviewPill, { backgroundColor: theme.softSurface }]}>
                        <Ionicons name="analytics-outline" size={15} color={theme.primaryStrong} />
                        <Text style={[styles.contextReviewText, { color: theme.muted }]}>{label}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {!isKeyboardVisible && (
        <View style={styles.bottomTabWrap}>
          <BottomTabPlaceholder activeKey="journal" onTabPress={handleTabPress} />
        </View>
      )}
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
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  searchBox: {
    minHeight: 46,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  searchInput: {
    flex: 1,
    minHeight: 42,
    fontSize: 14,
    fontWeight: '700',
  },
  clearSearchButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addJournalButton: {
    minHeight: 46,
    borderRadius: 16,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    flex: 1,
  },
  addJournalButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  reviewButton: {
    minHeight: 46,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  reviewButtonText: {
    fontSize: 13,
    fontWeight: '900',
  },
  list: {
    gap: 10,
  },
  emptyCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  emptyBody: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  emptyActionButton: {
    minHeight: 42,
    borderRadius: 14,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  emptyActionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  dateCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 1,
  },
  dateCardPressed: {
    opacity: 0.88,
  },
  dateIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateTextWrap: {
    flex: 1,
  },
  dateTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  dateMeta: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  summaryPreview: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(8, 12, 18, 0.58)',
    justifyContent: 'center',
    padding: 20,
  },
  modalKeyboardAvoidingView: {
    flex: 1,
  },
  modalOverlayKeyboard: {
    justifyContent: 'flex-end',
  },
  modalCard: {
    maxHeight: '88%',
    borderRadius: 24,
    borderWidth: 1,
    padding: 18,
  },
  reviewModalCard: {
    maxHeight: '82%',
    borderRadius: 24,
    borderWidth: 1,
    padding: 18,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  reviewTitleWrap: {
    flex: 1,
  },
  modalKicker: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '900',
    marginTop: 4,
  },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBody: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 12,
  },
  composerScrollContent: {
    paddingBottom: 2,
  },
  composerScrollContentKeyboard: {
    paddingBottom: 18,
  },
  imageAttachCard: {
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 12,
    overflow: 'hidden',
  },
  attachImageButton: {
    minHeight: 74,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  attachImageIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
  },
  imagePreview: {
    width: 82,
    height: 82,
    borderRadius: 16,
    backgroundColor: '#E8EEF0',
  },
  imagePreviewTextWrap: {
    flex: 1,
  },
  imagePreviewTitle: {
    fontSize: 14,
    fontWeight: '900',
  },
  imagePreviewBody: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
    marginTop: 3,
  },
  removeImageButton: {
    marginTop: 9,
    alignSelf: 'flex-start',
    minHeight: 32,
    borderRadius: 999,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFF0F0',
  },
  removeImageText: {
    color: '#C33B3B',
    fontSize: 11,
    fontWeight: '900',
  },
  voiceButton: {
    minHeight: 76,
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  voiceButtonDisabled: {
    opacity: 0.72,
  },
  voiceButtonIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceButtonTextWrap: {
    flex: 1,
  },
  voiceButtonTitle: {
    fontSize: 14,
    fontWeight: '900',
  },
  voiceButtonBody: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
    marginTop: 3,
  },
  promptSection: {
    marginTop: 14,
    gap: 8,
  },
  promptTitle: {
    fontSize: 13,
    fontWeight: '900',
  },
  promptChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  promptChip: {
    minHeight: 38,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  promptChipPressed: {
    opacity: 0.8,
  },
  promptChipText: {
    fontSize: 12,
    fontWeight: '900',
  },
  contextSection: {
    marginTop: 14,
    gap: 8,
  },
  contextChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  contextChip: {
    minHeight: 40,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contextChipText: {
    fontSize: 12,
    fontWeight: '900',
  },
  journalInput: {
    minHeight: 150,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    textAlignVertical: 'top',
    marginTop: 12,
  },
  modalPrimaryButton: {
    minHeight: 48,
    borderRadius: 16,
    marginTop: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  modalPrimaryButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  reviewScrollContent: {
    paddingTop: 14,
    gap: 12,
  },
  loadingBlock: {
    minHeight: 118,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    fontWeight: '700',
  },
  summaryCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '900',
  },
  summaryBody: {
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '600',
    marginTop: 8,
  },
  reviewSection: {
    borderTopWidth: 1,
    paddingTop: 12,
  },
  reviewSectionTitle: {
    fontSize: 14,
    fontWeight: '900',
    marginBottom: 8,
  },
  reviewTaskRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 9,
  },
  reviewTaskTextWrap: {
    flex: 1,
  },
  reviewTaskTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  reviewMutedText: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
  },
  reviewImage: {
    width: '100%',
    height: 190,
    borderRadius: 16,
    marginBottom: 10,
    backgroundColor: '#E8EEF0',
  },
  moodLine: {
    fontSize: 13,
    fontWeight: '800',
    marginTop: 8,
  },
  contextReviewList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  contextReviewPill: {
    minHeight: 34,
    borderRadius: 999,
    paddingHorizontal: 10,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  contextReviewText: {
    fontSize: 12,
    fontWeight: '800',
  },
  bottomTabWrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
  },
});
