import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, fonts, igGradient } from '../theme/colors';

export default function PerformanceGraph({ you, personalBest, friend }) {
  const yourScore = clamp01(you?.score ?? 0);
  const bestScore = clamp01(personalBest?.score ?? 0);
  const friendScore = clamp01(friend?.score ?? 0);

  const max = Math.max(0.05, yourScore, bestScore, friendScore);

  return (
    <View style={styles.box}>
      <Text style={styles.title}>How this run compares</Text>
      <Row
        label="You"
        sublabel={you?.rating ? capitalize(you.rating) : ''}
        score={yourScore}
        max={max}
        accent="gradient"
      />
      <Row
        label="Your best"
        sublabel={personalBest ? capitalize(personalBest.rating || 'bronze') : 'No record yet'}
        score={bestScore}
        max={max}
        accent="muted"
      />
      <Row
        label={friend?.username ? `@${friend.username}` : 'Friend'}
        sublabel="Best on this level"
        score={friendScore}
        max={max}
        accent="soft"
      />
    </View>
  );
}

function Row({ label, sublabel, score, max, accent }) {
  const pct = max === 0 ? 0 : (score / max) * 100;

  return (
    <View style={styles.row}>
      <View style={styles.labelCol}>
        <Text style={styles.label}>{label}</Text>
        {!!sublabel && <Text style={styles.sublabel}>{sublabel}</Text>}
      </View>
      <View style={styles.barCol}>
        <View style={styles.barTrack}>
          <View style={[styles.barFillWrap, { width: `${pct}%` }]}>
            {accent === 'gradient' ? (
              <LinearGradient
                colors={igGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
            ) : (
              <View
                style={[
                  StyleSheet.absoluteFill,
                  {
                    backgroundColor:
                      accent === 'muted' ? colors.text : colors.textDim,
                  },
                ]}
              />
            )}
          </View>
        </View>
        <Text style={styles.scoreText}>{Math.round(score * 100)}</Text>
      </View>
    </View>
  );
}

function clamp01(n) {
  if (typeof n !== 'number' || Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function capitalize(s) {
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const styles = StyleSheet.create({
  box: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    marginVertical: 12,
  },
  title: {
    ...fonts.uiBold,
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  labelCol: {
    width: 90,
  },
  label: {
    ...fonts.uiBold,
    fontSize: 13,
    color: colors.text,
  },
  sublabel: {
    ...fonts.uiMedium,
    fontSize: 10,
    color: colors.textDim,
    marginTop: 1,
  },
  barCol: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  barTrack: {
    flex: 1,
    height: 8,
    backgroundColor: colors.divider,
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFillWrap: {
    height: '100%',
    overflow: 'hidden',
  },
  scoreText: {
    ...fonts.uiBold,
    fontSize: 12,
    color: colors.text,
    width: 32,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
});
