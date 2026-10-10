# Blockers and verification boundaries

- **Android APK build (blocked):** the build environment's network policy denies `dl.google.com`, so the Android SDK
  platform and build tools could not be installed and Gradle was not run. Allow that host (or build on a machine with
  Android Studio) and run `npm run android:build`.
- **Devices:** no physical Android phones, tablets or emulator were available. Device behaviour (Back gesture, safe
  areas, haptics, lifecycle, Wi-Fi/hotspot LAN, performance) is unverified; the checklist is in `docs/ANDROID.md`.
- **Phone-only hosting:** LAN games still need the Node host on a computer. Hosting from a phone would require an
  embedded WebSocket server in a native plugin and device testing.
- Safari, Firefox and real low-end GPU frame rates remain unverified.

No account credentials, cloud services or remote publishing were used.
