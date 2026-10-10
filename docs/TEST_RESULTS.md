# Executed tests

## Android APK build — 2026-10-10

- GitHub Actions run 38037870235 (`.github/workflows/android.yml`, ubuntu-24.04, Node 22, Temurin JDK 21) on commit
  `000896c`: `npm ci`, `npm run check`, `npx cap sync android` and `./gradlew assembleDebug assembleRelease` all passed
  (Gradle `BUILD SUCCESSFUL`, 421 tasks). Outputs: debug APK 4,883,887 bytes, unsigned release APK 3,882,594 bytes,
  published to the `android-build` prerelease with SHA-256 sums.
- Both APKs were downloaded and matched the SHA-256 sums printed by the build. Release APK: 461 entries, every stored
  entry 4-byte aligned, `resources.arsc` stored, no native libraries, manifest not debuggable, web app present.
- Release signing: the Android SDK's `apksigner` cannot be downloaded in this environment, so the release APK was signed
  with a JDK-only implementation of APK Signature Scheme v2 (RSA 4096, SHA-512). The same verifier first confirmed the
  build's own debug-key signature on the debug APK (identical content digest) and rejected a copy with one changed byte.
  The signed release APK verifies (signature, content digest, certificate matching the release key), all ZIP CRCs
  pass and its entries are byte-identical to the unsigned build. SHA-256
  `9387ed1ae95d5374cd040ac45cb507d966cef49bb3dbf18d445f84dc054d1030`.

Not executed: installing either APK on an emulator or device; `apksigner verify` from the Android SDK.

## Android UI redesign — 2026-10-10

Environment: Linux, Node 22.22, Chromium 141 (Playwright 1.56.1, headless, SwiftShader WebGL). No Android SDK, emulator or physical device was available.

- `npm run check`: **228 Vitest tests passed in 23 files** (7 Windows-only launcher tests skipped on Linux), strict TypeScript, Vite production build, offline cache manifest and server bundle.
  - New `tests/rules.test.ts` (48 tests): dice and doubles, third doubles to jail without moving or salary, Start salary when passing and landing, Go to Jail, every jail path (miss, doubles release without an extra roll, third-miss fine and move, fine paid through debt, bail, jail card returned to its deck, rent collected in jail), every Chance and Community Chest card kind including nearest station/utility rent, back-three chains into another card, repairs, pay/collect from every player and debt during a card, auctions, rent tiers for streets, stations and utilities, building stock, hotels, even selling, mortgages, trades (decline, ownership, duplicates, jail cards, mortgage interest, recipient only), bankruptcy to the bank and to a player, and save round-trips in every pending phase. No engine defects were found; raising funds during a purchase decision and withdrawing an unanswered trade offer were added (each with tests).
  - New UI tests: title deed and tile preview, notice feed timing, decision detection and the action dock (including pass-and-play naming), purchase/auction/jail/debt/trade panels, card reveal, trade builder logic, properties sheet, money history, settings migration and LAN host-address parsing. The server suite now checks the Android app origin.
- `npm run test:browser`: **29 Playwright tests passed** (7.2 min, 2 workers) against the production host with a temporary save folder, in a 393×852 touch-emulated phone viewport unless stated:
  menu with Continue disabled without a save; setup summary and start; browser Back through screens and layers; leave and continue a match; settings applied and persisted; rules and all 32 cards; pass-and-play hand-over; buy; auction win; minimised decision reopened and Back not declining; Chance double station rent after Continue; Community Chest hide and reopen; jail fine and unavailable card; debt reduced by mortgage then confirmed bankruptcy and results; accepting an incoming offer; trade builder review and bot answer; counteroffer; building through the properties sheet and deed; board tap preview to deed; bank history and player overview; LAN host and guest in separate browser contexts sharing state, then the guest rejoining after a reload; missing room message; unreachable host message; layouts without horizontal scroll and with ≥44 px tools at 360×640, 412×915, 800×1280 and 1280×800; eight player chips; and an automated play-through to turn 16.
