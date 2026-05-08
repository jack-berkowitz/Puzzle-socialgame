import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { colors, fonts, igGradient } from '../theme/colors';
import { memoryParams } from '../utils/difficulty';

const PHASE = {
  dual: 'dual',
  recall: 'recall',
};

function randInt(max, min = 1) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function buildSequence(length) {
  return Array.from({ length }, () => randInt(9, 0));
}

function buildMathQuestion(op) {
  if (op === 'add') {
    const a = randInt(20);
    const b = randInt(20);
    const truth = a + b;
    const shown = Math.random() < 0.5 ? truth : truth + (Math.random() < 0.5 ? 1 : -1) * randInt(4);
    return { text: `${a} + ${b} = ${shown}`, answer: shown === truth };
  }
  if (op === 'mul') {
    const a = randInt(12);
    const b = randInt(12);
    const truth = a * b;
    const shown = Math.random() < 0.5 ? truth : truth + (Math.random() < 0.5 ? 1 : -1) * randInt(6);
    return { text: `${a} × ${b} = ${shown}`, answer: shown === truth };
  }
  // multi-step
  const a = randInt(15);
  const b = randInt(8);
  const c = randInt(12);
  const truth = a + b * c;
  const shown = Math.random() < 0.5 ? truth : truth + (Math.random() < 0.5 ? 1 : -1) * randInt(8);
  return { text: `${a} + ${b} × ${c} = ${shown}`, answer: shown === truth };
}

