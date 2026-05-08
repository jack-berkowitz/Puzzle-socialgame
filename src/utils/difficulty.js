export function difficulty(level) {
  return 1 + level / 10;
}

export const GAME_TYPES = ['train', 'attention', 'memory', 'spatial', 'storm'];

export const GAME_NAMES = {
  train: 'Train Router',
  attention: 'Attention Filter',
  memory: 'Memory Overload',
  spatial: 'Rapid Fire Spatial',
  storm: 'Storm Chaser',
};

// Deterministic, never repeats two levels in a row.
// (level * 7) % 5 is non-repeating since gcd(7,5)=1.
export function gameTypeForLevel(level) {
  return GAME_TYPES[((level | 0) * 7) % GAME_TYPES.length];
}

export function speedMultiplier(timeMs) {
  if (timeMs < 60000) return 2;
  if (timeMs < 120000) return 1.5;
  if (timeMs > 180000) return 1;
  return 1.25;
}

export function speedLabel(timeMs) {
  if (timeMs < 60000) return 'Lightning';
  if (timeMs < 120000) return 'Fast';
  if (timeMs > 180000) return 'Steady';
  return 'Quick';
}

export const RATINGS = {
  platinum: { name: 'Platinum', mult: 2, threshold: 0.95 },
  gold: { name: 'Gold', mult: 1.5, threshold: 0.8 },
  silver: { name: 'Silver', mult: 1.25, threshold: 0.6 },
  bronze: { name: 'Bronze', mult: 1, threshold: 0 },
};

export function ratingForScore(score) {
  if (score >= RATINGS.platinum.threshold) return 'platinum';
  if (score >= RATINGS.gold.threshold) return 'gold';
  if (score >= RATINGS.silver.threshold) return 'silver';
  return 'bronze';
}

// Difficulty tier helper (low/mid/high) — used by all five games.
export function tier(level) {
  if (level <= 5) return 'low';
  if (level <= 15) return 'mid';
  return 'high';
}

export function trainParams(level) {
  const t = tier(level);
  if (t === 'low') {
    return { trains: 2, junctions: 1, speed: 60, lives: 3, layout: 'simple' };
  }
  if (t === 'mid') {
    return { trains: 3 + Math.min(1, level - 6), junctions: 2, speed: 90, lives: 3, layout: 'branch' };
  }
  return { trains: 5, junctions: 3, speed: 120, lives: 3, layout: 'complex' };
}

export function attentionParams(level) {
  const t = tier(level);
  const D = difficulty(level);
  if (t === 'low') {
    return { distractors: 4, displayMs: 1500, totalRounds: 12, sameColor: false, animateDistractors: false, targetSize: 56 };
  }
  if (t === 'mid') {
    return { distractors: 8, displayMs: 1000, totalRounds: 16, sameColor: true, animateDistractors: false, targetSize: 48 };
  }
  return {
    distractors: 12,
    displayMs: Math.max(500, 600 - level * 5),
    totalRounds: 20,
    sameColor: true,
    animateDistractors: true,
    targetSize: Math.max(36, 44 - Math.floor(D)),
  };
}

export function memoryParams(level) {
  const t = tier(level);
  if (t === 'low') {
    return { sequenceLength: 4, mathOp: 'add', sequenceFlashMs: 900, durationMs: 90000 };
  }
  if (t === 'mid') {
    return { sequenceLength: 6, mathOp: 'mul', sequenceFlashMs: 800, durationMs: 90000 };
  }
  return {
    sequenceLength: 8,
    mathOp: 'multi',
    sequenceFlashMs: Math.max(500, 700 - level * 8),
    durationMs: 90000,
  };
}

export function spatialParams(level) {
  const t = tier(level);
  if (t === 'low') {
    return {
      shapeCount: 30,
      decisionMs: 2000,
      penaltyMs: 5000,
      shapeComplexity: 'simple',
      rotationAxes: ['z'],
      mirrorChance: 0,
    };
  }
  if (t === 'mid') {
    return {
      shapeCount: 30,
      decisionMs: 1500,
      penaltyMs: 5000,
      shapeComplexity: 'medium',
      rotationAxes: ['x', 'y', 'z'],
      mirrorChance: 0.4,
    };
  }
  return {
    shapeCount: 30,
    decisionMs: Math.max(700, 1000 - level * 10),
    penaltyMs: 5000,
    shapeComplexity: 'compound',
    rotationAxes: ['x', 'y', 'z'],
    mirrorChance: 0.5,
  };
}

export function stormParams(level) {
  const t = tier(level);
  if (t === 'low') {
    return {
      cloudCount: 4,
      speed: 0.6,
      numberChangeMs: 5000,
      splits: false,
      questionEveryMs: 8000,
      durationMs: 75000,
    };
  }
  if (t === 'mid') {
    return {
      cloudCount: 5,
      speed: 0.9,
      numberChangeMs: 3000,
      splits: true,
      splitChance: 0.15,
      questionEveryMs: 6000,
      durationMs: 75000,
    };
  }
  return {
    cloudCount: 6,
    speed: 1.2,
    numberChangeMs: 2000,
    splits: true,
    splitChance: 0.3,
    wind: true,
    questionEveryMs: 4500,
    durationMs: 75000,
  };
}

export function rewardForLevel(level, ratingMult, speedMult = 1) {
  const base = 10 + level * 2;
  return Math.round(base * ratingMult * speedMult);
}
