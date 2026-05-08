import React, { useEffect } from 'react';
import { StyleSheet, View, Text, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { colors, fonts, igGradient } from '../theme/colors';
import Button from './Button';

export default function OutOfTokensSheet({
  visible,
  level,
  context = 'feed',
  onPlay,
  onMap,
  onDismiss,
}) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(visible ? 1 : 0, { duration: 280 });
  }, [visible, progress]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - progress.value) * 600 }],
  }));
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: progress.value * 0.55,
  }));

  if (!visible && progress.value === 0) return null;

  const reelsContext = context === 'reels';

  const title = reelsContext
    ? 'You need tokens to keep watching Reels'
    : "You're out of scroll tokens";
  const body = reelsContext
    ? 'Reels cost 5 tokens per swipe. Play a puzzle to earn more.'
    : 'Earn more by completing your next puzzle.';

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents={visible ? 'auto' : 'none'}>
      <Animated.View style={[styles.backdrop, backdropStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onDismiss} />
      </Animated.View>

      <Animated.View style={[styles.sheet, sheetStyle]}>
        <View style={styles.handle} />

        <View style={styles.iconWrap}>
          <LinearGradient
            colors={igGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.iconGradient}
          />
        </View>

        <Text style={styles.title}>{title}</Text>
        <Text style={styles.body}>{body}</Text>

        <View style={styles.row}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>LEVEL</Text>
            <Text style={styles.statValue}>{level}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>{reelsContext ? 'COST / SWIPE' : 'COST / TICK'}</Text>
            <Text style={styles.statValue}>{reelsContext ? '5' : '1'}</Text>
          </View>
        </View>

        <View style={styles.actions}>
          <Button title="Play a puzzle" variant="primary" onPress={onPlay} />
          <Button title="Go to map" variant="ghost" onPress={onMap} />
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.bgSheet,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -4 },
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: 16,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
    marginBottom: 12,
  },
  iconGradient: {
    flex: 1,
  },
  title: {
    ...fonts.uiBold,
    fontSize: 18,
    color: colors.text,
    textAlign: 'center',
    marginBottom: 6,
  },
  body: {
    ...fonts.uiMedium,
    fontSize: 14,
    color: colors.textDim,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginBottom: 20,
  },
  statBox: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  statLabel: {
    ...fonts.uiSemi,
    fontSize: 10,
    color: colors.textDim,
    letterSpacing: 1,
    marginBottom: 4,
  },
  statValue: {
    ...fonts.uiBold,
    fontSize: 22,
    color: colors.text,
  },
  actions: {
    width: '100%',
    gap: 8,
  },
});
