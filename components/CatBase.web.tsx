import React from 'react';
import { StyleSheet, View } from 'react-native';

import type { WenwenProps } from '@/components/WenwenBase';

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

export const CatBase: React.FC<WenwenProps> = ({
  eyeColor = '#58CFC6',
  faceColor = '#E9EFEA',
  bodyColor = '#F7F3EC',
  presentation = 'full',
}) => {
  const isPeek = presentation === 'peek';
  const isShowcase = presentation === 'showcase';
  const bodyHighlight = mixHexColor(bodyColor, '#FFFFFF', 0.52);
  const bodyShadow = mixHexColor(bodyColor, '#475569', 0.24);
  const muzzleColor = mixHexColor(faceColor, '#FFFFFF', 0.26);
  const lineColor = mixHexColor(eyeColor, '#0F172A', 0.4);

  return (
    <View style={styles.container}>
      <View style={[styles.stage, isPeek && styles.peekStage, isShowcase && styles.showcaseStage]}>
        <View style={[styles.tail, { borderColor: bodyShadow }]} />
        <View style={[styles.body, { backgroundColor: bodyColor }]} />
        <View style={[styles.ear, styles.leftEar, { backgroundColor: bodyColor }]}>
          <View style={[styles.innerEar, { backgroundColor: faceColor }]} />
        </View>
        <View style={[styles.ear, styles.rightEar, { backgroundColor: bodyColor }]}>
          <View style={[styles.innerEar, { backgroundColor: faceColor }]} />
        </View>
        <View
          style={[
            styles.head,
            {
              backgroundColor: bodyColor,
              borderColor: bodyHighlight,
              shadowColor: bodyShadow,
            },
          ]}
        >
          <View style={[styles.headGlow, { backgroundColor: bodyHighlight }]} />
          <View style={[styles.eyeWrap, styles.leftEyeWrap]}>
            <View style={[styles.pupil, { backgroundColor: eyeColor }]} />
            <View style={styles.eyeSpark} />
          </View>
          <View style={[styles.eyeWrap, styles.rightEyeWrap]}>
            <View style={[styles.pupil, { backgroundColor: eyeColor }]} />
            <View style={styles.eyeSpark} />
          </View>
          <View style={[styles.muzzle, { backgroundColor: muzzleColor }]}>
            <View style={[styles.nose, { borderBottomColor: eyeColor }]} />
            <View style={[styles.mouth, { borderBottomColor: lineColor }]} />
          </View>
          <View style={[styles.whisker, styles.leftWhiskerTop, { backgroundColor: lineColor }]} />
          <View style={[styles.whisker, styles.leftWhiskerMid, { backgroundColor: lineColor }]} />
          <View style={[styles.whisker, styles.leftWhiskerBottom, { backgroundColor: lineColor }]} />
          <View style={[styles.whisker, styles.rightWhiskerTop, { backgroundColor: lineColor }]} />
          <View style={[styles.whisker, styles.rightWhiskerMid, { backgroundColor: lineColor }]} />
          <View style={[styles.whisker, styles.rightWhiskerBottom, { backgroundColor: lineColor }]} />
        </View>
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
    width: '78%',
    maxWidth: 330,
    aspectRatio: 1,
    position: 'relative',
  },
  peekStage: {
    width: '86%',
    transform: [{ translateY: 42 }, { scale: 1.2 }],
  },
  showcaseStage: {
    width: '76%',
  },
  body: {
    position: 'absolute',
    left: '29%',
    right: '29%',
    bottom: '12%',
    height: '24%',
    borderRadius: 999,
    opacity: 0.9,
  },
  tail: {
    position: 'absolute',
    right: '5%',
    bottom: '16%',
    width: '32%',
    height: '28%',
    borderRadius: 999,
    borderWidth: 17,
    borderLeftColor: 'transparent',
    borderBottomColor: 'transparent',
    transform: [{ rotate: '-18deg' }],
    opacity: 0.72,
  },
  ear: {
    position: 'absolute',
    top: '11%',
    width: '19%',
    height: '28%',
    borderRadius: 999,
    alignItems: 'center',
    overflow: 'hidden',
  },
  leftEar: {
    left: '26%',
    transform: [{ rotate: '-13deg' }],
  },
  rightEar: {
    right: '26%',
    transform: [{ rotate: '13deg' }],
  },
  innerEar: {
    width: '48%',
    height: '66%',
    borderRadius: 999,
    marginTop: '26%',
    opacity: 0.72,
  },
  head: {
    position: 'absolute',
    left: '16%',
    right: '16%',
    top: '28%',
    height: '46%',
    borderRadius: 999,
    borderWidth: 2,
    overflow: 'hidden',
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
  },
  headGlow: {
    position: 'absolute',
    top: '0%',
    left: '9%',
    right: '9%',
    height: '40%',
    borderRadius: 999,
    opacity: 0.34,
  },
  eyeWrap: {
    position: 'absolute',
    top: '31%',
    width: '16%',
    height: '22%',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.94)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(30,41,59,0.1)',
  },
  leftEyeWrap: {
    left: '29%',
  },
  rightEyeWrap: {
    right: '29%',
  },
  pupil: {
    width: '42%',
    height: '62%',
    borderRadius: 999,
  },
  eyeSpark: {
    position: 'absolute',
    top: '27%',
    right: '30%',
    width: 5,
    height: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.95)',
  },
  muzzle: {
    position: 'absolute',
    left: '34%',
    right: '34%',
    bottom: '19%',
    height: '24%',
    borderRadius: 999,
    alignItems: 'center',
  },
  nose: {
    marginTop: '13%',
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderBottomWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  mouth: {
    width: '35%',
    height: '18%',
    borderBottomWidth: 3,
    borderRadius: 999,
    marginTop: 0,
  },
  whisker: {
    position: 'absolute',
    width: '24%',
    height: 3,
    borderRadius: 999,
  },
  leftWhiskerTop: {
    left: '12%',
    top: '52%',
    transform: [{ rotate: '10deg' }],
  },
  leftWhiskerMid: {
    left: '10%',
    top: '61%',
  },
  leftWhiskerBottom: {
    left: '12%',
    top: '70%',
    transform: [{ rotate: '-11deg' }],
  },
  rightWhiskerTop: {
    right: '12%',
    top: '52%',
    transform: [{ rotate: '-10deg' }],
  },
  rightWhiskerMid: {
    right: '10%',
    top: '61%',
  },
  rightWhiskerBottom: {
    right: '12%',
    top: '70%',
    transform: [{ rotate: '11deg' }],
  },
});

export default CatBase;