export default function MemoryOverloadGame({ level, onComplete, onFailRound }) {
  const params = useMemo(() => memoryParams(level), [level]);
  const [sequence] = useState(() => buildSequence(params.sequenceLength));
  const [seqIndex, setSeqIndex] = useState(0);
  const [activeNumber, setActiveNumber] = useState(null);
  const [phase, setPhase] = useState(PHASE.dual);
  const [mathQ, setMathQ] = useState(() => buildMathQuestion(params.mathOp));
  const [mathCorrect, setMathCorrect] = useState(0);
  const [mathTotal, setMathTotal] = useState(0);
  const [timeLeft, setTimeLeft] = useState(Math.floor(params.durationMs / 1000));
  const [recall, setRecall] = useState('');
  const completedRef = useRef(false);
  const seqIntervalRef = useRef(null);
  const tickRef = useRef(null);

  // Number flash sequence (top half)
  useEffect(() => {
    let i = 0;
    const flash = () => {
      setActiveNumber(sequence[i % sequence.length]);
      setSeqIndex(i % sequence.length);
      i++;
    };
    flash();
    seqIntervalRef.current = setInterval(flash, params.sequenceFlashMs);
    return () => clearInterval(seqIntervalRef.current);
  }, [sequence, params.sequenceFlashMs]);

  // Countdown
  useEffect(() => {
    tickRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(tickRef.current);
          clearInterval(seqIntervalRef.current);
          setActiveNumber(null);
          setPhase(PHASE.recall);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(tickRef.current);
  }, []);

  const handleTrue = () => answerMath(true);
  const handleFalse = () => answerMath(false);

  const answerMath = (val) => {
    if (phase !== PHASE.dual) return;
    const ok = val === mathQ.answer;
    setMathTotal((t) => t + 1);
    if (ok) {
      Haptics.selectionAsync();
      setMathCorrect((c) => c + 1);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      onFailRound?.();
    }
    setMathQ(buildMathQuestion(params.mathOp));
  };

  const submitRecall = () => {
    if (completedRef.current) return;
    completedRef.current = true;
    const recallDigits = recall.replace(/\D/g, '').split('').map((d) => parseInt(d, 10));
    let correctDigits = 0;
    for (let i = 0; i < sequence.length; i++) {
      if (recallDigits[i] === sequence[i]) correctDigits++;
    }
    const seqAccuracy = correctDigits / sequence.length;
    const mathAccuracy = mathTotal === 0 ? 0 : mathCorrect / mathTotal;
    // weighted score: half from each task, with min math attempts threshold
    const mathBonus = mathTotal >= 5 ? mathAccuracy : mathAccuracy * (mathTotal / 5);
    const score = seqAccuracy * 0.55 + mathBonus * 0.45;
    onComplete?.({
      firstTry: seqAccuracy === 1 && mathAccuracy >= 0.9,
      score,
      sequenceAccuracy: seqAccuracy,
      mathCorrect,
      mathTotal,
    });
  };

  if (phase === PHASE.recall) {
    return (
      <View style={styles.root}>
        <Text style={styles.recallTitle}>Type the sequence</Text>
        <Text style={styles.recallSub}>{params.sequenceLength} digits — order matters</Text>
        <TextInput
          value={recall}
          onChangeText={setRecall}
          keyboardType="number-pad"
          maxLength={params.sequenceLength}
          autoFocus
          style={styles.recallInput}
          placeholder={'•'.repeat(params.sequenceLength)}
          placeholderTextColor={colors.textMuted}
        />
        <Pressable
          onPress={submitRecall}
          style={({ pressed }) => [styles.submitBtn, pressed && { opacity: 0.85 }]}
        >
          <LinearGradient
            colors={igGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <Text style={styles.submitText}>Submit</Text>
        </Pressable>
        <Text style={styles.note}>
          Math task: {mathCorrect} / {mathTotal} correct
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.timer}>
        <Text style={styles.timerLabel}>TIME LEFT</Text>
        <Text style={styles.timerValue}>{timeLeft}s</Text>
      </View>

      <View style={styles.topHalf}>
        <Text style={styles.taskLabel}>Memorize the sequence</Text>
        <View style={styles.numberCard}>
          <Text style={styles.numberDisplay}>{activeNumber ?? '–'}</Text>
        </View>
        <View style={styles.dotRow}>
          {Array.from({ length: params.sequenceLength }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === seqIndex && styles.dotActive,
              ]}
            />
          ))}
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.bottomHalf}>
        <Text style={styles.taskLabel}>True or false?</Text>
        <View style={styles.mathBox}>
          <Text style={styles.mathText}>{mathQ.text}</Text>
        </View>
        <View style={styles.tfRow}>
          <Pressable onPress={handleTrue} style={({ pressed }) => [styles.tfBtn, pressed && styles.tfPressed]}>
            <Text style={styles.tfText}>True</Text>
          </Pressable>
          <Pressable onPress={handleFalse} style={({ pressed }) => [styles.tfBtn, styles.tfBtnAlt, pressed && styles.tfPressed]}>
            <Text style={[styles.tfText, styles.tfTextAlt]}>False</Text>
          </Pressable>
        </View>
        <Text style={styles.mathScore}>Math: {mathCorrect} / {mathTotal}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  timer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 8,
  },
  timerLabel: {
    ...fonts.uiSemi,
    fontSize: 10,
    color: colors.textDim,
    letterSpacing: 1.5,
  },
  timerValue: {
    ...fonts.uiBold,
    fontSize: 16,
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  topHalf: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskLabel: {
    ...fonts.uiSemi,
    fontSize: 11,
    color: colors.textDim,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  numberCard: {
    width: 140,
    height: 140,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  numberDisplay: {
    ...fonts.display,
    fontSize: 80,
    color: colors.text,
  },
  dotRow: {
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.divider,
  },
  dotActive: {
    backgroundColor: colors.accent,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.divider,
    marginVertical: 8,
  },
  bottomHalf: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mathBox: {
    paddingHorizontal: 22,
    paddingVertical: 14,
    backgroundColor: colors.surface,
    borderRadius: 14,
    marginBottom: 14,
  },
  mathText: {
    ...fonts.display,
    fontSize: 26,
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  tfRow: {
    flexDirection: 'row',
    gap: 12,
  },
  tfBtn: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: colors.success,
    minWidth: 110,
    alignItems: 'center',
  },
  tfBtnAlt: {
    backgroundColor: colors.danger,
  },
  tfPressed: {
    opacity: 0.85,
  },
  tfText: {
    ...fonts.uiBold,
    color: '#fff',
    fontSize: 14,
    letterSpacing: 0.5,
  },
  tfTextAlt: {},
  mathScore: {
    ...fonts.uiMedium,
    color: colors.textDim,
    fontSize: 12,
    marginTop: 10,
  },
  recallTitle: {
    ...fonts.display,
    fontSize: 24,
    color: colors.text,
    textAlign: 'center',
    marginTop: 32,
    marginBottom: 4,
  },
  recallSub: {
    ...fonts.uiMedium,
    fontSize: 13,
    color: colors.textDim,
    textAlign: 'center',
    marginBottom: 20,
  },
  recallInput: {
    ...fonts.display,
    fontSize: 36,
    color: colors.text,
    backgroundColor: colors.surface,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
    letterSpacing: 6,
    marginHorizontal: 24,
  },
  submitBtn: {
    marginTop: 16,
    marginHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    overflow: 'hidden',
  },
  submitText: {
    ...fonts.uiBold,
    color: '#fff',
    fontSize: 14,
    letterSpacing: 0.5,
  },
  note: {
    ...fonts.uiMedium,
    color: colors.textDim,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 16,
  },
});
