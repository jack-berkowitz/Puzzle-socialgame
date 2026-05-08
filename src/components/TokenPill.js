import React, { useEffect } from 'react';
import { Pressable, StyleSheet, View, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { colors, fonts, igGradient } from '../theme/colors';

export default function TokenPill({ tokens, low, onPress }) {
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (low) {
      pulse.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 600 }),
          withTiming(0, { duration: 600 })
        ),
        -1,
        false
      );
    } else {
      pulse.value = withTiming(0, { duration: 200 });
    }
  }, [low, pulse]);

  const ringStyle = useAnimatedStyle(() => ({
    opacity: 0.25 + pulse.value * 0.45,
    transform: [{ scale: 1 + pulse.value * 0.18 }],
  }));

  return (
    <Pressable onPress={onPress} style={styles.wrap}>
      <Animated.View style={[styles.ring, ringStyle]} pointerEvents="none">
        <LinearGradient
          colors={igGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
      <View style={styles.pill}>
        <View style={styles.coinWrap}>
          <LinearGradient
            colors={igGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.coin}
          />
        </View>
        <Text style={styles.text}>{tokens}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: 'flex-start',
    margin: 8,
  },
  ring: {
    position: 'absolute',
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    borderRadius: 999,
    overflow: 'hidden',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  coinWrap: {
    width: 22,
    height: 22,
    borderRadius: 11,
    overflow: 'hidden',
    marginRight: 8,
    backgroundColor: '#fff',
    padding: 2,
  },
  coin: {
    flex: 1,
    borderRadius: 9,
  },
  text: {
    ...fonts.uiBold,
    color: colors.text,
    fontSize: 15,
    letterSpacing: 0.2,
  },
});
