import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import {
  BlurMask,
  Canvas,
  Group,
  LinearGradient,
  Oval,
  Path,
  RoundedRect,
  Skia,
  vec,
} from '@shopify/react-native-skia';
import {
  Easing,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

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
  return Math.max(0, Math.min(255, Math.round(value)))
    .toString(16)
    .padStart(2, '0');
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

function makeRoundedRectPath(x: number, y: number, width: number, height: number, radius: number) {
  const r = Math.min(radius, width / 2, height / 2);
  const p = Skia.Path.Make();

  p.moveTo(x + r, y);
  p.lineTo(x + width - r, y);
  p.quadTo(x + width, y, x + width, y + r);
  p.lineTo(x + width, y + height - r);
  p.quadTo(x + width, y + height, x + width - r, y + height);
  p.lineTo(x + r, y + height);
  p.quadTo(x, y + height, x, y + height - r);
  p.lineTo(x, y + r);
  p.quadTo(x, y, x + r, y);
  p.close();

  return p;
}

export const WenwenBase: React.FC<WenwenProps> = ({
  eyeColor = '#00D4C2',
  faceColor = '#E2E8F0',
  bodyColor = '#F0F2F5',
  presentation = 'full',
}) => {
  const [size, setSize] = useState(() => {
    const { width, height } = Dimensions.get('window');
    return { w: width, h: height * 0.7 };
  });

  const onLayout = (e: any) => {
    const { width, height } = e.nativeEvent.layout;
    if (width > 0 && height > 0) {
      setSize({ w: width, h: height });
    }
  };

  const SW = Math.max(size.w, 100);
  const SH = Math.max(size.h, 100);
  const isPeek = presentation === 'peek';
  const isShowcase = presentation === 'showcase';

  const CW = Math.min(
    SW * (isPeek ? 0.78 : isShowcase ? 0.82 : 0.72),
    SH * (isPeek ? 1.45 : isShowcase ? 0.88 : 0.78),
    isShowcase ? 360 : 320
  );
  const CH = CW * 1.04;
  const CX = SW / 2;
  const CY = SH * (isPeek ? 0.78 : isShowcase ? 0.57 : 0.52);

  const BODY_W = CW * 0.86;
  const BODY_H = CH * 0.82;

  const FACE_BEZEL = CW * 0.055;
  const FACE_W = BODY_W * 0.76;
  const FACE_H = BODY_H * 0.32;
  const FACE_X = CX - FACE_W / 2;
  const FACE_Y = CY - BODY_H * 0.36;
  const FACE_R = FACE_H * 0.42;

  const EYE_W = FACE_W * 0.095;
  const EYE_H = FACE_H * 0.48;
  const EYE_Y = FACE_Y + FACE_H * 0.47;
  const L_EYE_X = CX - FACE_W * 0.22;
  const R_EYE_X = CX + FACE_W * 0.22;

  const BLUSH_Y = EYE_Y + EYE_H * 0.28;
  const L_BLUSH_X = CX - FACE_W * 0.34;
  const R_BLUSH_X = CX + FACE_W * 0.34;
  const BLUSH_RX = FACE_W * 0.07;
  const BLUSH_RY = FACE_H * 0.11;

  const TV_X = FACE_X;
  const TV_Y = FACE_Y;
  const TV_W = FACE_W;
  const TV_H = FACE_H;
  const TV_R = FACE_R;

  const HI_STROKE = TV_W * 0.085;
  const HI_HEIGHT = TV_H * 0.38;
  const HI_TOP = TV_Y + TV_H * 0.32;
  const H_LEFT = CX - TV_W * 0.17;
  const H_RIGHT = CX - TV_W * 0.03;
  const I_CENTER = CX + TV_W * 0.19;

  const FOOT_W = BODY_W * 0.34;
  const FOOT_H = BODY_H * 0.2;
  const L_FPX = CX - BODY_W * 0.24;
  const L_FPY = CY + BODY_H * 0.53;
  const R_FPX = CX + BODY_W * 0.24;
  const R_FPY = CY + BODY_H * 0.53;

  const ARM_W = BODY_W * 0.23;
  const ARM_H = BODY_H * 0.36;
  const ARM_TOUCH_RADIUS = ARM_H * 0.62;
  const L_ARM_CX = CX - BODY_W * 0.6;
  const L_ARM_CY = CY + BODY_H * 0.13;
  const R_ARM_CX = CX + BODY_W * 0.6;
  const R_ARM_CY = CY + BODY_H * 0.13;

  const bodyHighlight = useMemo(() => mixHexColor(bodyColor, '#FFFFFF', 0.68), [bodyColor]);
  const bodySoftHighlight = useMemo(() => mixHexColor(bodyColor, '#FFFFFF', 0.42), [bodyColor]);
  const bodyShadow = useMemo(() => mixHexColor(bodyColor, '#64748B', 0.36), [bodyColor]);
  const bodyDeepShadow = useMemo(() => mixHexColor(bodyColor, '#334155', 0.44), [bodyColor]);
  const screenColor = useMemo(() => mixHexColor(faceColor, '#0F172A', 0.84), [faceColor]);
  const screenDeep = useMemo(() => mixHexColor(screenColor, '#020617', 0.5), [screenColor]);
  const screenHighlight = useMemo(() => mixHexColor(screenColor, '#FFFFFF', 0.2), [screenColor]);
  const featureGlow = useMemo(() => mixHexColor(eyeColor, '#FFFFFF', 0.35), [eyeColor]);

  const bodyPath = useMemo(() => {
    const p = Skia.Path.Make();
    const x = CX;
    const y = CY;
    const w = BODY_W / 2;
    const h = BODY_H / 2;

    p.moveTo(x, y - h);
    p.cubicTo(x + w * 0.88, y - h, x + w, y - h * 0.5, x + w, y - h * 0.08);
    p.lineTo(x + w, y + h * 0.34);
    p.cubicTo(x + w, y + h * 0.78, x + w * 0.65, y + h, x + w * 0.25, y + h);
    p.lineTo(x - w * 0.25, y + h);
    p.cubicTo(x - w * 0.65, y + h, x - w, y + h * 0.78, x - w, y + h * 0.34);
    p.lineTo(x - w, y - h * 0.08);
    p.cubicTo(x - w, y - h * 0.5, x - w * 0.88, y - h, x, y - h);
    p.close();

    return p;
  }, [BODY_H, BODY_W, CX, CY]);

  const faceBridgePath = useMemo(() => {
    const p = Skia.Path.Make();
    const y = EYE_Y + FACE_H * 0.11;
    p.moveTo(CX - FACE_W * 0.1, y);
    p.quadTo(CX, y + FACE_H * 0.1, CX + FACE_W * 0.1, y);
    return p;
  }, [CX, EYE_Y, FACE_H, FACE_W]);

  const tvClipPath = useMemo(() => {
    return makeRoundedRectPath(TV_X, TV_Y, TV_W, TV_H, TV_R);
  }, [TV_H, TV_R, TV_W, TV_X, TV_Y]);

  const breatheY = useSharedValue(0);
  const bounceY = useSharedValue(0);
  const bodyRock = useSharedValue(0);
  const squashY = useSharedValue(1);
  const stretchX = useSharedValue(1);
  const bodyTilt = useSharedValue(0);
  const lArmAngle = useSharedValue(0.0);
  const rArmAngle = useSharedValue(0.0);
  const idleArmAngle = useSharedValue(0.0);
  const idleLegY = useSharedValue(0.0);
  const happyFaceY = useSharedValue(0.0);
  const hiWave = useSharedValue(0.0);
  const hiWaveBodyY = useSharedValue(0.0);
  const tvOverlay = useSharedValue(0.0);
  const tvTextOpacity = useSharedValue(0.0);
  const tvScanProgress = useSharedValue(0.0);
  const tvScanOpacity = useSharedValue(0.0);
  const activeTarget = useSharedValue(0);

  useEffect(() => {
    breatheY.value = withRepeat(withTiming(-4, { duration: 2200, easing: Easing.inOut(Easing.sin) }), -1, true);
    bounceY.value = withRepeat(
      withSequence(
        withTiming(-CW * 0.014, { duration: 950, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 950, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    );
    bodyRock.value = withRepeat(
      withSequence(
        withTiming(0.012, { duration: 1600, easing: Easing.inOut(Easing.sin) }),
        withTiming(-0.012, { duration: 1600, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );
    idleArmAngle.value = withRepeat(
      withSequence(
        withTiming(0.045, { duration: 2200, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.0, { duration: 2200, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );
    idleLegY.value = withRepeat(
      withSequence(
        withTiming(-CW * 0.016, { duration: 950, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.0, { duration: 950, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );
    happyFaceY.value = withRepeat(
      withSequence(
        withTiming(-CW * 0.008, { duration: 1100, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 1100, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );
  }, [CW, bodyRock, bounceY, breatheY, happyFaceY, idleArmAngle, idleLegY]);

  const hiWaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    hiWaveTimerRef.current = setTimeout(() => {
      if (isPeek) {
        hiWave.value = 0;
        hiWaveBodyY.value = withSequence(
          withTiming(-CW * 0.018, { duration: 260, easing: Easing.out(Easing.cubic) }),
          withTiming(0, { duration: 340, easing: Easing.inOut(Easing.sin) }),
          withTiming(-CW * 0.01, { duration: 220, easing: Easing.out(Easing.cubic) }),
          withTiming(0, { duration: 320, easing: Easing.inOut(Easing.sin) })
        );
        stretchX.value = withSequence(
          withTiming(1.018, { duration: 260, easing: Easing.out(Easing.cubic) }),
          withTiming(1, { duration: 340, easing: Easing.inOut(Easing.sin) })
        );
        squashY.value = withSequence(
          withTiming(0.985, { duration: 260, easing: Easing.out(Easing.cubic) }),
          withTiming(1, { duration: 340, easing: Easing.inOut(Easing.sin) })
        );
        return;
      }

      hiWave.value = withSequence(
        withTiming(0.42, { duration: 320, easing: Easing.out(Easing.cubic) }),
        withRepeat(
          withSequence(
            withTiming(0.14, { duration: 190, easing: Easing.inOut(Easing.sin) }),
            withTiming(0.42, { duration: 190, easing: Easing.inOut(Easing.sin) })
          ),
          3,
          false
        ),
        withTiming(0, { duration: 380, easing: Easing.out(Easing.cubic) })
      );

      hiWaveBodyY.value = withSequence(
        withTiming(-CW * 0.018, { duration: 320, easing: Easing.out(Easing.cubic) }),
        withRepeat(
          withSequence(
            withTiming(-CW * 0.008, { duration: 180, easing: Easing.inOut(Easing.sin) }),
            withTiming(-CW * 0.018, { duration: 180, easing: Easing.inOut(Easing.sin) })
          ),
          3,
          false
        ),
        withTiming(0, { duration: 380, easing: Easing.out(Easing.cubic) })
      );
    }, 1100);

    return () => {
      if (hiWaveTimerRef.current) clearTimeout(hiWaveTimerRef.current);
    };
  }, [CW, hiWave, hiWaveBodyY, isPeek, squashY, stretchX]);

  const tvTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    tvTimerRef.current = setTimeout(() => {
      tvOverlay.value = withSequence(
        withTiming(0.82, { duration: 220, easing: Easing.out(Easing.cubic) }),
        withTiming(0.38, { duration: 240, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.94, { duration: 280, easing: Easing.out(Easing.cubic) }),
        withDelay(1200, withTiming(0, { duration: 520, easing: Easing.out(Easing.quad) }))
      );

      tvTextOpacity.value = withSequence(
        withDelay(700, withTiming(1, { duration: 360, easing: Easing.out(Easing.cubic) })),
        withDelay(1150, withTiming(0, { duration: 420, easing: Easing.inOut(Easing.sin) }))
      );

      tvScanProgress.value = 0;
      tvScanProgress.value = withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.quad) });
      tvScanOpacity.value = withSequence(
        withTiming(0.68, { duration: 260 }),
        withTiming(0.34, { duration: 520 }),
        withTiming(0.58, { duration: 300 }),
        withTiming(0, { duration: 360 })
      );
    }, 5600);

    return () => {
      if (tvTimerRef.current) clearTimeout(tvTimerRef.current);
    };
  }, [tvOverlay, tvScanOpacity, tvScanProgress, tvTextOpacity]);

  const bodyT = useDerivedValue(() => [
    { translateX: CX },
    { translateY: CY + bounceY.value + breatheY.value + hiWaveBodyY.value },
    { rotate: bodyTilt.value + bodyRock.value },
    { scaleX: stretchX.value },
    { scaleY: squashY.value },
    { translateX: -CX },
    { translateY: -CY },
  ]);

  const lArmT = useDerivedValue(() => [
    { translateX: L_ARM_CX },
    { translateY: L_ARM_CY },
    { rotate: 0.22 + lArmAngle.value + idleArmAngle.value * 0.55 },
  ]);

  const rArmT = useDerivedValue(() => [
    { translateX: R_ARM_CX },
    { translateY: R_ARM_CY },
    { rotate: -0.22 + rArmAngle.value - idleArmAngle.value * 0.55 - hiWave.value * (isPeek ? 0 : 0.58) },
  ]);

  const lLegT = useDerivedValue(() => [{ translateX: L_FPX }, { translateY: L_FPY + idleLegY.value }]);
  const rLegT = useDerivedValue(() => [{ translateX: R_FPX }, { translateY: R_FPY + idleLegY.value }]);
  const faceT = useDerivedValue(() => [{ translateY: happyFaceY.value }]);
  const tvScanT = useDerivedValue(() => [{ translateY: tvScanProgress.value * TV_H }]);

  const clamp = (v: number, lo: number, hi: number) => {
    'worklet';
    return v < lo ? lo : v > hi ? hi : v;
  };

  const tapGesture = Gesture.Tap().onEnd(() => {
    squashY.value = withSequence(withSpring(0.96), withSpring(1.02), withSpring(1.0));
    stretchX.value = withSequence(withSpring(1.04), withSpring(0.99), withSpring(1.0));
  });

  const panGesture = Gesture.Pan()
    .onBegin((e) => {
      const near = (ax: number, ay: number, r: number) =>
        (e.x - ax) * (e.x - ax) + (e.y - ay) * (e.y - ay) < r * r;
      if (near(L_ARM_CX, L_ARM_CY, ARM_TOUCH_RADIUS)) activeTarget.value = 1;
      else if (near(R_ARM_CX, R_ARM_CY, ARM_TOUCH_RADIUS)) activeTarget.value = 2;
      else activeTarget.value = 0;
    })
    .onUpdate((e) => {
      if (activeTarget.value === 1) {
        lArmAngle.value = clamp(-Math.atan2(e.x - L_ARM_CX, e.y - L_ARM_CY), -0.5, 0.5);
      } else if (activeTarget.value === 2) {
        rArmAngle.value = clamp(-Math.atan2(e.x - R_ARM_CX, e.y - R_ARM_CY), -0.5, 0.5);
      } else {
        bodyTilt.value = withSpring(clamp(((e.x - CX) / CX) * 0.14, -0.14, 0.14));
      }
    })
    .onEnd(() => {
      lArmAngle.value = withSpring(0.0);
      rArmAngle.value = withSpring(0.0);
      bodyTilt.value = withSpring(0);
      activeTarget.value = 0;
    });

  const gesture = Gesture.Simultaneous(tapGesture, panGesture);

  return (
    <View style={styles.container} onLayout={onLayout}>
      <GestureDetector gesture={gesture}>
        <Canvas style={styles.canvas}>
          <Group transform={bodyT}>
            <Path path={bodyPath} color="rgba(0,0,0,0.15)" transform={[{ translateY: 25 }]}> 
              <BlurMask blur={35} style="normal" />
            </Path>

            <Group transform={lArmT}>
              <Oval x={-ARM_W / 2} y={-ARM_H / 2} width={ARM_W} height={ARM_H} color={bodyColor}>
                <LinearGradient start={vec(-ARM_W * 0.32, -ARM_H / 2)} end={vec(ARM_W * 0.3, ARM_H / 2)} colors={[bodyHighlight, bodyColor, bodyShadow]} />
              </Oval>
              <RoundedRect x={-ARM_W * 0.34} y={-ARM_H * 0.04} width={ARM_W * 0.36} height={ARM_H * 0.1} r={ARM_H * 0.05} color={eyeColor}>
                <BlurMask blur={4} style="normal" />
              </RoundedRect>
            </Group>

            <Group transform={rArmT}>
              <Oval x={-ARM_W / 2} y={-ARM_H / 2} width={ARM_W} height={ARM_H} color={bodyColor}>
                <LinearGradient start={vec(-ARM_W * 0.35, -ARM_H / 2)} end={vec(ARM_W * 0.35, ARM_H / 2)} colors={[bodyHighlight, bodyColor, bodyShadow]} />
              </Oval>
              <RoundedRect x={ARM_W * 0.02} y={-ARM_H * 0.04} width={ARM_W * 0.36} height={ARM_H * 0.1} r={ARM_H * 0.05} color={eyeColor}>
                <BlurMask blur={4} style="normal" />
              </RoundedRect>
            </Group>

            <RoundedRect x={CX - BODY_W * 0.54} y={CY - BODY_H * 0.05} width={BODY_W * 0.055} height={BODY_H * 0.25} r={BODY_W * 0.027} color={eyeColor}>
              <BlurMask blur={8} style="normal" />
            </RoundedRect>
            <RoundedRect x={CX + BODY_W * 0.485} y={CY - BODY_H * 0.05} width={BODY_W * 0.055} height={BODY_H * 0.25} r={BODY_W * 0.027} color={eyeColor}>
              <BlurMask blur={8} style="normal" />
            </RoundedRect>

            <Group transform={lLegT}>
              <RoundedRect x={-FOOT_W / 2} y={-FOOT_H / 2} width={FOOT_W} height={FOOT_H} r={FOOT_H * 0.46} color={bodyColor}>
                <LinearGradient start={vec(0, -FOOT_H / 2)} end={vec(0, FOOT_H / 2)} colors={[bodyHighlight, bodyColor, bodyShadow, bodyDeepShadow]} />
              </RoundedRect>
              <RoundedRect x={-FOOT_W * 0.25} y={-FOOT_H * 0.12} width={FOOT_W * 0.5} height={FOOT_H * 0.1} r={FOOT_H * 0.05} color={eyeColor}>
                <BlurMask blur={4} style="normal" />
              </RoundedRect>
            </Group>

            <Group transform={rLegT}>
              <RoundedRect x={-FOOT_W / 2} y={-FOOT_H / 2} width={FOOT_W} height={FOOT_H} r={FOOT_H * 0.46} color={bodyColor}>
                <LinearGradient start={vec(0, -FOOT_H / 2)} end={vec(0, FOOT_H / 2)} colors={[bodyHighlight, bodyColor, bodyShadow, bodyDeepShadow]} />
              </RoundedRect>
              <RoundedRect x={-FOOT_W * 0.25} y={-FOOT_H * 0.12} width={FOOT_W * 0.5} height={FOOT_H * 0.1} r={FOOT_H * 0.05} color={eyeColor}>
                <BlurMask blur={4} style="normal" />
              </RoundedRect>
            </Group>

            <Path path={bodyPath} color="rgba(0,0,0,0.12)">
              <BlurMask blur={20} style="normal" />
            </Path>

            <Path path={bodyPath} color={bodyColor}>
              <LinearGradient start={vec(CX, CY - BODY_H / 2)} end={vec(CX, CY + BODY_H / 2)} colors={[bodyHighlight, bodyColor, bodyShadow, bodyDeepShadow]} />
            </Path>

            <Path path={bodyPath} color="transparent">
              <LinearGradient start={vec(CX, CY)} end={vec(CX + BODY_W * 0.5, CY + BODY_H * 0.5)} colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.08)']} />
            </Path>

            <Group clip={bodyPath}>
              <Oval x={CX - BODY_W * 0.49} y={CY - BODY_H * 0.08} width={BODY_W * 0.98} height={BODY_H * 0.48} color={bodyHighlight}>
                <LinearGradient start={vec(CX, CY - BODY_H * 0.1)} end={vec(CX, CY + BODY_H * 0.32)} colors={[bodyHighlight, bodySoftHighlight, 'rgba(255,255,255,0.08)']} />
              </Oval>
              <Oval x={CX - BODY_W * 0.38} y={CY + BODY_H * 0.06} width={BODY_W * 0.76} height={BODY_H * 0.27} color="rgba(255,255,255,0.18)" />
              <Oval x={CX - BODY_W * 0.3} y={CY - BODY_H * 0.42} width={BODY_W * 0.5} height={BODY_H * 0.15} color="rgba(255,255,255,0.62)">
                <BlurMask blur={15} style="normal" />
              </Oval>
            </Group>

            <Oval x={CX - BODY_W * 0.26} y={CY + BODY_H * 0.13} width={BODY_W * 0.52} height={BODY_H * 0.035} color="rgba(255,255,255,0.28)" />

            <Group transform={faceT}>
              <RoundedRect x={FACE_X - FACE_BEZEL} y={FACE_Y - FACE_BEZEL} width={FACE_W + FACE_BEZEL * 2} height={FACE_H + FACE_BEZEL * 2} r={FACE_R + FACE_BEZEL} color={bodyHighlight}>
                <LinearGradient start={vec(CX, FACE_Y - FACE_BEZEL)} end={vec(CX, FACE_Y + FACE_H + FACE_BEZEL)} colors={[bodyHighlight, bodyColor, bodyShadow]} />
              </RoundedRect>
              <RoundedRect x={FACE_X - FACE_BEZEL * 0.32} y={FACE_Y - FACE_BEZEL * 0.32} width={FACE_W + FACE_BEZEL * 0.64} height={FACE_H + FACE_BEZEL * 0.64} r={FACE_R + FACE_BEZEL * 0.32} color="#111827" />
              <RoundedRect x={FACE_X} y={FACE_Y} width={FACE_W} height={FACE_H} r={FACE_R} color={screenColor}>
                <LinearGradient start={vec(CX, FACE_Y)} end={vec(CX, FACE_Y + FACE_H)} colors={[screenHighlight, screenColor, screenDeep]} />
              </RoundedRect>
              <RoundedRect x={FACE_X} y={FACE_Y} width={FACE_W} height={FACE_H} r={FACE_R} color="transparent">
                <LinearGradient start={vec(CX, FACE_Y)} end={vec(CX, FACE_Y + FACE_H)} colors={['rgba(255,255,255,0.28)', 'rgba(255,255,255,0.02)', 'rgba(0,0,0,0.24)']} />
              </RoundedRect>
              <RoundedRect x={FACE_X} y={FACE_Y} width={FACE_W} height={FACE_H} r={FACE_R} style="stroke" strokeWidth={1.6} color="rgba(255,255,255,0.18)" />
              <RoundedRect x={FACE_X - FACE_BEZEL} y={FACE_Y - FACE_BEZEL} width={FACE_W + FACE_BEZEL * 2} height={FACE_H + FACE_BEZEL * 2} r={FACE_R + FACE_BEZEL} style="stroke" strokeWidth={3.2} color="rgba(255,255,255,0.82)" />
              <RoundedRect x={FACE_X + FACE_W * 0.56} y={FACE_Y + FACE_H * 0.06} width={FACE_W * 0.27} height={FACE_H * 0.25} r={FACE_H * 0.12} color="rgba(255,255,255,0.18)">
                <BlurMask blur={9} style="normal" />
              </RoundedRect>

              <Group>
                <Oval x={L_BLUSH_X - BLUSH_RX} y={BLUSH_Y - BLUSH_RY} width={BLUSH_RX * 2} height={BLUSH_RY * 2} color={eyeColor}>
                  <BlurMask blur={7} style="normal" />
                </Oval>
                <Oval x={R_BLUSH_X - BLUSH_RX} y={BLUSH_Y - BLUSH_RY} width={BLUSH_RX * 2} height={BLUSH_RY * 2} color={eyeColor}>
                  <BlurMask blur={7} style="normal" />
                </Oval>
                <RoundedRect x={L_EYE_X - EYE_W / 2} y={EYE_Y - EYE_H / 2} width={EYE_W} height={EYE_H} r={EYE_W / 2} color={eyeColor}>
                  <BlurMask blur={8} style="normal" />
                </RoundedRect>
                <RoundedRect x={R_EYE_X - EYE_W / 2} y={EYE_Y - EYE_H / 2} width={EYE_W} height={EYE_H} r={EYE_W / 2} color={eyeColor}>
                  <BlurMask blur={8} style="normal" />
                </RoundedRect>
                <RoundedRect x={L_EYE_X - EYE_W / 2} y={EYE_Y - EYE_H / 2} width={EYE_W} height={EYE_H} r={EYE_W / 2} color={featureGlow} />
                <RoundedRect x={R_EYE_X - EYE_W / 2} y={EYE_Y - EYE_H / 2} width={EYE_W} height={EYE_H} r={EYE_W / 2} color={featureGlow} />
                <Path path={faceBridgePath} color={eyeColor} style="stroke" strokeWidth={EYE_W * 0.34} strokeCap="round">
                  <BlurMask blur={5} style="normal" />
                </Path>
                <Path path={faceBridgePath} color={featureGlow} style="stroke" strokeWidth={EYE_W * 0.22} strokeCap="round" />
              </Group>

              <Group opacity={tvOverlay} clip={tvClipPath}>
                <RoundedRect x={TV_X} y={TV_Y} width={TV_W} height={TV_H} r={TV_R} color="#071422">
                  <LinearGradient start={vec(TV_X, TV_Y)} end={vec(TV_X, TV_Y + TV_H)} colors={['#071422', '#0F2538', '#071422']} />
                </RoundedRect>

                <RoundedRect x={TV_X + TV_W * 0.06} y={TV_Y + TV_H * 0.14} width={TV_W * 0.88} height={TV_H * 0.01} r={TV_H * 0.005} color="rgba(120,220,255,0.2)" />
                <RoundedRect x={TV_X + TV_W * 0.06} y={TV_Y + TV_H * 0.33} width={TV_W * 0.88} height={TV_H * 0.01} r={TV_H * 0.005} color="rgba(120,220,255,0.16)" />
                <RoundedRect x={TV_X + TV_W * 0.06} y={TV_Y + TV_H * 0.52} width={TV_W * 0.88} height={TV_H * 0.01} r={TV_H * 0.005} color="rgba(120,220,255,0.18)" />
                <RoundedRect x={TV_X + TV_W * 0.06} y={TV_Y + TV_H * 0.71} width={TV_W * 0.88} height={TV_H * 0.01} r={TV_H * 0.005} color="rgba(120,220,255,0.14)" />

                <Group transform={tvScanT} opacity={tvScanOpacity}>
                  <RoundedRect x={TV_X} y={TV_Y - TV_H * 0.2} width={TV_W} height={TV_H * 0.2} r={TV_R * 0.35} color="#34D3FF">
                    <LinearGradient start={vec(TV_X, TV_Y - TV_H * 0.2)} end={vec(TV_X, TV_Y)} colors={['rgba(255,255,255,0)', 'rgba(52,211,255,0.78)']} />
                  </RoundedRect>
                </Group>

                <Group opacity={tvTextOpacity}>
                  <RoundedRect x={H_LEFT - HI_STROKE / 2} y={HI_TOP} width={HI_STROKE} height={HI_HEIGHT} r={HI_STROKE / 2} color="#7FF4FF" />
                  <RoundedRect x={H_RIGHT - HI_STROKE / 2} y={HI_TOP} width={HI_STROKE} height={HI_HEIGHT} r={HI_STROKE / 2} color="#7FF4FF" />
                  <RoundedRect x={H_LEFT} y={HI_TOP + HI_HEIGHT * 0.45} width={H_RIGHT - H_LEFT} height={HI_STROKE * 0.75} r={HI_STROKE * 0.34} color="#7FF4FF" />

                  <RoundedRect x={I_CENTER - HI_STROKE / 2} y={HI_TOP} width={HI_STROKE} height={HI_HEIGHT} r={HI_STROKE / 2} color="#7FF4FF" />
                </Group>
              </Group>
            </Group>
          </Group>
        </Canvas>
      </GestureDetector>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  canvas: { flex: 1, backgroundColor: 'transparent' },
});

export default WenwenBase;
