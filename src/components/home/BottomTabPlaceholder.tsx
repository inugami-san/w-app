import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/src/theme/app-theme';
import { usePreferencesStore } from '@/src/store/preferences-store';

export type DashboardTabKey = 'home' | 'customize' | 'journal' | 'companion' | 'settings';

type TabItem = {
  key: DashboardTabKey;
  label: string;
  icon: string;
};

const TABS: TabItem[] = [
  { key: 'home', label: 'Home', icon: 'home-outline' },
  { key: 'customize', label: 'Customize', icon: 'sparkles-outline' },
  { key: 'journal', label: 'Journal', icon: 'create-outline' },
  { key: 'companion', label: 'Companion', icon: 'chatbubble-ellipses-outline' },
  { key: 'settings', label: 'Settings', icon: 'settings-outline' },
];

interface BottomTabPlaceholderProps {
  activeKey?: DashboardTabKey;
  onTabPress?: (key: DashboardTabKey) => void;
}

type BottomTabButtonProps = {
  tab: TabItem;
  isActive: boolean;
  onPress?: (key: DashboardTabKey) => void;
  theme: ReturnType<typeof useAppTheme>;
};

function BottomTabButton({ tab, isActive, onPress, theme }: BottomTabButtonProps) {
  const reducedMotion = usePreferencesStore((state) => state.reducedMotion);
  const activeProgress = useRef(new Animated.Value(isActive ? 1 : 0)).current;
  const pressScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (reducedMotion) {
      activeProgress.setValue(isActive ? 1 : 0);
      return;
    }

    Animated.timing(activeProgress, {
      toValue: isActive ? 1 : 0,
      duration: 150,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [activeProgress, isActive, reducedMotion]);

  const activeScale = activeProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.82, 1],
  });

  const contentLift = activeProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -1],
  });

  const handlePressIn = () => {
    if (reducedMotion) return;

    Animated.timing(pressScale, {
      toValue: 0.94,
      duration: 80,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    if (reducedMotion) return;

    Animated.spring(pressScale, {
      toValue: 1,
      friction: 5,
      tension: 160,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${tab.label} tab`}
      accessibilityState={{ selected: isActive }}
      onPress={() => onPress?.(tab.key)}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={({ pressed }) => [styles.tab, pressed && styles.tabPressed]}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          styles.activePill,
          {
            backgroundColor: theme.activeSurface,
            opacity: activeProgress,
            transform: [{ scale: reducedMotion ? 1 : activeScale }],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.tabContent,
          {
            transform: [
              { translateY: reducedMotion ? 0 : contentLift },
              { scale: reducedMotion ? 1 : pressScale },
            ],
          },
        ]}
      >
        <Ionicons
          name={tab.icon as keyof typeof Ionicons.glyphMap}
          size={18}
          color={isActive ? theme.primaryStrong : theme.subtle}
        />
        <Text
          style={[
            styles.label,
            { color: theme.subtle },
            isActive && { color: theme.primaryStrong },
          ]}
        >
          {tab.label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

export function BottomTabPlaceholder({
  activeKey = 'home',
  onTabPress,
}: BottomTabPlaceholderProps) {
  const theme = useAppTheme();

  return (
    <View
      style={[
        styles.wrap,
        {
          backgroundColor: theme.surface,
          borderColor: theme.border,
          shadowColor: theme.shadow,
        },
      ]}
    >
      {TABS.map((tab) => (
        <BottomTabButton
          key={tab.key}
          tab={tab}
          isActive={activeKey === tab.key}
          onPress={onTabPress}
          theme={theme}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderRadius: 28,
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 7,
    marginTop: 14,
    elevation: 8,
    shadowOpacity: 0.1,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
  },
  tab: {
    flex: 1,
    minHeight: 48,
    borderRadius: 22,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabPressed: {
    opacity: 0.9,
  },
  activePill: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderRadius: 22,
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  label: {
    fontSize: 10,
    fontWeight: '900',
  },
});