- One earlier full run failed the LAN test when the guest happened to move first: the test helper used `isEnabled()`, which waits for a Roll button that only the current player's page shows. The helper now counts enabled buttons instead; the test then passed six repeated runs and the full suite passed.
- Automated full-match play-through (scratch script, same UI): a solo match driven only by the interface ran 190 turns to elimination with purchases, auctions, cards, jail, rejected bot offers, raising funds and bankruptcy, with no stalls and no console errors.
- Screenshots of every screen and panel were reviewed at 393×852, 800×1280, 1440×900 and 852×393.

Not executed: Gradle/APK build (Android SDK download host blocked), Android emulator or devices, Safari, Firefox, real Wi-Fi between devices, low-end GPU frame rates.

# Executed tests — earlier entries

## Menu credit and short right-side popups — 2026-10-09

`npm run check` passed 161 tests in 21 files, strict TypeScript and both production builds. Production Chrome `menu_popup_review.py` passed desktop 1440×900, tablet 1024×650, portrait 390×844 and landscape 844×390: separate resume buttons, exact developer credit, right-aligned purchase/Chance/Community Chest panels, reachable sticky actions, unchanged board geometry, human card effects waiting for Continue, 2.2-second rent expiry, 2.8-second trade expiry, and the next bot movement clearing an old confirmation.

Production `polished_game_review.py` passed cash changes on both nametags, illustrated trade confirmation, right-side opponent cards, bot Continue, human Continue, reduced-motion settlement and mobile actions, with no page errors. Its mobile bounds check settles the compositor animation first because a mocked JavaScript timer does not advance the card's CSS/WAAPI flight. The refreshed 50.2 MB share ZIP contains the credit and matches all 18 current built browser/server files by SHA-256.

## Spatial transactions, read-first cards and results — 2026-10-09

Final `npm run check`: **105 tests passed in 12 files**, followed by strict TypeScript and both production builds. App 256.42 KB / 83.19 KB gzip; CSS 81.44 KB / 17.29 KB gzip; Three 540.36 KB / 137.64 KB gzip; server 55.25 KB. The offline manifest contains 16 local assets.

New real-engine tests cover saved unread cards, money/movement delayed until resolution, recipient-only actions, backward movement into another unread card, jail and held-card timing, all 32 card identities/art/motions, exact paid-rent metadata, accepted trade assets and declared-winner standings. A real two-peer WebSocket test resumes an unread card, rejects another player's resolution, broadcasts its effect once and rejects repeated resolution. Existing bot simulations continue to validate snapshots and finish games with the new card phase.

All eleven production Chrome scripts and the separate reduced-motion run passed across the final verification cycle, with no page exceptions. The main runner passed gameplay, offline reload, LAN synchronization/reconnect, deeds, ownership/trading, camera/events, arrivals/cards, fullscreen/counteroffers and game-feel checks. An older compact-feedback test hit a 100 ms clock-freeze deadline under software rendering; its clock now freezes on the menu before restoration. The same setup was applied to stable-turn and arrival tests. Arrival/cards, compact feedback, stable turns, opponent/models, new board moments and the reduced-motion checks then passed against the same final production build.

New Chrome checks verify unchanged cash before Continue, delayed card movement and rent, property-anchored named rent, purchase seals, accepted deed exchange, winner/loser standings and reopening results, mobile card/result bounds, centered tools with internal mobile scrolling, and in-app reduced-motion card artwork/sparks. The development renderer probe confirms all 28 owner plaques sit beyond the tile edge. Production screenshots of rent, purchases, trades, winner/loser and mobile results were inspected. A separate real-time Chrome check confirms the card flight settles into a readable popup while cash remains unchanged; frozen-clock captures can show the flight before it paints.

Independent review found inherited card positioning, mobile toolbar overflow, in-app card motion and duplicate pending/held jail-card validation gaps. All were repaired and covered by checks. Final review confirmed the atomic movement/popup update avoids duplicate card flights and the reduced-motion spark override is present, with no remaining material findings. Production health passes on port 3001. Physical-device frame rates and other browsers remain unmeasured.

