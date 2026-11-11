# Campaign Monitor — mobile app (Part 2)

React Native CLI app (no Expo) for internal operations: live campaign health, a push notification previewer, failure alerts and a biometric lock.

## Run it

Prerequisites: the standard [React Native CLI environment](https://reactnative.dev/docs/set-up-your-environment) (Node 22+, JDK 17, Android Studio; Xcode + CocoaPods for iOS).

```bash
# 1. Start the mock API from the repo root (the app reads from it)
cd mock-api && npm install && npm start

# 2. In another terminal
cd mobile
npm install

# Android (emulator or device)
npm run android

# iOS (macOS only)
cd ios && bundle install && bundle exec pod install && cd ..
npm run ios
```

**API address** is set in `src/core/config.ts`:

| Where the app runs | URL |
|---|---|
| Android emulator | `http://10.0.2.2:4000` (default) |
| iOS simulator | `http://localhost:4000` (default) |
| Physical device | Your computer's LAN IP, e.g. `http://192.168.1.20:4000` |

**Biometric lock:** the app asks for Face ID / Touch ID / fingerprint or the device passcode on start and after more than 30 s in the background. On an emulator without a screen lock, use the "Skip (development build only)" button, which only exists in debug builds. To test the real prompt: iOS Simulator → Features → Face ID → Enrolled; Android emulator → set a PIN and enrol a fingerprint in Settings.

**Demo the alert:** campaign `cmp_0006` "Flash sale (SMS)" in the mock API always runs above 20% failure. Open the app, allow notifications, and an alert appears on the first sync. Tapping it opens the campaign.

## Checks

```bash
npm run typecheck
npm run lint
npm test
```

## Structure

```
src/
├── app/            App shell: navigation, NavigationService, i18n, module registration
├── core/           API client + decoders, SQLite (op-sqlite) repositories, health rules, config, logger
├── ui/             Theme tokens and shared components
└── modules/
    ├── campaign-health/   Feature 1: live list, pull-to-refresh, polling, offline cache, detail
    ├── push-preview/      Feature 2: notification previewer (iOS/Android, collapsed/expanded, widths)
    ├── alerts/            Feature 3a: >20% failure → local notification, with re-arm at 18%
    └── security/          Feature 3b: biometric lock, re-lock after 30 s, app-switcher cover
```

Each module has `screens/`, `viewmodels/` (MVVM), `store/` (Zustand), `services/`, `components/`, `i18n/` and an `index.ts` that is its only public entry. Design decisions are in [`../ENGINEERING_NOTES.md`](../ENGINEERING_NOTES.md).

## Libraries

| Need | Library |
|---|---|
| Navigation | React Navigation (native stack + bottom tabs) |
| State | Zustand |
| Networking / parsing | axios + hand-written decoders (`src/core/api/decoders.ts`) |
| Offline cache | `@op-engineering/op-sqlite` |
| Connectivity | `@react-native-community/netinfo` |
| Local notifications | `@notifee/react-native` |
| Biometrics | `react-native-biometrics` |
| Text | i18next + react-i18next |
| Tests | Jest + React Native Testing Library |
