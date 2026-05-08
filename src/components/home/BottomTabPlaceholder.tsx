import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export type DashboardTabKey = 'home' | 'customize' | 'journal' | 'companion';

type TabItem = {
  key: DashboardTabKey;
  label: string;
  icon: string;
};

const TABS: TabItem[] = [
  { key: 'home', label: 'Home', icon: '⌂' },
  { key: 'customize', label: 'Customize', icon: '✦' },
  { key: 'journal', label: 'Journal', icon: '✎' },
  { key: 'companion', label: 'Companion', icon: '◉' },
];

interface BottomTabPlaceholderProps {
  activeKey?: DashboardTabKey;
  onTabPress?: (key: DashboardTabKey) => void;
}

export function BottomTabPlaceholder({
  activeKey = 'home',
  onTabPress,
}: BottomTabPlaceholderProps) {
  return (
    <View style={styles.wrap}>
      {TABS.map((tab) => (
        <Pressable
          key={tab.key}
          accessibilityRole="button"
          accessibilityLabel={`${tab.label} tab`}
          onPress={() => onTabPress?.(tab.key)}
          style={({ pressed }) => [
            styles.tab,
            activeKey === tab.key && styles.tabActive,
            pressed && styles.tabPressed,
          ]}
        >
          <Text style={[styles.icon, activeKey === tab.key && styles.activeText]}>{tab.icon}</Text>
          <Text style={[styles.label, activeKey === tab.key && styles.activeText]}>{tab.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderRadius: 22,
    backgroundColor: 'rgba(11,18,46,0.95)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 8,
    paddingVertical: 8,
    marginTop: 14,
  },
  tab: {
    flex: 1,
    minHeight: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 2,
  },
  tabActive: {
    backgroundColor: 'rgba(82,196,255,0.18)',
  },
  tabPressed: {
    opacity: 0.85,
  },
  icon: {
    color: '#8DA0C6',
    fontSize: 13,
    fontWeight: '700',
  },
  label: {
    color: '#8DA0C6',
    fontSize: 11,
    fontWeight: '700',
  },
  activeText: {
    color: '#D8ECFF',
  },
});
