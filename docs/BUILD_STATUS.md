# Build status

2026-10-10, after the Android UI redesign.

`npm run check` passes: 228 Vitest tests (7 Windows-only skipped on Linux), strict TypeScript, Vite production build, offline cache manifest (24 assets) and the tsup server bundle.

| Output | Size |
|---|---|
| `apps/web/dist/assets/index-*.js` (app) | 336 KB raw |
| `apps/web/dist/assets/three-*.js` (Three.js renderer chunk) | 543 KB raw / 138 KB gzip |
| `apps/web/dist/assets/index-*.css` | 68 KB raw / 13.7 KB gzip (was 105 KB across 13 stylesheets) |
| Fonts | Inter (Latin and Latin Extended) for the UI; Fredoka 600 and Nunito 800 for board textures only |
| `apps/server/dist/index.js` | 58 KB ESM |

Vite still warns that the Three.js chunk exceeds 500 KB; it is loaded once and cached.

Android: `android/` is a Capacitor 8.5.2 project (compileSdk/targetSdk 36, minSdk 24). `npx cap sync android` succeeds and all Android XML resources parse. The Gradle build runs on GitHub Actions (`.github/workflows/android.yml`, ubuntu-24.04) because this environment cannot download the Android SDK (`dl.google.com` denied by network policy). Build of `000896c`: debug APK 4.9 MB, release APK 3.9 MB, no native libraries, `resources.arsc` stored and aligned. See [ANDROID.md](ANDROID.md).

`npm audit` reports a moderate `uuid` advisory inside the iOS `xcode` helper used by the dev-only `@capacitor/cli`; it is not part of the shipped app and the only automatic fix is a CLI downgrade.
