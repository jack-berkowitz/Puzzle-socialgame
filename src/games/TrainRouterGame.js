import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
  Animated,
  Easing,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, fonts } from '../theme/colors';
import { trainParams } from '../utils/difficulty';

const { width: SCREEN_W } = Dimensions.get('window');
const TRAIN_COLORS = {
  red: colors.tile.red,
  blue: colors.tile.blue,
  green: colors.tile.green,
  yellow: colors.tile.yellow,
  purple: colors.tile.purple,
  orange: colors.tile.orange,
};

function colorAt(i) {
  const order = ['red', 'blue', 'green', 'yellow', 'purple', 'orange'];
  return order[i % order.length];
}

// Build a layout per level. All layouts use a shared shape:
// spawns at top, junctions in the middle, stations at bottom.
// Each spawn has a fixed downward path to one junction.
// Each junction has two outputs (left/right) to two of the stations.
function buildLayout(level) {
  const params = trainParams(level);
  const W = Math.min(SCREEN_W - 24, 360);
  const H = 460;
  const trainCount = Math.min(params.trains, 5);

  if (params.layout === 'simple') {
    // 2 trains, 1 junction each, 2 stations
    const stations = [
      { id: 'sR', color: 'red', x: W * 0.18, y: H - 30 },
      { id: 'sB', color: 'blue', x: W * 0.82, y: H - 30 },
    ];
    const spawns = [];
    const junctions = [];
    for (let i = 0; i < trainCount; i++) {
      const col = i;
      const x = col === 0 ? W * 0.18 : W * 0.82;
      const trainColor = i % 2 === 0 ? 'red' : 'blue';
      spawns.push({ id: `s${i}`, color: trainColor, x, y: 30 });
      junctions.push({
        id: `j${i}`,
        x,
        y: H * 0.45,
        leftTo: 'sR',
        rightTo: 'sB',
        state: i % 2 === 0 ? 'left' : 'right',
      });
    }
    return { W, H, spawns, junctions, stations, params };
  }

  if (params.layout === 'branch') {
    // 3-4 trains, 2 junctions paths sharing intermediate routing, 3 stations
    const stations = [
      { id: 'sR', color: 'red', x: W * 0.15, y: H - 30 },
      { id: 'sG', color: 'green', x: W * 0.5, y: H - 30 },
      { id: 'sB', color: 'blue', x: W * 0.85, y: H - 30 },
    ];
    const spawns = [];
    const junctions = [];
    const colorsByIdx = ['red', 'green', 'blue', 'red'];
    const junctionTargets = [
      { leftTo: 'sR', rightTo: 'sG' },
      { leftTo: 'sR', rightTo: 'sG' },
      { leftTo: 'sG', rightTo: 'sB' },
      { leftTo: 'sR', rightTo: 'sB' },
    ];
    for (let i = 0; i < trainCount; i++) {
      const col = i / Math.max(1, trainCount - 1);
      const x = W * (0.15 + col * 0.7);
      const tColor = colorsByIdx[i % colorsByIdx.length];
      spawns.push({ id: `s${i}`, color: tColor, x, y: 30 });
      junctions.push({
        id: `j${i}`,
        x,
        y: H * 0.4 + (i % 2) * 60,
        ...junctionTargets[i % junctionTargets.length],
        state: 'left',
      });
    }
    return { W, H, spawns, junctions, stations, params };
  }

  // complex: 5 trains, 3 stations including a decoy color
  const stations = [
    { id: 'sR', color: 'red', x: W * 0.12, y: H - 30 },
    { id: 'sG', color: 'green', x: W * 0.38, y: H - 30 },
    { id: 'sB', color: 'blue', x: W * 0.64, y: H - 30 },
    { id: 'sP', color: 'purple', x: W * 0.9, y: H - 30 },
  ];
  const spawns = [];
  const junctions = [];
  const colorsByIdx = ['red', 'green', 'blue', 'purple', 'red'];
  const junctionPicks = [
    { leftTo: 'sR', rightTo: 'sG' },
    { leftTo: 'sG', rightTo: 'sB' },
    { leftTo: 'sB', rightTo: 'sP' },
    { leftTo: 'sR', rightTo: 'sP' },
    { leftTo: 'sR', rightTo: 'sB' },
  ];
  for (let i = 0; i < trainCount; i++) {
    const col = i / Math.max(1, trainCount - 1);
    const x = W * (0.12 + col * 0.78);
    const tColor = colorsByIdx[i];
    spawns.push({ id: `s${i}`, color: tColor, x, y: 30 });
    junctions.push({
      id: `j${i}`,
      x,
      y: H * 0.35 + (i % 3) * 50,
      ...junctionPicks[i],
      state: 'left',
    });
  }
  return { W, H, spawns, junctions, stations, params };
}

