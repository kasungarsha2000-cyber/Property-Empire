# Blockers and verification boundaries

- **Local Android build:** the build environment's network policy denies `dl.google.com`, so the Android SDK cannot be
  installed here. APKs are built on GitHub Actions instead; allow that host to build locally.
- **Devices:** no physical Android phones, tablets or emulator were available. Device behaviour (Back gesture, safe
  areas, haptics, lifecycle, Wi-Fi/hotspot LAN, performance) is unverified; the checklist is in `docs/ANDROID.md`.
- **Phone-only hosting:** LAN games still need the Node host on a computer. Hosting from a phone would require an
  embedded WebSocket server in a native plugin and device testing.
- Safari, Firefox and real low-end GPU frame rates remain unverified.

The only remote publishing is the repository's own GitHub Actions workflow and its `android-build` prerelease.
