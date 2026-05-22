import React, { ComponentType, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
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
import { router } from 'expo-router';

import type { WenwenProps } from '@/components/WenwenBase';
import { BottomTabPlaceholder, type DashboardTabKey } from '@/src/components/home/BottomTabPlaceholder';
import { useKeyboardState } from '@/src/hooks/use-keyboard-state';
import { useVoiceCheckInRecorder } from '@/src/hooks/use-voice-check-in-recorder';
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
import { useAppTheme } from '@/src/theme/app-theme';
import type { CompanionChatSummary, CompanionDayEntry, CompanionMessage } from '@/src/types/companion';
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

type MiniPersonaAvatarProps = {
  colors: AvatarColors;
  persona: AvatarPersona;
};

function MiniPersonaAvatar({ colors, persona }: MiniPersonaAvatarProps) {
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
          <View style={[styles.miniCatEye, styles.miniCatEyeLeft]}>
            <View style={[styles.miniCatPupil, { backgroundColor: colors.eyeColor }]} />
          </View>
          <View style={[styles.miniCatEye, styles.miniCatEyeRight]}>
            <View style={[styles.miniCatPupil, { backgroundColor: colors.eyeColor }]} />
          </View>
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
            <View style={[styles.miniBotEye, { backgroundColor: colors.eyeColor }]} />
            <View style={[styles.miniBotSmile, { borderBottomColor: colors.eyeColor }]} />
            <View style={[styles.miniBotEye, { backgroundColor: colors.eyeColor }]} />
          </View>
        </View>
        <View style={[styles.miniBotChest, { backgroundColor: colors.faceColor }]} />
      </View>
    </View>
  );
}

