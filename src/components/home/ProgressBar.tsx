import React, { useEffect, useMemo, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useAppTheme } from '@/src/theme/app-theme';

type ProgressBarProps = {
  completed: number;
  total: number;
};

export function ProgressBar({ completed, total }: ProgressBarProps) {
  const theme = useAppTheme();
  const [trackWidth, setTrackWidth] = useState(0);
  const animatedWidth = useSharedValue(0);

  const progress = useMemo(() => {
    if (total <= 0) return 0;
    return Math.max(0, Math.min(1, completed / total));
  }, [completed, total]);

  useEffect(() => {
    if (trackWidth <= 0) return;
    animatedWidth.value = withTiming(trackWidth * progress, {
      duration: 700,
      easing: Easing.out(Easing.cubic),
    });
  }, [animatedWidth, progress, trackWidth]);

  const onTrackLayout = (event: LayoutChangeEvent) => {
    setTrackWidth(event.nativeEvent.layout.width);
  };

  const barStyle = useAnimatedStyle(() => ({
    width: animatedWidth.value,
  }));

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel="Today's task progress"
      accessibilityValue={{ min: 0, max: total, now: completed }}
      style={[
        styles.container,
        { backgroundColor: theme.surface, borderColor: theme.border, shadowColor: theme.shadow },
      ]}
    >
      <View style={styles.headerRow}>
        <Text style={[styles.label, { color: theme.textStrong }]}>Today&apos;s Progress</Text>
        <Text style={[styles.value, { color: theme.primary }]}>{completed}/{total}</Text>
      </View>

      <View style={[styles.track, { backgroundColor: theme.softSurface }]} onLayout={onTrackLayout}>
        <Animated.View style={[styles.fill, { backgroundColor: theme.primary }, barStyle]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
  },
  value: {
    fontSize: 13,
    fontWeight: '700',
  },
  track: {
    width: '100%',
    height: 10,
    borderRadius: 999,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 999,
  },
});
