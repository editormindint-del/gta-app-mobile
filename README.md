# Visit Gauteng — Mobile (iOS + Android)

Native shell wrapping [visit.gauteng.net](https://visit.gauteng.net) with a native bottom tab bar and OS-level features (share, pull-to-refresh, offline detection, push registration).

Built with Expo SDK 56 + expo-router + react-native-webview. Same TypeScript/React stack as the web app, so the same team can maintain it.

---

## What's native vs what loads from the web

| Layer | Native | Web |
|---|---|---|
| Bottom tab bar (5 tabs) | ✅ | hidden via UA detection |
| Top bar | | ✅ |
| All page content | | ✅ |
| Share sheet (iOS/Android system) | ✅ | |
| Pull-to-refresh | ✅ | |
| Offline screen | ✅ | |
| Loading spinner | ✅ | |
| Cookie/session storage | ✅ shared across tabs | |

The web app detects the native shell via a custom UA token (`VisitGauteng-Native/<version> (<os>)`) and hides its own bottom nav so the native one isn't duplicated.

---

## Project layout

```
src/
├── app/
│   ├── _layout.tsx              ← root Stack + SafeAreaProvider + StatusBar
│   └── (tabs)/
│       ├── _layout.tsx          ← bottom Tabs config (5 tabs, dark theme, gold accent)
│       ├── visit.tsx            ← AppWebView(/visit)
│       ├── business.tsx         ← AppWebView(/gcceb)
│       ├── live.tsx             ← AppWebView(/live)
│       ├── market.tsx           ← AppWebView(/market)
│       └── more.tsx             ← AppWebView(/more)
├── components/
│   └── app-webview.tsx          ← shared WebView with all native features
└── constants/
    └── config.ts                ← BASE_URL, per-tab URLs, custom UA, IN_APP_HOSTS allowlist
```

---

## Local dev

```bash
npm install
npx expo start
```

Press `i` for iOS Simulator (requires Xcode), `a` for Android emulator (requires Android Studio), or scan the QR code with the Expo Go app on a physical device.

To preview without setting up any local toolchain, use **Expo Go** on your phone — it runs the JS without needing native build.

---

## Building for distribution

We use EAS Build (cloud builds — no Mac required).

```bash
# One-time, link this repo to an Expo account
npx eas init

# iOS TestFlight build (production profile)
npx eas build --platform ios --profile production

# Android Play Internal Testing build (production profile, AAB)
npx eas build --platform android --profile production

# Submit the latest iOS build to TestFlight automatically
npx eas submit --platform ios --latest

# Submit the latest Android build to the internal track
npx eas submit --platform android --latest
```

### EAS Build credentials

iOS uploads use the App Store Connect API key. On the prod box it lives at `/root/secrets/AuthKey_4ARW28DFUW.p8` (mode 600, root-only, never committed). Key ID + Issuer ID + Apple Team ID + bundle ID are in `/root/secrets/asc-api-creds.env`. EAS reads these via env vars or interactive prompt at submit time.

---

## Bumping the version

`app.json` holds the user-facing version (`expo.version`) and per-platform build counters (`ios.buildNumber`, `android.versionCode`). When you cut a new release:

1. Bump `expo.version` (semver — e.g. `2.1.1`)
2. Bump `ios.buildNumber` (string — every iOS build must have a higher number than the previous one on App Store Connect)
3. Bump `android.versionCode` (integer — same rule on Play Console)
4. Run `eas build` and `eas submit`

`eas.json` is already configured with `appVersionSource: "remote"` and `autoIncrement: true` on the production profile — EAS will increment build numbers for you.

---

## Updating without re-submitting (OTA)

Most JS-only changes (new screens, copy tweaks, even most React code) can ship via Expo Updates without going through App Store/Play review:

```bash
npx eas update --branch production --message "..."
```

The app will pull the new JS bundle on next launch. Native changes (new permission, new plugin, app icon) still require a full rebuild + submit.

---

## App Store / Play Store metadata that lives outside this repo

- **App Store Connect** listing: name, description, keywords, screenshots, privacy info, category — all managed in https://appstoreconnect.apple.com
- **Google Play Console** listing: same set of fields at https://play.google.com/console
- **Privacy policy URL**: https://visit.gauteng.net/privacy
- **Bundle identifier**: `com.visitgp.app` (iOS + Android — same string)
- **Apple Team ID**: `84NC742K68`