export default function CompanionScreen() {
  const theme = useAppTheme();
  const { height: windowHeight } = useWindowDimensions();
  const today = useMemo(() => getLocalDateKey(), []);
  const yesterday = useMemo(() => getPreviousDateKey(today), [today]);
  const fallbackMessages = useMemo(
    () => [createCompanionMessage('assistant', COMPANION_WELCOME_TEXT)],
    []
  );
  const entries = useCompanionStore((state) => state.entries);
  const ensureDay = useCompanionStore((state) => state.ensureDay);
  const addMessage = useCompanionStore((state) => state.addMessage);
  const addSummary = useCompanionStore((state) => state.addSummary);
  const hasHydrated = useCompanionStore((state) => state.hasHydrated);
  const avatarColors = usePreferencesStore((state) => state.avatarColors);
  const avatarPersona = usePreferencesStore((state) => state.avatarPersona);
  const companionMemoryEnabled = usePreferencesStore((state) => state.companionMemoryEnabled);
  const markHomeGuideFeatureVisited = usePreferencesStore((state) => state.markHomeGuideFeatureVisited);
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
  const chatScrollRef = useRef<ScrollView | null>(null);
  const inputRef = useRef<TextInput | null>(null);
  const { isVisible: isKeyboardVisible } = useKeyboardState();
  const voiceRecorder = useVoiceCheckInRecorder();
  const avatarScale = useRef(new Animated.Value(1)).current;
  const avatarTranslateY = useRef(new Animated.Value(0)).current;
  const avatarRotate = useRef(new Animated.Value(0)).current;
  const avatarGlow = useRef(new Animated.Value(0)).current;
  const lastAnimatedMessageIdRef = useRef('');
  const canSend = input.trim().length > 0 && !isSending && !isTranscribingVoice;
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
  const avatarRotateInterpolate = avatarRotate.interpolate({
    inputRange: [-1, 1],
    outputRange: ['-5deg', '5deg'],
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
    if (!hasHydrated) return;
    ensureDay(today);
  }, [ensureDay, hasHydrated, today]);

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
    if (tab === 'settings') {
      router.replace('/settings');
    }
  };

  const openReviewForDate = useCallback(
    async (dateKey: string) => {
      const entry = useCompanionStore.getState().entries[dateKey];
      if (!hasConversation(entry)) return;

      const summaryMessages = entry?.messages ?? [];

      setReviewDateKey(dateKey);
      setIsReviewModalVisible(true);
      setReviewError('');

      const existingSummary = getMatchingSummary(entry, summaryMessages);
      if (existingSummary) {
        setReviewSummary(existingSummary);
        return;
      }

      setReviewSummary(null);
      setIsReviewLoading(true);
      try {
        const result = await generateCompanionSummary({
          dateKey,
          messages: summaryMessages,
        });
        const summary = addSummary({
          dateKey,
          title: result.title,
          body: result.body,
          messages: summaryMessages,
        });
        setReviewSummary(summary);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Wenwen could not summarize this chat yet.';
        setReviewError(message);
      } finally {
        setIsReviewLoading(false);
      }
    },
    [addSummary]
  );

  const sendMessageText = async (rawText: string, shouldClearInput = false) => {
    const cleanInput = clampText(rawText, INPUT_LIMITS.companionMessage).trim();
    if (!cleanInput || isSending) return;

    const userMessage = createCompanionMessage('user', cleanInput);
    const nextMessages = [...messages, userMessage];
    addMessage(today, userMessage);
    if (shouldClearInput) {
      setInput('');
    }
    setIsSending(true);

    try {
      const memoryContext = companionMemoryEnabled ? buildCompanionMemoryContext(today) : '';
      const reply = await generateCompanionReply(nextMessages, {
        persona: selectedPersona,
        memoryContext,
      });
      addMessage(today, createCompanionMessage('assistant', reply));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to reach Wenwen right now.';
      Alert.alert('Try again', message);
    } finally {
      setIsSending(false);
    }
  };

  const handleSend = async () => {
    await sendMessageText(input, true);
  };

  const handleToggleVoiceMessage = async () => {
    if (isSending || isTranscribingVoice || voiceRecorder.isPreparing) return;

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
        <Text style={[styles.screenTitle, { color: theme.subtle }]}>Companion</Text>
        <Text style={[styles.heroTitle, { color: theme.text }]}>Talk with Wenwen</Text>
        <Text style={[styles.heroSubtitle, { color: theme.muted }]}>
          Chat about your day, tasks, or what you want to sort out.
        </Text>

        <View style={styles.avatarStage}>
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
            <View>
              <Text style={[styles.chatTitle, { color: theme.textStrong }]}>Today&apos;s chat</Text>
              <Text style={[styles.chatMeta, { color: theme.muted }]}>
                {userMessageCount === 0 ? 'No message yet' : `${userMessageCount} message${userMessageCount === 1 ? '' : 's'} from you`}
              </Text>
            </View>
            {hasConversation(todayEntry) && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Summarize today's chat"
                onPress={() => openReviewForDate(today)}
                style={[styles.summaryIconButton, { backgroundColor: theme.primarySoft }]}
              >
                <Ionicons name="sparkles-outline" size={18} color={theme.primaryStrong} />
              </Pressable>
            )}
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
          </ScrollView>

          <View style={[styles.composerBar, { backgroundColor: theme.surface, borderColor: theme.softBorder }]}>
            <TextInput
              ref={inputRef}
              value={input}
              onChangeText={setInput}
              maxLength={INPUT_LIMITS.companionMessage}
              placeholder="Type a thought or update..."
              placeholderTextColor={theme.subtle}
              multiline
              style={[styles.input, { color: theme.text }, webInputReset]}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={voiceRecorder.isRecording ? 'Stop voice message recording' : 'Record voice message'}
              disabled={isSending || isTranscribingVoice || voiceRecorder.isPreparing}
              onPress={handleToggleVoiceMessage}
              style={[
                styles.voiceComposerButton,
                {
                  backgroundColor: voiceRecorder.isRecording ? theme.primarySoft : theme.softSurface,
                  borderColor: voiceRecorder.isRecording ? theme.primary : theme.softBorder,
                },
                (isSending || isTranscribingVoice || voiceRecorder.isPreparing) && styles.voiceComposerButtonDisabled,
              ]}
            >
              {isTranscribingVoice || voiceRecorder.isPreparing ? (
                <ActivityIndicator color={theme.primaryStrong} />
              ) : (
                <Ionicons
                  name={voiceRecorder.isRecording ? 'stop-circle-outline' : 'mic-outline'}
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
            <Text style={[styles.historySubtitle, { color: theme.muted }]}>Daily conversations and AI reviews.</Text>
          </View>
          {hasYesterdayReview && (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Show yesterday chat review"
              style={[styles.historyAction, { backgroundColor: theme.primarySoft }]}
              onPress={() => openReviewForDate(yesterday)}
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
          <View style={styles.historyList}>
            {historyKeys.map((dateKey) => {
              const entry = entries[dateKey];
              const messagesForDay = entry?.messages ?? [];
              const dayUserMessageCount = messagesForDay.filter((message) => message.role === 'user').length;
              const summary = getMatchingSummary(entry, messagesForDay);

              return (
                <Pressable
                  key={dateKey}
                  accessibilityRole="button"
                  accessibilityLabel={`Open chat review for ${formatDateLabel(dateKey)}`}
                  onPress={() => openReviewForDate(dateKey)}
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
          </View>
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
                <Text style={[styles.modalTitle, { color: theme.text }]}>Daily review</Text>
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
                <View style={[styles.summaryCard, { backgroundColor: theme.primarySoft, borderColor: theme.softBorder }]}>
                  <Text style={[styles.summaryTitle, { color: theme.text }]}>{reviewSummary.title}</Text>
                  <Text style={[styles.summaryBody, { color: theme.muted }]}>{reviewSummary.body}</Text>
                </View>
              ) : (
                <View style={[styles.summaryCard, { backgroundColor: theme.softSurface, borderColor: theme.softBorder }]}>
                  <Text style={[styles.summaryTitle, { color: theme.text }]}>Saved for later</Text>
                  <Text style={[styles.summaryBody, { color: theme.muted }]}>
                    {reviewError || 'The AI review could not be written yet, but the chat is saved.'}
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
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 124,
  },
  scrollContentKeyboard: {
    paddingBottom: 36,
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
    lineHeight: 20,
    marginTop: 4,
    marginBottom: 14,
  },
  avatarStage: {
    alignItems: 'center',
    marginBottom: 14,
    position: 'relative',
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
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
  summaryIconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
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
  historyList: {
    gap: 10,
  },
  historyCard: {
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
  bottomTabWrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
  },
});
