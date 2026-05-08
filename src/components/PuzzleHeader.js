import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, fonts, igGradient } from '../theme/colors';

export default function PuzzleHeader({ tokens, streak, completed }) {
  return (
    <View style={styles.row}>
      <View style={styles.stat}>
        <View style={styles.coinWrap}>
          <LinearGradient
            colors={igGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.coin}
          />
        </View>
        <View>
          <Text style={styles.value}>{tokens}</Text>
          <Text style={styles.label}>Tokens</Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.stat}>
        <Text style={styles.icon}>🔥</Text>
        <View>
          <Text style={styles.value}>{streak}</Text>
          <Text style={styles.label}>Streak</Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.stat}>
        <Text style={styles.icon}>🏆</Text>
        <View>
          <Text style={styles.value}>{completed}</Text>
          <Text style={styles.label}>Levels</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.bg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
    gap: 8,
  },
  stat: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  divider: {
    width: StyleSheet.hairlineWidth,
    height: 28,
    backgroundColor: colors.divider,
  },
  icon: {
    fontSize: 20,
  },
  coinWrap: {
    width: 22,
    height: 22,
    borderRadius: 11,
    overflow: 'hidden',
    backgroundColor: '#fff',
    padding: 2,
  },
  coin: {
    flex: 1,
    borderRadius: 9,
  },
  value: {
    ...fonts.uiBold,
    color: colors.text,
    fontSize: 15,
    lineHeight: 17,
  },
  label: {
    ...fonts.uiMedium,
    color: colors.textDim,
    fontSize: 11,
  },
});
