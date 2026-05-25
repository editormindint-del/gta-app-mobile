import Constants from 'expo-constants';
import { Platform } from 'react-native';

/** The web app we wrap. */
export const BASE_URL = 'https://visit.gauteng.net';

/** Per-tab landing URLs. The web layout will hide its bottom nav when it sees
 *  our custom User-Agent token, so each WebView only paints content + the
 *  top bar. */
export const TAB_URLS = {
  visit:    `${BASE_URL}/visit`,
  business: `${BASE_URL}/gcceb`,
  live:     `${BASE_URL}/live`,
  market:   `${BASE_URL}/market`,
  more:     `${BASE_URL}/more`,
} as const;

export type TabKey = keyof typeof TAB_URLS;

/** Custom UA token appended to the default WebView UA. The web app pattern-
 *  matches on `VisitGauteng-Native` to detect that it's running inside the
 *  native shell and adjust its layout (hide bottom nav, drop safe-area pad). */
export const NATIVE_UA_TOKEN = `VisitGauteng-Native/${Constants.expoConfig?.version ?? 'dev'} (${Platform.OS})`;

/** Hosts we keep INSIDE the WebView even though they're not the base domain.
 *  PayFast checkout, OAuth redirects, etc. Everything else opens in Safari. */
export const IN_APP_HOSTS = new Set<string>([
  'visit.gauteng.net',
  'market.gauteng.net',
  'sandbox.payfast.co.za',
  'www.payfast.co.za',
  'accounts.google.com',
  'www.facebook.com',
  'm.facebook.com',
]);
