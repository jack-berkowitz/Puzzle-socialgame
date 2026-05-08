import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native';
import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech';
import { colors, fonts } from '../theme/colors';
import { nbackParams } from '../utils/difficulty';

const { width: SCREEN_W } = Dimensions.get('window');
const GRID_SIZE = Math.min(SCREEN_W - 80, 280);
const CELL = GRID_SIZE / 3;

const LETTERS = ['B', 'D', 'G', 'K', 'P', 'R', 'S', 'T'];

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateSequence(length, n, matchChance) {
  const positions = []; // 0-8 grid positions
  const letters = [];

  for (let i = 0; i < length; i++) {
    if (i >= n && Math.random() < matchChance) {
      // Position match
      if (Math.random() < 0.5) {
        positions.push(positions[i - n]);
      } else {
        positions.push(Math.floor(Math.random() * 9));
      }
    } else {
      positions.push(Math.floor(Math.random() * 9));
    }

    if (i >= n && Math.random() < matchChance) {
      // Letter match
      if (Math.random() < 0.5) {
        letters.push(letters[i - n]);
      } else {
        letters.push(pickRandom(LETTERS));
      }
    } else {
      letters.push(pickRandom(LETTERS));
    }
  }

  // Compute actual matches
  const posMatches = positions.map((p, i) => i >= n && p === positions[i - n]);
  const letterMatches = letters.map((l, i) => i >= n && l === letters[i - n]);

  return { positions, letters, posMatches, letterMatches };
}

