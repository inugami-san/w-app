import React, { useEffect, useMemo, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

type ProgressBarProps = {
  completed: number;
  total: number;
};

export function ProgressBar({ completed, total }: ProgressBarProps) {
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
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.label}>Today&apos;s Progress</Text>
        <Text style={styles.value}>{completed}/{total}</Text>
      </View>

      <View style={styles.track} onLayout={onTrackLayout}>
        <Animated.View style={[styles.fill, barStyle]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    padding: 14,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  label: {
    color: '#DDE8FB',
    fontSize: 14,
    fontWeight: '700',
  },
  value: {
    color: '#A6C1F3',
    fontSize: 13,
    fontWeight: '700',
  },
  track: {
    width: '100%',
    height: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.14)',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#3BD8C5',
  },
});
