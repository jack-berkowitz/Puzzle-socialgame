import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  BackHandler,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import { colors, fonts, igGradient } from '../theme/colors';
import Button from '../components/Button';
import Timer from '../components/Timer';
import Confetti from '../components/Confetti';
import PerformanceGraph from '../components/PerformanceGraph';
import {
  GAME_NAMES,
  RATINGS,
  gameTypeForLevel,
  ratingForScore,
  speedLabel,
  speedMultiplier,
} from '../utils/difficulty';
import {
  awardLevelTokens,
  friendBestForLevel,
  getValue,
  KEYS,
  personalBestForLevel,
} from '../utils/storage';

import TrainRouterGame from '../games/TrainRouterGame';
import AttentionFilterGame from '../games/AttentionFilterGame';
import MemoryOverloadGame from '../games/MemoryOverloadGame';
import RapidFireSpatialGame from '../games/RapidFireSpatialGame';
import StormChaserGame from '../games/StormChaserGame';

const RATING_COLORS = {
  platinum: ['#dbe4ff', '#a48fff'],
  gold: ['#feda77', '#f58529'],
  silver: ['#dcdcdc', '#9ca3af'],
  bronze: ['#d6a17a', '#a86c3a'],
};

const RATING_PARTICLES = {
  platinum: 130,
  gold: 90,
  silver: 60,
  bronze: 35,
};

function formatMs(ms) {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function PuzzleScreen({ navigation, route }) {
  const [level, setLevel] = useState(route.params?.level ?? 1);
  const [gameType, setGameType] = useState(() =>
    route.params?.gameType ?? gameTypeForLevel(route.params?.level ?? 1)
  );
  const [phase, setPhase] = useState('playing');
  const [summary, setSummary] = useState(null);

  const startTimeRef = useRef(Date.now());

  useEffect(() => {
    (async () => {
      const stored = await getValue(KEYS.currentLevel);
      if (route.params?.level === undefined) {
        setLevel(stored);
        setGameType(gameTypeForLevel(stored));
      }
    })();
  }, [route.params?.level]);

  useFocusEffect(
    useCallback(() => {
      const onBack = () => {
        if (phase === 'summary') return false;
        confirmExit();
        return true;
      };
      const sub = BackHandler.addEventListener('hardwareBackPress', onBack);
      return () => sub.remove();
    }, [phase])
  );

  const confirmExit = () => {
    Alert.alert('Quit puzzle?', 'Your progress in this puzzle will be lost.', [
      { text: 'Stay', style: 'cancel' },
      { text: 'Quit', style: 'destructive', onPress: () => navigation.goBack() },
    ]);
  };

  const handleGameDone = useCallback(
    async (result) => {
      const timeMs = Date.now() - startTimeRef.current;
      const score = clamp01(result?.score ?? 0);
      const rating = ratingForScore(score);
      const ratingMult = RATINGS[rating].mult;
      const speedMult = speedMultiplier(timeMs);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      const completed = await getValue(KEYS.completedLevels);
      const previousBest = personalBestForLevel(completed, level);
      const friend = friendBestForLevel(level, await getValue(KEYS.followingList));

      const award = await awardLevelTokens({
        level,
        rating,
        ratingMult,
        speedMultiplier: speedMult,
        timeMs,
        score,
        gameType,
      });

      setSummary({
        rating,
        ratingMult,
        score,
        timeMs,
        speedMult,
        speedLabel: speedLabel(timeMs),
        earned: award.earned,
        base: award.base,
        previousBest,
        friend,
        gameStats: result,
      });
      setPhase('summary');
    },
    [level, gameType]
  );

  const handleGameRestart = useCallback(() => {
    // first-try state lives in the game
  }, []);

  const continueChain = () => {
    const next = level + 1;
    startTimeRef.current = Date.now();
    setLevel(next);
    setGameType(gameTypeForLevel(next));
    setSummary(null);
    setPhase('playing');
  };

  const goBack = () => navigation.goBack();

  const Game = useMemo(() => {
    switch (gameType) {
      case 'train':
        return TrainRouterGame;
      case 'attention':
        return AttentionFilterGame;
      case 'memory':
        return MemoryOverloadGame;
      case 'spatial':
        return RapidFireSpatialGame;
      case 'storm':
        return StormChaserGame;
      default:
        return TrainRouterGame;
    }
  }, [gameType]);

  if (phase === 'summary' && summary) {
    const ratingDef = RATINGS[summary.rating];
    const ratingPalette = RATING_COLORS[summary.rating];
    const particles = RATING_PARTICLES[summary.rating] ?? 50;

    return (
      <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
        <Confetti visible count={particles} />
        <ScrollView
          contentContainerStyle={styles.summary}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.summaryEyebrow}>Level {level} cleared</Text>

          <View style={styles.medalWrap}>
            <LinearGradient
              colors={ratingPalette}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.medal}
            >
              <Text style={styles.medalText}>{ratingDef.name.toUpperCase()}</Text>
            </LinearGradient>
            <Text style={styles.scoreText}>{Math.round(summary.score * 100)} / 100</Text>
          </View>

          <View style={styles.timeRow}>
            <Text style={styles.timeLabel}>Completed in</Text>
            <Text style={styles.timeValue}>{formatMs(summary.timeMs)}</Text>
            <Text style={styles.speedTag}>
              {summary.speedLabel} · {summary.speedMult}×
            </Text>
          </View>

          <View style={styles.tokenBig}>
            <Text style={styles.tokenAmount}>+{summary.earned}</Text>
            <Text style={styles.tokenLabel}>tokens</Text>
          </View>

          <View style={styles.breakdown}>
            <BreakdownRow label="Base reward" value={`${summary.base}`} />
            <BreakdownRow
              label={`${ratingDef.name} bonus`}
              value={`× ${ratingDef.mult}`}
              accent
            />
            <BreakdownRow label="Speed bonus" value={`× ${summary.speedMult}`} accent />
          </View>

          <PerformanceGraph
            you={{ score: summary.score, rating: summary.rating }}
            personalBest={summary.previousBest}
            friend={summary.friend}
          />

          <View style={styles.summaryActions}>
            <Button title={`Try level ${level + 1}`} onPress={continueChain} />
            <Button title="Back to map" variant="ghost" onPress={goBack} />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.topBar}>
        <Pressable style={styles.exitBtn} onPress={confirmExit}>
          <Text style={styles.exitText}>×</Text>
        </Pressable>
        <View style={styles.center}>
          <Text style={styles.gameTypeLabel}>{GAME_NAMES[gameType]}</Text>
          <Text style={styles.levelLabel}>Level {level}</Text>
        </View>
        <Timer />
      </View>

      <View style={styles.gameContainer}>
        <Game
          key={`${gameType}-${level}`}
          level={level}
          onComplete={handleGameDone}
          onFailRound={handleGameRestart}
        />
      </View>
    </SafeAreaView>
  );
}

