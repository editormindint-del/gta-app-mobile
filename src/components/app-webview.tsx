import { useNetInfo } from '@react-native-community/netinfo';
import * as Linking from 'expo-linking';
import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView, type WebViewMessageEvent, type WebViewNavigation } from 'react-native-webview';

import { IN_APP_HOSTS, NATIVE_UA_TOKEN } from '@/constants/config';

type Props = {
  /** Initial URL this tab opens to. */
  url: string;
  /** Human label used by the native share sheet. */
  shareTitle?: string;
};

/** Shared WebView screen wrapped with native niceties:
 *   - injects custom UA so the web app can hide its own bottom nav
 *   - shows a native spinner during the very first load
 *   - pull-to-refresh
 *   - offline fallback screen
 *   - native iOS/Android share button (top-right)
 *   - external/unfamiliar links open in the system browser instead of trapping
 *     the user inside the WebView */
export function AppWebView({ url, shareTitle }: Props) {
  const webRef = useRef<WebView>(null);
  const netInfo = useNetInfo();

  const [loading, setLoading]         = useState(true);
  const [currentUrl, setCurrentUrl]   = useState(url);
  const [refreshing, setRefreshing]   = useState(false);

  // Reset to the tab's home URL each time the tab regains focus,
  // mimicking native tab-switching behaviour.
  useFocusEffect(
    useCallback(() => {
      // No-op: WebView holds state across focus. We only force-reload
      // if the user explicitly pulls to refresh or hits the share/back.
    }, [])
  );

  function handleNavChange(nav: WebViewNavigation) {
    setCurrentUrl(nav.url);
  }

  /** Decide whether to follow a link inside the WebView or hand off
   *  to the system browser. We keep our domain + known auth/payment
   *  hosts in-app; everything else (third-party blogs, mailto:, tel:,
   *  app:// etc.) goes to the OS. */
  function shouldStartLoad(req: { url: string }) {
    try {
      const u = new URL(req.url);
      if (u.protocol === 'mailto:' || u.protocol === 'tel:' || u.protocol === 'sms:') {
        Linking.openURL(req.url);
        return false;
      }
      if (u.protocol !== 'http:' && u.protocol !== 'https:') return true;
      if (IN_APP_HOSTS.has(u.host)) return true;
      Linking.openURL(req.url);
      return false;
    } catch {
      return true;
    }
  }

  async function onShare() {
    try {
      await Share.share({
        message: currentUrl,
        url:     currentUrl,
        title:   shareTitle ?? 'Visit Gauteng',
      });
    } catch {
      /* user cancelled */
    }
  }

  function onRefresh() {
    setRefreshing(true);
    webRef.current?.reload();
    // WebView's onLoadEnd will toggle refreshing off
  }

  function onMessage(_e: WebViewMessageEvent) {
    /* reserved for future native<->web bridging (push, geolocation, etc.) */
  }

  // ── Offline fallback ─────────────────────────────────────────────────────
  if (netInfo.isInternetReachable === false) {
    return (
      <SafeAreaView style={styles.fallback} edges={['top', 'left', 'right']}>
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
    <SafeAreaView style={styles.root} edges={['top', 'left', 'right']}>
      {/* Native action bar (share). Placed above the WebView. */}
      <View style={styles.actionBar}>
        <Pressable
          hitSlop={12}
          onPress={onShare}
          accessibilityLabel="Share this page"
          accessibilityRole="button"
        >
          <Text style={styles.actionText}>Share</Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.flex}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#f7b81e" />
        }
      >
        <WebView
          ref={webRef}
          source={{ uri: url }}
          applicationNameForUserAgent={NATIVE_UA_TOKEN}
          sharedCookiesEnabled
          thirdPartyCookiesEnabled
          startInLoadingState
          onLoadStart={() => setLoading(true)}
          onLoadEnd={() => { setLoading(false); setRefreshing(false); }}
          onNavigationStateChange={handleNavChange}
          onShouldStartLoadWithRequest={shouldStartLoad}
          onMessage={onMessage}
          allowsBackForwardNavigationGestures
          decelerationRate="normal"
          pullToRefreshEnabled
          renderLoading={() => (
            <View style={styles.loader}>
              <ActivityIndicator size="large" color="#f7b81e" />
            </View>
          )}
          style={styles.flex}
        />
      </ScrollView>

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
  actionBar:  {
    height: 38,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 14,
    backgroundColor: '#111111',
  },
  actionText: { color: '#f7b81e', fontSize: 14, fontWeight: '700' },
  loader:     { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#111111' },
  topProgress: {
    position: 'absolute',
    top: 38, // sits under the action bar
    right: 14,
  },
  // Offline fallback
  fallback:   { flex: 1, backgroundColor: '#111111', alignItems: 'center', justifyContent: 'center', padding: 24 },
  fallbackTitle: { color: '#ffffff', fontSize: 20, fontWeight: '700', marginBottom: 8 },
  fallbackBody:  { color: '#b8c0bd', fontSize: 14, textAlign: 'center', marginBottom: 20 },
  button:     { backgroundColor: '#f7b81e', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 999 },
  buttonText: { color: '#111111', fontWeight: '700' },
});
