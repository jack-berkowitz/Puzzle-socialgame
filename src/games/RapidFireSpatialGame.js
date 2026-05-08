import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { colors, fonts, igGradient } from '../theme/colors';
import { spatialParams } from '../utils/difficulty';

const { width: SCREEN_W } = Dimensions.get('window');

const SHAPES_SIMPLE = [
  [
    [1, 0, 0],
    [1, 0, 0],
    [1, 1, 0],
  ],
  [
    [0, 1, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  [
    [1, 1, 0],
    [0, 1, 1],
    [0, 0, 0],
  ],
  [
    [1, 1, 1],
    [1, 0, 0],
    [0, 0, 0],
  ],
];

const SHAPES_MEDIUM = [
  [
    [1, 1, 0],
    [0, 1, 0],
    [0, 1, 1],
  ],
  [
    [1, 0, 1],
    [1, 1, 1],
    [0, 0, 0],
  ],
  [
    [1, 1, 0],
    [1, 0, 0],
    [1, 1, 1],
  ],
  [
    [0, 1, 1],
    [1, 1, 0],
    [1, 0, 0],
  ],
];

const SHAPES_COMPOUND = [
  [
    [1, 1, 0, 0],
    [0, 1, 1, 0],
    [0, 0, 1, 1],
    [0, 0, 0, 1],
  ],
  [
    [1, 0, 0, 1],
    [1, 1, 1, 1],
    [1, 0, 0, 0],
    [0, 0, 0, 0],
  ],
  [
    [0, 1, 1, 0],
    [1, 1, 0, 0],
    [0, 1, 1, 0],
    [0, 0, 1, 1],
  ],
  [
    [1, 1, 1, 1],
    [1, 0, 0, 0],
    [1, 0, 1, 0],
    [0, 0, 1, 1],
  ],
];

function rotate90(grid) {
  const n = grid.length;
  const m = grid[0].length;
  const out = Array.from({ length: m }, () => Array(n).fill(0));
  for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) out[j][n - 1 - i] = grid[i][j];
  return out;
}

function mirrorH(grid) {
  return grid.map((row) => [...row].reverse());
}

function shapesEqual(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i].length !== b[i].length) return false;
    for (let j = 0; j < a[i].length; j++) if (a[i][j] !== b[i][j]) return false;
  }
  return true;
}

function isSameUnderRotation(a, b) {
  let cur = a;
  for (let r = 0; r < 4; r++) {
    if (shapesEqual(cur, b)) return true;
    cur = rotate90(cur);
  }
  return false;
}

function pickShape(library) {
  return library[Math.floor(Math.random() * library.length)];
}

function buildTrial(library, mirrorChance) {
  const a = pickShape(library);
  const wantSame = Math.random() < 0.5;
  if (wantSame) {
    let b = a;
    const rotations = Math.floor(Math.random() * 4);
    for (let i = 0; i < rotations; i++) b = rotate90(b);
    return { a, b, isSame: true };
  }
  if (Math.random() < mirrorChance) {
    let b = mirrorH(a);
    const rotations = Math.floor(Math.random() * 4);
    for (let i = 0; i < rotations; i++) b = rotate90(b);
    if (isSameUnderRotation(a, b)) {
      // mirror happened to be same — fall through to different shape
    } else {
      return { a, b, isSame: false };
    }
  }
  // Different shape
  let b = pickShape(library);
  let attempts = 0;
  while (isSameUnderRotation(a, b) && attempts < 10) {
    b = pickShape(library);
    attempts++;
  }
  const rotations = Math.floor(Math.random() * 4);
  for (let i = 0; i < rotations; i++) b = rotate90(b);
  return { a, b, isSame: false };
}

function libraryFor(complexity) {
  if (complexity === 'simple') return SHAPES_SIMPLE;
  if (complexity === 'medium') return SHAPES_MEDIUM;
  return SHAPES_COMPOUND;
}

function buildTrials(params) {
  const lib = libraryFor(params.shapeComplexity);
  return Array.from({ length: params.shapeCount }, () => buildTrial(lib, params.mirrorChance));
}

const CELL = 22;

