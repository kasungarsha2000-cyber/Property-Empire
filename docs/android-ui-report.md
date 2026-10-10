# Property Empire — Android UI redesign report

Date: 2026-10-10 · Branch: `claude/modest-knuth-kwjx0i` · Starting point: `7922429`

## Summary

The repository had no Android application: the "Android version" was the web page opened in a phone browser.
This work adds a Capacitor Android project around the existing Vite build, replaces the desktop-oriented page layout
with a mobile-first game interface built on central design tokens, adds pass-and-play, and replaces the Windows-only
browser scripts with a cross-platform Playwright suite. The rules engine, 3D board, bots, saves and LAN protocol are
kept; the engine gained one classic-rules change (raising funds during a purchase decision).

**Not done here:** nothing was run on Android hardware; no emulator or device was available. The APK is built on
GitHub Actions because this environment's network policy blocks `dl.google.com` (the Android SDK). Phone-only LAN
hosting (without a computer) was not implemented.

## Results

| Check | Result |
|---|---|
| Unit tests (`npm test`) | 228 passed, 7 skipped (Windows-only launcher tests), 0 failed |
| Typecheck and production build (`npm run check`) | Pass |
| Browser suite (`npm run test:browser`, Chromium 141, phone viewport with touch) | 29 passed, 0 failed |
| Full match driven through the UI (scratch play-through) | 190 turns to elimination, no stalls, no console errors |
| `npx cap sync android`, Android XML well-formedness | Pass |
| Gradle build / APK | Pass on GitHub Actions (ubuntu-24.04): debug and release APKs |
| Release APK 1.0 | Signed with the project release key (APK Signature Scheme v2); signature and ZIP integrity verified |
| Emulator / physical devices / real Wi-Fi between phones | Not tested — none available |

## Files

**Created**
- `apps/web/src/ui/` — `tokens.css` (palette, spacing, radii, elevation, type scale, motion, touch target, safe
  areas), `components.css`, `layout.css`, `panels.css`, `effects.css`; `dom.ts` (escaping, icons, avatars, `patch`),
  `turn-state.ts` (viewer decision and dock model), `hud.ts`, `deed.ts` (preview and full deed), `decisions.ts`
  (purchase, auction, jail, debt, incoming trade), `card-reveal.ts`, `portfolio.ts`, `trade-builder.ts`, `sheets.ts`
  (settings, game menu, rules, player, bank and history), `screens.ts` (menu, setup, lobby), `notices.ts`.
- `apps/web/src/platform.ts` (Capacitor/Web bridge: Back, pause/resume, haptics, share), `lan-address.ts`,
  `ambient-music.ts`, `apps/web/public/webview-update.html`.
- `capacitor.config.ts`, `android/` (Capacitor 8 project with icon, splash, theme, network-security config).
- `playwright.config.ts`, `tests/e2e/*` (5 specs, fixtures, helpers), `tests/rules.test.ts`, `tests/turn-ui.test.ts`,
  `tests/notices.test.ts`, `tests/settings-lan.test.ts`, `scripts/android-build.mjs`.
- Docs: `android-ui-audit.md`, `android-ui-implementation-plan.md`, `ANDROID.md`, this report.

**Refactored**
- `apps/web/src/main.ts` — rewritten as a controller: state, rendering of shell/HUD/dock/panels/sheets/dialogs,
  one Back path, solo, pass-and-play and LAN flows, settings.
- `board-view.ts` — portrait camera framing, re-measure on reset, eased focus/reset, menu idle orbit, render pausing
  (`setActive`, `setPaused`), camera sensitivity, tap-to-dismiss that ignores drags and pinches.
- `storage.ts` — richer settings with migration from the old format; save summary for the menu.
- `network.ts` — reports an unreachable host instead of retrying forever before the first connection.
- `game-sounds.ts`, `match-finale.ts`, `board-moments.ts`, `event-feedback.ts` — new cues, results stats, shared helpers.
- `apps/server/src/server.ts`, `index.ts` — app WebSocket origin, `SAVE_DIR`.
- `packages/core/engine.ts` — build/sell/mortgage allowed for the current player while a purchase is pending;
  new `cancelTrade` action (offering player withdraws an unanswered offer).

**Removed** — `event-presenter.ts`, `card-ui.ts`, `ui-components.ts`, 13 legacy stylesheets (417 hard-coded colours),
15 Python review scripts, `scripts/test-browser.mjs`, `tests/browser-fixtures.ts`, `tests/event-presenter.test.ts`.

## UI improvements