## Pawn arrival, dice and cards — 2026-10-09

Final automated suite: **68 tests passed** across six files. Strict TypeScript, Vite frontend, offline cache and Node server builds passed. Eight turn-presentation tests and fourteen event tests cover card destinations, backward/chained movement, exact repairs, card effects, all 32 card explanations, actual versus unpaid rent, safe reconnect attribution, randomized dice landings and the entire rotated cube footprint staying on felt.

Development browser checks passed with no page exceptions. A controlled clock verifies that no destination popup or action control appears during dice playback, then verifies the purchase popup after arrival. Actual Chance double-station rent, Community Chest cash, card acknowledgment, disabled trade while reading, all 32 catalog faces and mobile card bounds pass. A real renderer probe reports zero initial landmarks/buildings, active then settled playback, two houses, one hotel and zero buildings after sale. Desktop Chance and mobile Community Chest screenshots were visually inspected.

Final production `EMPIRE_URL=http://127.0.0.1:3001 EMPIRE_OFFLINE=1 npm run test:browser` passed all five browser scripts plus the reduced-motion rerun: 13 gameplay/LAN journeys with offline resume, eight deed journeys, ten ownership/trade journeys, seven camera/event journeys, five turn/card journeys and two mid-movement reduced-motion cases. No page exceptions were observed.

Independent review found reduced-motion cancellation leaving popups hidden, rotated dice overhanging the tray, and opponent-card attribution across reconnect gaps. Each was reproduced before repair and confirmed after repair. Frozen-clock purchase and card tests specifically cover changing to Reduced motion during movement. The browser timing test advances between checkpoints instead of rendering every virtual frame, avoiding software-renderer overload. Physical-device and other-browser limitations below remain applicable.

## Camera and game event improvements — 2026-10-09

`npm run check`: **58 tests passed** in five files; strict TypeScript, frontend/server production builds and offline cache generation passed. Twelve event regressions cover fresh versus restored snapshots, actual versus unpaid rent, movement-card rent, generic card payments, deferred payments, duplicate names, purchase confirmations, salary/jail notices and authorized/stable decisions. The movement-card regression failed before repair and passed afterward.

All four production browser scripts passed: 13 gameplay/LAN journeys plus offline reload/resume, eight illustrated-deed journeys, ten ownership/trade journeys and seven camera/event journeys. The event checks exercise actual purchase, auction and incoming-trade controls; dismissal and floating actions; actual received rent; desktop scroll containment at 1440×960, 1024×650 and 1440×600; mobile sticky board; and notice bounds/scrollable purchase detail at 390×390. No page exceptions were observed. Desktop purchase and mobile rent screenshots were visually inspected.

The development browser camera probe measured pointer-anchor screen drift of approximately 7.9×10⁻¹⁵ after wheel zoom, with decreased camera distance and a moved target. Resizing preserved the target to approximately 5.6×10⁻¹⁷. Independent review confirmed repairs for movement-card rent classification and notice clipping on short mobile screens, with no unresolved findings. The physical-device and browser limitations recorded below still apply.

## Rules and server

`npm test`: **34 passed**, 2 files, approximately 2.5 seconds on the final run.

Covered: seeded state and decks; turn authorization and immutability; purchases and cash deductions; auctions and all-pass outcomes; street/transport/utility rent; even buildings and bank stock; hotel shortages and group liquidation; mortgage interest; atomic cash/property trades and developed-group restrictions; debt repayment and trade recovery; creditor/bank bankruptcy, auction continuation, inherited-interest recovery and chained creditors; preservation of doubles on off-turn bankruptcy; last-survivor victory; jail; corrupt-save rejection; serialization continuity; full quick matches at every difficulty; complete classic hard-bot matches for seeds 12, 73 and 211 with every intermediate save validated; tax-only jackpot.

Real WS clients: identical initial and next snapshots, strict message rejection, duplicate rejection, reconnect to same seat, unrelated-origin rejection, disk room restoration after restart, and disk failure without success acknowledgment.

