import React, { useState, useEffect, ComponentType } from 'react';
import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import type { WenwenProps } from '@/components/WenwenBase';
import { loadSkiaWebIfNeeded } from '@/src/utils/load-skia-web';

export default function SplashScreen() {
  const [WenwenComponent, setWenwenComponent] = useState<ComponentType<WenwenProps> | null>(null);

  useEffect(() => {
    const loadWenwen = async () => {
      try {
        await loadSkiaWebIfNeeded();

        const mod = await import('@/components/WenwenBase');
        setWenwenComponent(() => mod.WenwenBase as ComponentType<WenwenProps>);

        setTimeout(() => {
          router.replace('/login');
        }, 2500);
      } catch {
        setTimeout(() => router.replace('/login'), 1000);
      }
    };

    loadWenwen();
  }, []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <View style={styles.container}>
        <View style={styles.splashCard}>
          {WenwenComponent && (
            <WenwenComponent
              eyeColor="#58CFC6"
              faceColor="#E9EFEA"
              bodyColor="#F7F3EC"
              presentation="peek"
            />
          )}
        </View>
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F8F5EF',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  splashCard: {
    width: '100%',
    maxWidth: 360,
    height: 230,
    borderRadius: 54,
    overflow: 'hidden',
    backgroundColor: '#E6EFE8',
    borderWidth: 1,
    borderColor: '#D7CDC0',
    shadowColor: '#C7BBAE',
    shadowOpacity: 0.22,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 18 },
    elevation: 5,
  },
});
