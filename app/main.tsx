/**
 * app/(tabs)/index.tsx
 *
 * On web:  CanvasKit WASM is fetched FIRST, then WenwenBase is dynamically
 *          imported so that @shopify/react-native-skia evaluates its
 *          JsiSkApi(global.CanvasKit) AFTER CanvasKit exists.
 *
 * On native: direct static import — Skia native module is always ready.
 *
 * Color controls:
 *  - Eye color, Lip color, Body color — each with 6 presets from the
 *    reference image palette. Defaults match the original Wenwen design.
 */

import React, { useState, useEffect, ComponentType } from 'react';
import {
  Platform,
  StyleSheet,
  View,
  TouchableOpacity,
  Text,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// ─── Props interface (mirrors WenwenBase) ────────────────────────────────────

interface WenwenProps {
  eyeColor?:  string;
  faceColor?: string;
  bodyColor?: string;
}

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

const SwatchRow: React.FC<SwatchRowProps> = ({ label, colors, selected, onSelect }) => (
  <View style={row.container}>
    <Text style={row.label}>{label}</Text>
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

const row = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 5,
  },
  label: {
    width: 40,
    fontSize: 11,
    color: '#9CA3AF',
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
    borderColor: '#FFFFFF',
    shadowColor: '#FFFFFF',
    shadowOpacity: 0.6,
    shadowRadius: 4,
    elevation: 4,
  },
  swatchDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.85)',
  },
});

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const [WenwenComponent, setWenwenComponent] =
    useState<ComponentType<WenwenProps> | null>(null);

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

  return (
    <GestureHandlerRootView style={styles.root}>

      {/* ── Character canvas ── */}
      <View style={styles.canvasArea}>
        {WenwenComponent && (
          <WenwenComponent
            eyeColor={eyeColor}
            faceColor={faceColor}
            bodyColor={bodyColor}
          />
        )}
      </View>

      {/* ── Color picker panel ── */}
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>✦ Customize Wenwen</Text>

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

    </GestureHandlerRootView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#1A1A2E',
  },
  canvasArea: {
    flex: 1,
  },
  panel: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    backgroundColor: '#12122A',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.07)',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 28,
  },
  panelTitle: {
    color: '#E2E8F0',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
});