Independent review found no unresolved material issues after repairs. The reviewer additionally simulated complete Classic games with Easy bots at four and eight players for seeds 12, 73 and 211. An HTTP health request and real WS PING/PONG through the host's Wi-Fi address 192.168.1.222:3001 succeeded from this PC.

## Browser

`EMPIRE_URL=http://127.0.0.1:3001`, `EMPIRE_OFFLINE=1`, `npm run test:browser` uses installed Chrome headless with two independent browser contexts. The production bundle is served by the built Node application.

13 journeys: solo roll; manual save; reload/resume; property inspection; purchase; auction and bot pass; even-building controls; sale/mortgage/unmortgage interest; cashless debtor property-for-cash trade; responsive layout; two-human LAN lobby/match; ledger and revision synchronization; reconnect after reload. Production offline reload and saved solo resume also pass. Reduced-motion and Low-quality settings are exercised.

Screenshots: menu and match desktop 1440×960; mobile 390×844; tablet 768×1024; LAN desktop and mobile. Overflow checks also cover 375×812 and 844×390 landscape. No browser page exceptions were observed. Artifacts are under `test-artifacts/`.

## Build and dependencies

Strict TypeScript check passed. Vite static frontend build passed. Offline precache manifest generated. Node ESM bundle build passed. Final full npm audit: zero vulnerabilities.

## Graphics upgrade

Graphics upgrade verification: the same 34 core/server tests and thirteen production browser journeys pass with the new renderer, including offline saved-game resume and two-client LAN. `tests/graphics_review.py` additionally exercises zoom/reset, all eight token choices, an eight-player match, visible WebGL rendering and layouts at 1440×960, 390×844, 375×812, 844×390 and 768×1024. No page exceptions or horizontal overflow were observed. Desktop/mobile screenshots were inspected visually. Independent review found token style reuse across games; replacing changed models and clearing prior animation paths resolved it. Gem geometry is shared across instances.

Independent browser module checks confirmed replacement of changed token styles, removal of obsolete player IDs, cleared movement/dice animation on match replacement, valid dice opposite-face pairs, shared Gem geometry, and correct tile-center raycasts for all 40 spaces.

## Not executed

Physical phones or tablets, real router/hotspot peer communication from another device, Firefox, Safari, real low-end GPU frame-rate/thermal measurements, HTTPS reverse proxy and remote production deployment. Local network URLs are detected from interfaces; these tests establish local process/browser behavior, not physical-device reachability.

## Ownership and trade UI overhaul

Final `npm run check`: **46 tests passed** in four files, strict TypeScript and both production builds passed. Seven portfolio/trade regressions verify actual deed ownership, missing group members, exact mortgage transfer fees, completed groups, developed-group restrictions, cashless debt repayment, and incoming offer explanation with state immutability. The incoming debt explanation regression failed before the repair and passed afterward.

Production `EMPIRE_URL=http://127.0.0.1:3001 EMPIRE_OFFLINE=1 npm run test:browser` passed all three sequential scripts: 13 baseline gameplay/LAN journeys plus offline reload; eight illustrated-deed journeys; ten ownership/trading journeys. The new journeys cover owned and bank filters, highlight toggle, missing-deed shortcut, disabled developed deeds, complete-set preview, review/edit preservation, actual bot acceptance, incoming offer comparison/acceptance, and responsive layouts. Zero page exceptions. Desktop turn controls fit within the 1440×960 viewport; narrow layouts have no horizontal overflow at 390×844, 375×812, 844×390 and 768×1024. Screenshots were visually inspected. SwiftShader rendering was additionally inspected after its initial draw and zoom; the board remains visible.

Independent review found an incoming debt-trade explanation gap; its condition now covers debt-resuming incoming trades. Reviewer confirmed the repair and 7/7 helper tests; no unresolved material findings. Physical-device and other-browser limitations above still apply.


