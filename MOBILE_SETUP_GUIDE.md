# FinPal Mobile - Quick Start Guide

## Project Overview

This is the mobile version of FinPal - An AI-powered personal finance management application built with React Native for iOS and Android.

## Prerequisites

- Node.js 18+
- React Native CLI
- Xcode (for iOS development)
- Android Studio (for Android development)
- CocoaPods (for iOS)

## Quick Setup

### 1. Initialize React Native Project

```bash
# Navigate to FinPal directory
cd c:\Users\gsrib\OneDrive\Desktop\Finpal

# Create React Native project
npx react-native init FinPalMobile --template react-native-template-typescript

# Navigate to mobile project
cd FinPalMobile
```

### 2. Install Dependencies

```bash
# Core navigation
npm install @react-navigation/native @react-navigation/bottom-tabs @react-navigation/stack
npm install react-native-screens react-native-safe-area-context react-native-gesture-handler react-native-reanimated

# State management & API
npm install zustand @tanstack/react-query axios
npm install @react-native-async-storage/async-storage

# Authentication & Security
npm install react-native-keychain
npm install @react-native-google-signin/google-signin
npm install @invertase/react-native-apple-authentication
npm install react-native-biometrics

# Firebase (Push Notifications, Analytics, Crashlytics)
npm install @react-native-firebase/app @react-native-firebase/messaging
npm install @react-native-firebase/analytics @react-native-firebase/crashlytics

# UI Components
npm install nativewind
npm install react-native-modal react-native-bottom-sheet
npm install @shopify/flash-list
npm install lottie-react-native

# Charts
npm install react-native-chart-kit react-native-svg victory-native

# Forms
npm install react-hook-form zod

# Camera & Images
npm install react-native-vision-camera react-native-image-picker react-native-fast-image

# Utilities
npm install date-fns react-native-mmkv react-native-device-info

# PDF Generation
npm install react-native-html-to-pdf

# Offline Support
npm install @react-native-community/netinfo react-native-sqlite-storage

# Icons
npm install lucide-react-native

# Internationalization
npm install i18next react-i18next

# Animations
npm install react-native-confetti-cannon

# Dev Dependencies
npm install --save-dev @testing-library/react-native @types/jest jest babel-jest
npm install --save-dev eslint prettier
npm install --save-dev detox
```

### 3. iOS Setup

```bash
cd ios
pod install
cd ..
```

### 4. Android Setup

Update `android/build.gradle`:
```gradle
buildscript {
    ext {
        buildToolsVersion = "34.0.0"
        minSdkVersion = 24
        compileSdkVersion = 34
        targetSdkVersion = 34
    }
}
```

### 5. Configure Environment Variables

Create `.env` file in root:

```bash
# API Configuration
API_URL=http://localhost:5000/api

# OAuth
GOOGLE_WEB_CLIENT_ID=your-google-client-id
GOOGLE_IOS_CLIENT_ID=your-ios-client-id
GOOGLE_ANDROID_CLIENT_ID=your-android-client-id
APPLE_CLIENT_ID=com.finpal.app.signin

# Firebase
FIREBASE_API_KEY=your-firebase-api-key
FIREBASE_PROJECT_ID=finpal-mobile
FIREBASE_APP_ID_IOS=your-ios-app-id
FIREBASE_APP_ID_ANDROID=your-android-app-id
```

### 6. Run the App

```bash
# iOS
npm run ios

# Android
npm run android

# Start Metro bundler
npm start
```

## Project Structure

See `MOBILE_ARCHITECTURE_PLAN.md` for detailed folder structure.

```
finpal-mobile/
├── src/
│   ├── api/              # API client and endpoints
│   ├── assets/           # Images, fonts, icons
│   ├── components/       # Reusable components
│   ├── config/           # App configuration
│   ├── hooks/            # Custom React hooks
│   ├── navigation/       # Navigation setup
│   ├── screens/          # Screen components
│   ├── services/         # Business logic services
│   ├── store/            # Zustand stores
│   ├── types/            # TypeScript types
│   ├── utils/            # Utility functions
│   └── App.tsx           # Root component
├── android/              # Android native code
├── ios/                  # iOS native code
└── package.json
```

## Available Scripts

```bash
npm start          # Start Metro bundler
npm run ios        # Run iOS simulator
npm run android    # Run Android emulator
npm run test       # Run Jest tests
npm run lint       # Run ESLint
npm run format     # Run Prettier
```

## Development Workflow

1. Make sure backend server is running (`cd server && npm run dev`)
2. Start Metro bundler (`npm start`)
3. Run iOS or Android app
4. Make changes and see hot reload

## Backend Connection

The mobile app connects to your existing FinPal backend:
- Development: `http://localhost:5000/api`
- Production: `https://api.finpal.app/api`

All API endpoints are reused from the web app with no changes needed to the backend.

## Features

✅ JWT Authentication with Biometric support
✅ Dashboard with real-time stats
✅ Transaction management
✅ Budget tracking
✅ FinMate AI Chatbot
✅ Family Mode
✅ Reminders with push notifications
✅ Monthly reports with PDF export
✅ Achievement system
✅ Offline mode with sync
✅ Dark mode support

## Testing

```bash
# Unit tests
npm run test

# E2E tests (Detox)
npm run test:e2e:ios
npm run test:e2e:android
```

## Building for Production

### iOS

```bash
# Build for testing
npm run build:ios

# Archive for App Store
# Use Xcode → Product → Archive
```

### Android

```bash
# Build APK
cd android
./gradlew assembleRelease

# Build AAB for Play Store
./gradlew bundleRelease
```

## Troubleshooting

### iOS Build Issues

```bash
cd ios
pod deintegrate
pod install
cd ..
npm run ios
```

### Android Build Issues

```bash
cd android
./gradlew clean
cd ..
npm run android
```

### Metro Cache Issues

```bash
npm start -- --reset-cache
```

## Documentation

- 📖 Architecture Plan: `MOBILE_ARCHITECTURE_PLAN.md`
- 🎨 Design System: See plan section 11
- 🔌 API Integration: See plan section 7
- 🔒 Security: See plan section 8
- 📱 Deployment: See plan section 12

## Support

For issues or questions:
- Email: support@finpal.app
- GitHub: [Create an issue]

## License

© 2026 FinPal. All rights reserved.
