import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  PanResponder,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, fonts } from '../theme/colors';
import { attentionParams } from '../utils/difficulty';

const { width: SCREEN_W } = Dimensions.get('window');

const DIRS = ['up', 'down', 'left', 'right'];
const SYMBOL = { up: '↑', down: '↓', left: '←', right: '→' };

function pickRandom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function buildRound(params) {
  const targetDir = pickRandom(DIRS);
  const flockRadius = 110;
  const minDist = params.targetSize * 0.9;

  const distractors = [];
  for (let i = 0; i < params.distractors; i++) {
    let attempts = 0;
    let pos;
    while (attempts < 12) {
      const angle = Math.random() * Math.PI * 2;
      const r = minDist + Math.random() * (flockRadius - minDist);
      const cand = {
        x: Math.cos(angle) * r,
        y: Math.sin(angle) * r,
      };
      const ok = distractors.every((d) => {
        const dx = d.x - cand.x;
        const dy = d.y - cand.y;
        return Math.sqrt(dx * dx + dy * dy) > 36;
      });
      if (ok) {
        pos = cand;
        break;
      }
      attempts++;
    }
    pos = pos || { x: (Math.random() - 0.5) * flockRadius, y: (Math.random() - 0.5) * flockRadius };
    distractors.push({
      id: i,
      ...pos,
      dir: pickRandom(DIRS),
      rotation: params.animateDistractors ? Math.random() * 360 : 0,
    });
  }
  return { targetDir, distractors };
}

const PHASE = {
  display: 'display',
  input: 'input',
  reveal: 'reveal',
};

export default function AttentionFilterGame({ level, onComplete, onFailRound }) {
  const params = useMemo(() => attentionParams(level), [level]);
  const [round, setRound] = useState(1);
  const [phase, setPhase] = useState(PHASE.display);
  const [data, setData] = useState(() => buildRound(params));
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const completedRef = useRef(false);

  useEffect(() => {
    if (phase !== PHASE.display) return;
    const id = setTimeout(() => setPhase(PHASE.input), params.displayMs);
    return () => clearTimeout(id);
  }, [phase, params.displayMs]);

  const onSwipe = (dir) => {
    if (phase !== PHASE.input) return;
    const ok = dir === data.targetDir;
    if (ok) {
      Haptics.selectionAsync();
      setCombo((c) => {
        const nc = c + 1;
        setMaxCombo((m) => Math.max(m, nc));
        return nc;
      });
      setCorrect((n) => n + 1);
      setFeedback({ ok: true, dir });
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setCombo(0);
      setWrong((n) => n + 1);
      setFeedback({ ok: false, dir });
      onFailRound?.();
    }
    setPhase(PHASE.reveal);

    setTimeout(() => {
      const next = round + 1;
      if (next > params.totalRounds) {
        if (!completedRef.current) {
          completedRef.current = true;
          const total = correct + wrong + 1;
          const correctTotal = correct + (ok ? 1 : 0);
          const score = Math.min(1, correctTotal / params.totalRounds + maxCombo * 0.005);
          onComplete?.({
            firstTry: wrong === 0 && ok,
            score,
            correct: correctTotal,
            wrong: total - correctTotal,
            maxCombo: Math.max(maxCombo, ok ? combo + 1 : combo),
          });
        }
        return;
      }
      setRound(next);
      setData(buildRound(params));
      setFeedback(null);
      setPhase(PHASE.display);
    }, 700);
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderRelease: (_, g) => {
        const { dx, dy } = g;
        if (Math.abs(dx) < 30 && Math.abs(dy) < 30) return;
        const dir =
          Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';
        onSwipeRef.current(dir);
      },
    })
  ).current;
  const onSwipeRef = useRef(onSwipe);
  useEffect(() => {
    onSwipeRef.current = onSwipe;
  });

  return (
    <View style={styles.root}>
      <View style={styles.topBar}>
        <Text style={styles.progressTxt}>
          {round} / {params.totalRounds}
        </Text>
        <Text style={styles.comboTxt}>
          {combo > 1 ? `Combo ×${combo}` : ' '}
        </Text>
        <Text style={styles.scoreTxt}>
          ✓ {correct}  ✗ {wrong}
        </Text>
      </View>

      <View style={styles.flockArea} {...panResponder.panHandlers}>
        {phase === PHASE.display &&
          data.distractors.map((d) => (
            <Text
              key={d.id}
              style={[
                styles.distractor,
                {
                  transform: [
                    { translateX: d.x },
                    { translateY: d.y },
                    { rotate: `${d.rotation}deg` },
                  ],
                  color: params.sameColor ? colors.text : colors.textDim,
                },
              ]}
            >
              {SYMBOL[d.dir]}
            </Text>
          ))}

        {phase === PHASE.display && (
          <Text
            style={[
              styles.target,
              {
                fontSize: params.targetSize,
              },
            ]}
          >
            {SYMBOL[data.targetDir]}
          </Text>
        )}

        {phase === PHASE.input && (
          <View style={styles.prompt}>
            <Text style={styles.promptTitle}>Swipe</Text>
            <Text style={styles.promptSub}>in the direction the center pointed</Text>
          </View>
        )}

        {phase === PHASE.reveal && (
          <View style={styles.prompt}>
            <Text style={[styles.feedback, feedback?.ok ? styles.feedbackOk : styles.feedbackBad]}>
              {feedback?.ok ? '✓' : '✗'}
            </Text>
            <Text style={styles.promptSub}>
              Target: {SYMBOL[data.targetDir]} {data.targetDir.toUpperCase()}
            </Text>
            {feedback && !feedback.ok && (
              <Text style={styles.promptSub}>You: {SYMBOL[feedback.dir]}</Text>
            )}
          </View>
        )}
      </View>

      <Text style={styles.hint}>
        Watch the center arrow, ignore the rest. Swipe in its direction.
      </Text>
    </View>
  );
}

const FLOCK_SIZE = Math.min(SCREEN_W - 40, 320);

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 8,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '90%',
    marginBottom: 12,
  },
  progressTxt: {
    ...fonts.uiBold,
    color: colors.text,
    fontSize: 13,
  },
  comboTxt: {
    ...fonts.uiBold,
    color: colors.accent,
    fontSize: 13,
  },
  scoreTxt: {
    ...fonts.uiSemi,
    color: colors.textDim,
    fontSize: 12,
  },
  flockArea: {
    width: FLOCK_SIZE,
    height: FLOCK_SIZE,
    backgroundColor: colors.surface,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  distractor: {
    position: 'absolute',
    fontSize: 26,
    color: colors.text,
    ...fonts.uiBold,
  },
  target: {
    color: colors.accent,
    ...fonts.uiBold,
  },
  prompt: {
    alignItems: 'center',
  },
  promptTitle: {
    ...fonts.display,
    fontSize: 28,
    color: colors.text,
  },
  promptSub: {
    ...fonts.uiMedium,
    color: colors.textDim,
    fontSize: 13,
    marginTop: 6,
    textAlign: 'center',
  },
  feedback: {
    ...fonts.display,
    fontSize: 56,
  },
  feedbackOk: {
    color: colors.success,
  },
  feedbackBad: {
    color: colors.danger,
  },
  hint: {
    ...fonts.uiMedium,
    color: colors.textDim,
    fontSize: 12,
    marginTop: 16,
    paddingHorizontal: 24,
    textAlign: 'center',
  },
});
