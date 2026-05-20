import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { usePreferencesStore } from '@/src/store/preferences-store';
import { useAppTheme } from '@/src/theme/app-theme';
import { INPUT_LIMITS } from '@/src/utils/input-limits';

export default function LoginScreen() {
  const theme = useAppTheme();
  const hasHydrated = usePreferencesStore((state) => state.hasHydrated);
  const hasCompletedOnboarding = usePreferencesStore((state) => state.hasCompletedOnboarding);
  const savedName = usePreferencesStore((state) => state.displayName);
  const completeOnboarding = usePreferencesStore((state) => state.completeOnboarding);
  const [name, setName] = useState(savedName);

  useEffect(() => {
    if (!hasHydrated) return;
    if (hasCompletedOnboarding) {
      router.replace('/dashboard');
    }
  }, [hasCompletedOnboarding, hasHydrated]);

  useEffect(() => {
    setName(savedName);
  }, [savedName]);

  const handleStart = () => {
    const cleanName = name.trim() || 'Friend';
    completeOnboarding(cleanName);
    router.replace('/dashboard');
  };

  if (!hasHydrated) {
    return (
      <View style={[styles.root, styles.centered, { backgroundColor: theme.background }]}>
        <Text style={[styles.loadingText, { color: theme.muted }]}>Loading Wenwen...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.container}>
        <View style={[styles.avatarMark, { backgroundColor: theme.primarySoft }]}>
          <Text style={[styles.avatarLetter, { color: theme.primaryStrong }]}>W</Text>
        </View>

        <Text style={[styles.title, { color: theme.text }]}>Set up Wenwen</Text>
        <Text style={[styles.subtitle, { color: theme.muted }]}>
          Track tasks, write journal notes, and use the companion chat when you need to sort something out.
        </Text>

        <View style={styles.formContainer}>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.subtle }]}>Name</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.surface,
                  borderColor: theme.softBorder,
                  color: theme.text,
                },
              ]}
              placeholder="What should Wenwen call you?"
              placeholderTextColor={theme.subtle}
              autoCapitalize="words"
              maxLength={INPUT_LIMITS.displayName}
              value={name}
              onChangeText={setName}
              returnKeyType="done"
              onSubmitEditing={handleStart}
            />
          </View>

          <View style={[styles.summaryCard, { backgroundColor: theme.softSurface, borderColor: theme.border }]}>
            <View style={styles.summaryRow}>
              <Ionicons name="checkmark-circle-outline" size={18} color={theme.primaryStrong} />
              <Text style={[styles.summaryText, { color: theme.muted }]}>Tasks help you choose one action for today.</Text>
            </View>
            <View style={styles.summaryRow}>
              <Ionicons name="create-outline" size={18} color={theme.primaryStrong} />
              <Text style={[styles.summaryText, { color: theme.muted }]}>Journal keeps daily notes and memories organized.</Text>
            </View>
            <View style={styles.summaryRow}>
              <Ionicons name="chatbubble-ellipses-outline" size={18} color={theme.primaryStrong} />
              <Text style={[styles.summaryText, { color: theme.muted }]}>Companion helps sort thoughts into a next step.</Text>
            </View>
            <View style={styles.summaryRow}>
              <Ionicons name="shield-checkmark-outline" size={18} color={theme.primaryStrong} />
              <Text style={[styles.summaryText, { color: theme.muted }]}>Data stays local unless an AI feature needs context.</Text>
            </View>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Start using Wenwen"
            style={({ pressed }) => [
              styles.primaryButton,
              { backgroundColor: theme.primary },
              pressed && styles.primaryButtonPressed,
            ]}
            onPress={handleStart}
          >
            <Text style={styles.primaryButtonText}>Start</Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    flex: 1,
    paddingHorizontal: 28,
    justifyContent: 'center',
  },
  avatarMark: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
  },
  avatarLetter: {
    fontSize: 24,
    fontWeight: '900',
  },
  title: {
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: 0,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 23,
    fontWeight: '600',
    marginTop: 10,
  },
  formContainer: {
    gap: 16,
    marginTop: 28,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontWeight: '600',
  },
  summaryCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    gap: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
  },
  summaryText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
  },
  primaryButton: {
    minHeight: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  primaryButtonPressed: {
    opacity: 0.88,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
