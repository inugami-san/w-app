import React, { useState, useEffect, ComponentType } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { router } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { WenwenProps } from '@/components/WenwenBase';

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
        <View style={styles.characterContainer}>
          {WenwenComponent && (
            <WenwenComponent
              eyeColor="#00D4C2"
              faceColor="#E2E8F0"
              bodyColor="#F0F2F5"
            />
          )}
        </View>
        <Text style={styles.title}>Your companion buddy</Text>
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  characterContainer: {
    width: '100%',
    height: 400, // Fixed height to ensure character renders properly without layout shifting
  },
  title: {
    marginTop: 20,
    fontSize: 18,
    color: '#26344D',
    fontWeight: '600',
    letterSpacing: 1.2,
    opacity: 0.8,
  },
});
