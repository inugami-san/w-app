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
  const progressPercent = Math.round(progress * 100);

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
        <View>
          <Text style={[styles.label, { color: theme.textStrong }]}>Progress</Text>
          <Text style={[styles.caption, { color: theme.muted }]}>Today&apos;s tasks</Text>
        </View>
        <Text style={[styles.value, { color: theme.primary }]}>{progressPercent}%</Text>
      </View>

      <View style={[styles.track, { backgroundColor: theme.softSurface }]} onLayout={onTrackLayout}>
        <Animated.View style={[styles.fill, { backgroundColor: theme.primary }, barStyle]} />
      </View>
      <Text style={[styles.meta, { color: theme.subtle }]}>{completed} of {total} complete</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    shadowOpacity: 0.04,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  label: {
    fontSize: 16,
    fontWeight: '900',
  },
  caption: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  value: {
    fontSize: 28,
    fontWeight: '900',
  },
  track: {
    width: '100%',
    height: 8,
    borderRadius: 999,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 999,
  },
  meta: {
    marginTop: 9,
    fontSize: 12,
    fontWeight: '700',
  },
});
