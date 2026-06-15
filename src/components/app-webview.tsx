import { useNetInfo } from '@react-native-community/netinfo';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import { BASE_URL, IN_APP_HOSTS, NATIVE_UA_TOKEN } from '@/constants/config';
import { authBus } from '@/lib/auth-bus';

/** Hosts that demand a "real browser" UA (Google enforces this with a hard
 *  403 disallowed_useragent on accounts.google.com when called from any
 *  WebView). For these, we hand the URL to SFSafariViewController via
 *  expo-web-browser, which is a "secure browser" Google accepts. After the
 *  user signs in there, the session cookie lands in the iOS shared cookie
 *  store (because the WebView has sharedCookiesEnabled), so reloading the
 *  WebView on dismiss picks up the new session automatically. */
const OAUTH_HOSTS = new Set<string>([
  'accounts.google.com',
  'appleid.apple.com',
  'idmsa.apple.com',
  // Facebook OAuth lives on www.facebook.com but we allow normal facebook.com
  // links to render in the WebView — disambiguate by path prefix in shouldStartLoad.
]);

/** Path prefixes on www.facebook.com that are OAuth dialogs (not regular
 *  Facebook pages). Catches paths like /v18.0/dialog/oauth, /login/, etc. */
const FACEBOOK_OAUTH_PREFIXES = ['/dialog/oauth', '/login', '/v', '/oauth'];

/** JS injected into every WebView before the page runs. Exposes a tiny
 *  native bridge the web app can call to start an OAuth flow in the system
 *  browser. We do this because Google's "Use secure browsers" policy hard-
 *  blocks any WebView UA on accounts.google.com (Error 403
 *  disallowed_useragent), and relying on onShouldStartLoadWithRequest to
 *  catch the cross-origin redirect from NextAuth's POST is flaky on iOS
 *  WebKit. With this bridge the web app gets the OAuth URL up front and
 *  hands it straight to SFSafariViewController / Chrome Custom Tabs,
 *  which Google accepts. */
const NATIVE_BRIDGE_JS = `
(function() {
  if (window.__vgNative && window.__vgNative.version >= 2) return;
  window.__vgNative = {
    version: 2,
    /** Open an OAuth provider URL in the system browser. */
    openOAuth: function(url) {
      try {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'open-oauth',
          url: String(url || ''),
        }));
      } catch (_e) {}
    },
  };
})();
true;
`;

type Props = {
  /** Initial URL this tab opens to. */
  url: string;
  /** Reserved for future use (deep-link / share-sheet title). */
  shareTitle?: string;
};

/** Shared WebView screen wrapped with native niceties:
 *   - injects custom UA so the web app can hide its own bottom nav
 *   - shows a native spinner during the very first load
 *   - pull-to-refresh
 *   - offline fallback screen
 *   - external/unfamiliar links open in the system browser instead of trapping
 *     the user inside the WebView */