export default function TrainRouterGame({ level, onComplete, onFailRound }) {
  const layout = useMemo(() => buildLayout(level), [level]);
  const params = layout.params;
  const [junctions, setJunctions] = useState(layout.junctions);
  const [trains, setTrains] = useState(() =>
    layout.spawns.map((s, i) => ({
      id: s.id,
      color: s.color,
      x: new Animated.Value(s.x),
      y: new Animated.Value(s.y),
      atNodeId: s.id,
      arrived: false,
      crashed: false,
      delay: i * 600,
    }))
  );
  const [lives, setLives] = useState(params.lives);
  const [done, setDone] = useState(false);
  const [arrivedCount, setArrivedCount] = useState(0);
  const livesRef = useRef(params.lives);
  const arrivedRef = useRef(0);
  const totalTrainsRef = useRef(layout.spawns.length);
  const completedRef = useRef(false);
  const failedAnyRef = useRef(false);

  useEffect(() => {
    trains.forEach((train, idx) => {
      const startNode = layout.spawns.find((s) => s.id === train.id);
      const junction = layout.junctions.find((j) => j.id === `j${idx}`);
      if (!startNode || !junction) return;

      const dx = junction.x - startNode.x;
      const dy = junction.y - startNode.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const duration = (dist / params.speed) * 1000;

      const goToJunction = () => {
        Animated.parallel([
          Animated.timing(train.x, {
            toValue: junction.x,
            duration,
            easing: Easing.linear,
            useNativeDriver: false,
          }),
          Animated.timing(train.y, {
            toValue: junction.y,
            duration,
            easing: Easing.linear,
            useNativeDriver: false,
          }),
        ]).start(({ finished }) => {
          if (!finished) return;
          handleAtJunction(train, junction);
        });
      };

      const id = setTimeout(goToJunction, train.delay);
      return () => clearTimeout(id);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAtJunction = (train, junctionDataAtMount) => {
    // Read current junction state from latest junctions
    setJunctions((latest) => {
      const j = latest.find((x) => x.id === junctionDataAtMount.id) || junctionDataAtMount;
      const targetStationId = j.state === 'left' ? j.leftTo : j.rightTo;
      const station = layout.stations.find((s) => s.id === targetStationId);
      if (!station) return latest;

      const dx = station.x - j.x;
      const dy = station.y - j.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const duration = (dist / params.speed) * 1000;

      Animated.parallel([
        Animated.timing(train.x, {
          toValue: station.x,
          duration,
          easing: Easing.linear,
          useNativeDriver: false,
        }),
        Animated.timing(train.y, {
          toValue: station.y,
          duration,
          easing: Easing.linear,
          useNativeDriver: false,
        }),
      ]).start(({ finished }) => {
        if (!finished) return;
        if (station.color === train.color) {
          arrivedRef.current += 1;
          setArrivedCount(arrivedRef.current);
          train.arrived = true;
          Haptics.selectionAsync();
        } else {
          livesRef.current -= 1;
          setLives(livesRef.current);
          failedAnyRef.current = true;
          train.crashed = true;
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          onFailRound?.();
        }
        checkEndConditions();
      });
      return latest;
    });
  };

  const checkEndConditions = () => {
    if (completedRef.current) return;
    const total = totalTrainsRef.current;
    const arrived = arrivedRef.current;
    const livesLeft = livesRef.current;
    const allDone = trains.every((t) => t.arrived || t.crashed) || arrived + (total - livesLeft) >= total;

    if (livesLeft <= 0 || allDone) {
      completedRef.current = true;
      setDone(true);
      const score = computeScore(arrivedRef.current, total, livesLeft);
      onComplete?.({
        firstTry: !failedAnyRef.current,
        score,
        arrived,
        total,
        livesLeft,
      });
    }
  };

  const handleJunctionTap = (junctionId) => {
    Haptics.selectionAsync();
    setJunctions((prev) =>
      prev.map((j) =>
        j.id === junctionId ? { ...j, state: j.state === 'left' ? 'right' : 'left' } : j
      )
    );
  };

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.lives}>
          {Array.from({ length: params.lives }).map((_, i) => (
            <Text key={i} style={i < lives ? styles.heart : styles.heartLost}>♥ </Text>
          ))}
        </Text>
        <Text style={styles.subhead}>
          {arrivedCount} / {layout.spawns.length} arrived
        </Text>
      </View>

      <View style={[styles.board, { width: layout.W, height: layout.H }]}>
        {/* tracks: spawn-to-junction lines */}
        {layout.spawns.map((s, i) => {
          const j = layout.junctions[i];
          if (!j) return null;
          return (
            <Line key={`tr-${s.id}`} from={s} to={j} dim />
          );
        })}

        {/* tracks: junction-to-station (both possibilities visible) */}
        {layout.junctions.map((j) => {
          const left = layout.stations.find((s) => s.id === j.leftTo);
          const right = layout.stations.find((s) => s.id === j.rightTo);
          const cur = junctions.find((x) => x.id === j.id) || j;
          return (
            <View key={`tracks-${j.id}`}>
              {left && (
                <Line
                  from={j}
                  to={left}
                  active={cur.state === 'left'}
                  color={TRAIN_COLORS[left.color]}
                />
              )}
              {right && (
                <Line
                  from={j}
                  to={right}
                  active={cur.state === 'right'}
                  color={TRAIN_COLORS[right.color]}
                />
              )}
            </View>
          );
        })}

        {/* stations */}
        {layout.stations.map((s) => (
          <View
            key={s.id}
            style={[
              styles.station,
              {
                left: s.x - 22,
                top: s.y - 22,
                backgroundColor: TRAIN_COLORS[s.color],
              },
            ]}
          >
            <Text style={styles.stationLabel}>{s.color[0].toUpperCase()}</Text>
          </View>
        ))}

        {/* spawn dots */}
        {layout.spawns.map((s) => (
          <View
            key={s.id}
            style={[
              styles.spawn,
              {
                left: s.x - 8,
                top: s.y - 8,
                borderColor: TRAIN_COLORS[s.color],
              },
            ]}
          />
        ))}

        {/* junction switches */}
        {junctions.map((j) => (
          <Pressable
            key={`btn-${j.id}`}
            onPress={() => !done && handleJunctionTap(j.id)}
            style={[
              styles.junction,
              {
                left: j.x - 18,
                top: j.y - 18,
              },
            ]}
          >
            <Text style={styles.junctionArrow}>{j.state === 'left' ? '↙' : '↘'}</Text>
          </Pressable>
        ))}

        {/* trains */}
        {trains.map((t) => (
          <Animated.View
            key={t.id}
            style={[
              styles.train,
              {
                backgroundColor: TRAIN_COLORS[t.color],
                opacity: t.crashed ? 0.3 : 1,
                transform: [
                  { translateX: Animated.subtract(t.x, 12) },
                  { translateY: Animated.subtract(t.y, 12) },
                ],
              },
            ]}
          />
        ))}
      </View>

      <Text style={styles.hint}>
        Tap each junction to flip its switch. Route every train to its matching color.
      </Text>
    </View>
  );
}

function Line({ from, to, active, dim, color }) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.sqrt(dx * dx + dy * dy);
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  const baseColor = dim ? colors.border : active ? color || colors.text : colors.borderSoft;

  return (
    <View
      style={[
        lineStyles.line,
        {
          left: from.x,
          top: from.y,
          width: length,
          transform: [{ translateY: -2 }, { rotate: `${angle}deg` }],
          backgroundColor: baseColor,
          opacity: dim ? 0.6 : active ? 1 : 0.35,
          height: active ? 4 : 3,
        },
      ]}
    />
  );
}

function computeScore(arrived, total, livesLeft) {
  if (total === 0) return 0;
  const arrivalRate = arrived / total;
  const livesRate = Math.max(0, livesLeft) / 3;
  return arrivalRate * 0.7 + livesRate * 0.3;
}

const lineStyles = StyleSheet.create({
  line: {
    position: 'absolute',
    height: 3,
    borderRadius: 2,
    transformOrigin: '0 0',
  },
});

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '90%',
    marginBottom: 6,
  },
  lives: {
    fontSize: 16,
  },
  heart: {
    color: colors.danger,
    ...fonts.uiBold,
    fontSize: 18,
  },
  heartLost: {
    color: colors.borderSoft,
    fontSize: 18,
  },
  subhead: {
    ...fonts.uiSemi,
    color: colors.textDim,
    fontSize: 12,
  },
  board: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  station: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  stationLabel: {
    ...fonts.uiBold,
    fontSize: 16,
    color: '#fff',
  },
  spawn: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 3,
    backgroundColor: '#fff',
  },
  junction: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.text,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  junctionArrow: {
    ...fonts.uiBold,
    fontSize: 18,
    color: colors.text,
  },
  train: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  hint: {
    ...fonts.uiMedium,
    fontSize: 12,
    color: colors.textDim,
    marginTop: 12,
    paddingHorizontal: 24,
    textAlign: 'center',
  },
});
