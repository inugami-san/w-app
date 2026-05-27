import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { usePreferencesStore } from '@/src/store/preferences-store';
import {
  COMPANION_CHAT_DAILY_REWARD,
  DEEP_REVIEW_COST,
  JOURNAL_ENTRY_REWARD,
  PAID_COLOR_COST,
  PERSONA_CHARGE_COST,
  PERSONA_CHARGE_HOURS,
  PERSONA_UNLOCK_COSTS,
  REWARD_CURRENCY_NAME,
  STEP_ENERGY_REWARD,
  STEP_ENERGY_THRESHOLD,
  TASK_SUGGESTION_COST,
  TASK_COMPLETION_REWARD,
  useRewardStore,
} from '@/src/store/reward-store';
import { useAppTheme } from '@/src/theme/app-theme';

const ENERGY_RULES = [
  `Finish a task: +${TASK_COMPLETION_REWARD} ${REWARD_CURRENCY_NAME}`,
  `Write a journal entry: +${JOURNAL_ENTRY_REWARD} ${REWARD_CURRENCY_NAME}`,
  `First companion chat of the day: +${COMPANION_CHAT_DAILY_REWARD} ${REWARD_CURRENCY_NAME}`,
  `${STEP_ENERGY_THRESHOLD.toLocaleString()} steps: +${STEP_ENERGY_REWARD} ${REWARD_CURRENCY_NAME}`,
];

const SPEND_RULES = [
  `Wake Wenwen for ${PERSONA_CHARGE_HOURS} hours: ${PERSONA_CHARGE_COST} ${REWARD_CURRENCY_NAME}`,
  `Wenwen task suggestions: ${TASK_SUGGESTION_COST} ${REWARD_CURRENCY_NAME}`,
  `Deep Wenwen review: ${DEEP_REVIEW_COST} ${REWARD_CURRENCY_NAME}`,
  `Avatar colors: ${PAID_COLOR_COST} ${REWARD_CURRENCY_NAME}`,
  `Cat persona: ${PERSONA_UNLOCK_COSTS.cat ?? 0} ${REWARD_CURRENCY_NAME}`,
];

export function GlowBalancePill() {
  const theme = useAppTheme();
  const glowBalance = useRewardStore((state) => state.glowBalance);
  const reducedMotion = usePreferencesStore((state) => state.reducedMotion);
  const previousBalanceRef = useRef(glowBalance);
  const pulse = useRef(new Animated.Value(0)).current;
  const float = useRef(new Animated.Value(0)).current;
  const [earnedAmount, setEarnedAmount] = useState(0);
  const [isInfoVisible, setIsInfoVisible] = useState(false);

  useEffect(() => {
    const previousBalance = previousBalanceRef.current;
    previousBalanceRef.current = glowBalance;

    if (glowBalance <= previousBalance) return;

    const gained = glowBalance - previousBalance;
    setEarnedAmount(gained);

    if (reducedMotion) {
      const timeout = setTimeout(() => setEarnedAmount(0), 1200);
      return () => clearTimeout(timeout);
    }

    pulse.stopAnimation();
    float.stopAnimation();
    pulse.setValue(0);
    float.setValue(0);

    Animated.parallel([
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 180,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 420,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(float, {
        toValue: 1,
        duration: 900,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(() => setEarnedAmount(0));
  }, [float, glowBalance, pulse, reducedMotion]);

  const pillScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.08],
  });

  const sparkleScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.35],
  });

  const earnedTranslateY = float.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -18],
  });

  const earnedOpacity = float.interpolate({
    inputRange: [0, 0.25, 1],
    outputRange: [0, 1, 0],
  });

  return (
    <View style={styles.wrap}>
      {earnedAmount > 0 && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.earnedBadge,
            {
              backgroundColor: theme.primary,
              opacity: reducedMotion ? 1 : earnedOpacity,
              transform: [{ translateY: reducedMotion ? -14 : earnedTranslateY }],
            },
          ]}
        >
          <Text style={styles.earnedText}>+{earnedAmount}</Text>
        </Animated.View>
      )}
      <View style={styles.pillRow}>
        <Animated.View
          accessibilityLabel={`${glowBalance} ${REWARD_CURRENCY_NAME}`}
          style={[
            styles.pill,
            {
              backgroundColor: theme.primarySoft,
              borderColor: theme.softBorder,
              transform: [{ scale: reducedMotion ? 1 : pillScale }],
            },
          ]}
        >
          <Animated.View style={{ transform: [{ scale: reducedMotion ? 1 : sparkleScale }] }}>
            <Ionicons name="flash" size={15} color={theme.primaryStrong} />
          </Animated.View>
          <Text style={[styles.balance, { color: theme.primaryStrong }]}>{glowBalance}</Text>
          <Text style={[styles.label, { color: theme.muted }]}>{REWARD_CURRENCY_NAME}</Text>
        </Animated.View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Show Energy earning criteria"
          onPress={() => setIsInfoVisible(true)}
          style={[styles.infoButton, { backgroundColor: theme.surface, borderColor: theme.softBorder }]}
        >
          <Text style={[styles.infoText, { color: theme.primaryStrong }]}>!</Text>
        </Pressable>
      </View>

      <Modal
        animationType="fade"
        transparent
        visible={isInfoVisible}
        onRequestClose={() => setIsInfoVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={[styles.modalIcon, { backgroundColor: theme.primarySoft }]}>
              <Ionicons name="flash" size={22} color={theme.primaryStrong} />
            </View>
            <Text style={[styles.modalTitle, { color: theme.textStrong }]}>How to earn Energy</Text>
            <Text style={[styles.modalSectionTitle, { color: theme.textStrong }]}>Earn</Text>
            <View style={styles.ruleList}>
              {ENERGY_RULES.map((rule) => (
                <View key={rule} style={styles.ruleRow}>
                  <Ionicons name="checkmark-circle" size={17} color={theme.primaryStrong} />
                  <Text style={[styles.ruleText, { color: theme.muted }]}>{rule}</Text>
                </View>
              ))}
            </View>
            <Text style={[styles.modalSectionTitle, { color: theme.textStrong }]}>Spend</Text>
            <View style={styles.ruleList}>
              {SPEND_RULES.map((rule) => (
                <View key={rule} style={styles.ruleRow}>
                  <Ionicons name="flash" size={17} color={theme.primaryStrong} />
                  <Text style={[styles.ruleText, { color: theme.muted }]}>{rule}</Text>
                </View>
              ))}
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close Energy criteria"
              onPress={() => setIsInfoVisible(false)}
              style={[styles.closeInfoButton, { backgroundColor: theme.primary }]}
            >
              <Text style={styles.closeInfoText}>Got it</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pill: {
    minWidth: 86,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  earnedBadge: {
    position: 'absolute',
    top: -6,
    right: 2,
    borderRadius: 12,
    paddingHorizontal: 7,
    paddingVertical: 3,
    zIndex: 2,
  },
  earnedText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
  },
  balance: {
    fontSize: 15,
    fontWeight: '900',
  },
  label: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  infoButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoText: {
    fontSize: 15,
    fontWeight: '900',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(8, 12, 18, 0.58)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
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
  modalIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
  },
  modalSectionTitle: {
    width: '100%',
    fontSize: 13,
    fontWeight: '900',
    marginTop: 16,
    textTransform: 'uppercase',
  },
  ruleList: {
    width: '100%',
    gap: 10,
    marginTop: 10,
  },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  ruleText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  closeInfoButton: {
    width: '100%',
    minHeight: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
  },
  closeInfoText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
});
