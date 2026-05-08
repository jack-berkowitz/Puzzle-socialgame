import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, fonts } from '../theme/colors';
import { sequenceParams } from '../utils/difficulty';

const { width: SCREEN_W } = Dimensions.get('window');
const CELL_SIZE = Math.min(SCREEN_W * 0.22, 90);

export default function SequenceSpotterGame({ level, onComplete }) {
  const params = useMemo(() => sequenceParams(level), [level]);
  const [digits, setDigits] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [hits, setHits] = useState(0);
  const [misses, setMisses] = useState(0);
  const [falseAlarms, setFalseAlarms] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const [timeLeft, setTimeLeft] = useState(params.durationMs);
  const [started, setStarted] = useState(true);

  const completedRef = useRef(false);
  const seqRef = useRef([]);
  const idxRef = useRef(0);
  const feedbackTimer = useRef(null);

  // Generate the full digit stream on mount
  useEffect(() => {
    const stream = [];
    const seqLen = params.sequenceLength;
    let placed = 0;
    const totalDigits = params.totalDigits;
    // Place sequences at random intervals
    const sequencePositions = new Set();
    const targetCount = params.targetCount;

    // First, fill with random digits
    for (let i = 0; i < totalDigits; i++) {
      stream.push(Math.floor(Math.random() * 8) + 2); // 2-9
    }

    // Now plant ascending sequences at spaced intervals
    const spacing = Math.floor(totalDigits / (targetCount + 1));
    for (let t = 0; t < targetCount; t++) {
      const base = spacing * (t + 1) - Math.floor(seqLen / 2) + Math.floor(Math.random() * 4 - 2);
      const pos = Math.max(0, Math.min(totalDigits - seqLen, base));
      const startDigit = Math.floor(Math.random() * (10 - seqLen - 1)) + 1; // ensure fits 1-9
      for (let j = 0; j < seqLen; j++) {
        stream[pos + j] = startDigit + j;
        sequencePositions.add(pos + j);
      }
      // Mark the last digit of the sequence as the "hit" position
    }

    // Build target map: for each digit, is it the END of an ascending sequence?
    const targets = new Array(totalDigits).fill(false);
    for (let i = seqLen - 1; i < totalDigits; i++) {
      let isSeq = true;
      for (let j = 1; j < seqLen; j++) {
        if (stream[i - seqLen + 1 + j] !== stream[i - seqLen + 1] + j) {
          isSeq = false;
          break;
        }
      }
      targets[i] = isSeq;
    }

    seqRef.current = { stream, targets };
    setDigits(stream);
  }, [params]);

  // Countdown timer
  useEffect(() => {
    if (!started) return;
    const id = setInterval(() => {
      setTimeLeft((t) => {
        const next = t - 100;
        if (next <= 0) {
          clearInterval(id);
          finishGame();
          return 0;
        }
        return next;
      });
    }, 100);
    return () => clearInterval(id);
  }, [started]);

  // Advance digits at the configured rate
  useEffect(() => {
    if (!started) return;
    const id = setInterval(() => {
      setCurrentIdx((prev) => {
        const next = prev + 1;
        if (next >= digits.length) {
          clearInterval(id);
          return prev;
        }
        // Check if the previous digit was a target end and was missed
        if (prev >= params.sequenceLength - 1 && seqRef.current.targets[prev]) {
          // A target just passed without being tapped — it'll be counted as a miss
          // only if it hasn't been hit already (handled by tap logic)
        }
        return next;
      });
    }, params.flashMs);
    return () => clearInterval(id);
  }, [started, digits.length, params.flashMs]);

  const finishGame = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;

    const h = hitsRef.current;
    const m = missesRef.current;
    const fa = falseAlarmsRef.current;
    const total = h + m;
    const score = total > 0 ? Math.max(0, (h - fa * 0.5) / total) : 0;

    onComplete?.({ score: Math.min(1, Math.max(0, score)), hits: h, misses: m, falseAlarms: fa });
  }, [onComplete]);

  // Keep refs in sync for the finish callback
  const hitsRef = useRef(0);
  const missesRef = useRef(0);
  const falseAlarmsRef = useRef(0);
  useEffect(() => { hitsRef.current = hits; }, [hits]);
  useEffect(() => { missesRef.current = misses; }, [misses]);
  useEffect(() => { falseAlarmsRef.current = falseAlarms; }, [falseAlarms]);

  // Count missed targets as they pass
  const lastCheckedRef = useRef(-1);
  useEffect(() => {
    if (currentIdx <= lastCheckedRef.current) return;
    // Check if any target between last checked and current-1 was missed
    for (let i = lastCheckedRef.current + 1; i < currentIdx; i++) {
      if (seqRef.current.targets && seqRef.current.targets[i] && !tappedTargets.current.has(i)) {
        setMisses((m) => m + 1);
      }
    }
    lastCheckedRef.current = currentIdx - 1;
  }, [currentIdx]);

  const tappedTargets = useRef(new Set());

  const handleTap = () => {
    if (completedRef.current) return;

    // Check if current digit is at the end of a sequence (or within window)
    const idx = currentIdx;
    const targets = seqRef.current.targets;
    if (!targets) return;

    // Allow a small window: current or previous digit
    let hitIdx = -1;
    for (let offset = 0; offset <= 1; offset++) {
      const check = idx - offset;
      if (check >= 0 && targets[check] && !tappedTargets.current.has(check)) {
        hitIdx = check;
        break;
      }
    }

    if (hitIdx >= 0) {
      tappedTargets.current.add(hitIdx);
      setHits((h) => h + 1);
      Haptics.selectionAsync();
      showFeedback(true);
    } else {
      setFalseAlarms((f) => f + 1);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showFeedback(false);
    }
  };

  const showFeedback = (ok) => {
    setFeedback(ok ? 'hit' : 'miss');
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    feedbackTimer.current = setTimeout(() => setFeedback(null), 400);
  };

  // Auto-finish when stream ends
  useEffect(() => {
    if (started && currentIdx >= digits.length - 1 && digits.length > 0) {
      const id = setTimeout(finishGame, 800);
      return () => clearTimeout(id);
    }
  }, [currentIdx, digits.length, started, finishGame]);

  const seqLen = params.sequenceLength;
  const seqExample = Array.from({ length: seqLen }, (_, i) => i + 3).join('-');

  const displayDigit = started && currentIdx >= 0 && currentIdx < digits.length ? digits[currentIdx] : null;

  // Show recent digits as trail
  const trailCount = params.sequenceLength;
  const trail = [];
  if (started) {
    for (let i = Math.max(0, currentIdx - trailCount + 1); i <= currentIdx && i < digits.length; i++) {
      trail.push({ digit: digits[i], idx: i, isCurrent: i === currentIdx });
    }
  }

  const progressPct = digits.length > 0 ? ((currentIdx + 1) / digits.length) * 100 : 0;
  const timeLeftSec = Math.ceil(timeLeft / 1000);

  return (
    <View style={styles.root}>
      <View style={styles.topBar}>
        <Text style={styles.statTxt}>Hits: {hits}</Text>
        <Text style={styles.statTxt}>{timeLeftSec}s</Text>
        <Text style={styles.statTxt}>False: {falseAlarms}</Text>
      </View>

      {/* Progress bar */}
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${Math.min(100, progressPct)}%` }]} />
      </View>

      <Pressable style={styles.gameArea} onPress={handleTap}>
        {/* Digit trail */}
        <View style={styles.trailRow}>
          {trail.map((t, i) => (
            <View
              key={t.idx}
              style={[
                styles.trailCell,
                t.isCurrent && styles.trailCellCurrent,
                !t.isCurrent && { opacity: 0.3 + (i / trail.length) * 0.4 },
              ]}
            >
              <Text style={[styles.trailDigit, t.isCurrent && styles.trailDigitCurrent]}>
                {t.digit}
              </Text>
            </View>
          ))}
        </View>

        {/* Main digit display */}
        <View style={[
          styles.digitWrap,
          feedback === 'hit' && styles.digitWrapHit,
          feedback === 'miss' && styles.digitWrapMiss,
        ]}>
          <Text style={styles.bigDigit}>{displayDigit}</Text>
        </View>

        {/* Feedback */}
        {feedback && (
          <Text style={[styles.feedbackTxt, feedback === 'hit' ? styles.feedbackHit : styles.feedbackMiss]}>
            {feedback === 'hit' ? 'SEQUENCE!' : 'NOT YET'}
          </Text>
        )}

        <Text style={styles.tapHint}>Tap anywhere when you spot the sequence</Text>
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
    marginBottom: 8,
  },
  statTxt: {
    ...fonts.uiBold,
    color: colors.text,
    fontSize: 13,
  },
  progressBar: {
    width: '90%',
    height: 4,
    backgroundColor: colors.surface,
    borderRadius: 2,
    marginBottom: 16,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.accent,
    borderRadius: 2,
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
  trailRow: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 6,
  },
  trailCell: {
    width: CELL_SIZE * 0.6,
    height: CELL_SIZE * 0.6,
    borderRadius: 12,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trailCellCurrent: {
    backgroundColor: colors.accentSoft,
  },
  trailDigit: {
    ...fonts.uiBold,
    fontSize: 20,
    color: colors.textDim,
  },
  trailDigitCurrent: {
    color: colors.accent,
  },
  digitWrap: {
    width: CELL_SIZE * 1.8,
    height: CELL_SIZE * 1.8,
    borderRadius: CELL_SIZE * 0.9,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.border,
  },
  digitWrapHit: {
    borderColor: colors.success,
    backgroundColor: 'rgba(34, 197, 94, 0.08)',
  },
  digitWrapMiss: {
    borderColor: colors.danger,
    backgroundColor: 'rgba(237, 73, 86, 0.08)',
  },
  bigDigit: {
    ...fonts.display,
    fontSize: 64,
    color: colors.text,
  },
  feedbackTxt: {
    ...fonts.uiBold,
    fontSize: 16,
    marginTop: 16,
    letterSpacing: 1,
  },
  feedbackHit: {
    color: colors.success,
  },
  feedbackMiss: {
    color: colors.danger,
  },
  tapHint: {
    ...fonts.uiMedium,
    fontSize: 12,
    color: colors.textDim,
    marginTop: 24,
  },
});
