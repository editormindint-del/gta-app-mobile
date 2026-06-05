/**
 * Tiny pub/sub used to relay an OAuth magic token from the deep-link handler
 * (registered in app/_layout.tsx) to whichever AppWebView is currently mounted.
 *
 * The web app sets up a one-time token on visit.gauteng.net after OAuth
 * completes in SFSafariViewController, then triggers the visitgauteng://
 * custom scheme. We catch the URL here and the WebView consumes the token
 * at /auth/mobile-consume so the session cookie lands in the WebView's
 * cookie jar (not SFSafariViewController's isolated one).
 *
 * Dedupe is critical: a single OAuth completion triggers the URL handler
 * 3–4 times (Linking.getInitialURL fires on cold start, Linking 'url'
 * event fires for foreground delivery, and openAuthSessionAsync's resolved
 * URL fires a third path). Without dedupe, /auth/mobile-consume gets hit
 * 3–4 times for one token; the first succeeds, the rest fail with the
 * token-already-consumed error, and the WebView ends up on /?login=1
 * instead of /. The 30s window is well beyond any iOS handler-fan-out
 * but well below the token's 5-min TTL.
 */
type Listener = (token: string) => void;

const listeners = new Set<Listener>();
let pendingToken:   string | null = null;
let lastEmitToken:  string | null = null;
let lastEmitAt:     number        = 0;

const DEDUPE_WINDOW_MS = 30_000;

export const authBus = {
  /** Called from the deep-link handler when visitgauteng://auth/complete?token=… arrives. */
  emitToken(token: string) {
    const now = Date.now();
    if (token === lastEmitToken && now - lastEmitAt < DEDUPE_WINDOW_MS) {
      // Same token fired again within the dedupe window — almost certainly
      // a duplicate from one of the other URL-delivery paths. Drop it.
      return;
    }
    lastEmitToken = token;
    lastEmitAt    = now;

    if (listeners.size === 0) {
      // No WebView mounted yet (cold start). Stash the token; the first
      // WebView to subscribe will pick it up.
      pendingToken = token;
      return;
    }
    listeners.forEach(l => l(token));
  },

  /** WebView subscribes here. Returns an unsubscribe function. */
  onToken(handler: Listener) {
    listeners.add(handler);
    // Flush any token that arrived before we were mounted.
    if (pendingToken) {
      const t = pendingToken;
      pendingToken = null;
      // Defer so the subscriber's effect has time to settle.
      setTimeout(() => handler(t), 0);
    }
    return () => { listeners.delete(handler); };
  },
};
