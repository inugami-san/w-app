import React, { useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { BottomTabPlaceholder, type DashboardTabKey } from '@/src/components/home/BottomTabPlaceholder';
import { generateCompanionReply } from '@/src/services/gemini-companion-chat';
import { useAppTheme } from '@/src/theme/app-theme';
import type { CompanionMessage } from '@/src/types/companion';

function createMessage(role: CompanionMessage['role'], text: string): CompanionMessage {
  return {
    id: `message-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
    role,
    text,
    createdAt: new Date().toISOString(),
  };
}

export default function CompanionScreen() {
  const theme = useAppTheme();
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [messages, setMessages] = useState<CompanionMessage[]>(() => [
    createMessage('assistant', 'I’m here. What feels most present for you right now?'),
  ]);

  const canSend = input.trim().length > 0 && !isSending;

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

  const handleSend = async () => {
    const cleanInput = input.trim();
    if (!cleanInput || isSending) return;

    const userMessage = createMessage('user', cleanInput);
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput('');
    setIsSending(true);

    try {
      const reply = await generateCompanionReply(nextMessages);
      setMessages((current) => [...current, createMessage('assistant', reply)]);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to reach Wenwen right now.';
      Alert.alert('Try again gently', message);
    } finally {
      setIsSending(false);
    }
  };

  const inputBorderColor = useMemo(
    () => (input.trim() ? theme.primary : theme.softBorder),
    [input, theme.primary, theme.softBorder]
  );

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={[styles.screenTitle, { color: theme.subtle }]}>Companion</Text>
        <Text style={[styles.heroTitle, { color: theme.text }]}>Talk with Wenwen</Text>
        <Text style={[styles.heroSubtitle, { color: theme.muted }]}>
          A calm space for one thought, one feeling, or one small next step.
        </Text>

        <View style={styles.messageList}>
          {messages.map((message) => {
            const isUser = message.role === 'user';
            return (
              <View
                key={message.id}
                style={[
                  styles.messageBubble,
                  {
                    alignSelf: isUser ? 'flex-end' : 'flex-start',
                    backgroundColor: isUser ? theme.primary : theme.surface,
                    borderColor: isUser ? theme.primary : theme.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.messageText,
                    { color: isUser ? '#FFFFFF' : theme.textStrong },
                  ]}
                >
                  {message.text}
                </Text>
              </View>
            );
          })}

          {isSending && (
            <View
              style={[
                styles.messageBubble,
                { alignSelf: 'flex-start', backgroundColor: theme.surface, borderColor: theme.border },
              ]}
            >
              <Text style={[styles.messageText, { color: theme.muted }]}>Wenwen is thinking...</Text>
            </View>
          )}
        </View>
      </ScrollView>

      <View style={[styles.composerWrap, { backgroundColor: theme.background }]}>
        <View
          style={[
            styles.inputWrap,
            {
              backgroundColor: theme.surface,
              borderColor: inputBorderColor,
            },
          ]}
        >
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Write what you feel..."
            placeholderTextColor={theme.subtle}
            multiline
            style={[styles.input, { color: theme.text }]}
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
    paddingBottom: 230,
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
    marginBottom: 16,
  },
  messageList: {
    gap: 10,
  },
  messageBubble: {
    maxWidth: '86%',
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  messageText: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 21,
  },
  composerWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 84,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  inputWrap: {
    minHeight: 54,
    maxHeight: 120,
    borderRadius: 18,
    borderWidth: 1,
    paddingLeft: 14,
    paddingRight: 8,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  input: {
    flex: 1,
    maxHeight: 90,
    fontSize: 14,
    fontWeight: '600',
    paddingVertical: 7,
    textAlignVertical: 'top',
  },
  sendButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
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
