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
}

export const WenwenBase: React.FC<WenwenProps> = ({
  eyeColor = '#00D4C2',
  faceColor = '#E2E8F0',
  bodyColor = '#F0F2F5',
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

  const CW = Math.min(SW * 0.425, 180);
  const CH = CW * 0.88;
  const CX = SW / 2;
  const CY = SH * 0.45;

  const FP_RX = CW * 0.42;
  const FP_RY = CH * 0.38;
  const FP_CY = CY - CH * 0.02;

  const EYE_R = CW * 0.08;
  const EYE_Y = FP_CY - FP_RY * 0.05;
  const L_EYE_X = CX - CW * 0.18;
  const R_EYE_X = CX + CW * 0.18;

  const BLUSH_Y = EYE_Y + EYE_R * 1.3;
  const L_BLUSH_X = CX - CW * 0.25;
  const R_BLUSH_X = CX + CW * 0.25;
  const BLUSH_RX = CW * 0.08;
  const BLUSH_RY = CH * 0.04;

  const TV_PAD_X = FP_RX * 0.02;
  const TV_PAD_Y = FP_RY * 0.03;
  const TV_X = CX - FP_RX + TV_PAD_X;
  const TV_Y = FP_CY - FP_RY + TV_PAD_Y;
  const TV_W = FP_RX * 2 - TV_PAD_X * 2;
  const TV_H = FP_RY * 2 - TV_PAD_Y * 2;

  const HI_STROKE = TV_W * 0.085;
  const HI_HEIGHT = TV_H * 0.38;
  const HI_TOP = TV_Y + TV_H * 0.32;
  const H_LEFT = CX - TV_W * 0.17;
  const H_RIGHT = CX - TV_W * 0.03;
  const I_CENTER = CX + TV_W * 0.19;

  const FOOT_W = CW * 0.33;
  const FOOT_H = CW * 0.33;
  const L_FPX = CX - CW * 0.22;
  const L_FPY = CY + CH * 0.47;
  const R_FPX = CX + CW * 0.22;
  const R_FPY = CY + CH * 0.47;

  const ARM_W = CW * 0.14;
  const ARM_H = CH * 0.16;
  const L_SHX = CX - CW * 0.42;
  const L_SHY = CY + CH * 0.16;
  const R_SHX = CX + CW * 0.42;
  const R_SHY = CY + CH * 0.16;

  const bodyPath = useMemo(() => {
    const p = Skia.Path.Make();
    const x = CX;
    const y = CY;
    const w = CW / 2;
    const h = CH / 2;

    p.moveTo(x, y - h);
    p.cubicTo(x + w, y - h, x + w, y - h * 0.2, x + w, y + h * 0.1);
    p.cubicTo(x + w, y + h * 0.8, x + w * 0.6, y + h, x + w * 0.3, y + h);
    p.lineTo(x - w * 0.3, y + h);
    p.cubicTo(x - w * 0.6, y + h, x - w, y + h * 0.8, x - w, y + h * 0.1);
    p.cubicTo(x - w, y - h * 0.2, x - w, y - h, x, y - h);
    p.close();

    return p;
  }, [CX, CY, CW, CH]);

  const lArmPath = useMemo(() => {
    const p = Skia.Path.Make();
    p.moveTo(0, 0);
    p.quadTo(-ARM_W * 1.15, ARM_H * 0.45, ARM_W * 0.2, ARM_H * 0.9);
    return p;
  }, [ARM_W, ARM_H]);

  const rArmPath = useMemo(() => {
    const p = Skia.Path.Make();
    p.moveTo(0, 0);
    p.quadTo(ARM_W * 1.15, ARM_H * 0.45, -ARM_W * 0.2, ARM_H * 0.9);
    return p;
  }, [ARM_W, ARM_H]);

  const footPath = useMemo(() => {
    const p = Skia.Path.Make();
    p.addOval({ x: -FOOT_W / 2, y: -FOOT_H / 2, width: FOOT_W, height: FOOT_H });
    return p;
  }, [FOOT_W, FOOT_H]);

  const faceBridgePath = useMemo(() => {
    const p = Skia.Path.Make();
    p.moveTo(L_EYE_X + EYE_R * 0.2, EYE_Y);
    p.quadTo(CX, EYE_Y + EYE_R * 0.7, R_EYE_X - EYE_R * 0.2, EYE_Y);
    return p;
  }, [CX, L_EYE_X, R_EYE_X, EYE_Y, EYE_R]);

  const tvClipPath = useMemo(() => {
    const p = Skia.Path.Make();
    p.addOval({ x: TV_X, y: TV_Y, width: TV_W, height: TV_H });
    return p;
  }, [TV_H, TV_W, TV_X, TV_Y]);

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
      hiWave.value = withSequence(
        withTiming(0.55, { duration: 320, easing: Easing.out(Easing.cubic) }),
        withRepeat(
          withSequence(
            withTiming(0.18, { duration: 180, easing: Easing.inOut(Easing.sin) }),
            withTiming(0.55, { duration: 180, easing: Easing.inOut(Easing.sin) })
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
  }, [CW, hiWave, hiWaveBodyY]);

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
    { translateX: L_SHX },
    { translateY: L_SHY },
    { rotate: lArmAngle.value + idleArmAngle.value },
  ]);

  const rArmT = useDerivedValue(() => [
    { translateX: R_SHX },
    { translateY: R_SHY },
    { rotate: rArmAngle.value - idleArmAngle.value - hiWave.value },
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
            <Path path={bodyPath} color="rgba(0,0,0,0.15)" transform={[{ translateY: 25 }]}> 
              <BlurMask blur={35} style="normal" />
            </Path>

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

            <Group transform={lLegT}>
              <Path path={footPath} color={bodyColor}>
                <LinearGradient start={vec(0, -FOOT_H / 2)} end={vec(0, FOOT_H / 2)} colors={['#FFFFFF', '#94A3B8']} />
              </Path>
              <Oval x={-FOOT_W * 0.22} y={-FOOT_H * 0.08} width={FOOT_W * 0.44} height={FOOT_H * 0.34} color="#CBD5E1">
                <LinearGradient start={vec(0, -FOOT_H * 0.08)} end={vec(0, FOOT_H * 0.26)} colors={['#CBD5E1', '#A9B7CB']} />
              </Oval>
            </Group>

            <Group transform={rLegT}>
              <Path path={footPath} color={bodyColor}>
                <LinearGradient start={vec(0, -FOOT_H / 2)} end={vec(0, FOOT_H / 2)} colors={['#FFFFFF', '#94A3B8']} />
              </Path>
              <Oval x={-FOOT_W * 0.22} y={-FOOT_H * 0.08} width={FOOT_W * 0.44} height={FOOT_H * 0.34} color="#CBD5E1">
                <LinearGradient start={vec(0, -FOOT_H * 0.08)} end={vec(0, FOOT_H * 0.26)} colors={['#CBD5E1', '#A9B7CB']} />
              </Oval>
            </Group>

            <Path path={bodyPath} color="rgba(0,0,0,0.12)">
              <BlurMask blur={20} style="normal" />
            </Path>

            <Path path={bodyPath} color={bodyColor}>
              <LinearGradient start={vec(CX, CY - CH / 2)} end={vec(CX, CY + CH / 2)} colors={['#FFFFFF', bodyColor, '#CBD5E1']} />
            </Path>

            <Path path={bodyPath} color="transparent">
              <LinearGradient start={vec(CX, CY)} end={vec(CX + CW * 0.5, CY + CH * 0.5)} colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.08)']} />
            </Path>

            <Oval x={CX - CW * 0.3} y={CY - CH * 0.4} width={CW * 0.5} height={CH * 0.15} color="rgba(255,255,255,0.7)">
              <BlurMask blur={15} style="normal" />
            </Oval>

            <Group transform={faceT}>
              <Oval x={CX - FP_RX} y={FP_CY - FP_RY} width={FP_RX * 2} height={FP_RY * 2} color={faceColor} />
              <Oval x={CX - FP_RX} y={FP_CY - FP_RY} width={FP_RX * 2} height={FP_RY * 2} color="transparent">
                <LinearGradient start={vec(CX, FP_CY - FP_RY)} end={vec(CX, FP_CY + FP_RY)} colors={['rgba(255,255,255,0.7)', 'rgba(0,0,0,0.05)']} />
              </Oval>
              <Oval x={CX - FP_RX} y={FP_CY - FP_RY} width={FP_RX * 2} height={FP_RY * 2} style="stroke" strokeWidth={3} color="rgba(0,0,0,0.06)" />
              <Oval x={CX - FP_RX - 2} y={FP_CY - FP_RY - 2} width={FP_RX * 2 + 4} height={FP_RY * 2 + 4} style="stroke" strokeWidth={3} color="rgba(255,255,255,0.6)" />

              <Group>
                <Path path={faceBridgePath} color={eyeColor} style="stroke" strokeWidth={EYE_R * 0.25} strokeCap="round" />
                <RoundedRect x={L_EYE_X - EYE_R * 0.6} y={EYE_Y - EYE_R * 1.3} width={EYE_R * 1.2} height={EYE_R * 2.6} r={EYE_R * 0.6} color={eyeColor} />
                <RoundedRect x={R_EYE_X - EYE_R * 0.6} y={EYE_Y - EYE_R * 1.3} width={EYE_R * 1.2} height={EYE_R * 2.6} r={EYE_R * 0.6} color={eyeColor} />
                <Oval x={L_BLUSH_X - BLUSH_RX} y={BLUSH_Y - BLUSH_RY} width={BLUSH_RX * 2} height={BLUSH_RY * 2} color="rgba(255,255,255,0.16)" />
                <Oval x={R_BLUSH_X - BLUSH_RX} y={BLUSH_Y - BLUSH_RY} width={BLUSH_RX * 2} height={BLUSH_RY * 2} color="rgba(255,255,255,0.16)" />
              </Group>

              <Group opacity={tvOverlay} clip={tvClipPath}>
                <Oval x={TV_X} y={TV_Y} width={TV_W} height={TV_H} color="#071422">
                  <LinearGradient start={vec(TV_X, TV_Y)} end={vec(TV_X, TV_Y + TV_H)} colors={['#071422', '#0F2538', '#071422']} />
                </Oval>

                <RoundedRect x={TV_X + TV_W * 0.06} y={TV_Y + TV_H * 0.14} width={TV_W * 0.88} height={TV_H * 0.01} r={TV_H * 0.005} color="rgba(120,220,255,0.2)" />
                <RoundedRect x={TV_X + TV_W * 0.06} y={TV_Y + TV_H * 0.33} width={TV_W * 0.88} height={TV_H * 0.01} r={TV_H * 0.005} color="rgba(120,220,255,0.16)" />
                <RoundedRect x={TV_X + TV_W * 0.06} y={TV_Y + TV_H * 0.52} width={TV_W * 0.88} height={TV_H * 0.01} r={TV_H * 0.005} color="rgba(120,220,255,0.18)" />
                <RoundedRect x={TV_X + TV_W * 0.06} y={TV_Y + TV_H * 0.71} width={TV_W * 0.88} height={TV_H * 0.01} r={TV_H * 0.005} color="rgba(120,220,255,0.14)" />

                <Group transform={tvScanT} opacity={tvScanOpacity}>
                  <Oval x={TV_X} y={TV_Y - TV_H * 0.2} width={TV_W} height={TV_H * 0.2} color="#34D3FF">
                    <LinearGradient start={vec(TV_X, TV_Y - TV_H * 0.2)} end={vec(TV_X, TV_Y)} colors={['rgba(255,255,255,0)', 'rgba(52,211,255,0.78)']} />
                  </Oval>
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
