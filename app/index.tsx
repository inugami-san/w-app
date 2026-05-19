import React, { useState, useEffect, ComponentType } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { router } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import type { WenwenProps } from '@/components/WenwenBase';

export default function SplashScreen() {
  const [WenwenComponent, setWenwenComponent] = useState<ComponentType<WenwenProps> | null>(null);

  useEffect(() => {
    const loadWenwen = async () => {
      try {
        if (Platform.OS === 'web') {
          const { LoadSkiaWeb } = await import('@shopify/react-native-skia/lib/commonjs/web/LoadSkiaWeb');
          await (LoadSkiaWeb as Function)({
            locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/canvaskit-wasm@0.40.0/bin/full/${file}`,
          });
        }

        const mod = await import('@/components/WenwenBase');
        setWenwenComponent(() => mod.WenwenBase as ComponentType<WenwenProps>);

        setTimeout(() => {
          router.replace('/login');
        }, 2500);
      } catch (error) {
        console.error('Failed to load Wenwen:', error);
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
              eyeColor="#43DED5"
              faceColor="#DDF5F1"
              bodyColor="#F4F7F8"
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
    backgroundColor: '#F7FAF8',
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
    backgroundColor: '#EAF7F4',
    borderWidth: 1,
    borderColor: '#D7E8E3',
    shadowColor: '#B8D7D0',
    shadowOpacity: 0.22,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 18 },
    elevation: 5,
  },
});