2026-10-09 compact turn controls: 46 automated tests, strict TypeScript and production builds passed. All three production browser scripts and offline resume passed. Assertions confirm the initial roll control has one button and no large heading, roll messages render separately in the overview, and the waiting LAN player has no action bar. Purchase, auction, management, debt trade and incoming trade acceptance continue to work. Responsive checks passed with no page errors.


2026-10-09 floating controls: removed the board's reserved bottom inset. Actions float above the full-height canvas; camera controls float at the upper right. Production build and TypeScript passed. Browser geometry checks confirm the canvas fills the stage and action buttons stay inside it at 1440×960, 390×844, 375×812, 844×390 and 768×1024. Rolling and purchase clicks succeeded; all ten ownership/trade browser journeys passed with no page errors. Desktop screenshot inspected.


2026-10-09 receipts, ownership, fullscreen and counteroffers: **78 tests passed** in seven files; strict TypeScript and both production builds passed. Nine new core/LAN tests cover authorization, cash/development rules, three-counter limit, debt-resuming previews and settlement, bot revisions, compatibility, and actual two-peer restart/acceptance. A revised-offer decision key regression also passes. All six production browser scripts plus the separate reduced-motion run passed, including offline reload and LAN reconnect, with zero page exceptions. New browser coverage verifies compact auto-dismiss receipts, owned labels/inspector, native fullscreen with settings/exit, human and bot counteroffers, final decline and mobile bounds. Receipt, fullscreen ownership and counteroffer review screenshots were inspected. Independent review reported no findings.


2026-10-09 readable deeds, profiles, sound and pawns: **81 tests passed** in eight files; final strict TypeScript and production builds passed (227 KB app / 74 KB gzip). All seven Chrome scripts and the separate reduced-motion run passed across the production checks. The first four gameplay/deed/ownership/camera scripts passed; after the final dialog/sound edge-case repairs, arrival/cards, fullscreen/counteroffers, new game-feel checks and reduced-motion checks passed again. The frozen-clock arrival assertions were updated for the intentional 180 ms normal/85 ms fast pawn steps. No page exceptions.

New browser checks cover full sidebar deed rows without nested clipping, desktop deed controls fitting at 1440x720, live building/selling inside a deed dialog, player profile financials/assets and actual trade acceptance, real Web Audio unlock/dice generation/mute, mobile dialogs, disabled trade explanations, a deed staying on Copper Lane while Ben lands on Pier Avenue, and arrival sounds flushing when motion is reduced mid-card move. The last two regressions failed before their repairs and passed afterward. A development renderer probe confirmed a 0.34-unit hop, directional rotation, stretch, step callback and stable reduced-motion endpoints. Desktop/mobile screenshots were inspected. The independent reviewer confirmed all three repairs, including public-asset launcher freshness, with no further findings.

Both outer and project run.bat were exercised through Windows PowerShell with browser opening suppressed during automated launch verification. Cold start produced one hidden server; repeated invocation reused it. Server health passed, and the production host remains on port 3001. Browser opening uses the default Windows URL handler.


2026-10-09 game tools moved into one horizontal toolbar above the board. Strict TypeScript and production builds passed. Targeted Chrome checks confirm all nine fullscreen controls share one row, the property sidebar has no tools grid, Cards/Settings still open, and the toolbar stays above the board without horizontal page overflow at 1440x960, 1440x600, 1024x650 and 390x844. Short desktop boards fit the viewport. Narrow screens scroll within the toolbar. No page exceptions; fullscreen screenshot inspected.

2026-10-09 compact match tools, board popups and personal event effects: **86 tests passed in nine files**, including actual paid/unpaid rent, event tones, building feedback, unpaid birthday collections and queued feedback discarded by save restoration. Strict TypeScript and frontend/server production builds passed: app 229.34 KB / 74.62 KB gzip, CSS 66.46 KB / 14.25 KB gzip, server 52.97 KB.

