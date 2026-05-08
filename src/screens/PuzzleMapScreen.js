import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Dimensions,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { colors, fonts } from '../theme/colors';
import LevelNode from '../components/LevelNode';
import PuzzleHeader from '../components/PuzzleHeader';
import FriendAvatar from '../components/FriendAvatar';
import { KEYS, getState } from '../utils/storage';
import { GAME_TYPES, GAME_NAMES } from '../utils/difficulty';

const VISIBLE_AHEAD = 8;
const VISIBLE_BEHIND = 6;
const ROW_HEIGHT = 130;
const { width: SCREEN_W } = Dimensions.get('window');

function offsetForLevel(level) {
  const wave = Math.sin(level * 0.85);
  return wave * SCREEN_W * 0.28;
}

const GHOST_FRIENDS = [
  { username: 'lina_w', profilePic: null, level: 2 },
  { username: 'mark.rt', profilePic: null, level: 1 },
  { username: 'jules', profilePic: null, level: 3 },
  { username: 'ev.x', profilePic: null, level: 2 },
];

function PathDots({ fromLevel, toLevel }) {
  const fromX = offsetForLevel(fromLevel);
  const toX = offsetForLevel(toLevel);
  const dx = toX - fromX;
  const segments = 4;
  return (
    <View style={styles.pathDotRow} pointerEvents="none">
      {Array.from({ length: segments }).map((_, i) => {
        const t = (i + 1) / (segments + 1);
        const x = fromX + dx * t;
        return (
          <View
            key={i}
            style={[
              styles.pathDot,
              {
                transform: [{ translateX: x }],
                top: t * (ROW_HEIGHT - 12),
                opacity: 0.5,
              },
            ]}
          />
        );
      })}
    </View>
  );
}

