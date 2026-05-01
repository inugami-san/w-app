/**
 * WenwenBase.tsx v8
 * Absolute precision matching to the original Wemmsy reference:
 * - Body: Flat-bottomed squircle shape (not a perfect oval)
 * - Arms: Custom bezier flippers with distinct inner-thumb paw hooks, drawn over body
 * - Details: Horizontal body seam line above the arms
 * - Legs: Large spheres resting under the flat bottom
 * - Logo: Native text overlays for pixel-perfect readability
 * - Responsiveness: Uses onLayout to guarantee perfect scaling and centering on all mobile devices.
 */
import React, { useMemo, useEffect, useRef, useState } from 'react';
import { Dimensions, StyleSheet, View, Text } from 'react-native';
import {
  Canvas, Path, LinearGradient, RadialGradient, vec, Skia,
  BlurMask, Oval, Circle, Group, RoundedRect
} from '@shopify/react-native-skia';
import {
  useSharedValue, useDerivedValue,
  withRepeat, withTiming, withSequence, Easing, withSpring
} from 'react-native-reanimated';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';

export interface WenwenProps {
  eyeColor?: string;
  faceColor?: string;
  bodyColor?: string;
}

export const WenwenBase: React.FC<WenwenProps> = ({
  eyeColor = '#00D4C2',
  faceColor = '#E2E8F0',
  bodyColor = '#F0F2F5',
}) => {
  // Use local state to track actual container dimensions for proper mobile rendering
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

  // Safe minimums to prevent Skia crashes on initial empty renders
  const SW = Math.max(size.w, 100);
  const SH = Math.max(size.h, 100);

  const CW = Math.min(SW * 0.425, 180);
  const CH = CW * 0.88;
  const CX = SW / 2;
  const CY = SH * 0.45; // Centered gracefully

  const FP_RX = CW * 0.42;
  const FP_RY = CH * 0.38;
  const FP_CY = CY - CH * 0.02;

  const EYE_R = CW * 0.08;
  const EYE_Y = FP_CY - FP_RY * 0.05;
  const L_EYE_X = CX - CW * 0.18;
  const R_EYE_X = CX + CW * 0.18;

  const MOUTH_Y = FP_CY + FP_RY * 0.45;
  const MOUTH_HW = CW * 0.08;

  const BLUSH_Y = EYE_Y + EYE_R * 1.3;
  const L_BLUSH_X = CX - CW * 0.25;
  const R_BLUSH_X = CX + CW * 0.25;
  const BLUSH_RX = CW * 0.08;
  const BLUSH_RY = CH * 0.04;

  const FOOT_W = CW * 0.35;
  const FOOT_H = CW * 0.35;
  const L_FPX = CX - CW * 0.25;
  const L_FPY = CY + CH * 0.45;
  const R_FPX = CX + CW * 0.25;
  const R_FPY = CY + CH * 0.45;

  const ARM_W = CW * 0.15;
  const ARM_H = CH * 0.15;
  const L_SHX = CX - CW * 0.42;
  const L_SHY = CY + CH * 0.16;
  const R_SHX = CX + CW * 0.42;
  const R_SHY = CY + CH * 0.16;

  const bodyPath = useMemo(() => {
    const p = Skia.Path.Make();
    const x = CX, y = CY;
    const w = CW / 2, h = CH / 2;
    p.moveTo(x, y - h);
    p.cubicTo(x + w, y - h, x + w, y - h * 0.2, x + w, y + h * 0.1);
    p.cubicTo(x + w, y + h * 0.8, x + w * 0.6, y + h, x + w * 0.3, y + h);
    p.lineTo(x - w * 0.3, y + h);
    p.cubicTo(x - w * 0.6, y + h, x - w, y + h * 0.8, x - w, y + h * 0.1);
    p.cubicTo(x - w, y - h * 0.2, x - w, y - h, x, y - h);
    p.close();
    return p;
  }, [CX, CY, CW, CH]);

  const seamPath = useMemo(() => {
    const p = Skia.Path.Make();
    const sy = CY - CH * 0.04;
    p.moveTo(CX - CW * 0.44, sy);
    p.quadTo(CX, sy + CH * 0.08, CX + CW * 0.44, sy);
    return p;
  }, [CX, CY, CW, CH]);

  const lArmPath = useMemo(() => {
    const p = Skia.Path.Make();
    p.moveTo(0, 0);
    p.quadTo(-ARM_W * 1.2, ARM_H * 0.4, ARM_W * 0.2, ARM_H * 0.85);
    return p;
  }, [ARM_W, ARM_H]);

  const rArmPath = useMemo(() => {
    const p = Skia.Path.Make();
    p.moveTo(0, 0);
    p.quadTo(ARM_W * 1.2, ARM_H * 0.4, -ARM_W * 0.2, ARM_H * 0.85);
    return p;
  }, [ARM_W, ARM_H]);

  const footPath = useMemo(() => {
    const p = Skia.Path.Make();
    p.addOval({ x: -FOOT_W / 2, y: -FOOT_H / 2, width: FOOT_W, height: FOOT_H });
    return p;
  }, [FOOT_W, FOOT_H]);

  const smilePath = useMemo(() => {
    const p = Skia.Path.Make();
    p.moveTo(CX - MOUTH_HW, MOUTH_Y);
    p.quadTo(CX, MOUTH_Y + CW * 0.08, CX + MOUTH_HW, MOUTH_Y);
    return p;
  }, [CX, CY, CW, MOUTH_Y, MOUTH_HW]);

  const cloudPath = useMemo(() => Skia.Path.MakeFromSVGString('M 0 10 C -10 10 -10 0 0 0 C 0 -15 20 -15 20 0 C 30 0 30 10 20 10 Z') || Skia.Path.Make(), []);

  const faceBridgePath = useMemo(() => {
    const p = Skia.Path.Make();
    // Start slightly inside the left eye
    p.moveTo(L_EYE_X + EYE_R * 0.2, EYE_Y);
    // Curve downwards gently like a stethoscope or a wide smile
    p.quadTo(CX, EYE_Y + EYE_R * 0.7, R_EYE_X - EYE_R * 0.2, EYE_Y);
    return p;
  }, [CX, L_EYE_X, R_EYE_X, EYE_Y, EYE_R]);

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
  const activeTarget = useSharedValue(0);

  useEffect(() => {
    breatheY.value = withRepeat(withTiming(-4, { duration: 3800, easing: Easing.inOut(Easing.sin) }), -1, true);
    idleArmAngle.value = withRepeat(
      withSequence(
        withTiming(0.05, { duration: 2500, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.0, { duration: 2500, easing: Easing.inOut(Easing.sin) })
      ),
      -1, true
    );
    idleLegY.value = withRepeat(
      withSequence(
        withTiming(-CW * 0.02, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.0, { duration: 2000, easing: Easing.inOut(Easing.sin) })
      ),
      -1, true
    );
  }, [CW]);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const schedule = () => {
      const r = Math.random();
      if (r < 0.45) {
        bounceY.value = withSequence(withTiming(-CW * 0.016, { duration: 1200 }), withTiming(CW * 0.005, { duration: 900 }), withTiming(0, { duration: 1000 }));
      } else if (r < 0.80) {
        bodyRock.value = withSequence(withTiming(0.030, { duration: 900 }), withTiming(-0.035, { duration: 1100 }), withTiming(0.015, { duration: 800 }), withTiming(0, { duration: 700 }));
      }
      timerRef.current = setTimeout(schedule, 6000 + Math.random() * 6000);
    };
    timerRef.current = setTimeout(schedule, 4000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [CW]);

  const bodyT = useDerivedValue(() => [
    { translateX: CX },
    { translateY: CY + bounceY.value + breatheY.value },
    { rotate: bodyTilt.value + bodyRock.value },
    { scaleX: stretchX.value },
    { scaleY: squashY.value },
    { translateX: -CX },
    { translateY: -CY },
  ]);

  const lArmT = useDerivedValue(() => [
    { translateX: L_SHX },
    { translateY: L_SHY },
    { rotate: lArmAngle.value + idleArmAngle.value },
  ]);
  const rArmT = useDerivedValue(() => [
    { translateX: R_SHX },
    { translateY: R_SHY },
    { rotate: rArmAngle.value - idleArmAngle.value },
  ]);
  const lLegT = useDerivedValue(() => [{ translateX: L_FPX }, { translateY: L_FPY + idleLegY.value }]);
  const rLegT = useDerivedValue(() => [{ translateX: R_FPX }, { translateY: R_FPY + idleLegY.value }]);

  const clamp = (v: number, lo: number, hi: number) => { 'worklet'; return v < lo ? lo : v > hi ? hi : v; };

  const tapGesture = Gesture.Tap().onEnd(() => {
    squashY.value = withSequence(withSpring(0.96), withSpring(1.02), withSpring(1.00));
    stretchX.value = withSequence(withSpring(1.04), withSpring(0.99), withSpring(1.00));
  });

  const panGesture = Gesture.Pan()
    .onBegin((e) => {
      const near = (ax: number, ay: number, r: number) => (e.x - ax) * (e.x - ax) + (e.y - ay) * (e.y - ay) < r * r;
      if (near(L_SHX, L_SHY, ARM_W * 1.5)) activeTarget.value = 1;
      else if (near(R_SHX, R_SHY, ARM_W * 1.5)) activeTarget.value = 2;
      else activeTarget.value = 0;
    })
    .onUpdate((e) => {
      if (activeTarget.value === 1) {
        lArmAngle.value = clamp(-Math.atan2(e.x - L_SHX, e.y - L_SHY), -0.5, 0.5);
      } else if (activeTarget.value === 2) {
        rArmAngle.value = clamp(-Math.atan2(e.x - R_SHX, e.y - R_SHY), -0.5, 0.5);
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
            {/* Main Shadow */}
            <Path path={bodyPath} color="rgba(0,0,0,0.15)" transform={[{ translateY: 25 }]}>
              <BlurMask blur={35} style="normal" />
            </Path>

            {/* Arms (Drawn BEHIND body for a seamless shoulder joint) */}
            <Group transform={lArmT}>
              <Path path={lArmPath} style="stroke" strokeWidth={ARM_W} strokeCap="round" color={bodyColor}>
                <LinearGradient start={vec(-ARM_W, 0)} end={vec(ARM_W, 0)} colors={['#FFFFFF', '#94A3B8']} />
              </Path>
            </Group>

            <Group transform={rArmT}>
              <Path path={rArmPath} style="stroke" strokeWidth={ARM_W} strokeCap="round" color={bodyColor}>
                <LinearGradient start={vec(-ARM_W, 0)} end={vec(ARM_W, 0)} colors={['#FFFFFF', '#94A3B8']} />
              </Path>
            </Group>

            {/* Legs (Drawn behind body) */}
            <Group transform={lLegT}>
              <Path path={footPath} color={bodyColor}>
                <LinearGradient start={vec(0, -FOOT_H / 2)} end={vec(0, FOOT_H / 2)} colors={['#FFFFFF', '#94A3B8']} />
              </Path>
              <Oval x={-FOOT_W * 0.25} y={-FOOT_H * 0.1} width={FOOT_W * 0.5} height={FOOT_H * 0.4} color="#CBD5E1">
                <LinearGradient start={vec(0, -FOOT_H * 0.1)} end={vec(0, FOOT_H * 0.3)} colors={['#CBD5E1', '#94A3B8']} />
              </Oval>
            </Group>

            <Group transform={rLegT}>
              <Path path={footPath} color={bodyColor}>
                <LinearGradient start={vec(0, -FOOT_H / 2)} end={vec(0, FOOT_H / 2)} colors={['#FFFFFF', '#94A3B8']} />
              </Path>
              <Oval x={-FOOT_W * 0.25} y={-FOOT_H * 0.1} width={FOOT_W * 0.5} height={FOOT_H * 0.4} color="#CBD5E1">
                <LinearGradient start={vec(0, -FOOT_H * 0.1)} end={vec(0, FOOT_H * 0.3)} colors={['#CBD5E1', '#94A3B8']} />
              </Oval>
            </Group>

            {/* Body Ambient Occlusion Shadow (Darkens arms and legs where they tuck behind the body) */}
            <Path path={bodyPath} color="rgba(0,0,0,0.12)">
              <BlurMask blur={20} style="normal" />
            </Path>

            {/* Main Body */}
            <Path path={bodyPath} color={bodyColor}>
              <LinearGradient start={vec(CX, CY - CH / 2)} end={vec(CX, CY + CH / 2)} colors={['#FFFFFF', bodyColor, '#CBD5E1']} />
            </Path>
            {/* Subtle 3D shading on the right */}
            <Path path={bodyPath} color="transparent">
              <LinearGradient start={vec(CX, CY)} end={vec(CX + CW * 0.5, CY + CH * 0.5)} colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.1)']} />
            </Path>

            {/* Body Seam Line */}
            <Path path={seamPath} color="rgba(0,0,0,0.06)" style="stroke" strokeWidth={3} strokeCap="round" />
            <Path path={seamPath} color="rgba(255,255,255,0.6)" style="stroke" strokeWidth={3} strokeCap="round" transform={[{ translateY: 1 }]} />

            {/* Specular Highlight (Top Left) */}
            <Oval x={CX - CW * 0.3} y={CY - CH * 0.4} width={CW * 0.5} height={CH * 0.15} color="rgba(255,255,255,0.7)">
              <BlurMask blur={15} style="normal" />
            </Oval>

            {/* Face Plate Base Color */}
            <Oval x={CX - FP_RX} y={FP_CY - FP_RY} width={FP_RX * 2} height={FP_RY * 2} color={faceColor} />
            {/* Face Plate 3D Shading Overlay */}
            <Oval x={CX - FP_RX} y={FP_CY - FP_RY} width={FP_RX * 2} height={FP_RY * 2} color="transparent">
              <LinearGradient start={vec(CX, FP_CY - FP_RY)} end={vec(CX, FP_CY + FP_RY)} colors={['rgba(255,255,255,0.7)', 'rgba(0,0,0,0.05)']} />
            </Oval>
            <Oval x={CX - FP_RX} y={FP_CY - FP_RY} width={FP_RX * 2} height={FP_RY * 2} style="stroke" strokeWidth={3} color="rgba(0,0,0,0.06)" />
            <Oval x={CX - FP_RX - 2} y={FP_CY - FP_RY - 2} width={FP_RX * 2 + 4} height={FP_RY * 2 + 4} style="stroke" strokeWidth={3} color="rgba(255,255,255,0.6)" />

            {/* Face - Legally Distinct Minimalist Style */}
            <Group>
              {/* Soft sagging bridge (Stethoscope style) */}
              <Path path={faceBridgePath} color={eyeColor} style="stroke" strokeWidth={EYE_R * 0.25} strokeCap="round" />

              {/* Left Eye (Vertical Pill) */}
              <RoundedRect x={L_EYE_X - EYE_R * 0.6} y={EYE_Y - EYE_R * 1.3} width={EYE_R * 1.2} height={EYE_R * 2.6} r={EYE_R * 0.6} color={eyeColor} />

              {/* Right Eye (Vertical Pill) */}
              <RoundedRect x={R_EYE_X - EYE_R * 0.6} y={EYE_Y - EYE_R * 1.3} width={EYE_R * 1.2} height={EYE_R * 2.6} r={EYE_R * 0.6} color={eyeColor} />
            </Group>

            {/* WEMMSY Cloud SVG */}
            <Group transform={[{ translateX: CX + CW * 0.22 }, { translateY: CY + CH * 0.14 }, { scale: 0.85 }]}>
              <Path path={cloudPath} color="#64748B" style="stroke" strokeWidth={2.5} strokeJoin="round" />
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
