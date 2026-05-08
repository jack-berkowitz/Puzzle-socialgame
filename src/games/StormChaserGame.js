import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, fonts } from '../theme/colors';
import { stormParams } from '../utils/difficulty';

const { width: SCREEN_W } = Dimensions.get('window');
const FIELD_W = Math.min(SCREEN_W - 24, 360);
const FIELD_H = 420;
const CLOUD_W = 72;
const CLOUD_H = 50;

const PALETTE = ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'pink'];

function makeCloud(id, paletteIdx, params) {
  const angle = Math.random() * Math.PI * 2;
  const speed = params.speed * (0.7 + Math.random() * 0.6);
  return {
    id,
    color: PALETTE[paletteIdx % PALETTE.length],
    paletteIdx,
    number: Math.floor(Math.random() * 9) + 1,
    x: Math.random() * (FIELD_W - CLOUD_W),
    y: Math.random() * (FIELD_H - CLOUD_H),
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    fading: false,
  };
}

const QUESTION_TYPES = ['highest', 'lowest', 'sum_above_5'];

function pickQuestion(clouds) {
  const t = QUESTION_TYPES[Math.floor(Math.random() * QUESTION_TYPES.length)];
  if (t === 'highest') {
    const max = Math.max(...clouds.map((c) => c.number));
    const cands = clouds.filter((c) => c.number === max).map((c) => c.id);
    return { type: t, prompt: 'Tap the highest', validIds: cands };
  }
  if (t === 'lowest') {
    const min = Math.min(...clouds.map((c) => c.number));
    const cands = clouds.filter((c) => c.number === min).map((c) => c.id);
    return { type: t, prompt: 'Tap the lowest', validIds: cands };
  }
  if (t === 'sum_above_5') {
    const candCloud = clouds[Math.floor(Math.random() * clouds.length)];
    if (!candCloud) return { type: 'highest', prompt: 'Tap the highest', validIds: [] };
    return {
      type: t,
      prompt: `Tap the ${candCloud.color} cloud`,
      validIds: clouds.filter((c) => c.color === candCloud.color).map((c) => c.id),
    };
  }
  return { type: 'highest', prompt: 'Tap the highest', validIds: [] };
}

