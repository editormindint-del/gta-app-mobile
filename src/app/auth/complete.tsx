import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { authBus } from '@/lib/auth-bus';

/**
 * Deep-link landing route for `visitgauteng://auth/complete?token=…`.
 *
 * OAuth flows that hand off to the system browser via WebBrowser.openBrowserAsync
 * (Google / Apple / Facebook, see OAUTH_HOSTS in app-webview.tsx) redirect back
 * to visitgauteng://auth/complete as an OS-level deep link. expo-router resolves
 * that against the route tree, and without this file it lands on the built-in
 * "Unmatched Route" screen — which is the "unmatched route" error users hit on
 * login. (The openAuthSessionAsync path captures the redirect itself and never
 * fires a deep link, so it was unaffected, which is why only some logins broke.)
 *
 * This screen catches the token, hands it to authBus — which stashes it as a
 * pendingToken until an AppWebView subscribes — then replaces itself with the
 * tabs. The remounted WebView picks up the pending token and consumes it at
 * /auth/mobile-consume so the session cookie lands in its own jar. The root
 * _layout deep-link listener also fires; authBus dedupes the double emit.
 */
export default function AuthComplete() {
  const { token } = useLocalSearchParams<{ token?: string }>();

  useEffect(() => {
    if (token) authBus.emitToken(String(token));
    // replace (not push) so this transient screen never enters the back stack.
    router.replace('/(tabs)');
  }, [token]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#f7b81e" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111111',
  },
});
