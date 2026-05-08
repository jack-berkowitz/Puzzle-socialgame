# Modinsta

A React Native app that wraps Instagram in a WebView with a token-based scroll economy and a brain training puzzle map. Earn tokens by completing puzzles — spend them scrolling the feed or swiping Reels.

---

## Prerequisites

Make sure you have all of the following installed before you start:

- **Node.js** (v18+) — install via [Homebrew](https://brew.sh): `brew install node`
- **Watchman** — `brew install watchman`
- **CocoaPods** — `brew install cocoapods`
- **Xcode** (latest, from the Mac App Store) with iOS Simulator support

After installing Xcode, run these two commands once:

```bash
sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer
sudo xcodebuild -license accept
```

---

## Installation

```bash
# 1. Navigate into the project folder
cd modinsta

# 2. Install JavaScript dependencies
npm install

# 3. Install iOS native dependencies
cd ios && pod install && cd ..
```

---

## Running the App

### iOS Simulator (recommended)

```bash
npx expo run:ios
```

This compiles the native iOS build and launches it in the simulator. The first build takes several minutes — subsequent builds are much faster.

### Expo Dev Server (faster hot reload)

```bash
npx expo start
```

Press `i` to open the iOS Simulator. Note that some features — WebView, haptics — require the full native build via `npx expo run:ios` and won't work in Expo Go.

---

## Project Structure

```
modinsta/
├── App.js                         # Root navigation (Web → PuzzleMap → Puzzle)
├── app.json                       # Expo config (bundle ID, name, orientations)
├── babel.config.js                # Babel preset + Reanimated plugin
│
├── src/
│   ├── screens/
│   │   ├── WebViewScreen.js       # Instagram WebView + token overlay + freeze logic
│   │   ├── PuzzleMapScreen.js     # Candy Crush-style level map with friend avatars
│   │   └── PuzzleScreen.js        # Game host, summary screen, confetti, token awards
│   │
│   ├── games/
│   │   ├── TrainRouterGame.js     # Route colored trains through junction switches
│   │   ├── AttentionFilterGame.js # Identify center arrow among distractors, swipe to answer
│   │   ├── MemoryOverloadGame.js  # Memorize a digit sequence while solving math problems
│   │   ├── RapidFireSpatialGame.js# Same or different 3D shapes? (mirrored ≠ rotated)
│   │   └── StormChaserGame.js     # Track moving numbered clouds, answer timed prompts
│   │
│   ├── components/
│   │   ├── TokenPill.js           # Animated token counter shown over the WebView
│   │   ├── OutOfTokensSheet.js    # Bottom sheet when tokens run out
│   │   ├── LevelNode.js           # Pulsing gradient node on the puzzle map
│   │   ├── FriendAvatar.js        # Friend avatar with level tag on the map
│   │   ├── PerformanceGraph.js    # Bar graph comparing you vs. personal best vs. friend
│   │   ├── PuzzleHeader.js        # Tokens / streak / levels completed header bar
│   │   ├── Confetti.js            # Animated confetti particles on level completion
│   │   ├── Timer.js               # Live elapsed timer shown during puzzles
│   │   └── Button.js              # Shared button with gradient and ghost variants
│   │
│   ├── theme/
│   │   └── colors.js              # Instagram-matched color palette, fonts, IG gradient
│   │
│   └── utils/
│       ├── storage.js             # AsyncStorage helpers, token economy, daily bonus, awards
│       ├── difficulty.js          # Per-game params by tier, rating thresholds, speed labels
│       └── injectedJS.js          # JavaScript injected into the Instagram WebView
│
└── ios/                           # Native iOS project (generated via expo prebuild)
```

---

## How It Works

| Feature | Detail |
|---|---|
| **Token Economy** | Start with 100 tokens. Each 100px of feed scroll costs 1 token. Each Reel swipe costs 5. |
| **Daily Bonus** | +20 tokens awarded on first open each day. Streaks are tracked. |
| **Puzzle Map** | Candy Crush-style scrollable map. Levels increase in difficulty. |
| **Game Rotation** | 5 game types assigned deterministically — never repeats back-to-back. |
| **Chain Levels** | Complete a level to immediately attempt the next one. |
| **Ratings** | Bronze / Silver / Gold / Platinum based on score — multiplies token reward. |
| **Speed Bonus** | Finishing in under 60s pays 2× tokens. Bonus tiers: Lightning, Fast, Quick, Steady. |
| **Friend Map** | Instagram following list is scraped via WebView DOM injection and shown at their current level. |
| **Freeze Logic** | When tokens hit 0, scroll and Reel swipes are blocked via CSS class injection. |

---

## Token Reward Formula

```
base = 10 + (level × 2)
earned = round(base × ratingMultiplier × speedMultiplier)
```

| Rating | Score threshold | Multiplier |
|---|---|---|
| Bronze | 0% | ×1 |
| Silver | 60% | ×1.25 |
| Gold | 80% | ×1.5 |
| Platinum | 95% | ×2 |

| Speed | Time | Multiplier |
|---|---|---|
| Lightning | < 60s | ×2 |
| Fast | < 120s | ×1.5 |
| Quick | < 180s | ×1.25 |
| Steady | ≥ 180s | ×1 |

---

## Troubleshooting

**`syspolicyd` running at 100% CPU after pod install**

macOS Gatekeeper is scanning new files. Run:
```bash
sudo killall syspolicyd
sudo xattr -rd com.apple.quarantine /path/to/modinsta
```

**`EMFILE: too many open files`**
```bash
brew install watchman
ulimit -n 65536
```

**Xcode not found by Expo**
```bash
sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer
sudo xcodebuild -license accept
```

**CocoaPods stuck or outdated**
```bash
cd ios
pod repo update
pod install
```

**Babel error: `Cannot find module 'react-native-reanimated/plugin'`**
```bash
npm install react-native-reanimated
npx expo start --clear
```

---

## Tech Stack

| Package | Version |
|---|---|
| Expo | ~50.0.0 |
| React Native | 0.73.6 |
| React Navigation v6 | native-stack |
| react-native-webview | 13.6.4 |
| react-native-reanimated | ~3.6.2 |
| expo-haptics | ~12.8.1 |
| expo-linear-gradient | ~12.7.2 |
| @react-native-async-storage/async-storage | 1.21.0 |
