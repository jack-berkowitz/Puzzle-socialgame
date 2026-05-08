import React, { useEffect } from 'react';
import { Pressable, Text, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { colors, fonts, igGradient } from '../theme/colors';

export default function LevelNode({ level, status, onPress }) {
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (status !== 'current') return;
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 900 }),
        withTiming(0, { duration: 900 })
      ),
      -1,
      false
    );
  }, [status, pulse]);

  const ringStyle = useAnimatedStyle(() => ({
    opacity: 0.6 - pulse.value * 0.6,
    transform: [{ scale: 1 + pulse.value * 0.45 }],
  }));

  return (
    <View style={styles.wrap}>
      {status === 'current' && (
        <Animated.View style={[styles.ring, ringStyle]}>
          <LinearGradient
            colors={igGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      )}
      <Pressable
        onPress={status !== 'locked' ? onPress : undefined}
        disabled={status === 'locked'}
        style={({ pressed }) => [
          styles.node,
          status === 'completed' && styles.nodeCompleted,
          status === 'locked' && styles.nodeLocked,
          status === 'current' && styles.nodeCurrentShadow,
          pressed && status !== 'locked' && styles.pressed,
        ]}
      >
        {status === 'current' || status === 'completed' ? (
          <LinearGradient
            colors={igGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        ) : null}
        {status === 'completed' ? (
          <Text style={[styles.icon, styles.iconOnGradient]}>✓</Text>
        ) : status === 'locked' ? (
          <Text style={[styles.icon, styles.iconLocked]}>🔒</Text>
        ) : (
          <Text style={[styles.label, styles.labelOnGradient]}>{level}</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 96,
    height: 96,
  },
  ring: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: 'hidden',
  },
  node: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.border,
  },
  nodeCompleted: {
    borderWidth: 0,
  },
  nodeLocked: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  nodeCurrentShadow: {
    borderWidth: 0,
    shadowColor: colors.accent,
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  pressed: {
    transform: [{ scale: 0.94 }],
  },
  label: {
    ...fonts.display,
    fontSize: 22,
    color: colors.text,
  },
  labelOnGradient: {
    color: '#fff',
  },
  icon: {
    fontSize: 18,
    color: colors.text,
  },
  iconOnGradient: {
    color: '#fff',
    ...fonts.uiBold,
    fontSize: 22,
  },
  iconLocked: {
    color: colors.textDim,
  },
});