- Full-height game screen: compact HUD (turn, player chips with cash, active ring, bot/jail/offline/bankrupt badges),
  the board filling the middle, and a dock whose single primary button only ever offers a valid action.
- Portrait phones view the board edge-on from the Start side, so the board is noticeably larger than the old
  diagonal view; wider screens keep the diorama angle.
- Tile taps show a compact preview; **Details** opens the full deed with rent schedule by type, costs, set ownership
  and engine-checked actions with the engine's reasons.
- Decision panels: purchase (cash after, raise cash when short), auction (bid board, bidder states, stepper and quick
  increments, history, waiting state), jail (attempt meter, reasons for unavailable options), debt (shortfall meter,
  what can still be raised, confirmed bankruptcy), incoming trade (viewer's perspective, plain-language sentence).
- Chance (orange) and Community Chest (blue) cards rise and flip, keep the 32 original illustrations and motions,
  and apply only on **Continue**; observers see a compact copy.
- Sheets: properties by colour set with one-tap build/sell/mortgage, two-sided trade builder with review, bank and
  money history, player overview, settings, rules with both decks, game menu with confirmations.
- Menu built around the 3D board hero; Continue/Rejoin enabled only when available; setup with token picker,
  steppers, segmented rules and a live summary; lobby with share invite and readiness.
- Inter for UI type; text size setting; reduced motion; 44–48 px touch targets; safe-area insets.
- Sheets, dialogs, hand-over and card layers make everything behind them inert; closing sheets returns focus to
  the control that opened them.

## Gameplay and correctness

- 48-test rules suite; no engine defects found in the existing rules.
- New: raising funds while deciding on a purchase (classic rules), and withdrawing an unanswered trade offer so an
  absent LAN player cannot block the game.
- Deliberate simplifications kept and documented: trading only on your turn with one offer per turn, no
  building-shortage auctions, mortgaged-deed transfer always charges 10 %.

## Android

- Capacitor 8.5.2 shell; `http://localhost` scheme; network-security config for LAN cleartext; INTERNET permission
  only; portrait on phones; WebView 111+ with an update page; original icon and splash; Back routed through the
  in-app layer stack; saves and render-loop pause on background; haptics; share sheet for room invites.

## Multiplayer

- Protocol unchanged. The host accepts the app's WebSocket origin. Clients lock a command until the host answers,
  explain unreachable hosts and missing rooms, and offer Rejoin. Pass-and-play on one device was added.

## Saves

- Format unchanged (`Game` version 1). Solo saves still go to IndexedDB with a backup; settings migrate from the
  old format. Saving happens after every action and when the app is backgrounded.

## Performance

- 3D rendering stops behind full-screen pages and full-height sheets on phones, and the animation loop is released
  while the app is in the background. Low-memory or low-core devices start on Low graphics. CSS shrank from 105 KB
  to 68 KB. Real device frame rates were not measured.

## Known issues and remaining work

1. Install the release APK on devices and complete the device checklist in `ANDROID.md`.
2. Phone-only LAN hosting is not implemented; a computer runs the host.
3. The Android system font scale is not read; the in-app Text size setting is provided instead.
4. Predictive back, edge-to-edge insets, haptics and keyboard resizing need confirmation on Android 14–16 devices.
5. The Three.js chunk is 543 KB (Vite size warning); it is cached after the first load.
6. `npm audit`: moderate `uuid` advisory in the dev-only Capacitor CLI's iOS helper.

## How to run

- **Web (development):** `npm ci`, then `npm run dev` (solo) or `npm run dev:lan`; open http://localhost:5173.
- **Web (production/LAN host):** `npm run build`, then `npm run start:lan`; open http://localhost:3001. On Windows,
  `setup.bat` once and then `run.bat`.
- **Android:** `npm run android:sync`, then `npm run android:open` and Run in Android Studio.
- **APK:** `npm run android:build` → `android/app/build/outputs/apk/debug/app-debug.apk`; `npm run android:release`
  → `app-release.apk`, signed when `android/keystore.properties` exists (JDK 21 and the SDK). GitHub Actions builds both
  on every push and attaches them to the `android-build` prerelease.
- **Install on a device:** enable USB debugging, then `adb install -r android/app/build/outputs/apk/debug/app-debug.apk`.
- **Host a LAN game:** start the host on a computer (`run.bat` or `npm run start:lan`), note the printed Wi-Fi address,
  then in the app or a browser choose **Host LAN game**, enter the address if asked and create the room.
- **Join from another Android device:** **Join LAN game**, enter the same host address and the six-character room code,
  then **I'm ready**.
- **Tests:** `npm test`; `npm run build && npm run test:browser` (first `npx playwright install chromium` on a new machine).
