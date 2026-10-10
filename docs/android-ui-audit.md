# Property Empire — Android UI audit

Date: 2026-10-10. Scope: the whole repository at commit `7922429`, inspected before any change.
Method: source reading, `npm ci`, `npm test`, `npm run typecheck`, `npm run build`, and production-server
screenshots in Chromium at 393 × 852 CSS px (a typical Android phone, touch enabled).

## 1. What the project actually is

| Area | Finding |
|---|---|
| Language / framework | Strict TypeScript, Vite 7, no UI framework. All UI is HTML template strings rendered by `apps/web/src/main.ts`. |
| 3D | Three.js 0.180 (`board-view.ts`, `scene-assets.ts`, `city-life.ts`, `static-batch.ts`) with `OrbitControls`, procedural geometry, shadows, day/night city life. |
| Rules | `packages/core/engine.ts`: a pure reducer `applyAction(game, playerId, action)` over a serialisable `Game`. Phases: `roll`, `card`, `purchase`, `auction`, `manage`, `debt`, `trade`, `ended`. Pending effects queue, `actionPlayer()` decides who must act. |
| Validation | `packages/core/validation.ts`: Zod schemas for actions and whole games (`validateGame`) including deck, building-stock and phase invariants. |
| Board data | `packages/core/board.ts`: 40 original spaces, 8 street groups, stations, utilities, 16 + 16 original cards with structured kinds. |
| Bots | `packages/core/bots.ts`: deterministic heuristics per difficulty (reserve cash, auction caps, building, unmortgaging, counter-offers). Every bot action is checked with `applyAction` first. |
| LAN | `apps/server/src/server.ts`: Node HTTP + `ws` server. Rooms with 6-character codes, seat secrets (SHA-256 hashed), revision-checked command IDs (duplicate/stale commands rejected), server-side bots, atomic JSON persistence with `.bak`, reconnect with exponential back-off in `network.ts`. |
| Solo saves | IndexedDB `property-empire-saves` with `current` + `backup` keys written in one transaction; validated on load. Settings in `localStorage`. |
| Presentation helpers | `EventPresenter` (decision/notice popups), `EventFeedback`, `BoardMoments`, `MoneyLedger`, `MatchFinale`, `GameSounds` (synthesised Web Audio), dice physics and pawn hop plans. All are driven by authoritative state diffs, never by their own outcomes. |
| Tests | Vitest: 161 tests in 21 files (154 pass, 7 Windows-only launcher tests skipped on Linux). Fifteen Python Playwright "review" scripts require a Windows `.venv` and installed Google Chrome and assert the current desktop DOM. |
| Build | `vite build` → `apps/web/dist`, offline cache manifest, `tsup` server bundle. Baseline build and typecheck pass. |

### Android

**There is no Android application in the repository.** No Capacitor, Cordova, Trusted Web Activity,
React Native, Flutter, Gradle project or `AndroidManifest.xml` exists. The "Android version" is the
web page opened in a phone browser through the host computer's LAN URL. Consequently:

- There is no installable app, icon, splash screen, orientation policy, or permission set.
- System Back leaves the page instead of closing panels.
- No app lifecycle handling beyond `visibilitychange` saving.
- The service worker only works on `localhost`/HTTPS, so phones opening `http://192.168.x.x:3001`
  get no offline cache.
- If the existing page were wrapped in a WebView unchanged, LAN would fail: the server only accepts
  WebSocket origins whose host matches the server host, and an app origin (`http://localhost`) does not.
  The join screen also derives the server address from `location.host`, which inside an app is the app itself.

Recommended Android architecture: **Capacitor (Android WebView) wrapping the existing Vite build**.
It keeps the Three.js board, the shared rules engine and the LAN protocol intact, and adds native
Back, lifecycle, haptics and packaging. Migrating to Kotlin, Unity, Flutter or React Native would
mean rewriting the renderer and duplicating the rules, with no visual benefit.

## 2. Working features to preserve

- Complete rules engine: doubles and the three-doubles jail rule, jail fine/card/doubles with forced
  release on the third attempt, Start salary once per crossing, rent for streets/stations/utilities
  including card multipliers, auctions open to every player, even building, 32/12 building stock,
  hotel break-down rules, mortgages with 10 % interest, trades with mortgage transfer interest and
  jail cards, counter-offers (3 rounds), debt pause, bankruptcy to bank (auctions) or creditor.
- 32 structured cards with original illustrations and rule annotations.
- Bots for easy/medium/hard, 1–7 opponents, Classic / Quick (80 turns) / Extended (160 turns),
  starting cash, optional Free Parking tax jackpot (clearly labelled house rule).
- LAN rooms with invite codes, readiness, host bot configuration, reconnection, rejoin, host saves.
- 3D board: miniature city, dice physics, pawn hops, building growth, ownership plaques, day/night.
- Solo autosave + backup restore, settings (speed, quality, sound).

## 3. Mobile problems observed (393 × 852)

### Layout
1. The match is a scrolling web page: a 70 px dark header, a match-overview card, a board card and the
   portfolio below the fold, then a footer. The board occupies roughly 45 % of the first screen.
2. Player cards scroll horizontally; the third and later players are clipped and the current player is
   not scrolled into view.
3. The tools row (Properties, Cards, Trade, Sound on/off, Save game, Main menu) scrolls horizontally;
   Save and Main menu are off-screen; a sound toggle occupies prime space.
