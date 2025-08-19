# PillPilot (Expo MVP)

**Privacy-first medication reminders and dose logging with 7-day adherence analytics.**  
Built with **Expo React Native**. All data stays **on device** (no cloud).  
> Prototype for learning; **not a medical device**.

**▶ Live demo (Snack):** https://snack.expo.dev/@YOURNAME/pillpilot   <!-- replace with your link -->

[![Expo](https://img.shields.io/badge/Expo-React%20Native-black)]()
[![Local Notifications](https://img.shields.io/badge/Local-Notifications-blue)]()
[![Privacy](https://img.shields.io/badge/Privacy-On%20device-green)]()

## ✨ Features
- Schedule **daily local notifications** per medication time (e.g., 08:00, 20:00)
- **One-tap “Mark taken”** and automatic dose log
- **7-day adherence %** (taken / scheduled)
- **Local storage only** via AsyncStorage (no sign-in, no cloud)
## 🧱 Tech
- Expo React Native (Snack / Expo Go)
- `expo-notifications` – daily local reminders
- `@react-native-async-storage/async-storage` – on-device storage
- `dayjs` – date/time handling
- Platforms: iOS & Android (runs in Expo Go)

## 🚀 Run it
**Snack (no installs)**
1. Open the link above in a browser.
2. Tap **Run on your device** and scan with **Expo Go** on your phone.  
   > iOS/Android: allow notifications for Expo Go.

**Local**
```bash
npx create-expo-app pillpilot
cd pillpilot
npx expo install expo-notifications @react-native-async-storage/async-storage
npm i dayjs
npx expo start
