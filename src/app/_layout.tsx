import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

import { authBus } from '@/lib/auth-bus';

/**
 * Catches `visitgauteng://auth/complete?token=…` deep links and routes
 * the token to whichever AppWebView is mounted. The web app generates
 * this URL after OAuth completes in SFSafariViewController; we dismiss
 * the browser overlay and let the WebView consume the token to claim
 * the session in its own cookie jar.
 */
function handleDeepLink(url: string | null) {
  if (!url) return;
  try {
    const parsed = Linking.parse(url);
    // Path-based check (expo-linking strips the scheme) — matches
    // both visitgauteng://auth/complete?token=… and any future variants.
    const path = (parsed.path ?? '').replace(/^\/+/, '');
    if (path === 'auth/complete') {
      const token = String(parsed.queryParams?.token ?? '');
      if (token) {
        // Best-effort dismiss; throws if no browser is open.
        try { WebBrowser.dismissBrowser(); } catch { /* noop */ }
        authBus.emitToken(token);
      }
    }
  } catch {
    // Ignore malformed URLs
  }
}

export default function RootLayout() {
  useEffect(() => {
    // Cold-start case: app launched directly via deep link.
    Linking.getInitialURL().then(handleDeepLink).catch(() => {});
    // Warm case: app already running when the deep link fires.
    const sub = Linking.addEventListener('url', ({ url }) => handleDeepLink(url));
    return () => sub.remove();
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
      </Stack>
    </SafeAreaProvider>
  );
}