export function AppWebView({ url }: Props) {
  const webRef = useRef<WebView>(null);
  const netInfo = useNetInfo();

  const [loading, setLoading] = useState(true);

  // Subscribe to the deep-link auth bus. When the user finishes OAuth in
  // SFSafariViewController, the web app redirects to visitgauteng://auth/
  // complete?token=…; the root layout catches that, dismisses the browser
  // overlay, and emits the token here. We navigate the WebView to the
  // consume endpoint so the session cookie lands in the WebView's own jar.
  useEffect(() => {
    return authBus.onToken((token) => {
      const consumeUrl = `${BASE_URL}/auth/mobile-consume?token=${encodeURIComponent(token)}`;
      // Use injectJavaScript instead of reload — webRef.source can be stale.
      webRef.current?.injectJavaScript(
        `window.location.replace(${JSON.stringify(consumeUrl)}); true;`
      );
    });
  }, []);

  /** Open URL in iOS SFSafariViewController / Android Custom Tabs. Used for
   *  generic external links (third-party blogs, PayFast, etc.) where we don't
   *  need a custom-scheme return — just a "go look at this and come back". */
  async function openInBrowser(targetUrl: string) {
    try {
      await WebBrowser.openBrowserAsync(targetUrl, {
        toolbarColor:           '#111111',
        controlsColor:          '#f7b81e',
        secondaryToolbarColor:  '#111111',
        dismissButtonStyle:     'close',
      });
    } catch {
      // User dismissed or browser failed to open — nothing to recover.
    }
  }

  /** Open an OAuth provider URL in an ASWebAuthenticationSession (iOS) /
   *  Custom Tabs auth session (Android). Unlike openBrowserAsync, this
   *  session DOES recognise custom URL schemes — when the page navigates to
   *  visitgauteng://auth/complete?token=…, the session auto-closes and the
   *  URL is returned to us. SFSafariViewController blocks custom schemes
   *  outright, which is why the "Open app" button on the handoff page
   *  appears to do nothing if we use openBrowserAsync. */
  async function openOAuthSession(targetUrl: string) {
    try {
      const result = await WebBrowser.openAuthSessionAsync(
        targetUrl,
        'visitgauteng://auth/complete',
        {
          toolbarColor:    '#111111',
          controlsColor:   '#f7b81e',
          // Use the same iCloud Keychain / cookies as Safari so users who
          // are already signed in to Google in Safari can pick that account.
          preferEphemeralSession: false,
        }
      );
      if (result.type === 'success' && result.url) {
        const u = new URL(result.url);
        const token = u.searchParams.get('token');
        if (token) authBus.emitToken(token);
      }
    } catch {
      // User cancelled or session failed; nothing to recover.
    }
  }

  /** Decide whether to follow a link inside the WebView or hand off
   *  to the system browser. */
  function shouldStartLoad(req: { url: string }) {
    try {
      const u = new URL(req.url);

      // Non-http(s) handlers go to the OS.
      if (u.protocol === 'mailto:' || u.protocol === 'tel:' || u.protocol === 'sms:') {
        Linking.openURL(req.url);
        return false;
      }
      if (u.protocol !== 'http:' && u.protocol !== 'https:') return true;

      // OAuth providers refuse WebView UAs — open in system browser instead.
      const isFacebookOAuth =
        (u.host === 'www.facebook.com' || u.host === 'm.facebook.com') &&
        FACEBOOK_OAUTH_PREFIXES.some(p => u.pathname.startsWith(p));
      if (OAUTH_HOSTS.has(u.host) || isFacebookOAuth) {
        void openInBrowser(req.url);
        return false;
      }

      // Our domain + everything in the allowlist renders in-app.
      if (IN_APP_HOSTS.has(u.host)) return true;

      // Everything else (third-party blogs etc.) opens in the OS browser.
      Linking.openURL(req.url);
      return false;
    } catch {
      return true;
    }
  }

  // (Outer ScrollView+RefreshControl was removed: it intercepted vertical
  //  drags on Android and triggered a refresh when the user was just trying
  //  to scroll the page. The WebView's native pullToRefreshEnabled handles
  //  Android refresh correctly because it only fires when the WebView's own
  //  scroll position is at the top.)

  function onMessage(e: WebViewMessageEvent) {
    try {
      const msg = JSON.parse(e.nativeEvent.data) as { type?: string; url?: string };
      if (msg?.type === 'open-oauth' && typeof msg.url === 'string' && msg.url) {
        void openOAuthSession(msg.url);
      }
    } catch {
      // Ignore non-JSON messages; they're for future native<->web bridging.
    }
  }

  // ── Offline fallback ─────────────────────────────────────────────────────
  if (netInfo.isInternetReachable === false) {
    return (
      <SafeAreaView style={styles.fallback} edges={['left', 'right']}>
        <Text style={styles.fallbackTitle}>You&apos;re offline</Text>
        <Text style={styles.fallbackBody}>
          Visit Gauteng needs an internet connection. Reconnect and pull down to refresh.
        </Text>
        <Pressable style={styles.button} onPress={() => webRef.current?.reload()}>
          <Text style={styles.buttonText}>Try again</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['left', 'right']}>
      <WebView
        ref={webRef}
        source={{ uri: url }}
        applicationNameForUserAgent={NATIVE_UA_TOKEN}
        sharedCookiesEnabled
        thirdPartyCookiesEnabled
        startInLoadingState
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
        onShouldStartLoadWithRequest={shouldStartLoad}
        onMessage={onMessage}
        injectedJavaScriptBeforeContentLoaded={NATIVE_BRIDGE_JS}
        allowsBackForwardNavigationGestures
        pullToRefreshEnabled
        renderLoading={() => (
          <View style={styles.loader}>
            <Image
              source={require('@/assets/images/splash-icon.png')}
              style={styles.loaderLogo}
              resizeMode="contain"
            />
            <ActivityIndicator size="small" color="#f7b81e" style={styles.loaderSpinner} />
          </View>
        )}
        style={styles.flex}
      />

      {loading && (
        <View pointerEvents="none" style={styles.topProgress}>
          <ActivityIndicator size="small" color="#f7b81e" />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root:       { flex: 1, backgroundColor: '#111111' },
  flex:       { flex: 1 },
  loader:        { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#111111' },
  loaderLogo:    { width: 140, height: 140, marginBottom: 28 },
  loaderSpinner: { transform: [{ scale: 0.9 }] },
  topProgress: {
    position: 'absolute',
    top: 8,
    right: 12,
  },
  // Offline fallback
  fallback:   { flex: 1, backgroundColor: '#111111', alignItems: 'center', justifyContent: 'center', padding: 24 },
  fallbackTitle: { color: '#ffffff', fontSize: 20, fontWeight: '700', marginBottom: 8 },
  fallbackBody:  { color: '#b8c0bd', fontSize: 14, textAlign: 'center', marginBottom: 20 },
  button:     { backgroundColor: '#f7b81e', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 999 },
  buttonText: { color: '#111111', fontWeight: '700' },
});
