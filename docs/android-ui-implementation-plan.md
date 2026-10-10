# Property Empire — Android UI implementation plan

Companion to [android-ui-audit.md](android-ui-audit.md). Items are ticked as they are completed and
verified; anything left open at the end is listed in the final report with its blocker.

Guiding rule: every game action still flows `UI → applyAction (solo) / network.action (LAN) → state →
render`. No UI component changes cash, ownership or phase directly.

## Phase 1 — Audit and stabilisation
- [ ] Inspect architecture, run baseline (`npm test`, `typecheck`, `build`) — baseline: 154 pass, 7 skipped.
- [ ] Write audit and this plan.

## Phase 2 — Rules regression and engine fixes
- [ ] `tests/rules.test.ts`: dice and doubles (extra roll, third doubles goes to jail without moving),
      jail (fine, card returns to deck, doubles release without extra roll, forced release and payment
      on third miss), Start salary once / landing on Start / jail without salary, every Chance and
      Community Chest card, auctions (decline opens auction, all players bid, passing, leader cannot pass,
      no bids), rent (base, full group, houses, hotel, stations, utilities, card multipliers, mortgaged),
      building (group ownership, evenness, mortgages, stock, hotel exchange, selling evenly, hotel
      break-down shortage, group liquidation), mortgages (value, lift cost, buildings first), trades
      (ownership, duplicates, developed groups, cash, interest, jail cards, atomic acceptance, rejection
      transfers nothing), debt (pause, raise funds, auto-pay, chained card payments), bankruptcy (to bank
      with auctions, to player with interest, elimination, winner), save validation round-trip.
- [ ] Allow raising funds (mortgage / sell / build) while a purchase decision is open, as the classic
      rules permit; keep trades and other phases unchanged.
- [ ] Fix any defects the suite uncovers.

## Phase 3 — Design system
- [ ] `ui/tokens.css`: palette (ivory, emerald, deep emerald, navy, gold, mist, white, secondary text,
      danger, success, Chance orange, Community Chest blue), semantic aliases, spacing 4–32, radii 10–20,
      soft shadows, type scale in rem, motion durations/easings, 48 px touch target, safe-area variables.
- [ ] Inter (OFL, via Fontsource) for UI; Fredoka/Nunito kept only because board textures use them.
- [ ] Components: buttons (primary / secondary / quiet / danger, pressed + disabled + busy), icon
      buttons, chips, segmented control, stepper, toggle, sheet, card surface, list rows, badges.
- [ ] Remove the 13 legacy stylesheets after their selectors are no longer rendered.

## Phase 4 — Main gameplay screen
- [ ] Full-height shell: top HUD (menu, round, player chips), board in the middle, action dock at the bottom.
- [ ] Player chips: avatar/token, name, cash, active ring, bot / jail / offline / bankrupt state,
      "You" marker, adaptive strip that keeps the current player visible; tap opens a read-only overview.
- [ ] Contextual dock driven by a pure `dockModel(game, viewer)`; only valid actions, live status line.
- [ ] Board: tile tap → compact preview (no turn interruption), Details → full deed sheet, tap elsewhere
      dismisses; smooth camera focus/reset; touch rotate / pinch / two-finger pan; camera sensitivity.
- [ ] Pause rendering when the board is hidden or the app is backgrounded.

## Phase 5 — Core interactions
- [ ] Overlay manager: preview < sheet < decision < card < dialog; one Back path; mandatory decisions
      minimise instead of declining.
- [ ] Purchase panel (price, cash after, rent summary, Buy / Auction, raise funds when short).
- [ ] Auction panel (current bid, leader, bidder states, stepper + quick increments, Bid / Pass, waiting state).
- [ ] Card reveal (deck-coloured card rises and flips, instruction, annotations, Continue applies the effect;
      observer cards with bot Continue).
- [ ] Jail panel (attempt n/3, Roll / Pay / Use card with reasons).
- [ ] Debt panel (owed, creditor, cash, shortfall progress, Manage properties, Trade, Bankruptcy with confirmation).
- [ ] Incoming trade panel (you give / you get, cash after, sets completed, Accept / Counter / Decline).
- [ ] Compact receipts for non-spatial events; spatial rent/purchase/build moments kept; chip cash deltas kept.

## Phase 6 — Management flows and screens
- [ ] My Properties: groups with progress, compact rows, Build / Sell / Mortgage / Lift with engine reasons,
      bank stock, filters (Mine / All / Available).
- [ ] Full deed sheet: colour band, art, ownership, current rent, rent schedule by type, costs, actions.
- [ ] Trade builder: partner chips, You give / You receive segments, asset picker, cash and jail-card
      steppers, live plain-language summary, review step, counter-offers.
- [ ] Bank & history: cash, net worth, rent totals, bank stock, recent financial activity.
- [ ] Game menu: resume, save, rules & cards, settings, leave match (confirmation).
- [ ] Settings: sound, haptics, animation speed, reduced motion, camera sensitivity, graphics quality,
      text size, highlight my tiles; restore previous solo save.
- [ ] Main menu around the board hero; Continue / Rejoin enabled only when available.
- [ ] Setup: token picker, opponents stepper, difficulty, starting cash, game length, labelled house rule, summary.
- [ ] LAN host / join / lobby; host address entry and memory in the app; share code.
- [ ] Results: winner, standings, net worth, deeds, rent stats, New game / Main menu.
- [ ] LAN pending-command lock to avoid duplicate submissions.

## Phase 7 — Android
- [ ] Capacitor (`@capacitor/core`, `cli`, `android`, `app`, `haptics`, `share`), `capacitor.config.ts`,
      generated `android/` project.
- [ ] `http://localhost` scheme, network-security config allowing cleartext for LAN `ws://`, only
      INTERNET + ACCESS_NETWORK_STATE + VIBRATE permissions, portrait on phones.
- [ ] Back button → overlay manager; pause/resume → save solo game and pause rendering.
- [ ] Original launcher icon and splash.
- [ ] Server accepts the app's WebSocket origin; tests.
- [ ] `npm run android:sync`, `android:open`, `android:build` scripts and `docs/ANDROID.md`.

## Phase 8 — Verification
- [ ] Unit tests for dock model, decision markup, overlay stack, settings migration, host-address parsing.
- [ ] Playwright suite at phone, tablet and desktop sizes: solo start, roll, buy, auction, cards, jail,
      trade, properties management, debt and bankruptcy, results, Back handling, LAN host + join with two
      clients against the real server, no horizontal overflow.
- [ ] `npm run check` (tests + typecheck + build) green.
- [ ] Android Gradle build — blocked here (Android SDK download host denied); documented.
- [ ] Final report with commands, results and remaining device-only checks.
