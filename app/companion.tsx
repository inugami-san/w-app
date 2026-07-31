import React, { ComponentType, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  AppState,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextStyle,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';

import type { WenwenProps } from '@/components/WenwenBase';
import { BottomTabPlaceholder, type DashboardTabKey } from '@/src/components/home/BottomTabPlaceholder';
import { GlowBalancePill } from '@/src/components/rewards/GlowBalancePill';
import { useKeyboardState } from '@/src/hooks/use-keyboard-state';
import { useVoiceCheckInRecorder } from '@/src/hooks/use-voice-check-in-recorder';
import { useWebVoiceInput } from '@/src/hooks/use-web-voice-input';
import { useWenwenSpeech } from '@/src/hooks/use-wenwen-speech';
import { buildCompanionMemoryContext } from '@/src/services/companion-memory';
import { generateCompanionReply } from '@/src/services/gemini-companion-chat';
import { generateCompanionSummary } from '@/src/services/gemini-companion-summary';
import { transcribeVoiceCheckIn } from '@/src/services/gemini-voice';
import {
  COMPANION_WELCOME_TEXT,
  createCompanionMessage,
  useCompanionStore,
} from '@/src/store/companion-store';
import {
  DEFAULT_AVATAR_COLORS,
  DEFAULT_AVATAR_PERSONA,
  type AvatarColors,
  type AvatarPersona,
  usePreferencesStore,
} from '@/src/store/preferences-store';
import { useJournalStore } from '@/src/store/journal-store';
import {
  DEEP_REVIEW_COST,
  REWARD_CURRENCY_NAME,
  VOICE_TRANSCRIPTION_COST,
  useRewardStore,
} from '@/src/store/reward-store';
import { useTaskStore } from '@/src/store/task-store';
import { useAppTheme } from '@/src/theme/app-theme';
import type { CompanionChatSummary, CompanionDayEntry, CompanionMessage } from '@/src/types/companion';
import type { JournalEntry } from '@/src/types/journal';
import type { TaskItem } from '@/src/types/task';
import { getLocalDateKey } from '@/src/utils/date';
import { clampText, INPUT_LIMITS } from '@/src/utils/input-limits';
import { loadSkiaWebIfNeeded } from '@/src/utils/load-skia-web';

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

function hasConversation(entry: CompanionDayEntry | undefined) {
  return entry?.messages.some((message) => message.role === 'user') ?? false;
}

function getMatchingSummary(entry: CompanionDayEntry | undefined, messages: CompanionMessage[]) {
  return entry?.summaries.find((summary) => summary.messages.length === messages.length) ?? null;
}

const HISTORY_VISIBLE_ITEM_COUNT = 5;
const HISTORY_CARD_MIN_HEIGHT = 78;
const HISTORY_CARD_GAP = 10;
const HISTORY_LIST_MAX_HEIGHT =
  (HISTORY_CARD_MIN_HEIGHT * HISTORY_VISIBLE_ITEM_COUNT) +
  (HISTORY_CARD_GAP * (HISTORY_VISIBLE_ITEM_COUNT - 1));

function buildFloatingBubbleText(input: {
  tasks: TaskItem[];
  journalEntry?: JournalEntry;
  messages: CompanionMessage[];
}) {
  const hasOpenTask = input.tasks.some((task) => !task.done);
  if (hasOpenTask) return 'One small step counts.';

  const completedCount = input.tasks.filter((task) => task.done).length;
  if (completedCount > 0) return 'You made progress today.';

  const journalNote = input.journalEntry?.feelingNote.trim();
  if (journalNote) return 'Your thoughts are worth sorting.';

  const latestUserMessage = [...input.messages].reverse().find((message) => message.role === 'user')?.text;
  if (latestUserMessage) return 'Clarity can start small.';

  return 'Begin where you are.';
}

type MiniPersonaAvatarProps = {
  colors: AvatarColors;
  persona: AvatarPersona;
  isAsleep?: boolean;
};

function MiniPersonaAvatar({ colors, persona, isAsleep = false }: MiniPersonaAvatarProps) {
  if (persona === 'cat') {
    return (
      <View style={styles.miniCatScene}>
        <View style={[styles.miniCatEar, styles.miniCatEarLeft, { backgroundColor: colors.bodyColor }]}>
          <View style={[styles.miniCatInnerEar, { backgroundColor: colors.faceColor }]} />
        </View>
        <View style={[styles.miniCatEar, styles.miniCatEarRight, { backgroundColor: colors.bodyColor }]}>
          <View style={[styles.miniCatInnerEar, { backgroundColor: colors.faceColor }]} />
        </View>
        <View style={[styles.miniCatHead, { backgroundColor: colors.bodyColor }]}>
          {isAsleep ? (
            <>
              <View style={[styles.miniCatSleepEye, styles.miniCatSleepEyeLeft, { borderBottomColor: colors.eyeColor }]} />
              <View style={[styles.miniCatSleepEye, styles.miniCatSleepEyeRight, { borderBottomColor: colors.eyeColor }]} />
            </>
          ) : (
            <>
              <View style={[styles.miniCatEye, styles.miniCatEyeLeft]}>
                <View style={[styles.miniCatPupil, { backgroundColor: colors.eyeColor }]} />
              </View>
              <View style={[styles.miniCatEye, styles.miniCatEyeRight]}>
                <View style={[styles.miniCatPupil, { backgroundColor: colors.eyeColor }]} />
              </View>
            </>
          )}
          <View style={[styles.miniCatMuzzle, { backgroundColor: colors.faceColor }]}>
            <View style={[styles.miniCatNose, { borderBottomColor: colors.eyeColor }]} />
          </View>
          <View style={[styles.miniCatWhisker, styles.miniCatWhiskerTopLeft, { backgroundColor: colors.eyeColor }]} />
          <View style={[styles.miniCatWhisker, styles.miniCatWhiskerMidLeft, { backgroundColor: colors.eyeColor }]} />
          <View style={[styles.miniCatWhisker, styles.miniCatWhiskerLowLeft, { backgroundColor: colors.eyeColor }]} />
          <View style={[styles.miniCatWhisker, styles.miniCatWhiskerTopRight, { backgroundColor: colors.eyeColor }]} />
          <View style={[styles.miniCatWhisker, styles.miniCatWhiskerMidRight, { backgroundColor: colors.eyeColor }]} />
          <View style={[styles.miniCatWhisker, styles.miniCatWhiskerLowRight, { backgroundColor: colors.eyeColor }]} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.miniBotScene}>
      <View style={[styles.miniBotBody, { backgroundColor: colors.bodyColor }]}>
        <View style={[styles.miniBotFaceRim, { borderColor: colors.faceColor }]}>
          <View style={[styles.miniBotFace, { backgroundColor: colors.faceColor }]}>
            {isAsleep ? (
              <>
                <View style={[styles.miniBotSleepEye, { borderBottomColor: colors.eyeColor }]} />
                <View style={[styles.miniBotSleepEye, { borderBottomColor: colors.eyeColor }]} />
              </>
            ) : (
              <>
                <View style={[styles.miniBotEye, { backgroundColor: colors.eyeColor }]} />
                <View style={[styles.miniBotSmile, { borderBottomColor: colors.eyeColor }]} />
                <View style={[styles.miniBotEye, { backgroundColor: colors.eyeColor }]} />
              </>
            )}
          </View>
        </View>
        <View style={[styles.miniBotChest, { backgroundColor: colors.faceColor }]} />
      </View>
    </View>
  );
}

export default function CompanionScreen() {
  const params = useLocalSearchParams<{ closeoutPrompt?: string | string[] }>();
  const theme = useAppTheme();
  const { height: windowHeight } = useWindowDimensions();
  const [today, setToday] = useState(() => getLocalDateKey());
  const yesterday = useMemo(() => getPreviousDateKey(today), [today]);
  const fallbackMessages = useMemo(
    () => [createCompanionMessage('assistant', COMPANION_WELCOME_TEXT)],
    []
  );
  const entries = useCompanionStore((state) => state.entries);
  const tasks = useTaskStore((state) => state.tasks);
  const journalEntries = useJournalStore((state) => state.entries);
  const ensureDay = useCompanionStore((state) => state.ensureDay);
  const addMessage = useCompanionStore((state) => state.addMessage);
  const addSummary = useCompanionStore((state) => state.addSummary);
  const hasHydrated = useCompanionStore((state) => state.hasHydrated);
  const avatarColors = usePreferencesStore((state) => state.avatarColors);
  const avatarPersona = usePreferencesStore((state) => state.avatarPersona);
  const companionMemoryEnabled = usePreferencesStore((state) => state.companionMemoryEnabled);
  const setCompanionMemoryEnabled = usePreferencesStore((state) => state.setCompanionMemoryEnabled);
  const aiTaskContextEnabled = usePreferencesStore((state) => state.aiTaskContextEnabled);
  const aiJournalContextEnabled = usePreferencesStore((state) => state.aiJournalContextEnabled);
  const aiCompanionContextEnabled = usePreferencesStore((state) => state.aiCompanionContextEnabled);
  const reducedMotion = usePreferencesStore((state) => state.reducedMotion);
  const markHomeGuideFeatureVisited = usePreferencesStore((state) => state.markHomeGuideFeatureVisited);
  const spendEnergy = useRewardStore((state) => state.spendEnergy);
  const todayEntry = entries[today];
  const messages = todayEntry?.messages ?? fallbackMessages;
  const [avatarComponents, setAvatarComponents] =
    useState<Record<AvatarPersona, ComponentType<WenwenProps>> | null>(null);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isTranscribingVoice, setIsTranscribingVoice] = useState(false);
  const [reviewDateKey, setReviewDateKey] = useState('');
  const [isReviewModalVisible, setIsReviewModalVisible] = useState(false);
  const [isReviewLoading, setIsReviewLoading] = useState(false);
  const [reviewSummary, setReviewSummary] = useState<CompanionChatSummary | null>(null);
  const [reviewError, setReviewError] = useState('');
  const [lastFailedPrompt, setLastFailedPrompt] = useState('');
  const chatScrollRef = useRef<ScrollView | null>(null);
  const inputRef = useRef<TextInput | null>(null);
  const handledCloseoutPromptRef = useRef('');
  const reviewRequestIdRef = useRef(0);
  const { isVisible: isKeyboardVisible } = useKeyboardState();
  const voiceRecorder = useVoiceCheckInRecorder();
  const webVoiceInput = useWebVoiceInput();
  const wenwenSpeech = useWenwenSpeech();
  const isWebPlatform = Platform.OS === 'web';
  const avatarScale = useRef(new Animated.Value(1)).current;
  const avatarTranslateY = useRef(new Animated.Value(0)).current;
  const avatarRotate = useRef(new Animated.Value(0)).current;
  const avatarGlow = useRef(new Animated.Value(0)).current;
  const floatingBubble = useRef(new Animated.Value(0)).current;
  const lastAnimatedMessageIdRef = useRef('');
  const canSend = input.trim().length > 0 && !isSending && !isTranscribingVoice;
  // On web: show interim transcript in the input field while user speaks
  const displayInput = isWebPlatform && webVoiceInput.isListening && webVoiceInput.interimTranscript
    ? webVoiceInput.interimTranscript
    : input;
  const chatPanelHeight = isKeyboardVisible
    ? Math.min(Math.max(windowHeight * 0.34, 280), 390)
    : Math.min(Math.max(windowHeight * 0.46, 360), 520);
  const webInputReset = Platform.OS === 'web' ? ({ outlineStyle: 'none' } as unknown as TextStyle) : null;
  const selectedPersona = avatarPersona ?? DEFAULT_AVATAR_PERSONA;
  const AvatarComponent = avatarComponents?.[selectedPersona] ?? null;
  const selectedColors = {
    eyeColor: avatarColors?.eyeColor ?? DEFAULT_AVATAR_COLORS.eyeColor,
    faceColor: avatarColors?.faceColor ?? DEFAULT_AVATAR_COLORS.faceColor,
    bodyColor: avatarColors?.bodyColor ?? DEFAULT_AVATAR_COLORS.bodyColor,
  };
  const renderMessageAvatar = () => (
    <View
      accessibilityRole="image"
      accessibilityLabel="Wenwen persona"
      style={[styles.messageAvatar, { backgroundColor: theme.primarySoft, borderColor: theme.softBorder }]}
    >
      <MiniPersonaAvatar colors={selectedColors} persona={selectedPersona} />
    </View>
  );

  useEffect(() => {
    const closeoutPrompt = Array.isArray(params.closeoutPrompt) ? params.closeoutPrompt[0] : params.closeoutPrompt;
    const cleanCloseoutPrompt = closeoutPrompt?.trim() ?? '';
    if (!cleanCloseoutPrompt || handledCloseoutPromptRef.current === cleanCloseoutPrompt) return;

    handledCloseoutPromptRef.current = cleanCloseoutPrompt;
    setInput(cleanCloseoutPrompt);
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [params.closeoutPrompt]);

  const historyKeys = useMemo(() => {
    return Object.keys(entries)
      .filter((dateKey) => dateKey !== today)
      .filter((dateKey) => hasConversation(entries[dateKey]))
      .sort((a, b) => b.localeCompare(a));
  }, [entries, today]);

  const yesterdayEntry = entries[yesterday];
  const hasYesterdayReview = hasConversation(yesterdayEntry);
  const reviewEntry = reviewDateKey ? entries[reviewDateKey] : undefined;
  const reviewMessages = reviewEntry?.messages ?? [];
  const userMessageCount = messages.filter((message) => message.role === 'user').length;
  const floatingBubbleText = useMemo(
    () => buildFloatingBubbleText({ tasks, journalEntry: journalEntries[today], messages }),
    [journalEntries, messages, tasks, today]
  );
  const avatarRotateInterpolate = avatarRotate.interpolate({
    inputRange: [-1, 1],
    outputRange: ['-5deg', '5deg'],
  });
  const floatingBubbleY = floatingBubble.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -8],
  });
  const floatingBubbleOpacity = floatingBubble.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.88, 1, 0.88],
  });

  const runAvatarReaction = useCallback(
    (role: CompanionMessage['role']) => {
      avatarScale.stopAnimation();
      avatarTranslateY.stopAnimation();
      avatarRotate.stopAnimation();
      avatarGlow.stopAnimation();
      avatarScale.setValue(1);
      avatarTranslateY.setValue(0);
      avatarRotate.setValue(0);
      avatarGlow.setValue(0);

      if (role === 'user') {
        Animated.parallel([
          Animated.sequence([
            Animated.timing(avatarScale, {
              toValue: 1.035,
              duration: 130,
              useNativeDriver: true,
            }),
            Animated.spring(avatarScale, {
              toValue: 1,
              friction: 5,
              tension: 120,
              useNativeDriver: true,
            }),
          ]),
          Animated.sequence([
            Animated.timing(avatarRotate, {
              toValue: -0.65,
              duration: 120,
              useNativeDriver: true,
            }),
            Animated.spring(avatarRotate, {
              toValue: 0,
              friction: 6,
              tension: 110,
              useNativeDriver: true,
            }),
          ]),
        ]).start();
        return;
      }

      Animated.parallel([
        Animated.sequence([
          Animated.timing(avatarTranslateY, {
            toValue: -10,
            duration: 150,
            useNativeDriver: true,
          }),
          Animated.spring(avatarTranslateY, {
            toValue: 0,
            friction: 5,
            tension: 120,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(avatarScale, {
            toValue: 1.075,
            duration: 160,
            useNativeDriver: true,
          }),
          Animated.spring(avatarScale, {
            toValue: 1,
            friction: 5,
            tension: 120,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(avatarGlow, {
            toValue: 1,
            duration: 130,
            useNativeDriver: true,
          }),
          Animated.timing(avatarGlow, {
            toValue: 0,
            duration: 420,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    },
    [avatarGlow, avatarRotate, avatarScale, avatarTranslateY]
  );

  useEffect(() => {
    markHomeGuideFeatureVisited('companion');
  }, [markHomeGuideFeatureVisited]);

  useEffect(() => {
    const refreshToday = () => setToday(getLocalDateKey());
    const interval = setInterval(refreshToday, 60_000);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refreshToday();
    });

    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (!hasHydrated) return;
    ensureDay(today);
  }, [ensureDay, hasHydrated, today]);

  useEffect(() => {
    if (reducedMotion) {
      floatingBubble.stopAnimation();
      floatingBubble.setValue(0);
      return;
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(floatingBubble, {
          toValue: 1,
          duration: 1700,
          useNativeDriver: true,
        }),
        Animated.timing(floatingBubble, {
          toValue: 0,
          duration: 1700,
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();
    return () => animation.stop();
  }, [floatingBubble, reducedMotion]);

  useEffect(() => {
    const load = async () => {
      await loadSkiaWebIfNeeded();

      const [botMod, catMod] = await Promise.all([
        import('@/components/WenwenBase'),
        import('@/components/CatBase'),
      ]);
      setAvatarComponents({
        bot: botMod.WenwenBase as ComponentType<WenwenProps>,
        cat: catMod.CatBase as ComponentType<WenwenProps>,
      });
    };

    load().catch(() => {
      setAvatarComponents(null);
    });
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      chatScrollRef.current?.scrollToEnd({ animated: true });
    }, 80);

    return () => clearTimeout(timeout);
  }, [messages.length, isSending]);

  useEffect(() => {
    const latestMessage = messages[messages.length - 1];
    if (!latestMessage) return;

    if (!lastAnimatedMessageIdRef.current) {
      lastAnimatedMessageIdRef.current = latestMessage.id;
      return;
    }

    if (lastAnimatedMessageIdRef.current === latestMessage.id) return;
    lastAnimatedMessageIdRef.current = latestMessage.id;
    runAvatarReaction(latestMessage.role);
  }, [messages, runAvatarReaction]);

  const handleTabPress = (tab: DashboardTabKey) => {
    if (tab === 'companion') return;
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
    if (tab === 'profile') {
      router.replace('/profile');
    }
  };

  const openReviewForDate = useCallback(
    async (dateKey: string) => {
      const requestId = reviewRequestIdRef.current + 1;
      reviewRequestIdRef.current = requestId;
      const entry = useCompanionStore.getState().entries[dateKey];
      if (!hasConversation(entry)) return;

      const summaryMessages = entry?.messages ?? [];

      setReviewDateKey(dateKey);
      setIsReviewModalVisible(true);
      setReviewError('');

      const existingSummary = getMatchingSummary(entry, summaryMessages);
      if (existingSummary) {
        setReviewSummary(existingSummary);
        setIsReviewLoading(false);
        return;
      }

      setReviewSummary(null);
      setIsReviewLoading(true);
      try {
        const result = await generateCompanionSummary({
          dateKey,
          messages: summaryMessages,
        }, {
          includeCompanionContext: aiCompanionContextEnabled,
        });
        const summary = addSummary({
          dateKey,
          title: result.title,
          body: result.body,
          messages: summaryMessages,
        });
        if (reviewRequestIdRef.current !== requestId) return;
        setReviewSummary(summary);
      } catch (error) {
        if (reviewRequestIdRef.current !== requestId) return;
        const message = error instanceof Error ? error.message : 'Wenwen could not summarize this chat yet.';
        setReviewError(message);
      } finally {
        if (reviewRequestIdRef.current === requestId) {
          setIsReviewLoading(false);
        }
      }
    },
    [addSummary, aiCompanionContextEnabled]
  );

  const handleOpenReviewForDate = useCallback(
    (dateKey: string) => {
      openReviewForDate(dateKey).catch(() => undefined);
    },
    [openReviewForDate]
  );

  const handleDeepReview = () => {
    if (!reviewDateKey || isReviewLoading) return;

    const entry = useCompanionStore.getState().entries[reviewDateKey];
    if (!hasConversation(entry)) return;

    if (useRewardStore.getState().glowBalance < DEEP_REVIEW_COST) {
      Alert.alert(
        'Energy needed',
        `A deeper Wenwen review costs ${DEEP_REVIEW_COST} ${REWARD_CURRENCY_NAME}.`
      );
      return;
    }

    const didSpend = spendEnergy(DEEP_REVIEW_COST);
    if (!didSpend) return;

    const requestId = reviewRequestIdRef.current + 1;
    reviewRequestIdRef.current = requestId;
    const summaryMessages = entry?.messages ?? [];
    setReviewError('');
    setIsReviewLoading(true);

    generateCompanionSummary({
      dateKey: reviewDateKey,
      messages: summaryMessages,
    }, {
      includeCompanionContext: aiCompanionContextEnabled,
      depth: 'deep',
    })
      .then((result) => {
        const summary = addSummary({
          dateKey: reviewDateKey,
          title: result.title,
          body: result.body,
          messages: summaryMessages,
        });
        if (reviewRequestIdRef.current !== requestId) return;
        setReviewSummary(summary);
      })
      .catch((error) => {
        if (reviewRequestIdRef.current !== requestId) return;
        const message = error instanceof Error ? error.message : 'Wenwen could not write the deeper review yet.';
        setReviewError(message);
      })
      .finally(() => {
        if (reviewRequestIdRef.current === requestId) {
          setIsReviewLoading(false);
        }
      });
  };

  const sendMessageText = async (rawText: string, shouldClearInput = false) => {
    const cleanInput = clampText(rawText, INPUT_LIMITS.companionMessage).trim();
    if (!cleanInput || isSending) return;

    const userMessage = createCompanionMessage('user', cleanInput);
    const nextMessages = [...messages, userMessage];
    addMessage(today, userMessage);
    setLastFailedPrompt('');
    if (shouldClearInput) {
      setInput('');
    }
    setIsSending(true);

    try {
      const memoryContext = companionMemoryEnabled
        ? buildCompanionMemoryContext(today, {
            includeTasks: aiTaskContextEnabled,
            includeJournal: aiJournalContextEnabled,
            includeCompanionChats: aiCompanionContextEnabled,
          })
        : '';
      const reply = await generateCompanionReply(nextMessages, {
        persona: selectedPersona,
        memoryContext,
      });
      addMessage(today, createCompanionMessage('assistant', reply));
      wenwenSpeech.speak(reply);
    } catch (error) {
      setLastFailedPrompt(cleanInput);
      const message = error instanceof Error ? error.message : 'Unable to reach Wenwen right now.';
      Alert.alert('Try again', message);
    } finally {
      setIsSending(false);
    }
  };

  const handleSend = async () => {
    await sendMessageText(input, true);
  };

  const handleRetryFailedReply = async () => {
    if (!lastFailedPrompt || isSending) return;

    setIsSending(true);
    try {
      const entry = useCompanionStore.getState().entries[today];
      const retryMessages = entry?.messages ?? messages;
      const memoryContext = companionMemoryEnabled
        ? buildCompanionMemoryContext(today, {
            includeTasks: aiTaskContextEnabled,
            includeJournal: aiJournalContextEnabled,
            includeCompanionChats: aiCompanionContextEnabled,
          })
        : '';
      const reply = await generateCompanionReply(retryMessages, {
        persona: selectedPersona,
        memoryContext,
      });
      addMessage(today, createCompanionMessage('assistant', reply));
      setLastFailedPrompt('');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to reach Wenwen right now.';
      Alert.alert('Try again', message);
    } finally {
      setIsSending(false);
    }
  };

  /** Web: use SpeechRecognition — real-time, no energy cost, no Gemini transcription. */
  const handleWebVoiceMessage = useCallback(() => {
    if (isSending) return;

    if (webVoiceInput.isListening) {
      webVoiceInput.stopListening();
      return;
    }

    webVoiceInput.startListening((finalText) => {
      if (finalText.trim()) {
        sendMessageText(finalText);
      }
    });
  }, [isSending, sendMessageText, webVoiceInput]);

  const handleToggleVoiceMessage = async () => {
    if (isSending || isTranscribingVoice || voiceRecorder.isPreparing) return;

    try {
      if (!voiceRecorder.isRecording) {
        if (useRewardStore.getState().glowBalance < VOICE_TRANSCRIPTION_COST) {
          Alert.alert(
            'Energy needed',
            `Voice chat costs ${VOICE_TRANSCRIPTION_COST} ${REWARD_CURRENCY_NAME}.`
          );
          return;
        }

        await voiceRecorder.startRecording();
        return;
      }

      setIsTranscribingVoice(true);
      const uri = await voiceRecorder.stopRecording();
      if (!uri) {
        throw new Error('No voice recording was saved.');
      }

      const didSpend = spendEnergy(VOICE_TRANSCRIPTION_COST);
      if (!didSpend) {
        Alert.alert(
          'Energy needed',
          `Voice chat costs ${VOICE_TRANSCRIPTION_COST} ${REWARD_CURRENCY_NAME}.`
        );
        return;
      }

      const transcription = await transcribeVoiceCheckIn(
        { uri, mode: 'companion' },
        {
          onError: () => undefined,
        }
      );

      if (!transcription) {
        Alert.alert('Voice not sent', 'Wenwen could not read that voice message clearly.');
        return;
      }

      await sendMessageText(transcription);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to record voice right now.';
      Alert.alert('Voice message failed', message);
    } finally {
      setIsTranscribingVoice(false);
    }
  };

  const handleFocusComposer = () => {
    chatScrollRef.current?.scrollToEnd({ animated: true });
    inputRef.current?.focus();
  };

  const handleCancelVoiceMessage = async () => {
    try {
      await voiceRecorder.cancelRecording();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to cancel recording right now.';
      Alert.alert('Voice message failed', message);
    }
  };

  // Stop Wenwen speaking when navigating away
  useEffect(() => {
    return () => {
      wenwenSpeech.stop();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const recordingSeconds = Math.max(0, Math.floor(voiceRecorder.durationMillis / 1000));
  const recordingDuration = `${Math.floor(recordingSeconds / 60)}:${String(recordingSeconds % 60).padStart(2, '0')}`;

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          isKeyboardVisible && styles.scrollContentKeyboard,
        ]}
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topActionRow}>
          <GlowBalancePill />
        </View>

        <View style={styles.avatarStage}>
          <Animated.View
            pointerEvents="none"
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={[
              styles.floatingBubble,
              {
                backgroundColor: theme.surface,
                borderColor: theme.softBorder,
                opacity: floatingBubbleOpacity,
                transform: [{ translateY: floatingBubbleY }],
              },
            ]}
          >
            <Text numberOfLines={2} style={[styles.floatingBubbleText, { color: theme.primaryStrong }]}>
              {floatingBubbleText}
            </Text>
            <View style={[styles.floatingBubbleTail, { backgroundColor: theme.surface, borderColor: theme.softBorder }]} />
          </Animated.View>
          <Animated.View
            pointerEvents="none"
            style={[
              styles.avatarGlow,
              {
                backgroundColor: theme.primary,
                opacity: avatarGlow,
                transform: [{ scale: avatarScale }],
              },
            ]}
          />
          <Animated.View
            style={[
              styles.avatarMotion,
              {
                transform: [
                  { translateY: avatarTranslateY },
                  { rotate: avatarRotateInterpolate },
                  { scale: avatarScale },
                ],
              },
            ]}
          >
            <View style={[styles.avatarShell, { backgroundColor: theme.primarySoft, borderColor: theme.softBorder }]}>
              {AvatarComponent ? (
                <AvatarComponent
                  eyeColor={avatarColors?.eyeColor ?? DEFAULT_AVATAR_COLORS.eyeColor}
                  faceColor={avatarColors?.faceColor ?? DEFAULT_AVATAR_COLORS.faceColor}
                  bodyColor={avatarColors?.bodyColor ?? DEFAULT_AVATAR_COLORS.bodyColor}
                  presentation="peek"
                />
              ) : (
                <Text style={[styles.avatarFallback, { color: theme.primaryStrong }]}>
                  {selectedPersona === 'cat' ? 'C' : 'W'}
                </Text>
              )}
            </View>
          </Animated.View>
        </View>

        <View
          style={[
            styles.chatPanel,
            {
              height: chatPanelHeight,
              backgroundColor: theme.softSurface,
              borderColor: theme.border,
              shadowColor: theme.shadow,
            },
          ]}
        >
          <View style={styles.chatHeader}>
            <View style={styles.chatHeaderText}>
              <Text style={[styles.chatTitle, { color: theme.textStrong }]}>Today&apos;s chat</Text>
              <Text style={[styles.chatMeta, { color: theme.muted }]}>
                {userMessageCount === 0 ? 'No message yet' : `${userMessageCount} message${userMessageCount === 1 ? '' : 's'} from you`}
              </Text>
            </View>
            <View style={styles.chatHeaderActions}>
              {/* Voice reply toggle */}
              <Pressable
                accessibilityRole="switch"
                accessibilityState={{ checked: wenwenSpeech.voiceEnabled }}
                accessibilityLabel={wenwenSpeech.voiceEnabled ? 'Turn Wenwen voice off' : 'Turn Wenwen voice on'}
                onPress={wenwenSpeech.toggleVoice}
                style={[
                  styles.memoryPill,
                  {
                    backgroundColor: wenwenSpeech.voiceEnabled ? theme.primarySoft : theme.surface,
                    borderColor: wenwenSpeech.voiceEnabled ? theme.primary : theme.softBorder,
                  },
                ]}
              >
                <Ionicons
                  name={wenwenSpeech.isSpeaking ? 'volume-high' : wenwenSpeech.voiceEnabled ? 'volume-medium-outline' : 'volume-mute-outline'}
                  size={14}
                  color={wenwenSpeech.voiceEnabled ? theme.primaryStrong : theme.subtle}
                />
                <Text style={[styles.memoryPillText, { color: wenwenSpeech.voiceEnabled ? theme.primaryStrong : theme.muted }]}>
                  {wenwenSpeech.isSpeaking ? 'Speaking…' : wenwenSpeech.voiceEnabled ? 'Voice on' : 'Voice off'}
                </Text>
              </Pressable>
              {/* Companion memory toggle */}
              <Pressable
                accessibilityRole="switch"
                accessibilityState={{ checked: companionMemoryEnabled }}
                accessibilityLabel={companionMemoryEnabled ? 'Turn companion memory off' : 'Turn companion memory on'}
                onPress={() => setCompanionMemoryEnabled(!companionMemoryEnabled)}
                style={[
                  styles.memoryPill,
                  {
                    backgroundColor: companionMemoryEnabled ? theme.primarySoft : theme.surface,
                    borderColor: companionMemoryEnabled ? theme.primary : theme.softBorder,
                  },
                ]}
              >
                <Ionicons
                  name={companionMemoryEnabled ? 'file-tray-full-outline' : 'file-tray-outline'}
                  size={14}
                  color={companionMemoryEnabled ? theme.primaryStrong : theme.subtle}
                />
                <Text style={[styles.memoryPillText, { color: companionMemoryEnabled ? theme.primaryStrong : theme.muted }]}>
                  Memory {companionMemoryEnabled ? 'on' : 'off'}
                </Text>
              </Pressable>
              {hasConversation(todayEntry) && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Summarize today's chat"
                  onPress={() => handleOpenReviewForDate(today)}
                  style={[
                    styles.summaryButton,
                    { backgroundColor: theme.primarySoft },
                  ]}
                >
                  <Ionicons
                    name="sparkles-outline"
                    size={18}
                    color={theme.primaryStrong}
                  />
                  <Text style={[styles.summaryButtonText, { color: theme.primaryStrong }]}>Review</Text>
                </Pressable>
              )}
            </View>
          </View>

          <ScrollView
            ref={chatScrollRef}
            style={styles.chatScroll}
            contentContainerStyle={styles.messageList}
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {messages.map((message) => {
              const isUser = message.role === 'user';
              return (
                <View
                  key={message.id}
                  style={[styles.messageRow, isUser && styles.userMessageRow]}
                >
                  {!isUser && (
                    renderMessageAvatar()
                  )}
                  <View
                    style={[
                      styles.messageBubble,
                      {
                        backgroundColor: isUser ? theme.primary : theme.surface,
                        borderColor: isUser ? theme.primary : theme.softBorder,
                      },
                    ]}
                  >
                    <Text style={[styles.messageText, { color: isUser ? '#FFFFFF' : theme.textStrong }]}>
                      {message.text}
                    </Text>
                  </View>
                </View>
              );
            })}

            {isSending && (
              <View style={styles.messageRow}>
                {renderMessageAvatar()}
                <View style={[styles.messageBubble, { backgroundColor: theme.surface, borderColor: theme.softBorder }]}>
                  <Text style={[styles.messageText, { color: theme.muted }]}>Wenwen is thinking...</Text>
                </View>
              </View>
            )}
            {!!lastFailedPrompt && !isSending && (
              <View style={[styles.retryBlock, { backgroundColor: theme.surface, borderColor: theme.softBorder }]}>
                <Text style={[styles.retryText, { color: theme.muted }]}>Wenwen did not answer that message.</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Retry Wenwen reply"
                  onPress={handleRetryFailedReply}
                  style={[styles.retryButton, { backgroundColor: theme.primarySoft }]}
                >
                  <Ionicons name="refresh" size={14} color={theme.primaryStrong} />
                  <Text style={[styles.retryButtonText, { color: theme.primaryStrong }]}>Try again</Text>
                </Pressable>
              </View>
            )}
          </ScrollView>

          {/* Recording bar: native expo-audio recording */}
          {!isWebPlatform && voiceRecorder.isRecording && (
            <View style={[styles.recordingBar, { backgroundColor: theme.surface, borderColor: theme.primary }]}>
              <View style={styles.recordingStatus}>
                <View style={[styles.recordingDot, { backgroundColor: theme.primary }]} />
                <Text style={[styles.recordingText, { color: theme.textStrong }]}>Recording {recordingDuration}</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Cancel voice message"
                onPress={handleCancelVoiceMessage}
                style={[styles.cancelRecordingButton, { backgroundColor: theme.softSurface }]}
              >
                <Text style={[styles.cancelRecordingText, { color: theme.muted }]}>Cancel</Text>
              </Pressable>
            </View>
          )}

          {/* Listening bar: web SpeechRecognition */}
          {isWebPlatform && webVoiceInput.isListening && (
            <View style={[styles.recordingBar, { backgroundColor: theme.surface, borderColor: theme.primary }]}>
              <View style={styles.recordingStatus}>
                <View style={[styles.recordingDot, { backgroundColor: theme.primary }]} />
                <Text style={[styles.recordingText, { color: theme.textStrong }]}>
                  {webVoiceInput.interimTranscript ? webVoiceInput.interimTranscript : 'Listening…'}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Cancel voice input"
                onPress={webVoiceInput.stopListening}
                style={[styles.cancelRecordingButton, { backgroundColor: theme.softSurface }]}
              >
                <Text style={[styles.cancelRecordingText, { color: theme.muted }]}>Cancel</Text>
              </Pressable>
            </View>
          )}

          <View style={[styles.composerBar, { backgroundColor: theme.surface, borderColor: theme.softBorder }]}>
            <TextInput
              ref={inputRef}
              value={displayInput}
              onChangeText={setInput}
              maxLength={INPUT_LIMITS.companionMessage}
              placeholder={isWebPlatform && webVoiceInput.isSupported ? 'Type or tap the mic to speak…' : 'Type a thought or update...'}
              placeholderTextColor={theme.subtle}
              multiline
              editable={!webVoiceInput.isListening}
              style={[styles.input, { color: webVoiceInput.isListening ? theme.muted : theme.text }, webInputReset]}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                isWebPlatform
                  ? (webVoiceInput.isListening ? 'Stop listening' : 'Start voice input')
                  : (voiceRecorder.isRecording ? 'Stop voice message recording' : 'Record voice message')
              }
              disabled={
                isWebPlatform
                  ? (isSending || !webVoiceInput.isSupported)
                  : (isSending || isTranscribingVoice || voiceRecorder.isPreparing)
              }
              onPress={isWebPlatform ? handleWebVoiceMessage : handleToggleVoiceMessage}
              style={[
                styles.voiceComposerButton,
                {
                  backgroundColor:
                    (isWebPlatform ? webVoiceInput.isListening : voiceRecorder.isRecording)
                      ? theme.primarySoft
                      : theme.softSurface,
                  borderColor:
                    (isWebPlatform ? webVoiceInput.isListening : voiceRecorder.isRecording)
                      ? theme.primary
                      : theme.softBorder,
                },
                (isWebPlatform
                  ? (isSending || !webVoiceInput.isSupported)
                  : (isSending || isTranscribingVoice || voiceRecorder.isPreparing)
                ) && styles.voiceComposerButtonDisabled,
              ]}
            >
              {(!isWebPlatform && (isTranscribingVoice || voiceRecorder.isPreparing)) ? (
                <ActivityIndicator color={theme.primaryStrong} />
              ) : (
                <Ionicons
                  name={
                    isWebPlatform
                      ? (webVoiceInput.isListening ? 'stop-circle-outline' : 'mic-outline')
                      : (voiceRecorder.isRecording ? 'stop-circle-outline' : 'mic-outline')
                  }
                  size={16}
                  color={theme.primaryStrong}
                />
              )}
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Send message"
              disabled={!canSend}
              onPress={handleSend}
              style={[styles.sendButton, { backgroundColor: canSend ? theme.primary : theme.softSurface }]}
            >
              <Ionicons name="send" size={16} color={canSend ? '#FFFFFF' : theme.subtle} />
            </Pressable>
          </View>
        </View>

        <View style={styles.historyHeader}>
          <View>
            <Text style={[styles.historyTitle, { color: theme.textStrong }]}>Chat history</Text>
            <Text style={[styles.historySubtitle, { color: theme.muted }]}>Daily conversations and Wenwen reviews.</Text>
          </View>
          {hasYesterdayReview && (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Show yesterday chat review"
              style={[styles.historyAction, { backgroundColor: theme.primarySoft }]}
              onPress={() => handleOpenReviewForDate(yesterday)}
            >
              <Text style={[styles.historyActionText, { color: theme.primaryStrong }]}>Yesterday</Text>
            </TouchableOpacity>
          )}
        </View>

        {historyKeys.length === 0 ? (
          <View style={[styles.emptyHistoryCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Ionicons name="chatbubble-ellipses-outline" size={22} color={theme.primaryStrong} />
            <Text style={[styles.emptyTitle, { color: theme.textStrong }]}>No chat history yet</Text>
            <Text style={[styles.emptyBody, { color: theme.muted }]}>
              Share what is on your mind, or ask for one small step.
            </Text>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Start a chat"
              onPress={handleFocusComposer}
              style={[styles.emptyActionButton, { backgroundColor: theme.primary }]}
            >
              <Text style={styles.emptyActionText}>Start a chat</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView
            nestedScrollEnabled
            showsVerticalScrollIndicator={historyKeys.length > HISTORY_VISIBLE_ITEM_COUNT}
            style={styles.historyListScroll}
            contentContainerStyle={styles.historyList}
          >
            {historyKeys.map((dateKey) => {
              const entry = entries[dateKey];
              const messagesForDay = entry?.messages ?? [];
              const dayUserMessageCount = messagesForDay.filter((message) => message.role === 'user').length;
              const summary = getMatchingSummary(entry, messagesForDay);

              return (
                <Pressable
                  key={dateKey}
                  accessibilityRole="button"
                  accessibilityLabel={`Open daily review and chat log for ${formatDateLabel(dateKey)}`}
                  onPress={() => handleOpenReviewForDate(dateKey)}
                  style={({ pressed }) => [
                    styles.historyCard,
                    { backgroundColor: theme.surface, borderColor: theme.border, shadowColor: theme.shadow },
                    pressed && styles.historyCardPressed,
                  ]}
                >
                  <View style={[styles.historyIcon, { backgroundColor: theme.primarySoft }]}>
                    <Ionicons name="chatbubble-outline" size={19} color={theme.primaryStrong} />
                  </View>
                  <View style={styles.historyTextWrap}>
                    <Text style={[styles.historyDate, { color: theme.textStrong }]}>
                      {formatDateLabel(dateKey)}
                    </Text>
                    <Text style={[styles.historyMeta, { color: theme.muted }]}>
                      {dayUserMessageCount} message{dayUserMessageCount === 1 ? '' : 's'} from you
                      {summary ? ' · Summary ready' : ''}
                    </Text>
                    {summary && (
                      <Text style={[styles.historySummary, { color: theme.primaryStrong }]}>{summary.title}</Text>
                    )}
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={theme.subtle} />
                </Pressable>
              );
            })}
          </ScrollView>
        )}
      </ScrollView>

      <Modal
        animationType="fade"
        transparent
        visible={isReviewModalVisible}
        onRequestClose={() => setIsReviewModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.reviewModalCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleWrap}>
                <Text style={[styles.modalKicker, { color: theme.subtle }]}>
                  {reviewDateKey ? formatDateLabel(reviewDateKey) : 'Companion'}
                </Text>
                <Text style={[styles.modalTitle, { color: theme.text }]}>Review and chat log</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close chat review"
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
                <>
                  <View style={[styles.summaryCard, { backgroundColor: theme.primarySoft, borderColor: theme.softBorder }]}>
                    <Text style={[styles.summaryTitle, { color: theme.text }]}>{reviewSummary.title}</Text>
                    <Text style={[styles.summaryBody, { color: theme.muted }]}>{reviewSummary.body}</Text>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Spend Energy for a deeper Wenwen review"
                    onPress={handleDeepReview}
                    style={[styles.deepReviewButton, { backgroundColor: theme.surface, borderColor: theme.softBorder }]}
                  >
                    <Ionicons name="sparkles-outline" size={16} color={theme.primaryStrong} />
                    <Text style={[styles.deepReviewButtonText, { color: theme.primaryStrong }]}>
                      Deep review · {DEEP_REVIEW_COST} {REWARD_CURRENCY_NAME}
                    </Text>
                  </Pressable>
                </>
              ) : (
                <View style={[styles.summaryCard, { backgroundColor: theme.softSurface, borderColor: theme.softBorder }]}>
                  <Text style={[styles.summaryTitle, { color: theme.text }]}>Saved for later</Text>
                  <Text style={[styles.summaryBody, { color: theme.muted }]}>
                    {reviewError || 'The Wenwen review could not be written yet, but the chat is saved.'}
                  </Text>
                </View>
              )}

              <View style={[styles.reviewSection, { borderColor: theme.softBorder }]}>
                <Text style={[styles.reviewSectionTitle, { color: theme.textStrong }]}>Chat log</Text>
                {reviewMessages.map((message) => (
                  <View key={message.id} style={styles.reviewMessageRow}>
                    <Text style={[styles.reviewRole, { color: message.role === 'user' ? theme.primaryStrong : theme.subtle }]}>
                      {message.role === 'user' ? 'You' : 'Wenwen'}
                    </Text>
                    <Text style={[styles.reviewMessageText, { color: theme.muted }]}>{message.text}</Text>
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {!isKeyboardVisible && (
        <View style={styles.bottomTabWrap}>
          <BottomTabPlaceholder activeKey="companion" onTabPress={handleTabPress} />
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 32,
    paddingHorizontal: 20,
    paddingBottom: 124,
  },
  topActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 2,
  },
  chargeCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 12,
    marginTop: 10,
    marginBottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  chargeTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  chargeTitle: {
    fontSize: 13,
    fontWeight: '900',
  },
  chargeMeta: {
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 16,
    marginTop: 2,
  },
  chargeButton: {
    minHeight: 38,
    borderRadius: 19,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  chargeButtonDisabled: {
    opacity: 0.72,
  },
  chargeButtonText: {
    fontSize: 11,
    fontWeight: '900',
  },
  scrollContentKeyboard: {
    paddingBottom: 36,
  },
  avatarStage: {
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 14,
    position: 'relative',
  },
  floatingBubble: {
    position: 'absolute',
    right: 38,
    top: -14,
    minHeight: 34,
    maxWidth: 210,
    borderRadius: 17,
    borderWidth: 1,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#030711',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
    zIndex: 3,
  },
  floatingBubbleText: {
    fontSize: 12,
    fontWeight: '900',
    lineHeight: 16,
    textAlign: 'center',
  },
  floatingBubbleTail: {
    position: 'absolute',
    left: 18,
    bottom: -5,
    width: 10,
    height: 10,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    transform: [{ rotate: '45deg' }],
  },
  avatarMotion: {
    width: 172,
    height: 122,
  },
  avatarGlow: {
    position: 'absolute',
    width: 184,
    height: 134,
    borderRadius: 40,
    top: -6,
  },
  avatarShell: {
    width: 172,
    height: 122,
    borderRadius: 36,
    borderWidth: 1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFallback: {
    fontSize: 34,
    fontWeight: '900',
  },
  chatPanel: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 14,
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  chatHeader: {
    gap: 10,
    marginBottom: 12,
  },
  chatHeaderText: {
    minWidth: 0,
  },
  chatTitle: {
    fontSize: 16,
    fontWeight: '900',
  },
  chatMeta: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  chatHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  memoryPill: {
    flex: 1,
    minHeight: 36,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  memoryPillText: {
    fontSize: 11,
    fontWeight: '900',
  },
  summaryButton: {
    flex: 1,
    height: 38,
    borderRadius: 19,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  summaryButtonText: {
    fontSize: 11,
    fontWeight: '900',
  },
  chatScroll: {
    flex: 1,
  },
  messageList: {
    paddingVertical: 4,
    gap: 10,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  userMessageRow: {
    justifyContent: 'flex-end',
  },
  messageAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniBotScene: {
    width: 36,
    height: 34,
    alignItems: 'center',
    justifyContent: 'flex-end',
    position: 'relative',
  },
  miniBotBody: {
    width: 30,
    height: 28,
    borderRadius: 11,
    alignItems: 'center',
    paddingTop: 5,
    shadowColor: '#0B1720',
    shadowOpacity: 0.16,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
  },
  miniBotFaceRim: {
    width: 24,
    height: 13,
    borderRadius: 8,
    borderWidth: 1.4,
    padding: 1,
    backgroundColor: '#FFFFFF',
  },
  miniBotFace: {
    flex: 1,
    borderRadius: 7,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  miniBotEye: {
    width: 4,
    height: 7,
    borderRadius: 3,
  },
  miniBotSleepEye: {
    width: 7,
    height: 5,
    borderBottomWidth: 1.8,
    borderRadius: 6,
    marginHorizontal: 1,
  },
  miniBotSmile: {
    width: 8,
    height: 5,
    borderBottomWidth: 1.6,
    borderRadius: 6,
    marginTop: -1,
  },
  miniBotChest: {
    width: 15,
    height: 5,
    borderRadius: 5,
    opacity: 0.32,
    marginTop: 4,
  },
  miniCatScene: {
    width: 36,
    height: 34,
    alignItems: 'center',
    justifyContent: 'flex-end',
    position: 'relative',
  },
  miniCatHead: {
    width: 31,
    height: 27,
    borderRadius: 16,
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  miniCatEar: {
    position: 'absolute',
    width: 12,
    height: 15,
    borderRadius: 7,
    top: 1,
    alignItems: 'center',
    paddingTop: 4,
    zIndex: 0,
  },
  miniCatEarLeft: {
    left: 7,
    transform: [{ rotate: '-25deg' }],
  },
  miniCatEarRight: {
    right: 7,
    transform: [{ rotate: '25deg' }],
  },
  miniCatInnerEar: {
    width: 5,
    height: 8,
    borderRadius: 4,
    opacity: 0.75,
  },
  miniCatEye: {
    position: 'absolute',
    width: 9,
    height: 10,
    borderRadius: 6,
    top: 7,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(64, 82, 98, 0.18)',
  },
  miniCatEyeLeft: {
    left: 8,
  },
  miniCatEyeRight: {
    right: 8,
  },
  miniCatSleepEye: {
    position: 'absolute',
    width: 8,
    height: 5,
    borderBottomWidth: 1.8,
    borderRadius: 6,
    top: 9,
  },
  miniCatSleepEyeLeft: {
    left: 8,
  },
  miniCatSleepEyeRight: {
    right: 8,
  },
  miniCatPupil: {
    width: 4,
    height: 6,
    borderRadius: 3,
  },
  miniCatMuzzle: {
    position: 'absolute',
    width: 16,
    height: 9,
    borderRadius: 9,
    left: 7.5,
    bottom: 5,
    opacity: 0.9,
  },
  miniCatNose: {
    position: 'absolute',
    left: 6,
    top: 2,
    width: 0,
    height: 0,
    borderLeftWidth: 3,
    borderRightWidth: 3,
    borderBottomWidth: 4,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  miniCatWhisker: {
    position: 'absolute',
    width: 10,
    height: 1.4,
    borderRadius: 1,
    opacity: 0.85,
  },
  miniCatWhiskerTopLeft: {
    left: 2,
    bottom: 10,
    transform: [{ rotate: '10deg' }],
  },
  miniCatWhiskerMidLeft: {
    left: 2,
    bottom: 8,
  },
  miniCatWhiskerLowLeft: {
    left: 3,
    bottom: 6,
    transform: [{ rotate: '-10deg' }],
  },
  miniCatWhiskerTopRight: {
    right: 2,
    bottom: 10,
    transform: [{ rotate: '-10deg' }],
  },
  miniCatWhiskerMidRight: {
    right: 2,
    bottom: 8,
  },
  miniCatWhiskerLowRight: {
    right: 3,
    bottom: 6,
    transform: [{ rotate: '10deg' }],
  },
  messageBubble: {
    maxWidth: '82%',
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 13,
    paddingVertical: 10,
  },
  messageText: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  retryBlock: {
    alignSelf: 'flex-start',
    borderRadius: 16,
    borderWidth: 1,
    padding: 10,
    gap: 8,
    maxWidth: '82%',
  },
  retryText: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  retryButton: {
    minHeight: 32,
    borderRadius: 16,
    paddingHorizontal: 10,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  retryButtonText: {
    fontSize: 12,
    fontWeight: '900',
  },
  recordingBar: {
    minHeight: 42,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 12,
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  recordingStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  recordingText: {
    fontSize: 12,
    fontWeight: '900',
  },
  cancelRecordingButton: {
    minHeight: 30,
    borderRadius: 15,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelRecordingText: {
    fontSize: 11,
    fontWeight: '900',
  },
  composerBar: {
    minHeight: 48,
    maxHeight: 104,
    borderRadius: 24,
    borderWidth: 1,
    paddingLeft: 15,
    paddingRight: 6,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginTop: 12,
  },
  input: {
    flex: 1,
    maxHeight: 82,
    fontSize: 14,
    fontWeight: '600',
    paddingVertical: 8,
    textAlignVertical: 'top',
  },
  voiceComposerButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceComposerButtonDisabled: {
    opacity: 0.65,
  },
  sendButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 22,
    marginBottom: 10,
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: '900',
  },
  historySubtitle: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 3,
  },
  historyAction: {
    minHeight: 36,
    borderRadius: 18,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyActionText: {
    fontSize: 12,
    fontWeight: '900',
  },
  emptyHistoryCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '900',
  },
  emptyBody: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
  },
  emptyActionButton: {
    minHeight: 40,
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
  historyListScroll: {
    maxHeight: HISTORY_LIST_MAX_HEIGHT,
  },
  historyList: {
    gap: HISTORY_CARD_GAP,
  },
  historyCard: {
    borderRadius: 18,
    borderWidth: 1,
    minHeight: HISTORY_CARD_MIN_HEIGHT,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 1,
  },
  historyCardPressed: {
    opacity: 0.88,
  },
  historyIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyTextWrap: {
    flex: 1,
  },
  historyDate: {
    fontSize: 15,
    fontWeight: '900',
  },
  historyMeta: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  historySummary: {
    fontSize: 12,
    fontWeight: '800',
    marginTop: 5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(8, 12, 18, 0.58)',
    justifyContent: 'center',
    padding: 20,
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
  modalTitleWrap: {
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
  deepReviewButton: {
    minHeight: 42,
    borderRadius: 21,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  deepReviewButtonText: {
    fontSize: 13,
    fontWeight: '900',
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
  reviewMessageRow: {
    marginBottom: 10,
  },
  reviewRole: {
    fontSize: 12,
    fontWeight: '900',
    marginBottom: 3,
  },
  reviewMessageText: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
  },
  energyModalCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
    alignItems: 'center',
    shadowColor: '#28384E',
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 16 },
    elevation: 8,
  },
  energyModalIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  energyModalTitle: {
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
  },
  energyModalBody: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 21,
    textAlign: 'center',
    marginTop: 8,
  },
  energyModalActions: {
    width: '100%',
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  energySecondaryButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  energySecondaryButtonText: {
    fontSize: 13,
    fontWeight: '900',
  },
  energyPrimaryButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 12,
  },
  energyPrimaryButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  bottomTabWrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
  },
});
