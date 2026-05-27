import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Dimensions, type LayoutChangeEvent, StyleSheet, View } from 'react-native';
import {
  BlurMask,
  Canvas,
  Group,
  LinearGradient,
  Oval,
  Path,
  Skia,
  vec,
} from '@shopify/react-native-skia';
import {
  Easing,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

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

export const CatBase: React.FC<WenwenProps> = ({
  eyeColor = '#58CFC6',
  faceColor = '#E9EFEA',
  bodyColor = '#F7F3EC',
  presentation = 'full',
  isAsleep = false,
}) => {
  const [size, setSize] = useState(() => {
    const { width, height } = Dimensions.get('window');
    return { w: width, h: height * 0.7 };
  });

  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    if (width > 0 && height > 0) {
      setSize({ w: width, h: height });
    }
  };

  const SW = Math.max(size.w, 100);
  const SH = Math.max(size.h, 100);
  const isPeek = presentation === 'peek';
  const isShowcase = presentation === 'showcase';

  const CW = Math.min(
    SW * (isPeek ? 0.7 : isShowcase ? 0.76 : 0.68),
    SH * (isPeek ? 1.34 : isShowcase ? 0.82 : 0.72),
    isShowcase ? 330 : 300
  );
  const CX = SW / 2;
  const CY = SH * (isPeek ? 0.79 : isShowcase ? 0.58 : 0.54);

  const HEAD_W = CW * 0.7;
  const HEAD_H = CW * 0.64;
  const HEAD_X = CX - HEAD_W / 2;
  const HEAD_Y = CY - CW * 0.44;

  const BODY_W = CW * 0.54;
  const BODY_H = CW * 0.4;
  const BODY_X = CX - BODY_W / 2;
  const BODY_Y = CY + CW * 0.1;

  const EYE_W = CW * 0.17;
  const EYE_H = CW * 0.19;
  const PUPIL_W = CW * 0.06;
  const PUPIL_H = CW * 0.1;
  const EYE_Y = HEAD_Y + HEAD_H * 0.43;
  const L_EYE_X = CX - HEAD_W * 0.17;
  const R_EYE_X = CX + HEAD_W * 0.17;
  const MUZZLE_W = HEAD_W * 0.42;
  const MUZZLE_H = HEAD_H * 0.22;
  const MUZZLE_Y = HEAD_Y + HEAD_H * 0.58;
  const NOSE_Y = MUZZLE_Y + MUZZLE_H * 0.16;

  const tailWag = useSharedValue(0);
  const breatheY = useSharedValue(0);
  const squashY = useSharedValue(1);
  const stretchX = useSharedValue(1);
  const earTwitch = useSharedValue(0);
  const greetingLift = useSharedValue(0);
  const tapTilt = useSharedValue(0);
  const blinkScale = useSharedValue(1);

  const highlight = useMemo(() => mixHexColor(bodyColor, '#FFFFFF', 0.52), [bodyColor]);
  const softHighlight = useMemo(() => mixHexColor(bodyColor, '#FFFFFF', 0.28), [bodyColor]);
  const shadow = useMemo(() => mixHexColor(bodyColor, '#475569', 0.36), [bodyColor]);
  const deepShadow = useMemo(() => mixHexColor(bodyColor, '#1F2937', 0.26), [bodyColor]);
  const muzzleColor = useMemo(() => mixHexColor(faceColor, '#FFFFFF', 0.28), [faceColor]);
  const eyeGlow = useMemo(() => mixHexColor(eyeColor, '#FFFFFF', 0.28), [eyeColor]);
  const lineColor = useMemo(() => mixHexColor(eyeColor, '#0F172A', 0.38), [eyeColor]);

  const leftEarPath = useMemo(() => {
    const p = Skia.Path.Make();
    p.moveTo(HEAD_X + HEAD_W * 0.1, HEAD_Y + HEAD_H * 0.28);
    p.cubicTo(
      HEAD_X + HEAD_W * 0.14,
      HEAD_Y - HEAD_H * 0.06,
      HEAD_X + HEAD_W * 0.27,
      HEAD_Y - HEAD_H * 0.36,
      HEAD_X + HEAD_W * 0.4,
      HEAD_Y - HEAD_H * 0.02
    );
    p.cubicTo(
      HEAD_X + HEAD_W * 0.43,
      HEAD_Y + HEAD_H * 0.15,
      HEAD_X + HEAD_W * 0.28,
      HEAD_Y + HEAD_H * 0.23,
      HEAD_X + HEAD_W * 0.1,
      HEAD_Y + HEAD_H * 0.28
    );
    p.close();
    return p;
  }, [HEAD_H, HEAD_W, HEAD_X, HEAD_Y]);

  const rightEarPath = useMemo(() => {
    const p = Skia.Path.Make();
    p.moveTo(HEAD_X + HEAD_W * 0.6, HEAD_Y - HEAD_H * 0.02);
    p.cubicTo(
      HEAD_X + HEAD_W * 0.73,
      HEAD_Y - HEAD_H * 0.36,
      HEAD_X + HEAD_W * 0.86,
      HEAD_Y - HEAD_H * 0.06,
      HEAD_X + HEAD_W * 0.9,
      HEAD_Y + HEAD_H * 0.28
    );
    p.cubicTo(
      HEAD_X + HEAD_W * 0.72,
      HEAD_Y + HEAD_H * 0.23,
      HEAD_X + HEAD_W * 0.57,
      HEAD_Y + HEAD_H * 0.15,
      HEAD_X + HEAD_W * 0.6,
      HEAD_Y - HEAD_H * 0.02
    );
    p.close();
    return p;
  }, [HEAD_H, HEAD_W, HEAD_X, HEAD_Y]);

  const leftInnerEarPath = useMemo(() => {
    const p = Skia.Path.Make();
    p.moveTo(HEAD_X + HEAD_W * 0.19, HEAD_Y + HEAD_H * 0.13);
    p.cubicTo(
      HEAD_X + HEAD_W * 0.25,
      HEAD_Y - HEAD_H * 0.11,
      HEAD_X + HEAD_W * 0.31,
      HEAD_Y - HEAD_H * 0.17,
      HEAD_X + HEAD_W * 0.36,
      HEAD_Y + HEAD_H * 0.09
    );
    p.cubicTo(
      HEAD_X + HEAD_W * 0.3,
      HEAD_Y + HEAD_H * 0.14,
      HEAD_X + HEAD_W * 0.24,
      HEAD_Y + HEAD_H * 0.17,
      HEAD_X + HEAD_W * 0.18,
      HEAD_Y + HEAD_H * 0.16
    );
    p.close();
    return p;
  }, [HEAD_H, HEAD_W, HEAD_X, HEAD_Y]);

  const rightInnerEarPath = useMemo(() => {
    const p = Skia.Path.Make();
    p.moveTo(HEAD_X + HEAD_W * 0.64, HEAD_Y + HEAD_H * 0.09);
    p.cubicTo(
      HEAD_X + HEAD_W * 0.69,
      HEAD_Y - HEAD_H * 0.17,
      HEAD_X + HEAD_W * 0.75,
      HEAD_Y - HEAD_H * 0.11,
      HEAD_X + HEAD_W * 0.81,
      HEAD_Y + HEAD_H * 0.13
    );
    p.cubicTo(
      HEAD_X + HEAD_W * 0.76,
      HEAD_Y + HEAD_H * 0.17,
      HEAD_X + HEAD_W * 0.7,
      HEAD_Y + HEAD_H * 0.14,
      HEAD_X + HEAD_W * 0.66,
      HEAD_Y + HEAD_H * 0.08
    );
    p.close();
    return p;
  }, [HEAD_H, HEAD_W, HEAD_X, HEAD_Y]);

  const tailPath = useMemo(() => {
    const p = Skia.Path.Make();
    p.moveTo(0, 0);
    p.cubicTo(CW * 0.18, -CW * 0.2, CW * 0.44, -CW * 0.1, CW * 0.36, CW * 0.13);
    return p;
  }, [CW]);

  const mouthPath = useMemo(() => {
    const p = Skia.Path.Make();
    p.moveTo(CX - CW * 0.045, NOSE_Y + CW * 0.05);
    p.quadTo(CX, NOSE_Y + CW * 0.08, CX + CW * 0.045, NOSE_Y + CW * 0.05);
    return p;
  }, [CW, CX, NOSE_Y]);

  const leftWhiskerTop = useMemo(() => {
    const p = Skia.Path.Make();
    p.moveTo(CX - MUZZLE_W * 0.44, NOSE_Y + CW * 0.006);
    p.quadTo(CX - HEAD_W * 0.28, NOSE_Y - CW * 0.04, CX - HEAD_W * 0.43, NOSE_Y - CW * 0.058);
    return p;
  }, [CW, CX, HEAD_W, MUZZLE_W, NOSE_Y]);

  const leftWhiskerMiddle = useMemo(() => {
    const p = Skia.Path.Make();
    p.moveTo(CX - MUZZLE_W * 0.48, NOSE_Y + CW * 0.044);
    p.quadTo(CX - HEAD_W * 0.3, NOSE_Y + CW * 0.03, CX - HEAD_W * 0.45, NOSE_Y + CW * 0.034);
    return p;
  }, [CW, CX, HEAD_W, MUZZLE_W, NOSE_Y]);

  const leftWhiskerBottom = useMemo(() => {
    const p = Skia.Path.Make();
    p.moveTo(CX - MUZZLE_W * 0.42, NOSE_Y + CW * 0.078);
    p.quadTo(CX - HEAD_W * 0.28, NOSE_Y + CW * 0.105, CX - HEAD_W * 0.42, NOSE_Y + CW * 0.145);
    return p;
  }, [CW, CX, HEAD_W, MUZZLE_W, NOSE_Y]);

  const rightWhiskerTop = useMemo(() => {
    const p = Skia.Path.Make();
    p.moveTo(CX + MUZZLE_W * 0.44, NOSE_Y + CW * 0.006);
    p.quadTo(CX + HEAD_W * 0.28, NOSE_Y - CW * 0.04, CX + HEAD_W * 0.43, NOSE_Y - CW * 0.058);
    return p;
  }, [CW, CX, HEAD_W, MUZZLE_W, NOSE_Y]);

  const rightWhiskerMiddle = useMemo(() => {
    const p = Skia.Path.Make();
    p.moveTo(CX + MUZZLE_W * 0.48, NOSE_Y + CW * 0.044);
    p.quadTo(CX + HEAD_W * 0.3, NOSE_Y + CW * 0.03, CX + HEAD_W * 0.45, NOSE_Y + CW * 0.034);
    return p;
  }, [CW, CX, HEAD_W, MUZZLE_W, NOSE_Y]);

  const rightWhiskerBottom = useMemo(() => {
    const p = Skia.Path.Make();
    p.moveTo(CX + MUZZLE_W * 0.42, NOSE_Y + CW * 0.078);
    p.quadTo(CX + HEAD_W * 0.28, NOSE_Y + CW * 0.105, CX + HEAD_W * 0.42, NOSE_Y + CW * 0.145);
    return p;
  }, [CW, CX, HEAD_W, MUZZLE_W, NOSE_Y]);

  const nosePath = useMemo(() => {
    const p = Skia.Path.Make();
    p.moveTo(CX, NOSE_Y);
    p.lineTo(CX - CW * 0.024, NOSE_Y + CW * 0.032);
    p.lineTo(CX + CW * 0.024, NOSE_Y + CW * 0.032);
    p.close();
    return p;
  }, [CW, CX, NOSE_Y]);

  const leftClosedEyePath = useMemo(() => {
    const p = Skia.Path.Make();
    p.moveTo(L_EYE_X - EYE_W * 0.34, EYE_Y);
    p.quadTo(L_EYE_X, EYE_Y + EYE_H * 0.13, L_EYE_X + EYE_W * 0.34, EYE_Y);
    return p;
  }, [EYE_H, EYE_W, EYE_Y, L_EYE_X]);

  const rightClosedEyePath = useMemo(() => {
    const p = Skia.Path.Make();
    p.moveTo(R_EYE_X - EYE_W * 0.34, EYE_Y);
    p.quadTo(R_EYE_X, EYE_Y + EYE_H * 0.13, R_EYE_X + EYE_W * 0.34, EYE_Y);
    return p;
  }, [EYE_H, EYE_W, EYE_Y, R_EYE_X]);

  useEffect(() => {
    breatheY.value = withRepeat(
      withSequence(
        withTiming(-CW * 0.012, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 1200, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );
    tailWag.value = withRepeat(
      withSequence(
        withTiming(-0.18, { duration: 800, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.16, { duration: 800, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );
    earTwitch.value = withRepeat(
      withSequence(
        withTiming(0, { duration: 2400 }),
        withTiming(0.08, { duration: 120, easing: Easing.out(Easing.cubic) }),
        withTiming(0, { duration: 180, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    );
    blinkScale.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2300 }),
        withTiming(0.08, { duration: 75, easing: Easing.out(Easing.quad) }),
        withTiming(1, { duration: 115, easing: Easing.out(Easing.quad) }),
        withTiming(0.16, { duration: 55, easing: Easing.out(Easing.quad) }),
        withTiming(1, { duration: 130, easing: Easing.out(Easing.quad) }),
        withTiming(1, { duration: 1800 })
      ),
      -1,
      false
    );
  }, [CW, blinkScale, breatheY, earTwitch, tailWag]);

  const greetingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    greetingTimerRef.current = setTimeout(() => {
      greetingLift.value = withSequence(
        withTiming(-CW * 0.02, { duration: 220, easing: Easing.out(Easing.cubic) }),
        withTiming(0, { duration: 300, easing: Easing.inOut(Easing.sin) })
      );
      squashY.value = withSequence(withTiming(0.98, { duration: 220 }), withTiming(1, { duration: 300 }));
      stretchX.value = withSequence(withTiming(1.018, { duration: 220 }), withTiming(1, { duration: 300 }));
    }, 900);

    return () => {
      if (greetingTimerRef.current) clearTimeout(greetingTimerRef.current);
    };
  }, [CW, greetingLift, squashY, stretchX]);

  const bodyT = useDerivedValue(() => [
    { translateX: CX },
    { translateY: CY + breatheY.value + greetingLift.value },
    { rotate: tapTilt.value },
    { scaleX: stretchX.value },
    { scaleY: squashY.value },
    { translateX: -CX },
    { translateY: -CY },
  ]);
  const tailT = useDerivedValue(() => [
    { translateX: CX + BODY_W * 0.35 },
    { translateY: BODY_Y + BODY_H * 0.18 },
    { rotate: tailWag.value },
  ]);
  const leftEarT = useDerivedValue(() => [
    { translateX: HEAD_X + HEAD_W * 0.28 },
    { translateY: HEAD_Y + HEAD_H * 0.08 },
    { rotate: -earTwitch.value },
    { translateX: -(HEAD_X + HEAD_W * 0.28) },
    { translateY: -(HEAD_Y + HEAD_H * 0.08) },
  ]);
  const rightEarT = useDerivedValue(() => [
    { translateX: HEAD_X + HEAD_W * 0.72 },
    { translateY: HEAD_Y + HEAD_H * 0.08 },
    { rotate: earTwitch.value },
    { translateX: -(HEAD_X + HEAD_W * 0.72) },
    { translateY: -(HEAD_Y + HEAD_H * 0.08) },
  ]);
  const leftEyeT = useDerivedValue(() => [
    { translateX: L_EYE_X },
    { translateY: EYE_Y },
    { scaleY: blinkScale.value },
    { translateX: -L_EYE_X },
    { translateY: -EYE_Y },
  ]);
  const rightEyeT = useDerivedValue(() => [
    { translateX: R_EYE_X },
    { translateY: EYE_Y },
    { scaleY: blinkScale.value },
    { translateX: -R_EYE_X },
    { translateY: -EYE_Y },
  ]);
  const closedEyeOpacity = useDerivedValue(() => Math.max(0, 1 - blinkScale.value * 1.35));

  const headHighlightPath = useMemo(() => {
    const p = Skia.Path.Make();
    p.moveTo(HEAD_X + HEAD_W * 0.2, HEAD_Y + HEAD_H * 0.34);
    p.cubicTo(
      HEAD_X + HEAD_W * 0.26,
      HEAD_Y + HEAD_H * 0.15,
      HEAD_X + HEAD_W * 0.74,
      HEAD_Y + HEAD_H * 0.15,
      HEAD_X + HEAD_W * 0.8,
      HEAD_Y + HEAD_H * 0.34
    );
    p.cubicTo(
      HEAD_X + HEAD_W * 0.74,
      HEAD_Y + HEAD_H * 0.53,
      HEAD_X + HEAD_W * 0.26,
      HEAD_Y + HEAD_H * 0.53,
      HEAD_X + HEAD_W * 0.2,
      HEAD_Y + HEAD_H * 0.34
    );
    p.close();
    return p;
  }, [HEAD_H, HEAD_W, HEAD_X, HEAD_Y]);

  const tapGesture = Gesture.Tap().onEnd(() => {
    tapTilt.value = withSequence(withSpring(-0.035), withSpring(0.03), withSpring(0));
    squashY.value = withSequence(withSpring(0.97), withSpring(1.02), withSpring(1));
    stretchX.value = withSequence(withSpring(1.025), withSpring(0.995), withSpring(1));
  });

  return (
    <View style={styles.container} onLayout={onLayout}>
      <GestureDetector gesture={tapGesture}>
        <Canvas style={styles.canvas}>
          <Group transform={bodyT}>
            <Oval x={CX - CW * 0.42} y={CY + CW * 0.3} width={CW * 0.84} height={CW * 0.18} color="rgba(15,23,42,0.14)">
              <BlurMask blur={22} style="normal" />
            </Oval>

            <Group transform={tailT}>
              <Path path={tailPath} color={bodyColor} style="stroke" strokeWidth={CW * 0.13} strokeCap="round">
                <LinearGradient start={vec(0, 0)} end={vec(CW * 0.3, CW * 0.16)} colors={[highlight, bodyColor, shadow]} />
              </Path>
              <Path path={tailPath} color="rgba(255,255,255,0.3)" style="stroke" strokeWidth={CW * 0.045} strokeCap="round" />
            </Group>

            <Oval x={BODY_X} y={BODY_Y} width={BODY_W} height={BODY_H} color={bodyColor}>
              <LinearGradient start={vec(CX, BODY_Y)} end={vec(CX, BODY_Y + BODY_H)} colors={[highlight, bodyColor, shadow]} />
            </Oval>
            <Oval x={CX - BODY_W * 0.28} y={BODY_Y + BODY_H * 0.2} width={BODY_W * 0.56} height={BODY_H * 0.36} color={softHighlight} />

            <Oval x={CX - BODY_W * 0.38} y={BODY_Y + BODY_H * 0.72} width={BODY_W * 0.34} height={BODY_H * 0.2} color={bodyColor}>
              <LinearGradient start={vec(CX - BODY_W * 0.2, BODY_Y + BODY_H * 0.72)} end={vec(CX - BODY_W * 0.2, BODY_Y + BODY_H)} colors={[bodyColor, deepShadow]} />
            </Oval>
            <Oval x={CX + BODY_W * 0.04} y={BODY_Y + BODY_H * 0.72} width={BODY_W * 0.34} height={BODY_H * 0.2} color={bodyColor}>
              <LinearGradient start={vec(CX + BODY_W * 0.2, BODY_Y + BODY_H * 0.72)} end={vec(CX + BODY_W * 0.2, BODY_Y + BODY_H)} colors={[bodyColor, deepShadow]} />
            </Oval>

            <Group transform={leftEarT}>
              <Path path={leftEarPath} color={bodyColor}>
                <LinearGradient start={vec(HEAD_X + HEAD_W * 0.24, HEAD_Y - HEAD_H * 0.16)} end={vec(HEAD_X + HEAD_W * 0.32, HEAD_Y + HEAD_H * 0.18)} colors={[highlight, bodyColor, shadow]} />
              </Path>
              <Path path={leftInnerEarPath} color={faceColor} opacity={0.72} />
            </Group>

            <Group transform={rightEarT}>
              <Path path={rightEarPath} color={bodyColor}>
                <LinearGradient start={vec(HEAD_X + HEAD_W * 0.72, HEAD_Y - HEAD_H * 0.16)} end={vec(HEAD_X + HEAD_W * 0.72, HEAD_Y + HEAD_H * 0.18)} colors={[highlight, bodyColor, shadow]} />
              </Path>
              <Path path={rightInnerEarPath} color={faceColor} opacity={0.72} />
            </Group>

            <Oval x={HEAD_X} y={HEAD_Y} width={HEAD_W} height={HEAD_H} color={bodyColor}>
              <LinearGradient start={vec(CX, HEAD_Y)} end={vec(CX, HEAD_Y + HEAD_H)} colors={[highlight, bodyColor, shadow]} />
            </Oval>
            <Path path={headHighlightPath} color="rgba(255,255,255,0.18)" />

            <Oval x={CX - MUZZLE_W / 2} y={MUZZLE_Y} width={MUZZLE_W} height={MUZZLE_H} color={muzzleColor} opacity={0.9} />
            <Oval x={CX - HEAD_W * 0.3} y={HEAD_Y + HEAD_H * 0.54} width={HEAD_W * 0.16} height={HEAD_H * 0.1} color={faceColor} opacity={0.35} />
            <Oval x={CX + HEAD_W * 0.14} y={HEAD_Y + HEAD_H * 0.54} width={HEAD_W * 0.16} height={HEAD_H * 0.1} color={faceColor} opacity={0.35} />

            {!isAsleep && (
              <>
                <Group transform={leftEyeT}>
                  <Oval x={L_EYE_X - EYE_W / 2} y={EYE_Y - EYE_H / 2} width={EYE_W} height={EYE_H} color="rgba(255,255,255,0.96)" />
                  <Oval x={L_EYE_X - EYE_W / 2} y={EYE_Y - EYE_H / 2} width={EYE_W} height={EYE_H} style="stroke" strokeWidth={CW * 0.011} color="rgba(30,41,59,0.13)" />
                  <Oval x={L_EYE_X - PUPIL_W / 2} y={EYE_Y - PUPIL_H / 2} width={PUPIL_W} height={PUPIL_H} color={eyeColor}>
                    <BlurMask blur={4} style="normal" />
                  </Oval>
                  <Oval x={L_EYE_X - PUPIL_W / 2} y={EYE_Y - PUPIL_H / 2} width={PUPIL_W} height={PUPIL_H} color={eyeGlow} />
                  <Oval x={L_EYE_X + PUPIL_W * 0.08} y={EYE_Y - PUPIL_H * 0.3} width={PUPIL_W * 0.26} height={PUPIL_W * 0.26} color="rgba(255,255,255,0.95)" />
                </Group>
                <Group transform={rightEyeT}>
                  <Oval x={R_EYE_X - EYE_W / 2} y={EYE_Y - EYE_H / 2} width={EYE_W} height={EYE_H} color="rgba(255,255,255,0.96)" />
                  <Oval x={R_EYE_X - EYE_W / 2} y={EYE_Y - EYE_H / 2} width={EYE_W} height={EYE_H} style="stroke" strokeWidth={CW * 0.011} color="rgba(30,41,59,0.13)" />
                  <Oval x={R_EYE_X - PUPIL_W / 2} y={EYE_Y - PUPIL_H / 2} width={PUPIL_W} height={PUPIL_H} color={eyeColor}>
                    <BlurMask blur={4} style="normal" />
                  </Oval>
                  <Oval x={R_EYE_X - PUPIL_W / 2} y={EYE_Y - PUPIL_H / 2} width={PUPIL_W} height={PUPIL_H} color={eyeGlow} />
                  <Oval x={R_EYE_X + PUPIL_W * 0.08} y={EYE_Y - PUPIL_H * 0.3} width={PUPIL_W * 0.26} height={PUPIL_W * 0.26} color="rgba(255,255,255,0.95)" />
                </Group>
              </>
            )}
            <Group opacity={isAsleep ? 1 : closedEyeOpacity}>
              <Path path={leftClosedEyePath} color={lineColor} style="stroke" strokeWidth={CW * 0.012} strokeCap="round" />
              <Path path={rightClosedEyePath} color={lineColor} style="stroke" strokeWidth={CW * 0.012} strokeCap="round" />
            </Group>

            <Path path={nosePath} color={eyeColor} />
            <Path path={mouthPath} color={lineColor} style="stroke" strokeWidth={CW * 0.012} strokeCap="round" />
            <Path path={leftWhiskerTop} color={lineColor} style="stroke" strokeWidth={CW * 0.009} strokeCap="round" />
            <Path path={leftWhiskerMiddle} color={lineColor} style="stroke" strokeWidth={CW * 0.009} strokeCap="round" />
            <Path path={leftWhiskerBottom} color={lineColor} style="stroke" strokeWidth={CW * 0.009} strokeCap="round" />
            <Path path={rightWhiskerTop} color={lineColor} style="stroke" strokeWidth={CW * 0.009} strokeCap="round" />
            <Path path={rightWhiskerMiddle} color={lineColor} style="stroke" strokeWidth={CW * 0.009} strokeCap="round" />
            <Path path={rightWhiskerBottom} color={lineColor} style="stroke" strokeWidth={CW * 0.009} strokeCap="round" />
          </Group>
        </Canvas>
      </GestureDetector>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
    minWidth: 1,
    minHeight: 1,
    backgroundColor: 'transparent',
  },
  canvas: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: 'transparent',
  },
});

export default CatBase;
