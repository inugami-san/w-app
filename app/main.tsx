/**
 * app/(tabs)/index.tsx
 *
 * Color controls:
 *  - Eye color, Lip color, Body color — each with soft presets from the
 *    soft Wenwen palette. Defaults match the app-wide character defaults.
 */

import React, { ComponentType, useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  View,
  Text,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { WenwenProps } from '@/components/WenwenBase';
import { BottomTabPlaceholder, type DashboardTabKey } from '@/src/components/home/BottomTabPlaceholder';
import { GlowBalancePill } from '@/src/components/rewards/GlowBalancePill';
import {
  DEFAULT_AVATAR_COLORS,
  DEFAULT_AVATAR_PERSONA,
  type AvatarPersona,
  usePreferencesStore,
} from '@/src/store/preferences-store';
import {
  PAID_COLOR_COST,
  PERSONA_UNLOCK_COSTS,
  REWARD_CURRENCY_NAME,
  useRewardStore,
} from '@/src/store/reward-store';
import { useAppTheme } from '@/src/theme/app-theme';
import { loadSkiaWebIfNeeded } from '@/src/utils/load-skia-web';

// ─── Color presets  ──────────────────────────────────────────────────────────
// Defaults:
//   Body  → warm porcelain #F7F3EC
//   Eyes  → soft aqua      #58CFC6
//   Face  → mist green     #E9EFEA

const EYE_COLORS = [
  { label: 'Aqua',       color: '#58CFC6' },
  { label: 'Mint',       color: '#7EDDBB' },
  { label: 'Cornflower', color: '#79AEEA' },
  { label: 'Sky',        color: '#8DD7F7' },
  { label: 'Lavender',   color: '#B58BE8' },
  { label: 'Periwinkle', color: '#9FA8F5' },
  { label: 'Rose',       color: '#E98BBC' },
  { label: 'Berry',      color: '#C66AA0' },
  { label: 'Apricot',    color: '#EFA15E' },
  { label: 'Honey',      color: '#E7BD55' },
  { label: 'Coral',      color: '#E76F6A' },
  { label: 'Emerald',    color: '#4FBF8F' },
];

const FACE_COLORS = [
  { label: 'Mist',   color: '#E9EFEA' },
  { label: 'Cloud',  color: '#EEF3F7' },
  { label: 'Butter', color: '#F5E8A8' },
  { label: 'Cream',  color: '#F7E6C8' },
  { label: 'Sage',   color: '#BFE8D4' },
  { label: 'Mint',   color: '#D4F2E3' },
  { label: 'Petal',  color: '#F3CAD1' },
  { label: 'Peach',  color: '#F4D2BF' },
  { label: 'Mauve',  color: '#DDC8F0' },
  { label: 'Lilac',  color: '#D8D5F5' },
  { label: 'Ink',    color: '#36475A' },
  { label: 'Navy',   color: '#243B63' },
];

const BODY_COLORS = [
  { label: 'Porcelain', color: '#F7F3EC' },
  { label: 'Ivory',     color: '#FFF6E6' },
  { label: 'Dove',      color: '#CBD2D9' },
  { label: 'Pebble',    color: '#D9D4CB' },
  { label: 'Powder',    color: '#C5D9ED' },
  { label: 'Bluebell',  color: '#B8CFF0' },
  { label: 'Shell',     color: '#EBCBD5' },
  { label: 'Blush',     color: '#F0BFC7' },
  { label: 'Oat',       color: '#EFE3C8' },
  { label: 'Moss',      color: '#BFD8C5' },
  { label: 'Graphite',  color: '#56616B' },
  { label: 'Midnight',  color: '#2E3B4E' },
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

type ColorPart = 'Eyes' | 'Face' | 'Body';

function triggerSelectionHaptic() {
  Haptics.selectionAsync().catch(() => undefined);
}

function triggerLightImpactHaptic() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
}

// ─── Sub-component: a labeled row of color swatches ─────────────────────────

interface SwatchRowProps {
  label:    string;
  colors:   { label: string; color: string }[];
  selected: string;
  isUnlocked: (color: string, index: number) => boolean;
  onSelect: (color: string, index: number) => void;
}

const SwatchRow: React.FC<SwatchRowProps> = ({ label, colors, selected, isUnlocked, onSelect }) => {
  const theme = useAppTheme();

  return (
    <View style={row.container}>
      <Text style={[row.label, { color: theme.muted }]}>{label}</Text>
      <View style={row.swatches}>
        {colors.map(({ color, label: cl }, index) => {
          const isSelected = selected === color;
          const locked = !isUnlocked(color, index);
          return (
            <Pressable
              key={color}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={
                locked
                  ? `Unlock ${cl} ${label.toLowerCase()} color for ${PAID_COLOR_COST} ${REWARD_CURRENCY_NAME}`
                  : `Select ${cl} ${label.toLowerCase()} color`
              }
              onPress={() => {
                triggerSelectionHaptic();
                onSelect(color, index);
              }}
              style={({ pressed }) => [
                row.swatchButton,
                pressed && row.pressed,
                {
                  borderColor: isSelected ? theme.primary : 'transparent',
                },
              ]}
            >
              <View style={[row.swatchColor, { backgroundColor: color }]}>
                {locked && (
                  <View pointerEvents="none" style={row.lockOverlay}>
                    <Ionicons name="lock-closed" size={11} color="#FFFFFF" />
                  </View>
                )}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

const row = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 5,
  },
  label: {
    width: 48,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginRight: 10,
    marginTop: 14,
  },
  swatches: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  swatchButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  pressed: {
    opacity: 0.82,
  },
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 15,
    backgroundColor: 'rgba(15,23,42,0.42)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  swatchColor: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
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
  const glowBalance = useRewardStore((state) => state.glowBalance);
  const unlockedColorIds = useRewardStore((state) => state.unlockedColorIds);
  const unlockedPersonas = useRewardStore((state) => state.unlockedPersonas);
  const unlockColor = useRewardStore((state) => state.unlockColor);
  const unlockPersona = useRewardStore((state) => state.unlockPersona);
  const [avatarComponents, setAvatarComponents] =
    useState<Record<AvatarPersona, ComponentType<WenwenProps>> | null>(null);
  const { height } = useWindowDimensions();

  // Color state — image-accurate defaults
  const [eyeColor,  setEyeColor]  = useState(storedAvatarColors?.eyeColor ?? DEFAULT_AVATAR_COLORS.eyeColor);
  const [faceColor, setFaceColor] = useState(storedAvatarColors?.faceColor ?? DEFAULT_AVATAR_COLORS.faceColor);
  const [bodyColor, setBodyColor] = useState(storedAvatarColors?.bodyColor ?? DEFAULT_AVATAR_COLORS.bodyColor);
  const [persona, setPersona] = useState<AvatarPersona>(storedAvatarPersona ?? DEFAULT_AVATAR_PERSONA);
  const [pendingColorUnlock, setPendingColorUnlock] = useState<{
    part: ColorPart;
    color: string;
    colorId: string;
  } | null>(null);
  const [pendingPersonaUnlock, setPendingPersonaUnlock] = useState<AvatarPersona | null>(null);

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
  const makeColorId = (label: string, color: string) => `${label.toLowerCase()}:${color}`;
  const isFreeColor = (index: number) => index < 2;
  const isColorUnlocked = (label: string, color: string, index: number, selectedColor: string) =>
    isFreeColor(index) || unlockedColorIds.includes(makeColorId(label, color)) || selectedColor === color;
  const isPersonaUnlocked = (option: AvatarPersona) =>
    option === DEFAULT_AVATAR_PERSONA || unlockedPersonas.includes(option) || storedAvatarPersona === option;

  const saveAvatar = () => {
    setAvatarColors({ eyeColor, faceColor, bodyColor });
    setAvatarPersona(persona);
  };

  const handlePersonaSelect = (option: AvatarPersona) => {
    if (isPersonaUnlocked(option)) {
      triggerSelectionHaptic();
      setPersona(option);
      return;
    }

    triggerSelectionHaptic();
    setPendingPersonaUnlock(option);
  };

  const handleConfirmPersonaUnlock = () => {
    if (!pendingPersonaUnlock) return;

    const cost = PERSONA_UNLOCK_COSTS[pendingPersonaUnlock] ?? 0;
    if (glowBalance < cost) return;

    const didUnlock = unlockPersona(pendingPersonaUnlock, cost);
    if (!didUnlock) return;

    triggerSelectionHaptic();
    setPersona(pendingPersonaUnlock);
    setPendingPersonaUnlock(null);
  };

  const handleColorSelect = (
    label: ColorPart,
    color: string,
    index: number,
    selectedColor: string,
    setColor: (color: string) => void
  ) => {
    const colorId = makeColorId(label, color);
    if (isColorUnlocked(label, color, index, selectedColor)) {
      setColor(color);
      return;
    }

    setPendingColorUnlock({ part: label, color, colorId });
  };

  const applyColorForPart = (part: ColorPart, color: string) => {
    if (part === 'Eyes') {
      setEyeColor(color);
      return;
    }
    if (part === 'Face') {
      setFaceColor(color);
      return;
    }
    setBodyColor(color);
  };

  const handleConfirmColorUnlock = () => {
    if (!pendingColorUnlock || glowBalance < PAID_COLOR_COST) return;

    const didUnlock = unlockColor(pendingColorUnlock.colorId, PAID_COLOR_COST);
    if (!didUnlock) return;

    applyColorForPart(pendingColorUnlock.part, pendingColorUnlock.color);
    setPendingColorUnlock(null);
  };

  const resetAvatar = () => {
    triggerLightImpactHaptic();
    setEyeColor(DEFAULT_AVATAR_COLORS.eyeColor);
    setFaceColor(DEFAULT_AVATAR_COLORS.faceColor);
    setBodyColor(DEFAULT_AVATAR_COLORS.bodyColor);
    setPersona(DEFAULT_AVATAR_PERSONA);
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
    if (tab === 'profile') {
      router.replace('/profile');
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
          <View style={styles.titleRow}>
            <View style={styles.titleCopy}>
              <Text style={[styles.topTitle, { color: theme.text }]}>Customize Wenwen</Text>
              <Text style={[styles.topSubtitle, { color: theme.muted }]}>Unlock personas and colors with gentle progress.</Text>
            </View>
            <GlowBalancePill />
          </View>
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
                const PersonaPreviewComponent = avatarComponents?.[option.key] ?? null;
                return (
                  <Pressable
                    key={option.key}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    accessibilityLabel={
                      isPersonaUnlocked(option.key)
                        ? `Select ${option.title} persona`
                        : `Unlock ${option.title} persona for ${PERSONA_UNLOCK_COSTS[option.key] ?? 0} ${REWARD_CURRENCY_NAME}`
                    }
                    onPress={() => handlePersonaSelect(option.key)}
                    style={({ pressed }) => [
                      styles.personaOption,
                      pressed && styles.pressablePressed,
                      {
                        backgroundColor: isSelected ? theme.primarySoft : theme.surface,
                        borderColor: isSelected ? theme.primary : theme.softBorder,
                      },
                    ]}
                  >
                    <View
                      pointerEvents="none"
                      style={[
                        styles.personaPreview,
                        { backgroundColor: theme.primarySoft, borderColor: isSelected ? theme.primary : theme.softBorder },
                      ]}
                    >
                      {PersonaPreviewComponent && (
                        <PersonaPreviewComponent
                          eyeColor={eyeColor}
                          faceColor={faceColor}
                          bodyColor={bodyColor}
                          presentation="showcase"
                        />
                      )}
                      {!isPersonaUnlocked(option.key) && (
                        <View style={styles.personaLock}>
                          <Ionicons name="lock-closed" size={14} color="#FFFFFF" />
                        </View>
                      )}
                    </View>
                    <View style={styles.personaCopy}>
                      <Text style={[styles.personaTitle, { color: isSelected ? theme.primaryStrong : theme.textStrong }]}>
                        {option.title}
                      </Text>
                      <Text style={[styles.personaDescription, { color: theme.muted }]}>{option.description}</Text>
                      {!isPersonaUnlocked(option.key) && (
                        <Text style={[styles.unlockPrice, { color: theme.primaryStrong }]}>
                          {PERSONA_UNLOCK_COSTS[option.key] ?? 0} {REWARD_CURRENCY_NAME}
                        </Text>
                      )}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.panelHeader}>
            <Text style={[styles.panelTitle, { color: theme.textStrong }]}>Color palette</Text>
            <View style={styles.panelActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Reset avatar to defaults"
                onPress={resetAvatar}
                style={({ pressed }) => [
                  styles.resetButton,
                  pressed && styles.pressablePressed,
                  { borderColor: theme.softBorder, backgroundColor: theme.surface },
                ]}
              >
                <Text style={[styles.resetText, { color: theme.primaryStrong }]}>Reset</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={saveAndOpenDashboard}
                style={({ pressed }) => [
                  styles.submitButton,
                  pressed && styles.pressablePressed,
                  { backgroundColor: theme.primary },
                ]}
              >
                <Text style={styles.submitText}>Continue</Text>
              </Pressable>
            </View>
          </View>

          <SwatchRow
            label="Eyes"
            colors={EYE_COLORS}
            selected={eyeColor}
            isUnlocked={(color, index) => isColorUnlocked('Eyes', color, index, eyeColor)}
            onSelect={(color, index) => handleColorSelect('Eyes', color, index, eyeColor, setEyeColor)}
          />
          <SwatchRow
            label="Face"
            colors={FACE_COLORS}
            selected={faceColor}
            isUnlocked={(color, index) => isColorUnlocked('Face', color, index, faceColor)}
            onSelect={(color, index) => handleColorSelect('Face', color, index, faceColor, setFaceColor)}
          />
          <SwatchRow
            label="Body"
            colors={BODY_COLORS}
            selected={bodyColor}
            isUnlocked={(color, index) => isColorUnlocked('Body', color, index, bodyColor)}
            onSelect={(color, index) => handleColorSelect('Body', color, index, bodyColor, setBodyColor)}
          />
        </View>
      </ScrollView>

      <Modal
        animationType="fade"
        transparent
        visible={Boolean(pendingColorUnlock)}
        onRequestClose={() => setPendingColorUnlock(null)}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Dismiss color unlock dialog"
            style={styles.modalBackdrop}
            onPress={() => setPendingColorUnlock(null)}
          />
          <View
            style={[styles.unlockModal, { backgroundColor: theme.surface, borderColor: theme.border }]}
          >
            <View style={styles.unlockModalHeader}>
              <View style={[styles.unlockPreview, { backgroundColor: pendingColorUnlock?.color ?? theme.primarySoft }]} />
              <View style={styles.unlockCopy}>
                <Text style={[styles.unlockModalTitle, { color: theme.text }]}>
                  Unlock {pendingColorUnlock?.part.toLowerCase()} color?
                </Text>
                <Text style={[styles.unlockModalBody, { color: theme.muted }]}>
                  Spend {PAID_COLOR_COST} {REWARD_CURRENCY_NAME} to use this color.
                </Text>
              </View>
            </View>

            <View style={[styles.unlockBalanceRow, { backgroundColor: theme.softSurface }]}>
              <Text style={[styles.unlockBalanceLabel, { color: theme.muted }]}>Available</Text>
              <Text style={[styles.unlockBalanceValue, { color: theme.primaryStrong }]}>
                {glowBalance} {REWARD_CURRENCY_NAME}
              </Text>
            </View>

            {glowBalance < PAID_COLOR_COST && (
              <Text style={[styles.unlockWarning, { color: theme.muted }]}>
                Earn more by completing a task, adding a journal, or chatting with Wenwen once today.
              </Text>
            )}

            <View style={styles.unlockActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Cancel color unlock"
                onPress={() => setPendingColorUnlock(null)}
                style={({ pressed }) => [
                  styles.unlockCancelButton,
                  pressed && styles.pressablePressed,
                  { backgroundColor: theme.softSurface },
                ]}
              >
                <Text style={[styles.unlockCancelText, { color: theme.muted }]}>Cancel</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Confirm color unlock"
                disabled={glowBalance < PAID_COLOR_COST}
                onPress={handleConfirmColorUnlock}
                style={({ pressed }) => [
                  styles.unlockConfirmButton,
                  pressed && glowBalance >= PAID_COLOR_COST && styles.pressablePressed,
                  { backgroundColor: glowBalance >= PAID_COLOR_COST ? theme.primary : theme.softBorder },
                ]}
              >
                <Text style={styles.unlockConfirmText}>Unlock</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="fade"
        transparent
        visible={Boolean(pendingPersonaUnlock)}
        onRequestClose={() => setPendingPersonaUnlock(null)}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Dismiss persona unlock dialog"
            style={styles.modalBackdrop}
            onPress={() => setPendingPersonaUnlock(null)}
          />
          <View
            style={[styles.unlockModal, { backgroundColor: theme.surface, borderColor: theme.border }]}
          >
            <View style={styles.unlockModalHeader}>
              <View style={[styles.personaUnlockPreview, { backgroundColor: theme.primarySoft }]}>
                <Ionicons name="paw-outline" size={24} color={theme.primaryStrong} />
              </View>
              <View style={styles.unlockCopy}>
                <Text style={[styles.unlockModalTitle, { color: theme.text }]}>Unlock Cat?</Text>
                <Text style={[styles.unlockModalBody, { color: theme.muted }]}>
                  Spend {PERSONA_UNLOCK_COSTS[pendingPersonaUnlock ?? 'cat'] ?? 0} {REWARD_CURRENCY_NAME} to use this persona.
                </Text>
              </View>
            </View>

            <View style={[styles.unlockBalanceRow, { backgroundColor: theme.softSurface }]}>
              <Text style={[styles.unlockBalanceLabel, { color: theme.muted }]}>Available</Text>
              <Text style={[styles.unlockBalanceValue, { color: theme.primaryStrong }]}>
                {glowBalance} {REWARD_CURRENCY_NAME}
              </Text>
            </View>

            {glowBalance < (PERSONA_UNLOCK_COSTS[pendingPersonaUnlock ?? 'cat'] ?? 0) && (
              <Text style={[styles.unlockWarning, { color: theme.muted }]}>
                Earn more by completing tasks, adding a journal, or chatting with Wenwen once per day.
              </Text>
            )}

            <View style={styles.unlockActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Cancel persona unlock"
                onPress={() => setPendingPersonaUnlock(null)}
                style={({ pressed }) => [
                  styles.unlockCancelButton,
                  pressed && styles.pressablePressed,
                  { backgroundColor: theme.softSurface },
                ]}
              >
                <Text style={[styles.unlockCancelText, { color: theme.muted }]}>Cancel</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Confirm persona unlock"
                disabled={glowBalance < (PERSONA_UNLOCK_COSTS[pendingPersonaUnlock ?? 'cat'] ?? 0)}
                onPress={handleConfirmPersonaUnlock}
                style={({ pressed }) => [
                  styles.unlockConfirmButton,
                  pressed &&
                    glowBalance >= (PERSONA_UNLOCK_COSTS[pendingPersonaUnlock ?? 'cat'] ?? 0) &&
                    styles.pressablePressed,
                  {
                    backgroundColor:
                      glowBalance >= (PERSONA_UNLOCK_COSTS[pendingPersonaUnlock ?? 'cat'] ?? 0)
                        ? theme.primary
                        : theme.softBorder,
                  },
                ]}
              >
                <Text style={styles.unlockConfirmText}>Unlock</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 14,
  },
  titleCopy: {
    flex: 1,
    minWidth: 0,
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    justifyContent: 'center',
  },
  personaPreview: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    overflow: 'hidden',
  },
  personaLock: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 21,
    backgroundColor: 'rgba(15,23,42,0.42)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  personaCopy: {
    flex: 1,
    minWidth: 0,
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
  unlockPrice: {
    fontSize: 11,
    fontWeight: '900',
    marginTop: 4,
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 12,
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
  panelActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  resetButton: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  resetText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  pressablePressed: {
    opacity: 0.82,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.36)',
    justifyContent: 'center',
    padding: 22,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  unlockModal: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
    shadowOpacity: 0.14,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 16 },
    elevation: 10,
  },
  unlockModalHeader: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  unlockPreview: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.7)',
  },
  personaUnlockPreview: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unlockCopy: {
    flex: 1,
    minWidth: 0,
  },
  unlockModalTitle: {
    fontSize: 18,
    fontWeight: '900',
  },
  unlockModalBody: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
    marginTop: 4,
  },
  unlockBalanceRow: {
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  unlockBalanceLabel: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  unlockBalanceValue: {
    fontSize: 13,
    fontWeight: '900',
  },
  unlockWarning: {
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 18,
    marginTop: 10,
  },
  unlockActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 16,
  },
  unlockCancelButton: {
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  unlockCancelText: {
    fontSize: 13,
    fontWeight: '900',
  },
  unlockConfirmButton: {
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  unlockConfirmText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  bottomTabWrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
  },
});