function ShapeView({ grid, axes }) {
  const useX = axes.includes('x');
  const useY = axes.includes('y');
  const useZ = axes.includes('z');
  const transforms = [{ perspective: 700 }];
  if (useX) transforms.push({ rotateX: `${15 + Math.random() * 20}deg` });
  if (useY) transforms.push({ rotateY: `${(Math.random() - 0.5) * 30}deg` });
  if (useZ) transforms.push({ rotateZ: '0deg' });

  return (
    <View style={[shapeStyles.shapeWrap, { transform: transforms }]}>
      {grid.map((row, ri) => (
        <View key={ri} style={shapeStyles.shapeRow}>
          {row.map((v, ci) => (
            <View
              key={ci}
              style={[
                shapeStyles.cell,
                { backgroundColor: v ? colors.text : 'transparent' },
              ]}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

const shapeStyles = StyleSheet.create({
  shapeWrap: {},
  shapeRow: {
    flexDirection: 'row',
  },
  cell: {
    width: CELL,
    height: CELL,
    margin: 1,
    borderRadius: 4,
  },
});

export default function RapidFireSpatialGame({ level, onComplete, onFailRound }) {
  const params = useMemo(() => spatialParams(level), [level]);
  const trialsRef = useRef(buildTrials(params));
  const [idx, setIdx] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [timeLeft, setTimeLeft] = useState(Math.floor((params.shapeCount * params.decisionMs) / 1000));
  const [feedback, setFeedback] = useState(null);
  const completedRef = useRef(false);
  const tickRef = useRef(null);
  const decisionRef = useRef(null);
  const correctRef = useRef(0);
  const wrongRef = useRef(0);

  const finish = (correctCount, wrongCount) => {
    if (completedRef.current) return;
    completedRef.current = true;
    if (tickRef.current) clearInterval(tickRef.current);
    if (decisionRef.current) clearTimeout(decisionRef.current);
    const score = correctCount / params.shapeCount;
    onComplete?.({
      firstTry: wrongCount === 0,
      score,
      correct: correctCount,
      wrong: wrongCount,
    });
  };

  useEffect(() => {
    tickRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(tickRef.current);
          finish(correctRef.current, wrongRef.current);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(tickRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Per-trial decision timer
  useEffect(() => {
    if (completedRef.current) return;
    if (idx >= params.shapeCount) {
      finish(correct, wrong);
      return;
    }
    if (decisionRef.current) clearTimeout(decisionRef.current);
    decisionRef.current = setTimeout(() => {
      // No answer in time = treated as wrong
      handleAnswer(null);
    }, params.decisionMs);
    return () => {
      if (decisionRef.current) clearTimeout(decisionRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx]);

  const handleAnswer = (answer) => {
    if (completedRef.current) return;
    if (idx >= params.shapeCount) return;
    const trial = trialsRef.current[idx];
    let nextCorrect = correct;
    let nextWrong = wrong;
    let ok;
    if (answer === null) {
      ok = false;
    } else {
      ok = answer === trial.isSame;
    }
    if (ok) {
      Haptics.selectionAsync();
      nextCorrect = correct + 1;
      setCorrect(nextCorrect);
      correctRef.current = nextCorrect;
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      nextWrong = wrong + 1;
      setWrong(nextWrong);
      wrongRef.current = nextWrong;
      setTimeLeft((t) => Math.max(0, t - Math.floor(params.penaltyMs / 1000)));
      onFailRound?.();
    }
    setFeedback({ ok, expected: trial.isSame });
    setTimeout(() => setFeedback(null), 250);

    const nextIdx = idx + 1;
    if (nextIdx >= params.shapeCount) {
      finish(nextCorrect, nextWrong);
    } else {
      setIdx(nextIdx);
    }
  };

  const trial = trialsRef.current[idx];
  if (!trial) return <View style={styles.root} />;

  return (
    <View style={styles.root}>
      <View style={styles.topBar}>
        <Text style={styles.progress}>{idx + 1} / {params.shapeCount}</Text>
        <Text style={[styles.timer, timeLeft <= 5 && styles.timerLow]}>{timeLeft}s</Text>
        <Text style={styles.score}>✓ {correct} ✗ {wrong}</Text>
      </View>

      <View style={styles.row}>
        <View style={[styles.shapeBox, feedback && (feedback.ok ? styles.boxOk : styles.boxBad)]}>
          <ShapeView grid={trial.a} axes={params.rotationAxes} />
        </View>
        <Text style={styles.vs}>?</Text>
        <View style={[styles.shapeBox, feedback && (feedback.ok ? styles.boxOk : styles.boxBad)]}>
          <ShapeView grid={trial.b} axes={params.rotationAxes} />
        </View>
      </View>

      <View style={styles.actions}>
        <Pressable
          onPress={() => handleAnswer(true)}
          style={({ pressed }) => [styles.btn, pressed && { opacity: 0.85 }]}
        >
          <LinearGradient
            colors={igGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <Text style={styles.btnText}>SAME</Text>
        </Pressable>
        <Pressable
          onPress={() => handleAnswer(false)}
          style={({ pressed }) => [styles.btn, styles.btnAlt, pressed && { opacity: 0.85 }]}
        >
          <Text style={[styles.btnText, styles.btnTextAlt]}>DIFFERENT</Text>
        </Pressable>
      </View>

      <Text style={styles.hint}>
        Mirrored shapes count as different. Decide fast — wrong answers lose 5 seconds.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
    alignItems: 'center',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '90%',
    marginBottom: 12,
  },
  progress: {
    ...fonts.uiBold,
    fontSize: 13,
    color: colors.text,
  },
  timer: {
    ...fonts.display,
    fontSize: 18,
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  timerLow: {
    color: colors.danger,
  },
  score: {
    ...fonts.uiSemi,
    fontSize: 12,
    color: colors.textDim,
  },
  row: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
  },
  shapeBox: {
    width: Math.min(SCREEN_W * 0.4, 160),
    height: Math.min(SCREEN_W * 0.4, 160),
    backgroundColor: colors.surface,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxOk: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
  },
  boxBad: {
    backgroundColor: 'rgba(237, 73, 86, 0.15)',
  },
  vs: {
    ...fonts.display,
    fontSize: 28,
    color: colors.textDim,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    paddingTop: 24,
    paddingBottom: 8,
  },
  btn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    overflow: 'hidden',
  },
  btnAlt: {
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: colors.text,
  },
  btnText: {
    ...fonts.uiBold,
    color: '#fff',
    fontSize: 14,
    letterSpacing: 1.5,
  },
  btnTextAlt: {
    color: colors.text,
  },
  hint: {
    ...fonts.uiMedium,
    fontSize: 11,
    color: colors.textDim,
    textAlign: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
});
