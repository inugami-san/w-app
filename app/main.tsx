/**
 * app/(tabs)/index.tsx
 *
 * Color controls:
 *  - Eye color, Lip color, Body color — each with 6 presets from the
 *    soft Wenwen palette. Defaults match the app-wide character defaults.
 */

import React, { ComponentType, useEffect, useState } from 'react';
import {
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
import {
  DEFAULT_AVATAR_COLORS,
  DEFAULT_AVATAR_PERSONA,
  type AvatarPersona,
  usePreferencesStore,
} from '@/src/store/preferences-store';
import { useAppTheme } from '@/src/theme/app-theme';
import { loadSkiaWebIfNeeded } from '@/src/utils/load-skia-web';

// ─── Color presets  ──────────────────────────────────────────────────────────
// Defaults:
//   Body  → warm porcelain #F7F3EC
//   Eyes  → soft aqua      #58CFC6
//   Face  → mist green     #E9EFEA

const EYE_COLORS = [
  { label: 'Aqua',       color: '#58CFC6' },
  { label: 'Cornflower', color: '#79AEEA' },
  { label: 'Lavender',   color: '#B58BE8' },
  { label: 'Rose',       color: '#E98BBC' },
  { label: 'Apricot',    color: '#EFA15E' },
  { label: 'Coral',      color: '#E76F6A' },
];

const FACE_COLORS = [
  { label: 'Mist',   color: '#E9EFEA' },
  { label: 'Butter', color: '#F5E8A8' },
  { label: 'Sage',   color: '#BFE8D4' },
  { label: 'Petal',  color: '#F3CAD1' },
  { label: 'Mauve',  color: '#DDC8F0' },
  { label: 'Ink',    color: '#36475A' },
];

const BODY_COLORS = [
  { label: 'Porcelain', color: '#F7F3EC' },
  { label: 'Dove',      color: '#CBD2D9' },
  { label: 'Powder',    color: '#C5D9ED' },
  { label: 'Shell',     color: '#EBCBD5' },
  { label: 'Oat',       color: '#EFE3C8' },
  { label: 'Graphite',  color: '#56616B' },
];

const PERSONA_OPTIONS: {
  key: AvatarPersona;
  title: string;
  description: string;
}[] = [
  {
    key: 'bot',
    title: 'Bot Wenwen',
    description: 'Warm and steady',
  },
  {
    key: 'cat',
    title: 'Cat',
    description: 'Blunt and direct',
  },
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
    width: 48,
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
    borderColor: '#52796B',
    shadowColor: '#52796B',
    shadowOpacity: 0.2,
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
  const storedAvatarColors = usePreferencesStore((state) => state.avatarColors);
  const storedAvatarPersona = usePreferencesStore((state) => state.avatarPersona);
  const hasHydratedPreferences = usePreferencesStore((state) => state.hasHydrated);
  const setAvatarColors = usePreferencesStore((state) => state.setAvatarColors);
  const setAvatarPersona = usePreferencesStore((state) => state.setAvatarPersona);
  const [avatarComponents, setAvatarComponents] =
    useState<Record<AvatarPersona, ComponentType<WenwenProps>> | null>(null);
  const { height } = useWindowDimensions();

  // Color state — image-accurate defaults
  const [eyeColor,  setEyeColor]  = useState(storedAvatarColors?.eyeColor ?? DEFAULT_AVATAR_COLORS.eyeColor);
  const [faceColor, setFaceColor] = useState(storedAvatarColors?.faceColor ?? DEFAULT_AVATAR_COLORS.faceColor);
  const [bodyColor, setBodyColor] = useState(storedAvatarColors?.bodyColor ?? DEFAULT_AVATAR_COLORS.bodyColor);
  const [persona, setPersona] = useState<AvatarPersona>(storedAvatarPersona ?? DEFAULT_AVATAR_PERSONA);

  useEffect(() => {
    const load = async () => {
      await loadSkiaWebIfNeeded();

      const [botMod, catMod] = await Promise.all([
        import('@/components/WenwenBase'),
        import('@/components/CatBase'),
      ]);
      setAvatarComponents({
        bot: botMod.WenwenBase as ComponentType<WenwenProps>,
        cat: catMod.CatBase as ComponentType<WenwenProps>,
      });
    };

    load().catch(() => {
      setAvatarComponents(null);
    });
  }, []);

  useEffect(() => {
    if (!hasHydratedPreferences) return;

    setEyeColor(storedAvatarColors.eyeColor);
    setFaceColor(storedAvatarColors.faceColor);
    setBodyColor(storedAvatarColors.bodyColor);
    setPersona(storedAvatarPersona ?? DEFAULT_AVATAR_PERSONA);
  }, [
    hasHydratedPreferences,
    storedAvatarColors.bodyColor,
    storedAvatarColors.eyeColor,
    storedAvatarColors.faceColor,
    storedAvatarPersona,
  ]);

  const canvasHeight = Math.max(210, Math.min(260, height * 0.28));
  const AvatarComponent = avatarComponents?.[persona] ?? null;

  const saveAvatar = () => {
    setAvatarColors({ eyeColor, faceColor, bodyColor });
    setAvatarPersona(persona);
  };

  const saveAndOpenDashboard = () => {
    saveAvatar();
    router.replace({
      pathname: '/dashboard',
      params: { eyeColor, faceColor, bodyColor, persona },
    });
  };

  const handleTabPress = (tab: DashboardTabKey) => {
    if (tab === 'customize') return;
    if (tab === 'home') {
      saveAndOpenDashboard();
      return;
    }
    saveAvatar();
    if (tab === 'journal') {
      router.replace('/journal');
      return;
    }
    if (tab === 'settings') {
      router.replace('/settings');
      return;
    }
    if (tab === 'companion') {
      router.replace('/companion');
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
          <Text style={[styles.topSubtitle, { color: theme.muted }]}>Choose a persona and colors.</Text>
        </View>

        {/* ── Character canvas ── */}
        <View style={[styles.canvasArea, { height: canvasHeight }]}>
          <View style={styles.characterWrap}>
            {AvatarComponent && (
              <AvatarComponent
                eyeColor={eyeColor}
                faceColor={faceColor}
                bodyColor={bodyColor}
                presentation="peek"
              />
            )}
          </View>
        </View>

        {/* ── Color picker panel ── */}
        <View style={[styles.panel, { backgroundColor: theme.softSurface, borderTopColor: theme.border }]}>
          <View style={styles.personaSection}>
            <Text style={[styles.panelTitle, { color: theme.textStrong }]}>Persona</Text>
            <View style={styles.personaOptions}>
              {PERSONA_OPTIONS.map((option) => {
                const isSelected = persona === option.key;
                return (
                  <TouchableOpacity
                    key={option.key}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    accessibilityLabel={`Select ${option.title} persona`}
                    onPress={() => setPersona(option.key)}
                    style={[
                      styles.personaOption,
                      {
                        backgroundColor: isSelected ? theme.primarySoft : theme.surface,
                        borderColor: isSelected ? theme.primary : theme.softBorder,
                      },
                    ]}
                  >
                    <Text style={[styles.personaTitle, { color: isSelected ? theme.primaryStrong : theme.textStrong }]}>
                      {option.title}
                    </Text>
                    <Text style={[styles.personaDescription, { color: theme.muted }]}>{option.description}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.panelHeader}>
            <Text style={[styles.panelTitle, { color: theme.textStrong }]}>Color palette</Text>
            <TouchableOpacity
              style={[styles.submitButton, { backgroundColor: theme.primary }]}
              onPress={saveAndOpenDashboard}>
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
    overflow: 'hidden',
  },
  characterWrap: {
    width: '100%',
    maxWidth: 420,
    height: '100%',
  },
  panel: {
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 28,
  },
  personaSection: {
    marginBottom: 14,
  },
  personaOptions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  personaOption: {
    flex: 1,
    minHeight: 64,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    justifyContent: 'center',
  },
  personaTitle: {
    fontSize: 13,
    fontWeight: '900',
  },
  personaDescription: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 3,
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
