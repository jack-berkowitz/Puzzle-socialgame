import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View, Text, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';

import { colors, fonts } from '../theme/colors';
import TokenPill from '../components/TokenPill';
import OutOfTokensSheet from '../components/OutOfTokensSheet';
import {
  KEYS,
  REEL_SWIPE_COST,
  applyDailyBonus,
  getState,
  getValue,
  setFollowingList,
  spendTokens,
} from '../utils/storage';
import { INJECTED_JS, INSTAGRAM_URL, RN_TO_WEBVIEW } from '../utils/injectedJS';

export default function WebViewScreen({ navigation }) {
  const webRef = useRef(null);
  const [tokens, setTokens] = useState(0);
  const [level, setLevel] = useState(1);
  const [showOutSheet, setShowOutSheet] = useState(false);
  const [outContext, setOutContext] = useState('feed');
  const [bonusToast, setBonusToast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [path, setPath] = useState('/');

  const feedFrozenRef = useRef(false);
  const reelsFrozenRef = useRef(false);

  const refreshState = useCallback(async () => {
    const state = await getState();
    setTokens(state[KEYS.tokens]);
    setLevel(state[KEYS.currentLevel]);
  }, []);

  const applyFreezes = useCallback((nextTokens, currentPath) => {
    const onReels = (currentPath || '').indexOf('/reels') === 0;
    const wantFeedFrozen = !onReels && nextTokens <= 0;
    const wantReelsFrozen = onReels && nextTokens <= 0;

    if (wantFeedFrozen !== feedFrozenRef.current) {
      feedFrozenRef.current = wantFeedFrozen;
      webRef.current?.injectJavaScript(
        `window.postMessage('${wantFeedFrozen ? RN_TO_WEBVIEW.freezeFeed : RN_TO_WEBVIEW.unfreezeFeed}'); true;`
      );
    }
    if (wantReelsFrozen !== reelsFrozenRef.current) {
      reelsFrozenRef.current = wantReelsFrozen;
      webRef.current?.injectJavaScript(
        `window.postMessage('${wantReelsFrozen ? RN_TO_WEBVIEW.freezeReels : RN_TO_WEBVIEW.unfreezeReels}'); true;`
      );
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        await refreshState();
        const t = await getValue(KEYS.tokens);
        setTokens(t);
        if (t > 0) {
          setShowOutSheet(false);
        }
        applyFreezes(t, path);
      })();
    }, [refreshState, applyFreezes, path])
  );

  useEffect(() => {
    (async () => {
      const result = await applyDailyBonus();
      if (result.awarded > 0) {
        setBonusToast(`+${result.awarded} daily bonus`);
        setTimeout(() => setBonusToast(null), 2400);
      }
      await refreshState();
    })();
  }, [refreshState]);

  const onMessage = useCallback(
    async (event) => {
      let data;
      try {
        data = JSON.parse(event.nativeEvent.data);
      } catch {
        return;
      }

      if (data.type === 'READY') {
        if (data.path) setPath(data.path);
        const state = await getState();
        if (state[KEYS.followingList].length === 0) {
          webRef.current?.injectJavaScript(
            `window.postMessage('${RN_TO_WEBVIEW.scrapeFollowing}'); true;`
          );
        }
        applyFreezes(state[KEYS.tokens], data.path || '/');
        return;
      }

      if (data.type === 'PATH_CHANGE') {
        setPath(data.path);
        const t = await getValue(KEYS.tokens);
        applyFreezes(t, data.path);
        return;
      }

      if (data.type === 'SCROLL_TICK') {
        const next = await spendTokens(1);
        setTokens(next);
        if (next === 0) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          setOutContext('feed');
          setShowOutSheet(true);
          applyFreezes(0, '/feed');
        }
        return;
      }

      if (data.type === 'REEL_SWIPE') {
        const t = await getValue(KEYS.tokens);
        if (t <= 0) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          setOutContext('reels');
          setShowOutSheet(true);
          applyFreezes(0, '/reels/');
          return;
        }
        const next = await spendTokens(REEL_SWIPE_COST);
        Haptics.selectionAsync();
        setTokens(next);
        if (next === 0) {
          setOutContext('reels');
          setShowOutSheet(true);
          applyFreezes(0, '/reels/');
        }
        return;
      }

      if (data.type === 'FOLLOWING_LIST' && Array.isArray(data.list) && data.list.length) {
        const enriched = data.list.slice(0, 30).map((f) => ({
          username: f.username,
          profilePic: f.profilePic,
          level: 1 + Math.floor(Math.random() * 3),
        }));
        await setFollowingList(enriched);
      }
    },
    [path, applyFreezes]
  );

  const goPlay = () => {
    setShowOutSheet(false);
    navigation.navigate('Puzzle', { level });
  };

  const goMap = () => {
    setShowOutSheet(false);
    navigation.navigate('PuzzleMap');
  };

  const onReels = path.indexOf('/reels') === 0;

  return (
    <View style={styles.root}>
      <WebView
        ref={webRef}
        source={{ uri: INSTAGRAM_URL }}
        style={styles.webview}
        injectedJavaScript={INJECTED_JS}
        onMessage={onMessage}
        onLoadEnd={() => setLoading(false)}
        javaScriptEnabled
        domStorageEnabled
        sharedCookiesEnabled
        thirdPartyCookiesEnabled
        allowsBackForwardNavigationGestures
        mediaPlaybackRequiresUserAction={false}
        userAgent="Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
      />

      <SafeAreaView style={styles.overlay} pointerEvents="box-none" edges={['top']}>
        <View style={styles.tokenWrap} pointerEvents="box-none">
          <TokenPill
            tokens={tokens}
            low={tokens <= 5}
            onPress={() => navigation.navigate('PuzzleMap')}
          />
          {onReels && (
            <View style={styles.reelsBadge}>
              <Text style={styles.reelsBadgeText}>5 / SWIPE</Text>
            </View>
          )}
          {bonusToast && (
            <View style={styles.toast}>
              <Text style={styles.toastText}>{bonusToast}</Text>
            </View>
          )}
        </View>
      </SafeAreaView>

      {loading && (
        <View style={styles.loading} pointerEvents="none">
          <ActivityIndicator color={colors.accent} size="large" />
        </View>
      )}

      <OutOfTokensSheet
        visible={showOutSheet}
        level={level}
        context={outContext}
        onPlay={goPlay}
        onMap={goMap}
        onDismiss={() => setShowOutSheet(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  webview: {
    flex: 1,
    backgroundColor: '#fff',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  tokenWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  loading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  toast: {
    marginLeft: 8,
    alignSelf: 'center',
    backgroundColor: '#fff',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  toastText: {
    ...fonts.uiBold,
    color: colors.text,
    fontSize: 12,
    letterSpacing: 0.2,
  },
  reelsBadge: {
    backgroundColor: '#fff',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginLeft: 4,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  reelsBadgeText: {
    ...fonts.uiBold,
    fontSize: 10,
    color: colors.accent,
    letterSpacing: 1,
  },
});
