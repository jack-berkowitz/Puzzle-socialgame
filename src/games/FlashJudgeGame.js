import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, fonts } from '../theme/colors';
import { flashParams } from '../utils/difficulty';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const AREA_SIZE = Math.min(SCREEN_W - 48, 320);

const SHAPES = ['●', '■', '▲', '◆', '★', '✦', '⬟', '⬠'];
const SHAPE_COLORS = [
  colors.tile.red,
  colors.tile.blue,
  colors.tile.green,
  colors.tile.purple,
  colors.tile.orange,
  colors.tile.cyan,
];

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function buildRound(params) {
  // Pick a target shape + color
  const targetShape = pickRandom(SHAPES);
  const targetColor = pickRandom(SHAPE_COLORS);

  // Pick a peripheral marker position (one of 8 positions around the edge)
  const angle = Math.floor(Math.random() * 8) * (Math.PI / 4);
  const markerPos = {
    x: Math.cos(angle) * (AREA_SIZE * 0.38),
    y: Math.sin(angle) * (AREA_SIZE * 0.38),
  };
  const markerQuadrant = angle < Math.PI ? (angle < Math.PI / 2 ? 'TR' : 'TL') :
    (angle < Math.PI * 1.5 ? 'BL' : 'BR');

  // Decide if this is a go or no-go trial
  const isNoGo = Math.random() < params.noGoChance;

  // For no-go: show a different shape (decoy)
  let displayShape = targetShape;
  let displayColor = targetColor;
  if (isNoGo) {
    do { displayShape = pickRandom(SHAPES); } while (displayShape === targetShape);
    displayColor = pickRandom(SHAPE_COLORS);
  }

  return {
    targetShape,
    targetColor,
    displayShape,
    displayColor,
    markerPos,
    markerQuadrant,
    isNoGo,
  };
}

const PHASE = {
  fixation: 'fixation',
  flash: 'flash',
  respond: 'respond',
  feedback: 'feedback',
};