export default function PuzzleMapScreen({ navigation }) {
  const [state, setState] = useState(null);
  const scrollRef = useRef(null);
  const lastScrolledLevel = useRef(null);

  const refresh = useCallback(async () => {
    const s = await getState();
    setState(s);
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!state) return;
    const cur = state[KEYS.currentLevel];
    if (lastScrolledLevel.current === cur) return;
    const animated = lastScrolledLevel.current !== null;
    lastScrolledLevel.current = cur;
    const offset = VISIBLE_AHEAD * ROW_HEIGHT - 60;
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y: Math.max(0, offset), animated });
    });
  }, [state]);

  if (!state) {
    return <View style={styles.root} />;
  }

  const currentLevel = state[KEYS.currentLevel];
  const followingList = state[KEYS.followingList] || [];
  const completedLevels = state[KEYS.completedLevels] || [];
  const useGhosts = followingList.length === 0;
  const friends = useGhosts ? GHOST_FRIENDS : followingList;

  const startLevel = Math.max(1, currentLevel - VISIBLE_BEHIND);
  const endLevel = currentLevel + VISIBLE_AHEAD;
  const levels = [];
  for (let l = endLevel; l >= startLevel; l--) {
    levels.push(l);
  }

  const handleLevelPress = (level) => {
    if (level === currentLevel) {
      navigation.navigate('Puzzle', { level });
      return;
    }
    if (level < currentLevel) {
      const entries = completedLevels.filter((c) => c.level === level);
      if (entries.length === 0) {
        Alert.alert(`Level ${level}`, 'Completed before stats were tracked.');
        return;
      }
      const last = entries[entries.length - 1];
      const seconds = Math.round((last.timeMs || 0) / 1000);
      const ratingLabel = last.rating
        ? last.rating[0].toUpperCase() + last.rating.slice(1)
        : null;
      Alert.alert(
        `Level ${level}`,
        [
          `Time: ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`,
          `Tokens earned: ${last.tokensEarned}`,
          ratingLabel ? `Rating: ${ratingLabel}` : null,
        ]
          .filter(Boolean)
          .join('\n')
      );
    }
  };

  const handleFriendPress = (friend) => {
    if (useGhosts || !friend.profilePic) {
      Alert.alert(
        `@${friend.username}`,
        `On level ${friend.level}.\nThey haven't joined Modinsta yet — invite to sync levels.`,
        [
          { text: 'Close', style: 'cancel' },
          { text: 'Invite', onPress: () => {} },
        ]
      );
      return;
    }
    Alert.alert(
      `@${friend.username}`,
      `On level ${friend.level}.`,
      [
        { text: 'Close', style: 'cancel' },
        { text: 'Invite to sync levels', onPress: () => {} },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.topBar}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backIcon}>×</Text>
        </Pressable>
        <Text style={styles.title}>Puzzle Map</Text>
        <View style={{ width: 36 }} />
      </View>

      <PuzzleHeader
        tokens={state[KEYS.tokens]}
        streak={state[KEYS.streak]}
        completed={completedLevels.length}
      />

      {/* Dev: Test individual games */}
      <View style={styles.devSection}>
        <Text style={styles.devTitle}>Test Games</Text>
        <View style={styles.devGrid}>
          {GAME_TYPES.map((gt) => (
            <Pressable
              key={gt}
              style={styles.devBtn}
              onPress={() => navigation.navigate('Puzzle', { level: currentLevel, gameType: gt })}
            >
              <Text style={styles.devBtnTxt}>{GAME_NAMES[gt]}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => {
          if (lastScrolledLevel.current === currentLevel) return;
          const animated = lastScrolledLevel.current !== null;
          lastScrolledLevel.current = currentLevel;
          const offset = VISIBLE_AHEAD * ROW_HEIGHT - 60;
          scrollRef.current?.scrollTo({ y: Math.max(0, offset), animated });
        }}
      >
        <View style={styles.map}>
          {levels.map((level, i) => {
            let status = 'locked';
            if (level < currentLevel) status = 'completed';
            else if (level === currentLevel) status = 'current';

            const x = offsetForLevel(level);
            const friendsHere = friends.filter((f) => f.level === level);
            const nextLevel = levels[i + 1];

            return (
              <View key={level} style={styles.row}>
                {nextLevel != null && <PathDots fromLevel={level} toLevel={nextLevel} />}

                <View style={[styles.nodeRow, { transform: [{ translateX: x }] }]}>
                  <LevelNode
                    level={level}
                    status={status}
                    onPress={() => handleLevelPress(level)}
                  />
                  {friendsHere.length > 0 && (
                    <View style={styles.friendsRow}>
                      {friendsHere.slice(0, 3).map((f, k) => (
                        <View key={f.username} style={[styles.friendStack, { marginLeft: k === 0 ? 0 : -10 }]}>
                          <FriendAvatar
                            friend={f}
                            ghost={useGhosts || !f.profilePic}
                            size={32}
                            onPress={() => handleFriendPress(f)}
                          />
                        </View>
                      ))}
                      {friendsHere.length > 3 && (
                        <View style={styles.friendStack}>
                          <View style={styles.moreBubble}>
                            <Text style={styles.moreText}>+{friendsHere.length - 3}</Text>
                          </View>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              </View>
            );
          })}
          <View style={{ height: 60 }} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
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
    paddingVertical: 8,
    backgroundColor: colors.bg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    color: colors.text,
    fontSize: 28,
    lineHeight: 30,
    ...fonts.uiMedium,
  },
  title: {
    ...fonts.uiBold,
    color: colors.text,
    fontSize: 16,
  },
  scrollContent: {
    paddingBottom: 60,
    paddingTop: 8,
  },
  map: {
    paddingTop: 12,
  },
  row: {
    height: ROW_HEIGHT,
    position: 'relative',
  },
  nodeRow: {
    height: ROW_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  pathDotRow: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 0,
  },
  pathDot: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.pathDim,
  },
  friendsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 6,
  },
  friendStack: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreBubble: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreText: {
    ...fonts.uiBold,
    fontSize: 10,
    color: colors.textDim,
  },
  devSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
    marginBottom: 4,
  },
  devTitle: {
    ...fonts.uiBold,
    fontSize: 12,
    color: colors.textDim,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  devGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  devBtn: {
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  devBtnTxt: {
    ...fonts.uiMedium,
    fontSize: 11,
    color: colors.text,
  },
});