4. Camera `+ / − / reset` buttons are 44 px squares over the board and a "Day · Clear" pill adds clutter.
5. No `env(safe-area-inset-*)` handling, so content would sit under cut-outs and gesture bars in an
   edge-to-edge app.
6. Desktop wording on a phone: "Point & scroll to zoom · Right-drag to pan", "Click a deed", "hover".

### Decisions and popups
7. The purchase decision shows the full deed (art, owner, figures, rent table, costs) in a panel that
   covers the whole board area; the buy buttons are at the bottom of a long card.
8. Tapping any tile opens the full deed as a modal immediately; there is no compact preview, so
   exploring the board interrupts play.
9. Auctions use a native number input with "Place bid" — no quick increments, keyboard pops up.
10. The trade builder is a two-column checkbox form with number inputs; on a phone the columns are
    narrow and selected items are hard to read.
11. Several independent overlay systems (`<dialog>`, `#event-popup`, finale, board moments, feedback
    bursts, toasts) coordinate through ad-hoc flags (`events.suspend`, `hasBlockingCard`). Priorities are
    implicit.
12. Continue Saved Game is always shown and only reports "no save" after tapping.
13. Jail and debt decisions reuse the generic decision popup; no dedicated layout or explanation of
    unavailable options.

### Visual system
14. 13 stylesheets (~106 KB) layered as overrides with 417 distinct hard-coded colours and
    16 `!important`s. No central tokens; changing the palette means editing every file.
15. Rounded display fonts (Fredoka headings, Nunito body) read as cartoonish next to the
    miniature board. The board textures themselves use Fredoka/Nunito and must keep them.
16. Primary buttons use thick drop shadows ("3D" offset) and several accent blues/teals.

### State and interaction
17. LAN: a double tap sends two ACTION messages with the same revision; the server correctly rejects the
    second, but the player sees "State changed. Sync and try again". There is no pending-command lock.
18. Back/Escape only closes the event popup; there is no navigation stack.
19. `main.ts` is a 53 KB monolith (rendering, routing, events, trade builder, settings), which makes
    targeted UI work risky.

## 4. Rule observations (to be locked by regression tests)

The engine follows the classic rules closely. Deliberate simplifications, documented rather than changed:

- Trading is initiated by the player whose turn it is (or who owes a debt), one offer per turn, with
  up to three counter-offers. Classic rules allow trading at any time; this restriction keeps bots and
  LAN negotiation orderly and is already part of the saved-game format.
- Building-shortage auctions (when houses run out and several players want them) are not implemented;
  building is serialised by turns.
- A receiver of a mortgaged property always pays the 10 % transfer interest; the option to lift the
  mortgage immediately without the extra 10 % is not offered.
- "Advance to the nearest utility" rolls fresh dice for the 10× rent as written on the card.

## 5. Reusable components

Engine, validation, bots, server, network, storage, BoardView and all 3D modules, dice physics,
`animation-plan`, `card-presentation`, `card-designs`, `property-art`, `game-events`, `game-ui`
(trade preview and portfolio grouping), `money-ledger`, `board-moments`, `event-feedback`,
`match-finale`, `game-sounds`. These are logic-first and testable.

To replace: `main.ts` rendering/routing, `ui-components.ts`, `event-presenter.ts` decision presentation,
and the 13 legacy stylesheets.

## 6. Recommended architecture-preserving changes

1. Keep the engine and protocol; UI submits actions only through the existing `applyAction`/`network.action` path.
2. Add a token-based design system (`tokens.css`) and component styles; remove the override stack.
3. Split the UI into focused modules: shell/HUD, action dock (pure state → actions), overlay manager
   (priority stack + Back), deed (preview and full), decision panels (purchase, auction, card, jail,
   debt, incoming trade), portfolio, trade builder, bank/history, settings, menu/setup/lobby screens.
4. Full-height game layout: compact top HUD, board filling the middle, contextual dock at the bottom,
   sheets for everything else, safe-area aware.
5. Capacitor Android shell: `android/` project, `http://localhost` scheme so `ws://` LAN hosts work,
   cleartext limited to LAN use via network-security config, App plugin for Back and lifecycle,
   Haptics plugin, portrait orientation on phones.
6. Server accepts the app's WebSocket origin; join screen asks for (and remembers) the host address
   in the app.
7. Pending-command lock in LAN mode to prevent duplicate submissions.
8. Replace the Windows-only Python review scripts with a Node Playwright suite that runs anywhere.

## 7. Implementation order

1. Audit and plan (this document and `android-ui-implementation-plan.md`).
2. Rules regression suite; fix any engine defects found.
3. Design system and new game UI (HUD, dock, overlays, decisions, management, trade, screens).
4. Capacitor Android project and platform integration.
5. Browser end-to-end suite at phone sizes; screenshot review.
6. Polish (motion, haptics, sound, camera, performance), documentation and final report.

## 8. Environment limits for this run

- `dl.google.com` is blocked by the session's network policy, so the Android SDK cannot be installed
  and an APK cannot be built or run here. The Android project is generated and configured, and web
  assets are verified in Chromium at phone sizes; Gradle assembly and device testing are reported as
  not performed.
- No physical Android devices are available; LAN play is verified with multiple browser clients against
  the real server only.
