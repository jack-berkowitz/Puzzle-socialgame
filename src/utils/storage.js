import AsyncStorage from '@react-native-async-storage/async-storage';

export const KEYS = {
  currentLevel: 'current_level',
  tokens: 'tokens',
  streak: 'streak',
  lastOpenedDate: 'last_opened_date',
  followingList: 'following_list',
  completedLevels: 'completed_levels',
  dailyBonusClaimed: 'daily_bonus_claimed',
};

export const STARTING_TOKENS = 100;
export const DAILY_BONUS = 20;
export const REEL_SWIPE_COST = 5;

const DEFAULTS = {
  [KEYS.currentLevel]: 1,
  [KEYS.tokens]: STARTING_TOKENS,
  [KEYS.streak]: 0,
  [KEYS.lastOpenedDate]: null,
  [KEYS.followingList]: [],
  [KEYS.completedLevels]: [],
  [KEYS.dailyBonusClaimed]: null,
};

const parse = (raw, fallback) => {
  if (raw === null || raw === undefined) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
};

export async function getState() {
  const entries = await AsyncStorage.multiGet(Object.values(KEYS));
  const out = {};
  for (const [key, value] of entries) {
    out[key] = parse(value, DEFAULTS[key]);
  }
  return out;
}

export async function getValue(key) {
  const raw = await AsyncStorage.getItem(key);
  return parse(raw, DEFAULTS[key]);
}

export async function setValue(key, value) {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export async function setMany(pairs) {
  const list = Object.entries(pairs).map(([k, v]) => [k, JSON.stringify(v)]);
  await AsyncStorage.multiSet(list);
}

export async function resetAll() {
  await AsyncStorage.multiRemove(Object.values(KEYS));
}

export function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function isYesterday(isoStr) {
  if (!isoStr) return false;
  const y = new Date();
  y.setDate(y.getDate() - 1);
  const yIso = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, '0')}-${String(y.getDate()).padStart(2, '0')}`;
  return isoStr === yIso;
}

export async function applyDailyBonus() {
  const today = todayISO();
  const claimed = await getValue(KEYS.dailyBonusClaimed);
  if (claimed === today) return { awarded: 0, newTokens: null };

  const lastOpened = await getValue(KEYS.lastOpenedDate);
  const tokens = await getValue(KEYS.tokens);
  const streak = await getValue(KEYS.streak);

  let nextStreak;
  if (!lastOpened) nextStreak = 1;
  else if (lastOpened === today) nextStreak = streak;
  else if (isYesterday(lastOpened)) nextStreak = streak + 1;
  else nextStreak = 1;

  const newTokens = tokens + DAILY_BONUS;
  await setMany({
    [KEYS.tokens]: newTokens,
    [KEYS.dailyBonusClaimed]: today,
    [KEYS.lastOpenedDate]: today,
    [KEYS.streak]: nextStreak,
  });
  return { awarded: DAILY_BONUS, newTokens, streak: nextStreak };
}

export async function spendTokens(n) {
  const tokens = await getValue(KEYS.tokens);
  if (tokens <= 0) return 0;
  const next = Math.max(0, tokens - n);
  await setValue(KEYS.tokens, next);
  return next;
}

export async function spendOneToken() {
  return spendTokens(1);
}

export async function awardLevelTokens({
  level,
  rating,
  ratingMult,
  speedMultiplier = 1,
  timeMs,
  score,
  gameType,
}) {
  const base = 10 + level * 2;
  const earned = Math.round(base * ratingMult * speedMultiplier);

  const tokens = await getValue(KEYS.tokens);
  const completed = await getValue(KEYS.completedLevels);

  const entry = {
    level,
    gameType,
    score,
    rating,
    ratingMult,
    speedMultiplier,
    timeMs,
    tokensEarned: earned,
    completedAt: new Date().toISOString(),
  };

  await setMany({
    [KEYS.tokens]: tokens + earned,
    [KEYS.currentLevel]: level + 1,
    [KEYS.completedLevels]: [...completed, entry],
  });

  return { earned, base, ratingMult, speedMultiplier, newTokens: tokens + earned };
}

export function personalBestForLevel(completedLevels, level) {
  const entries = (completedLevels || []).filter((c) => c.level === level);
  if (entries.length === 0) return null;
  return entries.reduce((best, cur) =>
    !best || (cur.score ?? 0) > (best.score ?? 0) ? cur : best
  , null);
}

// Deterministic per-level "friend best" mock based on level number.
// Returns a pseudo-friend score in [0.55, 0.97] using a stable hash.
export function friendBestForLevel(level, friends) {
  const list = Array.isArray(friends) && friends.length > 0
    ? friends
    : [{ username: 'jules' }, { username: 'lina' }, { username: 'mark' }];
  const f = list[level % list.length];
  const seed = (level * 2654435761) >>> 0;
  const score = 0.55 + (((seed >>> 8) % 420) / 1000);
  return { username: f.username, score };
}

export async function setFollowingList(list) {
  await setValue(KEYS.followingList, list);
}
