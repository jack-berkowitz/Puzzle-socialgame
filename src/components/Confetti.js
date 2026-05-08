import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { colors } from '../theme/colors';

const { width: W, height: H } = Dimensions.get('window');

function Particle({ x, color, size, delay, drift, duration, rotateTo }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(1, {
      duration,
      easing: Easing.out(Easing.cubic),
    });
  }, [progress, duration]);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: x + drift * progress.value },
      { translateY: -40 + (H + 80) * progress.value },
      { rotate: `${rotateTo * progress.value}deg` },
    ],
    opacity: 1 - Math.max(0, progress.value - 0.85) * 6,
  }));

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          backgroundColor: color,
          width: size,
          height: size * 0.4,
          marginLeft: -delay,
        },
        style,
      ]}
    />
  );
}

export default function Confetti({ count = 60, visible = true }) {
  const particles = useMemo(() => {
    if (!visible) return [];
    return Array.from({ length: count }).map((_, i) => ({
      key: i,
      x: Math.random() * W,
      color: colors.confetti[i % colors.confetti.length],
      size: 6 + Math.random() * 10,
      delay: Math.random() * 80,
      drift: (Math.random() - 0.5) * 220,
      duration: 1800 + Math.random() * 1600,
      rotateTo: (Math.random() - 0.5) * 720,
    }));
  }, [count, visible]);

  if (!visible) return null;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {particles.map((p) => (
        <Particle key={p.key} {...p} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  particle: {
    position: 'absolute',
    borderRadius: 2,
  },
});