export default function DualNBackGame({ level, onComplete }) {
  const params = useMemo(() => nbackParams(level), [level]);
  const [started, setStarted] = useState(true);
  const [nLevel, setNLevel] = useState(params.startN);
  const [step, setStep] = useState(-1);
  const [activePos, setActivePos] = useState(-1);
  const [activeLetter, setActiveLetter] = useState('');
  const [posPressed, setPosPressed] = useState(false);
  const [letterPressed, setLetterPressed] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [hits, setHits] = useState(0);
  const [misses, setMisses] = useState(0);
  const [falseAlarms, setFalseAlarms] = useState(0);
  const [streak, setStreak] = useState(0);

  const seqRef = useRef(null);
  const completedRef = useRef(false);
  const stepRef = useRef(-1);
  const hitsRef = useRef(0);
  const missesRef = useRef(0);
  const falseAlarmsRef = useRef(0);
  const streakRef = useRef(0);
  const nLevelRef = useRef(params.startN);

  useEffect(() => { hitsRef.current = hits; }, [hits]);
  useEffect(() => { missesRef.current = misses; }, [misses]);
  useEffect(() => { falseAlarmsRef.current = falseAlarms; }, [falseAlarms]);
  useEffect(() => { streakRef.current = streak; }, [streak]);
  useEffect(() => { nLevelRef.current = nLevel; }, [nLevel]);

  const initSequence = useCallback((n) => {
    const seq = generateSequence(params.totalTrials, n, params.matchChance);
    seqRef.current = seq;
  }, [params]);

  const finishGame = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    Speech.stop();

    const h = hitsRef.current;
    const m = missesRef.current;
    const fa = falseAlarmsRef.current;
    const total = h + m + fa;
    const possible = h + m;
    const score = possible > 0 ? Math.max(0, (h - fa * 0.5) / possible) : 0;

    onComplete?.({
      score: Math.min(1, Math.max(0, score)),
      hits: h,
      misses: m,
      falseAlarms: fa,
      nLevel: nLevelRef.current,
    });
  }, [onComplete]);

  // Main game loop
  useEffect(() => {
    if (!started || !seqRef.current) return;

    const seq = seqRef.current;
    let currentStep = 0;

    const advance = () => {
      if (completedRef.current) return;

      // Evaluate previous step responses (if not first step)
      if (currentStep > 0) {
        const prevStep = currentStep - 1;
        const wasPosMatch = seq.posMatches[prevStep];
        const wasLetterMatch = seq.letterMatches[prevStep];
        // Results checked in button handlers
      }

      if (currentStep >= seq.positions.length) {
        finishGame();
        return;
      }

      stepRef.current = currentStep;
      setStep(currentStep);
      setActivePos(seq.positions[currentStep]);
      setActiveLetter(seq.letters[currentStep]);
      setPosPressed(false);
      setLetterPressed(false);
      setFeedback(null);

      // Speak the letter
      try {
        Speech.speak(seq.letters[currentStep], {
          language: 'en',
          rate: 0.9,
          pitch: 1.0,
        });
      } catch (e) {}

      currentStep++;
    };

    advance();
    const id = setInterval(advance, params.intervalMs);
    return () => clearInterval(id);
  }, [started, params.intervalMs, finishGame]);

  // Evaluate when step changes (for the PREVIOUS step)
  const prevStepEval = useRef({ step: -1, posP: false, letP: false });
  useEffect(() => {
    if (step <= 0 || !seqRef.current) return;
    const prev = step - 1;
    if (prev === prevStepEval.current.step) return;

    const seq = seqRef.current;
    const wasPosMatch = seq.posMatches[prev];
    const wasLetterMatch = seq.letterMatches[prev];
    const didPressPos = prevStepEval.current.posP;
    const didPressLetter = prevStepEval.current.letP;

    let stepHits = 0;
    let stepMisses = 0;
    let stepFA = 0;

    if (wasPosMatch && didPressPos) stepHits++;
    if (wasPosMatch && !didPressPos) stepMisses++;
    if (!wasPosMatch && didPressPos) stepFA++;

    if (wasLetterMatch && didPressLetter) stepHits++;
    if (wasLetterMatch && !didPressLetter) stepMisses++;
    if (!wasLetterMatch && didPressLetter) stepFA++;

    if (stepHits > 0) setHits((h) => h + stepHits);
    if (stepMisses > 0) setMisses((m) => m + stepMisses);
    if (stepFA > 0) setFalseAlarms((f) => f + stepFA);

    if (stepFA === 0 && stepMisses === 0) {
      setStreak((s) => s + 1);
    } else {
      setStreak(0);
    }

    prevStepEval.current = { step, posP: false, letP: false };
  }, [step]);

  // Sync button presses into the eval ref
  useEffect(() => {
    prevStepEval.current.posP = posPressed;
  }, [posPressed]);
  useEffect(() => {
    prevStepEval.current.letP = letterPressed;
  }, [letterPressed]);

  // N-level adaptation: promote/demote based on streak
  useEffect(() => {
    if (streak >= params.promoteAfter && nLevel < params.maxN) {
      const newN = nLevel + 1;
      setNLevel(newN);
      nLevelRef.current = newN;
      setStreak(0);
      initSequence(newN);
    }
  }, [streak, nLevel, params.promoteAfter, params.maxN, initSequence]);

  const handlePosPress = () => {
    if (!started || completedRef.current || posPressed) return;
    setPosPressed(true);
    prevStepEval.current.posP = true;
    Haptics.selectionAsync();
  };

  const handleLetterPress = () => {
    if (!started || completedRef.current || letterPressed) return;
    setLetterPressed(true);
    prevStepEval.current.letP = true;
    Haptics.selectionAsync();
  };

  // Auto-start on mount
  useEffect(() => {
    initSequence(params.startN);
    prevStepEval.current = { step: 0, posP: false, letP: false };
  }, []);

  const gridCells = Array.from({ length: 9 }, (_, i) => i);

  return (
    <View style={styles.root}>
      <View style={styles.topBar}>
        <Text style={styles.statTxt}>{step + 1} / {params.totalTrials}</Text>
        <Text style={[styles.nLabel, nLevel > params.startN && styles.nLabelUp]}>
          {nLevel}-Back
        </Text>
        <Text style={styles.statTxt}>✓ {hits}  ✗ {misses}</Text>
      </View>

      <View style={styles.gameArea}>
        {/* Letter display */}
        <View style={styles.letterDisplay}>
          <Text style={styles.currentLetter}>{activeLetter}</Text>
        </View>

        {/* Grid */}
        <View style={styles.grid}>
          {gridCells.map((i) => {
            const row = Math.floor(i / 3);
            const col = i % 3;
            const isActive = i === activePos;
            return (
              <View
                key={i}
                style={[
                  styles.cell,
                  {
                    left: col * CELL + 2,
                    top: row * CELL + 2,
                    width: CELL - 4,
                    height: CELL - 4,
                  },
                  isActive && styles.cellActive,
                ]}
              />
            );
          })}
        </View>

        {/* Response buttons */}
        <View style={styles.buttonRow}>
          <Pressable
            style={[styles.responseBtn, posPressed && styles.responseBtnPressed]}
            onPress={handlePosPress}
          >
            <Text style={[styles.responseBtnTxt, posPressed && styles.responseBtnTxtPressed]}>
              POSITION
            </Text>
            <Text style={styles.responseBtnSub}>
              Same square as {nLevel} ago
            </Text>
          </Pressable>

          <Pressable
            style={[styles.responseBtn, letterPressed && styles.responseBtnPressed]}
            onPress={handleLetterPress}
          >
            <Text style={[styles.responseBtnTxt, letterPressed && styles.responseBtnTxtPressed]}>
              SOUND
            </Text>
            <Text style={styles.responseBtnSub}>
              Same letter as {nLevel} ago
            </Text>
          </Pressable>
        </View>

        {streak >= 3 && (
          <Text style={styles.streakTxt}>Streak: {streak}</Text>
        )}
      </View>
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
  nLabel: {
    ...fonts.uiBold,
    fontSize: 15,
    color: colors.accent,
    backgroundColor: colors.accentSoft,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: 'hidden',
  },
  nLabelUp: {
    color: colors.success,
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
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
  letterDisplay: {
    marginBottom: 16,
    backgroundColor: colors.surface,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentLetter: {
    ...fonts.display,
    fontSize: 28,
    color: colors.text,
  },
  grid: {
    width: GRID_SIZE,
    height: GRID_SIZE,
    backgroundColor: colors.surface,
    borderRadius: 16,
    position: 'relative',
  },
  cell: {
    position: 'absolute',
    borderRadius: 10,
    backgroundColor: colors.borderSoft,
  },
  cellActive: {
    backgroundColor: colors.accent,
  },
  buttonRow: {
    flexDirection: 'row',
    marginTop: 24,
    gap: 12,
  },
  responseBtn: {
    flex: 1,
    maxWidth: 160,
    backgroundColor: colors.surface,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border,
  },
  responseBtnPressed: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  responseBtnTxt: {
    ...fonts.uiBold,
    fontSize: 14,
    color: colors.text,
    letterSpacing: 0.5,
  },
  responseBtnTxtPressed: {
    color: colors.accent,
  },
  responseBtnSub: {
    ...fonts.uiMedium,
    fontSize: 10,
    color: colors.textDim,
    marginTop: 2,
  },
  streakTxt: {
    ...fonts.uiBold,
    fontSize: 13,
    color: colors.success,
    marginTop: 12,
  },
});
