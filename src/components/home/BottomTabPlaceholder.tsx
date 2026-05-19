import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/src/theme/app-theme';

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
];

interface BottomTabPlaceholderProps {
  activeKey?: DashboardTabKey;
  onTabPress?: (key: DashboardTabKey) => void;
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
        <Pressable
          key={tab.key}
          accessibilityRole="button"
          accessibilityLabel={`${tab.label} tab`}
          onPress={() => onTabPress?.(tab.key)}
          style={({ pressed }) => [
            styles.tab,
            activeKey === tab.key && { backgroundColor: theme.activeSurface },
            pressed && styles.tabPressed,
          ]}
        >
          <Ionicons
            name={tab.icon as keyof typeof Ionicons.glyphMap}
            size={18}
            color={activeKey === tab.key ? theme.primaryStrong : theme.subtle}
          />
          <Text
            style={[
              styles.label,
              { color: theme.subtle },
              activeKey === tab.key && { color: theme.primaryStrong },
            ]}
          >
            {tab.label}
          </Text>
        </Pressable>
      ))}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Settings"
        onPress={() => onTabPress?.('settings')}
        style={({ pressed }) => [
          styles.tab,
          activeKey === 'settings' && { backgroundColor: theme.activeSurface },
          pressed && styles.tabPressed,
        ]}
      >
        <Ionicons
          name="settings-outline"
          size={18}
          color={activeKey === 'settings' ? theme.primaryStrong : theme.subtle}
        />
        <Text
          style={[
            styles.label,
            { color: theme.subtle },
            activeKey === 'settings' && { color: theme.primaryStrong },
          ]}
        >
          Settings
        </Text>
      </Pressable>
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
    justifyContent: 'center',
    alignItems: 'center',
    gap: 2,
  },
  tabPressed: {
    opacity: 0.85,
  },
  label: {
    fontSize: 10,
    fontWeight: '900',
  },
});
