export const INSTAGRAM_URL = 'https://www.instagram.com';

export const INJECTED_JS = `
(function() {
  if (window.__MODINSTA_HOOKED__) return;
  window.__MODINSTA_HOOKED__ = true;

  var SCROLL_TICK_PX = 100;
  var lastTickAt = 0;
  var lastReelEmitAt = 0;

  window.__modinstaFeedFrozen = false;
  window.__modinstaReelsFrozen = false;

  function send(type, payload) {
    try {
      var msg = JSON.stringify(Object.assign({ type: type }, payload || {}));
      window.ReactNativeWebView && window.ReactNativeWebView.postMessage(msg);
    } catch (e) {}
  }

  function injectStyles() {
    if (document.getElementById('modinsta-style')) return;
    var s = document.createElement('style');
    s.id = 'modinsta-style';
    s.innerHTML = [
      'a[href="/explore/"], a[href^="/explore"] { display: none !important; }',
      '[aria-label="Explore"] { display: none !important; }',
      '[data-testid="suggested-list"], [aria-label="Suggested for you"] { display: none !important; }',
      'body.modinsta-feed-frozen [role="main"] { overflow: hidden !important; touch-action: none !important; }',
      'body.modinsta-feed-frozen [role="main"] > * { pointer-events: none !important; }',
      'body.modinsta-reels-frozen { touch-action: none !important; }',
    ].join('\\n');
    document.head.appendChild(s);
  }

  function isOnReels() {
    return location.pathname.indexOf('/reels') === 0;
  }

  function findScrollContainer() {
    var main = document.querySelector('[role="main"]');
    return main || document.scrollingElement || document.documentElement;
  }

  function attachFeedScrollListener() {
    var container = findScrollContainer();
    var lastY = 0;
    var accumulated = 0;

    function onScroll() {
      if (isOnReels()) return;
      var y = (container.scrollTop != null ? container.scrollTop : window.scrollY) || 0;
      var delta = Math.abs(y - lastY);
      lastY = y;
      accumulated += delta;
      while (accumulated >= SCROLL_TICK_PX) {
        accumulated -= SCROLL_TICK_PX;
        var now = Date.now();
        if (now - lastTickAt > 30) {
          lastTickAt = now;
          send('SCROLL_TICK', { y: y });
        }
      }
    }

    container.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  function attachReelsSwipeListener() {
    var startY = null;
    var startX = null;

    document.addEventListener(
      'touchstart',
      function (e) {
        if (!isOnReels()) return;
        if (e.touches.length !== 1) return;
        startY = e.touches[0].clientY;
        startX = e.touches[0].clientX;
      },
      { passive: true }
    );

    document.addEventListener(
      'touchmove',
      function (e) {
        if (!isOnReels()) return;
        if (!window.__modinstaReelsFrozen) return;
        if (startY === null) return;
        var curY = e.touches[0].clientY;
        var curX = e.touches[0].clientX;
        var dy = startY - curY;
        var dx = curX - startX;
        if (Math.abs(dy) > 12 && Math.abs(dy) > Math.abs(dx)) {
          e.preventDefault();
        }
      },
      { passive: false }
    );

    document.addEventListener(
      'touchend',
      function (e) {
        if (!isOnReels()) return;
        if (startY === null) return;
        var endY = e.changedTouches[0].clientY;
        var endX = e.changedTouches[0].clientX;
        var dy = startY - endY;
        var dx = endX - startX;
        startY = null;
        startX = null;
        if (Math.abs(dy) > 60 && Math.abs(dy) > Math.abs(dx)) {
          var now = Date.now();
          if (now - lastReelEmitAt > 500) {
            lastReelEmitAt = now;
            send('REEL_SWIPE', { dy: dy });
          }
        }
      },
      { passive: true }
    );

    // Wheel for desktop / trackpad fallback
    var wheelAccum = 0;
    document.addEventListener(
      'wheel',
      function (e) {
        if (!isOnReels()) return;
        if (window.__modinstaReelsFrozen) {
          e.preventDefault();
          return;
        }
        wheelAccum += e.deltaY;
        if (Math.abs(wheelAccum) > 200) {
          var now = Date.now();
          if (now - lastReelEmitAt > 500) {
            lastReelEmitAt = now;
            send('REEL_SWIPE', { dy: wheelAccum });
          }
          wheelAccum = 0;
        }
      },
      { passive: false }
    );
  }

  function watchSponsored() {
    function pass() {
      var articles = document.querySelectorAll('article');
      articles.forEach(function (a) {
        var t = a.textContent || '';
        if (
          t.indexOf('Sponsored') !== -1 ||
          t.indexOf('Suggested for you') !== -1 ||
          t.indexOf('Suggested post') !== -1
        ) {
          a.style.display = 'none';
        }
      });
    }
    pass();
    var mo = new MutationObserver(pass);
    mo.observe(document.documentElement, { childList: true, subtree: true });
  }

  function scrapeFollowing() {
    var anchors = document.querySelectorAll('a[role="link"][href^="/"]');
    var seen = {};
    var out = [];
    anchors.forEach(function (a) {
      var href = a.getAttribute('href') || '';
      var m = href.match(/^\\/([A-Za-z0-9_.]+)\\/?$/);
      if (!m) return;
      var username = m[1];
      if (seen[username]) return;
      if (username.length < 2) return;
      var img = a.querySelector('img');
      if (!img) return;
      var src = img.getAttribute('src');
      if (!src) return;
      seen[username] = 1;
      out.push({ username: username, profilePic: src });
    });
    if (out.length > 0) {
      send('FOLLOWING_LIST', { list: out });
    }
  }

  function setFeedFrozen(v) {
    window.__modinstaFeedFrozen = !!v;
    if (v) document.body.classList.add('modinsta-feed-frozen');
    else document.body.classList.remove('modinsta-feed-frozen');
  }
  function setReelsFrozen(v) {
    window.__modinstaReelsFrozen = !!v;
    if (v) document.body.classList.add('modinsta-reels-frozen');
    else document.body.classList.remove('modinsta-reels-frozen');
  }

  function listenFromRN() {
    function handler(e) {
      try {
        var data = JSON.parse(e.data);
        if (data.type === 'FREEZE_FEED') setFeedFrozen(true);
        else if (data.type === 'UNFREEZE_FEED') setFeedFrozen(false);
        else if (data.type === 'FREEZE_REELS') setReelsFrozen(true);
        else if (data.type === 'UNFREEZE_REELS') setReelsFrozen(false);
        else if (data.type === 'SCRAPE_FOLLOWING') scrapeFollowing();
      } catch (err) {}
    }
    document.addEventListener('message', handler);
    window.addEventListener('message', handler);
  }

  function watchPath() {
    var lastPath = location.pathname;
    setInterval(function () {
      if (location.pathname !== lastPath) {
        lastPath = location.pathname;
        send('PATH_CHANGE', { path: lastPath });
        if (lastPath.indexOf('/following') !== -1) scrapeFollowing();
      }
    }, 400);
  }

  function ready(fn) {
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      setTimeout(fn, 50);
    } else {
      document.addEventListener('DOMContentLoaded', fn);
    }
  }

  ready(function () {
    injectStyles();
    attachFeedScrollListener();
    attachReelsSwipeListener();
    watchSponsored();
    listenFromRN();
    watchPath();
    send('READY', { path: location.pathname });
  });

  true;
})();
`;

export const RN_TO_WEBVIEW = {
  freezeFeed: JSON.stringify({ type: 'FREEZE_FEED' }),
  unfreezeFeed: JSON.stringify({ type: 'UNFREEZE_FEED' }),
  freezeReels: JSON.stringify({ type: 'FREEZE_REELS' }),
  unfreezeReels: JSON.stringify({ type: 'UNFREEZE_REELS' }),
  scrapeFollowing: JSON.stringify({ type: 'SCRAPE_FOLLOWING' }),
};