export default function FlashJudgeGame({ level, onComplete }) {
  const params = useMemo(() => flashParams(level), [level]);
  const [round, setRound] = useState(0);
  const [totalRounds] = useState(params.totalRounds);
  const [phase, setPhase] = useState(PHASE.fixation);
  const [data, setData] = useState(null);
  const [targetShape, setTargetShape] = useState(() => pickRandom(SHAPES));
  const [targetColor, setTargetColor] = useState(() => pickRandom(SHAPE_COLORS));
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [inhibitions, setInhibitions] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const [started, setStarted] = useState(true);

  const completedRef = useRef(false);
  const respondedRef = useRef(false);
  const roundTimerRef = useRef(null);
  const correctRef = useRef(0);
  const wrongRef = useRef(0);
  const inhibitionsRef = useRef(0);

  useEffect(() => { correctRef.current = correct; }, [correct]);
  useEffect(() => { wrongRef.current = wrong; }, [wrong]);
  useEffect(() => { inhibitionsRef.current = inhibitions; }, [inhibitions]);

  const finishGame = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    const c = correctRef.current;
    const w = wrongRef.current;
    const inh = inhibitionsRef.current;
    const total = c + w + inh;
    const score = total > 0 ? (c + inh) / total : 0;
    onComplete?.({ score: Math.min(1, Math.max(0, score)), correct: c, wrong: w, inhibitions: inh });
  }, [onComplete]);

  const startRound = useCallback((roundNum, tShape, tColor) => {
    if (completedRef.current) return;
    respondedRef.current = false;

    // Build round data with the current target
    const isNoGo = Math.random() < params.noGoChance;
    let displayShape = tShape;
    let displayColor = tColor;
    if (isNoGo) {
      do { displayShape = pickRandom(SHAPES); } while (displayShape === tShape);
      displayColor = pickRandom(SHAPE_COLORS);
    }
    const angle = Math.floor(Math.random() * 8) * (Math.PI / 4);
    const markerPos = {
      x: Math.cos(angle) * (AREA_SIZE * 0.38),
      y: Math.sin(angle) * (AREA_SIZE * 0.38),
    };

    const roundData = { targetShape: tShape, targetColor: tColor, displayShape, displayColor, markerPos, isNoGo };
    setData(roundData);

    // Fixation cross
    setPhase(PHASE.fixation);
    setTimeout(() => {
      if (completedRef.current) return;
      setPhase(PHASE.flash);

      // Flash duration
      setTimeout(() => {
        if (completedRef.current) return;
        setPhase(PHASE.respond);

        // Response window
        roundTimerRef.current = setTimeout(() => {
          if (completedRef.current || respondedRef.current) return;
          // Time ran out
          if (roundData.isNoGo) {
            // Correct inhibition — didn't tap on a no-go
            setInhibitions((i) => i + 1);
            showFeedback(true, 'Correct hold!');
          } else {
            // Missed a go trial
            setWrong((w) => w + 1);
            showFeedback(false, 'Too slow!');
          }
          advanceRound(roundNum, tShape, tColor);
        }, params.responseMs);
      }, params.flashMs);
    }, 500); // fixation duration
  }, [params]);

  const showFeedback = (ok, msg) => {
    setFeedback({ ok, msg });
  };

  const advanceRound = useCallback((currentRound, tShape, tColor) => {
    const next = currentRound + 1;
    if (next >= totalRounds) {
      setTimeout(finishGame, 600);
      return;
    }

    // Change target every few rounds to keep it fresh
    let nextShape = tShape;
    let nextColor = tColor;
    if (next % params.targetChangeEvery === 0) {
      nextShape = pickRandom(SHAPES);
      nextColor = pickRandom(SHAPE_COLORS);
      setTargetShape(nextShape);
      setTargetColor(nextColor);
    }

    setTimeout(() => {
      setRound(next);
      setFeedback(null);
      startRound(next, nextShape, nextColor);
    }, 700);
  }, [totalRounds, params.targetChangeEvery, finishGame]);

  // Auto-start first round
  useEffect(() => {
    startRound(0, targetShape, targetColor);
  }, []);

  const handleTap = () => {
    if (phase !== PHASE.respond && phase !== PHASE.flash) return;
    if (respondedRef.current || completedRef.current) return;
    respondedRef.current = true;
    if (roundTimerRef.current) clearTimeout(roundTimerRef.current);

    if (!data) return;

    if (data.isNoGo) {
      // Tapped on a no-go — wrong
      setWrong((w) => w + 1);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showFeedback(false, 'Should have held!');
    } else {
      // Correct go response
      setCorrect((c) => c + 1);
      Haptics.selectionAsync();
      showFeedback(true, 'Correct!');
    }
    advanceRound(round, targetShape, targetColor);
  };

  return (
    <View style={styles.root}>
      <View style={styles.topBar}>
        <Text style={styles.statTxt}>{round + (started ? 1 : 0)} / {totalRounds}</Text>
        <Text style={styles.statTxt}>
          ✓ {correct + inhibitions}  ✗ {wrong}
        </Text>
      </View>

      <Pressable style={styles.gameArea} onPress={handleTap}>
        {/* Target reminder */}
        <View style={styles.targetReminder}>
          <Text style={styles.reminderLabel}>Target: </Text>
          <Text style={[styles.reminderShape, { color: targetColor }]}>{targetShape}</Text>
        </View>

        {/* Main display area */}
        <View style={styles.arena}>
          {phase === PHASE.fixation && (
            <Text style={styles.fixation}>+</Text>
          )}

          {phase === PHASE.flash && data && (
            <>
              <Text style={[styles.flashShape, { color: data.displayColor }]}>
                {data.displayShape}
              </Text>
              {/* Peripheral marker */}
              <View style={[styles.marker, {
                transform: [{ translateX: data.markerPos.x }, { translateY: data.markerPos.y }],
              }]}>
                <Text style={styles.markerText}>◎</Text>
              </View>
            </>
          )}

          {phase === PHASE.respond && (
            <View style={styles.respondPrompt}>
              <Text style={styles.respondText}>
                {data?.isNoGo === undefined ? '' : 'TAP or HOLD'}
              </Text>
            </View>
          )}

          {feedback && (
            <View style={styles.feedbackWrap}>
              <Text style={[styles.feedbackText, feedback.ok ? styles.feedbackOk : styles.feedbackBad]}>
                {feedback.msg}
              </Text>
            </View>
          )}
        </View>

        <Text style={styles.hint}>
          Tap for matching shape — hold still for decoys
        </Text>
      </Pressable>
    </View>
  );
}

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
  statTxt: {
    ...fonts.uiBold,
    color: colors.text,
    fontSize: 13,
  },
  startArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  startTitle: {
    ...fonts.display,
    fontSize: 28,
    color: colors.text,
    marginBottom: 16,
  },
  targetPreview: {
    alignItems: 'center',
    marginBottom: 16,
  },
  previewLabel: {
    ...fonts.uiMedium,
    fontSize: 13,
    color: colors.textDim,
    marginBottom: 8,
  },
  previewShape: {
    fontSize: 56,
  },
  startDesc: {
    ...fonts.uiMedium,
    fontSize: 14,
    color: colors.textDim,
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 20,
  },
  startBtn: {
    marginTop: 24,
    backgroundColor: colors.accent,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 999,
  },
  startBtnTxt: {
    ...fonts.uiBold,
    color: '#fff',
    fontSize: 14,
    letterSpacing: 1.5,
  },
  gameArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  targetReminder: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
  },
  reminderLabel: {
    ...fonts.uiMedium,
    fontSize: 12,
    color: colors.textDim,
  },
  reminderShape: {
    fontSize: 20,
  },
  arena: {
    width: AREA_SIZE,
    height: AREA_SIZE,
    borderRadius: 24,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  fixation: {
    ...fonts.display,
    fontSize: 40,
    color: colors.textDim,
  },
  flashShape: {
    fontSize: 72,
  },
  marker: {
    position: 'absolute',
  },
  markerText: {
    fontSize: 24,
    color: colors.textDim,
  },
  respondPrompt: {
    alignItems: 'center',
  },
  respondText: {
    ...fonts.uiBold,
    fontSize: 18,
    color: colors.textDim,
    letterSpacing: 1,
  },
  feedbackWrap: {
    position: 'absolute',
    bottom: 24,
  },
  feedbackText: {
    ...fonts.uiBold,
    fontSize: 16,
    letterSpacing: 0.5,
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
    textAlign: 'center',
    paddingHorizontal: 24,
  },
});
