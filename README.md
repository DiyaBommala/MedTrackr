# PillPilot (Expo MVP)

**Privacy-first medication reminders and dose logging with 7-day adherence analytics.**  
Built with **Expo React Native**. All data stays **on device** (no cloud).  
> Prototype for learning; **not a medical device**.

[![Expo](https://img.shields.io/badge/Expo-React%20Native-black)]()
[![Notifications](https://img.shields.io/badge/Local-Notifications-blue)]()
[![Privacy](https://img.shields.io/badge/Privacy-On%20device-green)]()

## ✨ Features
- Schedule **daily local notifications** per medication time (e.g., 08:00, 20:00)
- **One-tap “Mark taken”** and automatic dose log
- **7-day adherence %** (taken / scheduled)
- **Local storage only** via AsyncStorage (no sign-in, no cloud)

## 🚀 Run it
**Option A — Snack (no installs)**
1. Open the Snack link (or paste this repo’s `App.js` into https://snack.expo.dev).
2. Add dependencies: `expo-notifications`, `@react-native-async-storage/async-storage`, `dayjs`.
3. Tap **Run on your device** and scan with **Expo Go**.  
   > iOS/Android: allow notifications for Expo Go.

**Option B — Local**
```bash
npx create-expo-app pillpilot
cd pillpilot
npx expo install expo-notifications @react-native-async-storage/async-storage
npm i dayjs
npx expo start
