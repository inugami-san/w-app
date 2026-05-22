import React from 'react';
import { StyleSheet, View } from 'react-native';

export interface WenwenProps {
  eyeColor?: string;
  faceColor?: string;
  bodyColor?: string;
  presentation?: 'full' | 'peek' | 'showcase';
}

function parseHexColor(color: string) {
  const clean = color.replace('#', '').trim();
  const normalized =
    clean.length === 3
      ? clean
          .split('')
          .map((char) => `${char}${char}`)
          .join('')
      : clean;

  if (!/^[0-9a-f]{6}$/i.test(normalized)) return null;

  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  };
}

function toHexChannel(value: number) {
  return Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, '0');
}

function mixHexColor(color: string, target: string, amount: number) {
  const sourceRgb = parseHexColor(color);
  const targetRgb = parseHexColor(target);

  if (!sourceRgb || !targetRgb) return color;

  const mix = Math.max(0, Math.min(1, amount));
  return `#${toHexChannel(sourceRgb.r + (targetRgb.r - sourceRgb.r) * mix)}${toHexChannel(
    sourceRgb.g + (targetRgb.g - sourceRgb.g) * mix
  )}${toHexChannel(sourceRgb.b + (targetRgb.b - sourceRgb.b) * mix)}`;
}

export const WenwenBase: React.FC<WenwenProps> = ({
  eyeColor = '#58CFC6',
  faceColor = '#E9EFEA',
  bodyColor = '#F7F3EC',
  presentation = 'full',
}) => {
  const isPeek = presentation === 'peek';
  const isShowcase = presentation === 'showcase';
  const bodyHighlight = mixHexColor(bodyColor, '#FFFFFF', 0.62);
  const bodyShadow = mixHexColor(bodyColor, '#64748B', 0.32);
  const screenColor = mixHexColor(faceColor, '#0F172A', 0.84);
  const screenBorder = mixHexColor(bodyColor, '#FFFFFF', 0.76);

  return (
    <View style={styles.container}>
      <View style={[styles.stage, isPeek && styles.peekStage, isShowcase && styles.showcaseStage]}>
        <View style={[styles.shadow, { backgroundColor: mixHexColor(bodyColor, '#0F172A', 0.35) }]} />
        <View
          style={[
            styles.body,
            {
              backgroundColor: bodyColor,
              borderColor: bodyHighlight,
              shadowColor: bodyShadow,
            },
          ]}
        >
          <View style={[styles.bodyHighlight, { backgroundColor: bodyHighlight }]} />
          <View style={[styles.belly, { backgroundColor: mixHexColor(bodyColor, '#FFFFFF', 0.36) }]} />
          <View style={[styles.screenBezel, { backgroundColor: screenBorder }]}>
            <View style={[styles.screen, { backgroundColor: screenColor }]}>
              <View style={[styles.screenGloss, { backgroundColor: 'rgba(255,255,255,0.16)' }]} />
              <View style={[styles.glow, styles.leftGlow, { backgroundColor: eyeColor }]} />
              <View style={[styles.glow, styles.rightGlow, { backgroundColor: eyeColor }]} />
              <View style={[styles.eye, styles.leftEye, { backgroundColor: eyeColor }]} />
              <View style={[styles.eye, styles.rightEye, { backgroundColor: eyeColor }]} />
              <View style={[styles.smile, { borderBottomColor: eyeColor }]} />
            </View>
          </View>
        </View>
        <View style={[styles.foot, styles.leftFoot, { backgroundColor: bodyShadow }]} />
        <View style={[styles.foot, styles.rightFoot, { backgroundColor: bodyShadow }]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  stage: {
    width: '74%',
    maxWidth: 320,
    aspectRatio: 1,
    position: 'relative',
  },
  peekStage: {
    width: '82%',
    transform: [{ translateY: 34 }, { scale: 1.18 }],
  },
  showcaseStage: {
    width: '72%',
    transform: [{ scale: 0.96 }],
  },
  shadow: {
    position: 'absolute',
    left: '20%',
    right: '20%',
    bottom: '10%',
    height: '9%',
    borderRadius: 999,
    opacity: 0.14,
  },
  body: {
    position: 'absolute',
    left: '14%',
    top: '12%',
    width: '72%',
    height: '74%',
    borderRadius: 54,
    borderWidth: 3,
    overflow: 'hidden',
    shadowOpacity: 0.22,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
  },
  bodyHighlight: {
    position: 'absolute',
    left: '2%',
    right: '2%',
    top: '0%',
    height: '40%',
    borderRadius: 999,
    opacity: 0.5,
  },
  belly: {
    position: 'absolute',
    left: '22%',
    right: '22%',
    bottom: '20%',
    height: '14%',
    borderRadius: 999,
    opacity: 0.7,
  },
  screenBezel: {
    position: 'absolute',
    left: '13%',
    right: '13%',
    top: '14%',
    height: '32%',
    borderRadius: 999,
    padding: 4,
  },
  screen: {
    flex: 1,
    borderRadius: 999,
    overflow: 'hidden',
  },
  screenGloss: {
    position: 'absolute',
    left: '14%',
    right: '8%',
    top: '6%',
    height: '32%',
    borderRadius: 999,
  },
  glow: {
    position: 'absolute',
    top: '45%',
    width: '22%',
    height: '20%',
    borderRadius: 999,
    opacity: 0.24,
  },
  leftGlow: {
    left: '16%',
  },
  rightGlow: {
    right: '16%',
  },
  eye: {
    position: 'absolute',
    top: '33%',
    width: '10%',
    height: '42%',
    borderRadius: 999,
  },
  leftEye: {
    left: '28%',
  },
  rightEye: {
    right: '28%',
  },
  smile: {
    position: 'absolute',
    left: '43%',
    top: '52%',
    width: '14%',
    height: '12%',
    borderBottomWidth: 4,
    borderRadius: 999,
  },
  foot: {
    position: 'absolute',
    bottom: '7%',
    width: '21%',
    height: '14%',
    borderRadius: 999,
    opacity: 0.56,
  },
  leftFoot: {
    left: '27%',
  },
  rightFoot: {
    right: '27%',
  },
});

export default WenwenBase;
