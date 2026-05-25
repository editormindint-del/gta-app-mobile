import { useNetInfo } from '@react-native-community/netinfo';
import * as Linking from 'expo-linking';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import { IN_APP_HOSTS, NATIVE_UA_TOKEN } from '@/constants/config';

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

  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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
  loader:     { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#111111' },
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