All eight production Chrome scripts and the separate mid-movement reduced-motion run passed with zero page exceptions. Checks retain solo/LAN synchronization and reconnect, auctions, debt trades, deed building/mortgage controls, ownership/trade previews, camera/page bounds, card arrival timing, fullscreen/counteroffers, player profiles and sound unlock/mute. The new script verifies 36-pixel controls directly after dice information inside the overview, no right column, board width above 75% of the layout, an actual WebGL canvas click opening Copper Lane, all nine fullscreen tools in one line, received/paid rent effects deferred until arrival, balance pulses, automatic cleanup, click-through effects, reduced-motion suppression and responsive bounds at 1440x600, 1024x650 and 390x844. Desktop fullscreen, deed popup, gain/loss and mobile screenshots were inspected. This run did not repeat offline-mode testing; earlier offline results above remain recorded.

Independent review reproduced two feedback defects: celebrating promised birthday money that had not been paid, and replaying discarded moving-turn feedback after restoration. Both were repaired and covered by regressions; reviewer confirmation found no further issues. Production health passed and the host remains available on port 3001.

2026-10-09 stable rolls, opponent activity and refined miniatures: **94 tests passed in ten files**, with strict TypeScript and both production builds passing. Final bundles: app 237.28 KB / 76.68 KB gzip, CSS 68.12 KB / 14.55 KB gzip, Three 540.36 KB / 137.64 KB gzip, server 52.97 KB. The offline manifest contains 16 local assets; offline-mode browser testing was not repeated in this follow-up.

All ten production Chrome scripts and the separate reduced-motion check passed across this verification cycle. The baseline gameplay/LAN, deed and ownership/trading scripts passed first; camera/events, arrival/cards, fullscreen/counteroffers, game feel, compact feedback, stable turns and opponent/models then passed against the final implementation. Browser clock arguments were corrected to UNIX seconds, and short-lived receipts were inspected with a controlled clock. The opponent fixture now waits for saved-game restoration before advancing its bot timer. No page exceptions were reported.

The first-roll regression originally moved the stage and tools down by 60 pixels. New geometry assertions show unchanged stage, toolbar and overview bounds before rolling, during movement and after arrival at 1440x720, 1024x650 and 390x844. The persistent status slot and bounded text prevent that shift; payment feedback now pulses its color without moving the balance.

New real-engine and presenter regressions cover opponent arrivals, purchases, Community Chest cards, paid/unpaid rent, buildings, deduplication of viewer-involved payments, reconnect bank payments, automatic dismissal, personal decision priority and discarding observer cards after restoring an earlier save. Chrome checks confirm an opponent card appears after arrival, its annotations scroll in a short viewport, bots continue without a Continue action, the viewer's next purchase takes priority, and opponent purchase receipts disappear automatically. Reduced motion during property and card movement continues to reveal the correct popup.

The development renderer probe measured all eight redesigned pawn footprints below .8 units, house width .216 against .22-unit placement spacing, and hotel width .62/height .727. The miniature contact sheet and actual four-house/hotel board close-ups were visually inspected. Independent review confirmed the reconnect payment repair and reported no further findings in the reviewed source/model changes. The later save-restoration guard was manually audited and covered by its own passing regression.

## 9 October living city, complete deeds and readable single notifications

Final `npm run check`: **131 tests passed in seventeen files**, strict TypeScript, Vite frontend, offline manifest and Node bundle passed. Bundles: app 271.98 KB / 88.52 KB gzip; CSS 93.19 KB / 19.15 KB gzip; Three 542.53 KB / 138.08 KB gzip; server 55.25 KB.

New regressions cover separate fully rotating dice lanes, exact settling and varied endpoints; ambient throttling, traffic signals/queues, sidewalk/aircraft bounds, readable night lighting, weather and reduced-motion/background clocks; property ownership/build/rent effects without blocking turns; complete deed finances/actions; one purchase/rent notification and eight-second financial notices. Queue tests deliberately failed with the old movement gate/retention behavior, then passed after restoration. Source hashes were unchanged after this proof.

Seven development Chrome scripts passed with zero page exceptions. Desktop status/tools/dice share a stable 52-pixel row; mobile has a bounded 102-pixel rail. Deeds retain live buy, auction, mortgage/lift and building/selling actions. Actual WebGL picking opens Copper Lane. Normal and OS-reduced rent remain readable; financial notices pause on hover/focus; opponent cards allow nine seconds before solo resolution. Decorative card effects have no repeated financial text.

