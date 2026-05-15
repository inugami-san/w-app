/**
 * app/(tabs)/index.tsx
 *
 * Color controls:
 *  - Eye color, Lip color, Body color — each with 6 presets from the
 *    reference image palette. Defaults match the original Wenwen design.
 */

import React, { ComponentType, useEffect, useState } from 'react';
import {
  Platform,
  StyleSheet,
  View,
  TouchableOpacity,
  Text,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { router } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { WenwenProps } from '@/components/WenwenBase';
import { BottomTabPlaceholder, type DashboardTabKey } from '@/src/components/home/BottomTabPlaceholder';
import { useAppTheme } from '@/src/theme/app-theme';

// ─── Color presets  ──────────────────────────────────────────────────────────
// Defaults taken directly from the reference Wenwen image:
//   Body  → pearl white   #F0F2F5
//   Eyes  → glowing teal  #00D4C2
//   Face  → silver gray   #E2E8F0

const EYE_COLORS = [
  { label: 'Teal',   color: '#00D4C2' },   // ← image default
  { label: 'Blue',   color: '#4D9FFF' },
  { label: 'Purple', color: '#A855F7' },
  { label: 'Pink',   color: '#F472B6' },
  { label: 'Orange', color: '#FB923C' },
  { label: 'Red',    color: '#EF4444' },
];

const FACE_COLORS = [
  { label: 'Silver', color: '#E2E8F0' },   // ← image default
  { label: 'Gold',   color: '#FEF08A' },
  { label: 'Mint',   color: '#A7F3D0' },
  { label: 'Rose',   color: '#FECDD3' },
  { label: 'Lilac',  color: '#E9D5FF' },
  { label: 'Dark',   color: '#334155' },
];

const BODY_COLORS = [
  { label: 'Pearl',  color: '#F0F2F5' },   // ← image default
  { label: 'Silver', color: '#C8CDD6' },
  { label: 'Sky',    color: '#BFD7F0' },
  { label: 'Blush',  color: '#F0C8D4' },
  { label: 'Cream',  color: '#F5EACC' },
  { label: 'Slate',  color: '#4B5563' },
];

// ─── Sub-component: a labeled row of color swatches ─────────────────────────

interface SwatchRowProps {
  label:    string;
  colors:   { label: string; color: string }[];
  selected: string;
  onSelect: (c: string) => void;
}

const SwatchRow: React.FC<SwatchRowProps> = ({ label, colors, selected, onSelect }) => {
  const theme = useAppTheme();

  return (
    <View style={row.container}>
      <Text style={[row.label, { color: theme.muted }]}>{label}</Text>
      <View style={row.swatches}>
        {colors.map(({ color, label: cl }) => (
          <TouchableOpacity
            key={color}
            accessibilityLabel={cl}
            onPress={() => onSelect(color)}
            style={[
              row.swatch,
              { backgroundColor: color },
              selected === color && row.swatchSelected,
            ]}
          >
            {selected === color && <View style={row.swatchDot} />}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const row = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 5,
  },
  label: {
    width: 40,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginRight: 10,
  },
  swatches: {
    flexDirection: 'row',
    gap: 8,
  },
  swatch: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  swatchSelected: {
    borderColor: '#319A8D',
    shadowColor: '#319A8D',
    shadowOpacity: 0.28,
    shadowRadius: 4,
    elevation: 4,
  },
  swatchDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
});

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const theme = useAppTheme();
  const [WenwenComponent, setWenwenComponent] =
    useState<ComponentType<WenwenProps> | null>(null);
  const { height } = useWindowDimensions();

  // Color state — image-accurate defaults
  const [eyeColor,  setEyeColor]  = useState('#00D4C2');
  const [faceColor, setFaceColor] = useState('#E2E8F0');
  const [bodyColor, setBodyColor] = useState('#F0F2F5');

  useEffect(() => {
    if (Platform.OS === 'web') {
      import('@shopify/react-native-skia/lib/commonjs/web/LoadSkiaWeb')
        .then(({ LoadSkiaWeb }) =>
          (LoadSkiaWeb as Function)({
            locateFile: (file: string) =>
              `https://cdn.jsdelivr.net/npm/canvaskit-wasm@0.40.0/bin/full/${file}`,
          })
        )
        .then(() => import('@/components/WenwenBase'))
        .then((mod) =>
          setWenwenComponent(
            () => mod.WenwenBase as ComponentType<WenwenProps>
          )
        )
        .catch(console.error);
    } else {
      import('@/components/WenwenBase').then((mod) =>
        setWenwenComponent(() => mod.WenwenBase as ComponentType<WenwenProps>)
      );
    }
  }, []);

  const canvasHeight = Math.max(260, Math.min(360, height * 0.34));

  const handleTabPress = (tab: DashboardTabKey) => {
    if (tab === 'customize') return;
    if (tab === 'home') {
      router.push({
        pathname: '/dashboard',
        params: { eyeColor, faceColor, bodyColor },
      });
      return;
    }
    if (tab === 'journal') {
      router.push('/journal');
      return;
    }
    if (tab === 'settings') {
      router.push('/settings');
      return;
    }
    if (tab === 'companion') {
      router.push('/companion');
      return;
    }
    router.push('/modal');
  };

  return (
    <GestureHandlerRootView style={[styles.root, { backgroundColor: theme.background }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        bounces={false}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topHeader}>
          <Text style={[styles.topTitle, { color: theme.text }]}>Customize Wenwen</Text>
          <Text style={[styles.topSubtitle, { color: theme.muted }]}>Choose Wenwen&apos;s colors.</Text>
        </View>

        {/* ── Character canvas ── */}
        <View style={[styles.canvasArea, { height: canvasHeight }]}>
          <View style={styles.characterWrap}>
            {WenwenComponent && (
              <WenwenComponent
                eyeColor={eyeColor}
                faceColor={faceColor}
                bodyColor={bodyColor}
              />
            )}
          </View>
        </View>

        {/* ── Color picker panel ── */}
        <View style={[styles.panel, { backgroundColor: theme.softSurface, borderTopColor: theme.border }]}>
          <View style={styles.panelHeader}>
            <Text style={[styles.panelTitle, { color: theme.textStrong }]}>Color palette</Text>
            <TouchableOpacity
              style={[styles.submitButton, { backgroundColor: theme.primary }]}
              onPress={() =>
                router.push({
                  pathname: '/dashboard',
                  params: { eyeColor, faceColor, bodyColor },
                })
              }>
              <Text style={styles.submitText}>Continue</Text>
            </TouchableOpacity>
          </View>

          <SwatchRow
            label="Eyes"
            colors={EYE_COLORS}
            selected={eyeColor}
            onSelect={setEyeColor}
          />
          <SwatchRow
            label="Face"
            colors={FACE_COLORS}
            selected={faceColor}
            onSelect={setFaceColor}
          />
          <SwatchRow
            label="Body"
            colors={BODY_COLORS}
            selected={bodyColor}
            onSelect={setBodyColor}
          />
        </View>
      </ScrollView>

      <View style={styles.bottomTabWrap}>
        <BottomTabPlaceholder activeKey="customize" onTabPress={handleTabPress} />
      </View>
    </GestureHandlerRootView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 120,
  },
  topHeader: {
    paddingTop: 44,
    paddingHorizontal: 24,
    marginBottom: 2,
  },
  topTitle: {
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  topSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 2,
  },
  canvasArea: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 10,
  },
  characterWrap: {
    width: '100%',
    maxWidth: 460,
    height: '100%',
  },
  panel: {
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 28,
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  panelTitle: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  submitButton: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  bottomTabWrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
  },
});
