# Executed tests — 2026-10-08

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