The real renderer probe confirms moving vehicle/pedestrian instance matrices and aircraft position, all 28 district markers, no undeveloped buildings, and building growth from .001 through .936 to 1 without marking the turn as moving. A canvas sample confirms Copper Lane's district border is RGB 167/124/87 while its interior stays green. Day, night/rain, dawn, property close-up and complete-deed screenshots were inspected.

Independent review found OS-reduced rent was hidden, queued personal rents could be lost, and timer-driven settlement could show a queued receipt before arrival. All three repairs were confirmed; static reduced-motion rent and multi-payer queue regressions verify them. No remaining material findings were reported in the repair review.

All thirteen production Chrome scripts and the separate reduced-motion check passed across the final verification cycle, with zero page exceptions, including offline saved-game resume and two-client LAN synchronization/reconnect. The baseline offline reload now waits explicitly for DOMContentLoaded before asserting the cached app can resume; its former default load deadline timed out under software rendering. An older exact deed-class assertion was updated for the new reduced-motion class. The first six production scripts passed, then the corrected game-feel script and remaining seven checks passed; no product code changed between these runs.

A real-time purchase check confirms the full receipt remains opaque and readable beyond four seconds without a mocked CSS clock; its screenshot was inspected. The production host is healthy on port 3001. Physical-device/GPU and other-browser limits recorded above remain unchanged.

## Cash, dice, city quality and portable Windows setup — 2026-10-09

`npm run check`: **160 tests passed in 21 files**, strict TypeScript and both production builds passed. New tests exercise fixed-step pair/deck/floor clearance through chained rolls and fractional samples; preserved static mesh world transforms/raycast targets; city time under dropped frames and 60 Hz cadence; actual per-player cash changes, arrival deferral, rerender preservation, direction reversals and expiry; illustrated accepted-trade assets; strict authenticated bot-card Continue with stale/duplicate/human rejection; and portable setup/launcher/package behavior. Setup verifies official Node download checksums, preserves saves, handles moved folders and occupied ports, rejects stale packaging and detects changed built assets.

Development Chrome `polished_game_review.py` passed with no page errors: purchase loss without row shift, rent gain/loss for both nametags after arrival, illustrated accepted trade with eight-second reading time, immediate bot-card Continue, own-card manual Continue, OS reduced-motion cancellation settlement, mobile visible sticky Continue, live city details, static tile picking, and a final animation shadow refresh. Day/night screenshots and desktop/mobile cards were inspected.

The comparative SwiftShader probe found 459 drawing calls before changes and 220 after city detail and static batching. At a simulated 60 Hz cadence, two seconds now produces 121 Medium/High city updates instead of 43, and 61 Low updates instead of 28. A 1000 ms dropped frame now advances the city by 1000 ms rather than 100 ms. Shadows refresh at a bounded cadence plus final settlement, and ambient rendering no longer repositions DOM receipts every frame. These are diagnostic comparisons, not a claim of measured physical-device FPS.

Independent review findings repaired: final stale shadows, OS motion-preference cancellation skipping settlement, and SkipBuild stamping stale output. The official Node 24.21.0 x64 download/checksum/reuse was exercised. ARM64 and a physically clean Windows PC remain untested.

Actual share-package check: **PASS**, 50.2 MB ZIP. Extracted and moved to a folder containing spaces and `&`, removed global Node/npm from PATH, ran actual setup.bat and run.bat, served built HTML/CSS/JS and the cache manifest, created/saved a LAN room through the packaged ws module, and reused the same host on a second launch. The test host was stopped by its recorded runtime path/start time; the original production host remains active. A separate fresh-context offline cache inspection/resume/purchase passed with all generated assets present. A two-peer combined smoke run timed out during offline reload under software rendering; its offline phase now closes the peer tab and functional rendering uses Low quality, while the separate city probe covers higher quality.
