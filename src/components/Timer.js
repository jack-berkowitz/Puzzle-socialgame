import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { colors, fonts } from '../theme/colors';

export default function Timer({ running = true, onTick }) {
  const [elapsed, setElapsed] = useState(0);
  const startedAt = useRef(Date.now());
  const onTickRef = useRef(onTick);

  useEffect(() => {
    onTickRef.current = onTick;
  }, [onTick]);

  useEffect(() => {
    if (!running) return;
    startedAt.current = Date.now();
    const id = setInterval(() => {
      const next = Date.now() - startedAt.current;
      setElapsed(next);
      onTickRef.current?.(next);
    }, 200);
    return () => clearInterval(id);
  }, [running]);

  const total = Math.floor(elapsed / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;

  return (
    <View style={styles.box}>
      <View style={styles.dot} />
      <Text style={styles.time}>
        {m}:{String(s).padStart(2, '0')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.danger,
  },
  time: {
    ...fonts.uiSemi,
    color: colors.text,
    fontSize: 14,
    fontVariant: ['tabular-nums'],
  },
});