function BreakdownRow({ label, value, accent }) {
  return (
    <View style={styles.breakRow}>
      <Text style={styles.breakLabel}>{label}</Text>
      <Text style={[styles.breakValue, accent && styles.breakValueAccent]}>{value}</Text>
    </View>
  );
}

function clamp01(n) {
  if (typeof n !== 'number' || Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  exitBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exitText: {
    ...fonts.uiMedium,
    color: colors.text,
    fontSize: 28,
    lineHeight: 30,
  },
  center: {
    alignItems: 'center',
  },
  gameTypeLabel: {
    ...fonts.uiBold,
    fontSize: 15,
    color: colors.text,
  },
  levelLabel: {
    ...fonts.uiMedium,
    fontSize: 11,
    color: colors.textDim,
  },
  gameContainer: {
    flex: 1,
  },
  summary: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 32,
    alignItems: 'center',
  },
  summaryEyebrow: {
    ...fonts.uiSemi,
    fontSize: 11,
    letterSpacing: 1.5,
    color: colors.accent,
    textTransform: 'uppercase',
    marginBottom: 14,
  },
  medalWrap: {
    alignItems: 'center',
    marginBottom: 16,
  },
  medal: {
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 999,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  medalText: {
    ...fonts.display,
    color: '#fff',
    fontSize: 18,
    letterSpacing: 2,
  },
  scoreText: {
    ...fonts.uiBold,
    fontSize: 14,
    color: colors.textDim,
    marginTop: 8,
    fontVariant: ['tabular-nums'],
  },
  timeRow: {
    alignItems: 'center',
    marginTop: 8,
  },
  timeLabel: {
    ...fonts.uiMedium,
    fontSize: 12,
    color: colors.textDim,
    marginBottom: 4,
  },
  timeValue: {
    ...fonts.display,
    fontSize: 38,
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  speedTag: {
    ...fonts.uiSemi,
    fontSize: 11,
    color: colors.accent,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  tokenBig: {
    alignItems: 'center',
    marginVertical: 14,
  },
  tokenAmount: {
    ...fonts.display,
    fontSize: 48,
    color: colors.text,
  },
  tokenLabel: {
    ...fonts.uiMedium,
    fontSize: 13,
    color: colors.textDim,
    marginTop: -2,
  },
  breakdown: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    marginTop: 4,
  },
  breakRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  breakLabel: {
    ...fonts.uiMedium,
    color: colors.textSecondary,
    fontSize: 13,
  },
  breakValue: {
    ...fonts.uiBold,
    color: colors.text,
    fontSize: 13,
  },
  breakValueAccent: {
    color: colors.accent,
  },
  summaryActions: {
    width: '100%',
    gap: 8,
    marginTop: 8,
  },
});