export default function StormChaserGame({ level, onComplete, onFailRound }) {
  const params = useMemo(() => stormParams(level), [level]);
  const [clouds, setClouds] = useState(() =>
    Array.from({ length: params.cloudCount }, (_, i) => makeCloud(i + 1, i, params))
  );
  const [question, setQuestion] = useState(null);
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [missed, setMissed] = useState(0);
  const [timeLeft, setTimeLeft] = useState(Math.floor(params.durationMs / 1000));
  const [feedback, setFeedback] = useState(null);
  const completedRef = useRef(false);
  const cloudIdRef = useRef(params.cloudCount + 1);

  const moveTickRef = useRef(null);
  const numberTickRef = useRef(null);
  const questionTickRef = useRef(null);
  const splitTickRef = useRef(null);
  const countdownRef = useRef(null);

  const cloudsRef = useRef(clouds);
  cloudsRef.current = clouds;
  const questionRef = useRef(null);
  questionRef.current = question;

  const correctRef = useRef(0);
  const wrongRef = useRef(0);
  const missedRef = useRef(0);

  const finish = () => {
    if (completedRef.current) return;
    completedRef.current = true;
    [moveTickRef, numberTickRef, questionTickRef, splitTickRef, countdownRef].forEach(
      (r) => r.current && clearInterval(r.current)
    );
    const c = correctRef.current;
    const w = wrongRef.current;
    const m = missedRef.current;
    const total = c + w + m;
    const score = total === 0 ? 0 : c / Math.max(total, 1);
    onComplete?.({
      firstTry: w === 0 && m === 0,
      score,
      correct: c,
      wrong: w,
      missed: m,
    });
  };

  useEffect(() => {
    moveTickRef.current = setInterval(() => {
      setClouds((prev) =>
        prev.map((c) => {
          let { x, y, vx, vy } = c;
          x += vx;
          y += vy;
          if (x < 0) {
            x = 0;
            vx = -vx;
          }
          if (x > FIELD_W - CLOUD_W) {
            x = FIELD_W - CLOUD_W;
            vx = -vx;
          }
          if (y < 0) {
            y = 0;
            vy = -vy;
          }
          if (y > FIELD_H - CLOUD_H) {
            y = FIELD_H - CLOUD_H;
            vy = -vy;
          }
          return { ...c, x, y, vx, vy };
        })
      );
    }, 80);
    return () => clearInterval(moveTickRef.current);
  }, []);

  useEffect(() => {
    numberTickRef.current = setInterval(() => {
      setClouds((prev) =>
        prev.map((c) => ({ ...c, number: Math.floor(Math.random() * 9) + 1 }))
      );
    }, params.numberChangeMs);
    return () => clearInterval(numberTickRef.current);
  }, [params.numberChangeMs]);

  useEffect(() => {
    const ask = () => {
      // If a previous question is still active, mark missed
      if (questionRef.current) {
        missedRef.current += 1;
        setMissed(missedRef.current);
      }
      const q = pickQuestion(cloudsRef.current);
      setQuestion(q);
    };
    ask();
    questionTickRef.current = setInterval(ask, params.questionEveryMs);
    return () => clearInterval(questionTickRef.current);
  }, [params.questionEveryMs]);

  useEffect(() => {
    if (!params.splits) return;
    splitTickRef.current = setInterval(() => {
      setClouds((prev) => {
        if (prev.length >= params.cloudCount + 2) return prev;
        if (Math.random() > params.splitChance) return prev;
        const i = Math.floor(Math.random() * prev.length);
        const parent = prev[i];
        const newId = cloudIdRef.current++;
        const angle = Math.random() * Math.PI * 2;
        const child = {
          ...parent,
          id: newId,
          x: Math.min(FIELD_W - CLOUD_W, parent.x + 30),
          y: parent.y,
          vx: Math.cos(angle) * params.speed,
          vy: Math.sin(angle) * params.speed,
          number: Math.floor(Math.random() * 9) + 1,
        };
        return [...prev, child];
      });
    }, 5000);
    return () => clearInterval(splitTickRef.current);
  }, [params.splits, params.splitChance, params.speed, params.cloudCount]);

  useEffect(() => {
    countdownRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(countdownRef.current);
          finish();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(countdownRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCloudTap = (cloudId) => {
    if (!question) return;
    if (feedback) return;
    const ok = question.validIds.includes(cloudId);
    if (ok) {
      Haptics.selectionAsync();
      correctRef.current += 1;
      setCorrect(correctRef.current);
      setFeedback({ ok: true, cloudId });
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      wrongRef.current += 1;
      setWrong(wrongRef.current);
      setFeedback({ ok: false, cloudId });
      onFailRound?.();
    }
    setQuestion(null);
    setTimeout(() => setFeedback(null), 600);
  };

  return (
    <View style={styles.root}>
      <View style={styles.topBar}>
        <Text style={styles.timer}>{timeLeft}s</Text>
        <Text style={styles.scoreLine}>
          ✓ {correct}  ✗ {wrong}  · {missed}
        </Text>
      </View>

      <View style={styles.questionBar}>
        <Text style={styles.questionText}>
          {question ? question.prompt : '…'}
        </Text>
      </View>

      <View style={[styles.field, { width: FIELD_W, height: FIELD_H }]}>
        {clouds.map((c) => {
          const isFeedback = feedback && feedback.cloudId === c.id;
          return (
            <Pressable
              key={c.id}
              onPress={() => handleCloudTap(c.id)}
              style={[
                styles.cloud,
                {
                  left: c.x,
                  top: c.y,
                  backgroundColor: colors.tile[c.color],
                  borderColor: isFeedback
                    ? feedback.ok
                      ? colors.success
                      : colors.danger
                    : 'rgba(255,255,255,0.4)',
                },
              ]}
            >
              <Text style={styles.cloudNumber}>{c.number}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.hint}>
        Track the clouds and answer prompts. Missed prompts hurt your score.
      </Text>
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
    width: '90%',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  timer: {
    ...fonts.display,
    fontSize: 22,
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  scoreLine: {
    ...fonts.uiSemi,
    fontSize: 12,
    color: colors.textDim,
  },
  questionBar: {
    backgroundColor: colors.text,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    marginBottom: 10,
  },
  questionText: {
    ...fonts.uiBold,
    color: '#fff',
    fontSize: 13,
    letterSpacing: 0.5,
  },
  field: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    overflow: 'hidden',
    position: 'relative',
  },
  cloud: {
    position: 'absolute',
    width: CLOUD_W,
    height: CLOUD_H,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  cloudNumber: {
    ...fonts.display,
    color: '#fff',
    fontSize: 22,
    textShadowColor: 'rgba(0, 0, 0, 0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  hint: {
    ...fonts.uiMedium,
    color: colors.textDim,
    fontSize: 11,
    marginTop: 12,
    paddingHorizontal: 24,
    textAlign: 'center',
  },
});
