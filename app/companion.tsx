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
import { generateCompanionReply } from '@/src/services/gemini-companion-chat';
import { generateCompanionSummary } from '@/src/services/gemini-companion-summary';
import {
  COMPANION_WELCOME_TEXT,
  createCompanionMessage,
  useCompanionStore,
} from '@/src/store/companion-store';
import {
  DEFAULT_AVATAR_COLORS,
  DEFAULT_AVATAR_PERSONA,
  type AvatarPersona,
  usePreferencesStore,
} from '@/src/store/preferences-store';
import { useAppTheme } from '@/src/theme/app-theme';
import type { CompanionChatSummary, CompanionDayEntry, CompanionMessage } from '@/src/types/companion';
import { getLocalDateKey } from '@/src/utils/date';

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
  const markHomeGuideFeatureVisited = usePreferencesStore((state) => state.markHomeGuideFeatureVisited);
  const todayEntry = entries[today];
  const messages = todayEntry?.messages ?? fallbackMessages;
  const [avatarComponents, setAvatarComponents] =
    useState<Record<AvatarPersona, ComponentType<WenwenProps>> | null>(null);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [reviewDateKey, setReviewDateKey] = useState('');
  const [isReviewModalVisible, setIsReviewModalVisible] = useState(false);
  const [isReviewLoading, setIsReviewLoading] = useState(false);
  const [reviewSummary, setReviewSummary] = useState<CompanionChatSummary | null>(null);
  const [reviewError, setReviewError] = useState('');
  const chatScrollRef = useRef<ScrollView | null>(null);
  const inputRef = useRef<TextInput | null>(null);
  const avatarScale = useRef(new Animated.Value(1)).current;
  const avatarTranslateY = useRef(new Animated.Value(0)).current;
  const avatarRotate = useRef(new Animated.Value(0)).current;
  const avatarGlow = useRef(new Animated.Value(0)).current;
  const lastAnimatedMessageIdRef = useRef('');
  const canSend = input.trim().length > 0 && !isSending;
  const chatPanelHeight = Math.min(Math.max(windowHeight * 0.46, 360), 520);
  const webInputReset = Platform.OS === 'web' ? ({ outlineStyle: 'none' } as unknown as TextStyle) : null;
  const selectedPersona = avatarPersona ?? DEFAULT_AVATAR_PERSONA;
  const AvatarComponent = avatarComponents?.[selectedPersona] ?? null;

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
      if (Platform.OS === 'web') {
        const { LoadSkiaWeb } = await import('@shopify/react-native-skia/lib/commonjs/web/LoadSkiaWeb');
        await (LoadSkiaWeb as Function)({
          locateFile: (file: string) =>
            `https://cdn.jsdelivr.net/npm/canvaskit-wasm@0.40.0/bin/full/${file}`,
        });
      }

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
    if (tab === 'settings') {
      router.push('/settings');
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

  const handleSend = async () => {
    const cleanInput = input.trim();
    if (!cleanInput || isSending) return;

    const userMessage = createCompanionMessage('user', cleanInput);
    const nextMessages = [...messages, userMessage];
    addMessage(today, userMessage);
    setInput('');
    setIsSending(true);

    try {
      const reply = await generateCompanionReply(nextMessages, { persona: selectedPersona });
      addMessage(today, createCompanionMessage('assistant', reply));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to reach Wenwen right now.';
      Alert.alert('Try again', message);
    } finally {
      setIsSending(false);
    }
  };

  const handleFocusComposer = () => {
    chatScrollRef.current?.scrollToEnd({ animated: true });
    inputRef.current?.focus();
  };

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
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
                    <View style={[styles.messageAvatar, { backgroundColor: theme.primarySoft }]}>
                      <Text style={[styles.messageAvatarText, { color: theme.primaryStrong }]}>W</Text>
                    </View>
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
                <View style={[styles.messageAvatar, { backgroundColor: theme.primarySoft }]}>
                  <Text style={[styles.messageAvatarText, { color: theme.primaryStrong }]}>W</Text>
                </View>
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
              placeholder="Type a thought or update..."
              placeholderTextColor={theme.subtle}
              multiline
              style={[styles.input, { color: theme.text }, webInputReset]}
            />
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

      <View style={styles.bottomTabWrap}>
        <BottomTabPlaceholder activeKey="companion" onTabPress={handleTabPress} />
      </View>
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
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageAvatarText: {
    fontSize: 11,
    fontWeight: '900',
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
