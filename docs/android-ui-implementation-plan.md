# Property Empire — Android UI implementation plan

Companion to [android-ui-audit.md](android-ui-audit.md). Items are ticked as they are completed and
verified; anything left open is listed in [android-ui-report.md](android-ui-report.md) with its blocker.

Guiding rule: every game action still flows `UI → applyAction (solo) / network.action (LAN) → state →
render`. No UI component changes cash, ownership or phase directly.

## Phase 1 — Audit and stabilisation
- [x] Inspect architecture, run baseline (`npm test`, `typecheck`, `build`) — baseline: 154 pass, 7 skipped.
- [x] Write audit and this plan.

## Phase 2 — Rules regression and engine fixes
- [x] `tests/rules.test.ts`: dice and doubles (extra roll, third doubles goes to jail without moving),
      jail (fine, card returns to deck, doubles release without extra roll, forced release and payment
      on third miss), Start salary once / landing on Start / jail without salary, every Chance and
      Community Chest card, auctions (decline opens auction, all players bid, passing, leader cannot pass,
      no bids), rent (base, full group, houses, hotel, stations, utilities, card multipliers, mortgaged),
      building (group ownership, evenness, mortgages, stock, hotel exchange, selling evenly, hotel
      break-down shortage, group liquidation), mortgages (value, lift cost, buildings first), trades
      (ownership, duplicates, developed groups, cash, interest, jail cards, atomic acceptance, rejection
      transfers nothing), debt (pause, raise funds, auto-pay, chained card payments), bankruptcy (to bank
      with auctions, to player with interest, elimination, winner), save validation round-trip.
- [x] Allow raising funds (mortgage / sell / build) while a purchase decision is open, as the classic
      rules permit; keep trades and other phases unchanged.
- [x] Fix any defects the suite uncovers.

## Phase 3 — Design system
- [x] `ui/tokens.css`: palette (ivory, emerald, deep emerald, navy, gold, mist, white, secondary text,
      danger, success, Chance orange, Community Chest blue), semantic aliases, spacing 4–32, radii 10–20,
      soft shadows, type scale in rem, motion durations/easings, 48 px touch target, safe-area variables.
- [x] Inter (OFL, via Fontsource) for UI; Fredoka/Nunito kept only because board textures use them.
- [x] Components: buttons (primary / secondary / quiet / danger, pressed + disabled + busy), icon
      buttons, chips, segmented control, stepper, toggle, sheet, card surface, list rows, badges.
- [x] Remove the 13 legacy stylesheets after their selectors are no longer rendered (CSS 105 KB → 68 KB).

## Phase 4 — Main gameplay screen
- [x] Full-height shell: top HUD (menu, round, player chips), board in the middle, action dock at the bottom.
- [x] Player chips: avatar/token, name, cash, active ring, bot / jail / offline / bankrupt state,
      "You" marker, adaptive strip that keeps the current player visible; tap opens a read-only overview.
- [x] Contextual dock driven by a pure `dockModel(game, viewer)`; only valid actions, live status line.
- [x] Board: tile tap → compact preview (no turn interruption), Details → full deed sheet, tap elsewhere
      dismisses; smooth camera focus/reset; touch rotate / pinch / two-finger pan; camera sensitivity.
- [x] Pause rendering when the board is hidden or the app is backgrounded.

## Phase 5 — Core interactions
- [x] Overlay order: preview < decision panel < sheet < card < hand-over < dialog. A newly arrived mandatory
      decision closes optional previews and sheets; one Back path; decisions minimise instead of declining.
- [x] Purchase panel (price, cash after, rent summary, Buy / Auction, raise funds when short).
- [x] Auction panel (current bid, leader, bidder states, stepper + quick increments, Bid / Pass, waiting state).
- [x] Card reveal (deck-coloured card rises and flips, instruction, annotations, Continue applies the effect;
      observer cards with bot Continue).
- [x] Jail panel (attempt n/3, Roll / Pay / Use card with reasons).
- [x] Debt panel (owed, creditor, cash, shortfall progress, Manage properties, Trade, Bankruptcy with confirmation).
- [x] Incoming trade panel (you give / you get, cash after, sets completed, Accept / Counter / Decline).
- [x] Compact receipts for non-spatial events; spatial rent/purchase/build moments kept; chip cash deltas kept.

## Phase 6 — Management flows and screens
- [x] My Properties: groups with progress, compact rows, Build / Sell / Mortgage / Lift with engine reasons,
      bank stock, filters (Mine / All / Available).
- [x] Full deed sheet: colour band, art, ownership, current rent, rent schedule by type, costs, actions.
- [x] Trade builder: partner chips, You give / You receive segments, asset picker, cash and jail-card
      steppers, live plain-language summary, review step, counter-offers.
- [x] Bank & history: cash, net worth, rent totals, bank stock, recent financial activity.
- [x] Game menu: resume, save, rules & cards, settings, leave match (confirmation).
- [x] Settings: sound, haptics, animation speed, reduced motion, camera sensitivity, graphics quality,
      text size, highlight my tiles; restore previous solo save.
- [x] Main menu around the board hero; Continue / Rejoin enabled only when available.
- [x] Setup: token picker, opponents stepper, difficulty, starting cash, game length, labelled house rule, summary.
- [x] LAN host / join / lobby; host address entry and memory in the app; share code.
- [x] Results: winner, standings, net worth, deeds, rent stats, New game / Main menu.
- [x] LAN pending-command lock to avoid duplicate submissions.

## Phase 7 — Android
- [x] Capacitor (`@capacitor/core`, `cli`, `android`, `app`, `haptics`, `share`), `capacitor.config.ts`,
      generated `android/` project.
- [x] `http://localhost` scheme, network-security config allowing cleartext for LAN `ws://`, the
      INTERNET permission only (VIBRATE comes from the Haptics plugin; no network-state permission needed), portrait on phones.
- [x] Back button → overlay manager; pause/resume → save solo game and pause rendering.
- [x] Original launcher icon and splash.
- [x] Server accepts the app's WebSocket origin; tests.
- [x] `npm run android:sync`, `android:open`, `android:build` scripts and `docs/ANDROID.md`.

## Phase 8 — Verification
- [x] Unit tests for the dock model, decisions, decision/deed/portfolio/trade markup, notices, settings
      migration and host-address parsing. The Back/overlay order is covered by the browser suite.
- [x] Playwright suite at phone, tablet and desktop sizes: solo start, roll, buy, auction, cards, jail,
      trade, properties management, debt and bankruptcy, results, Back handling, LAN host + join with two
      clients against the real server, no horizontal overflow.
- [x] `npm run check` (tests + typecheck + build) green.
- [ ] Android Gradle build — **blocked**: the Android SDK download host (`dl.google.com`) is denied by this environment's network policy. Run `npm run android:build` with the SDK installed.
- [x] Final report with commands, results and remaining device-only checks.

## Added during implementation
- [x] Pass-and-play: extra human players on one device with a hand-over screen.
- [x] Ambient music (synthesised, own setting), bid and bankruptcy sound cues.
- [x] Low graphics by default on low-memory or low-core devices.
- [x] Decision panels docked on the right on tablets and desktops.
- [ ] Physical-device validation (see the checklist in [ANDROID.md](ANDROID.md)) — no devices available here.
- [ ] Hosting a LAN game from a phone without a computer — not implemented; documented in ANDROID.md.
