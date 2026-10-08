# Executed tests — 2026-10-08

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

Production `EMPIRE_URL=http://127.0.0.1:3001 EMPIRE_OFFLINE=1 npm run test:browser` passed all three sequential scripts: 13 baseline gameplay/LAN journeys plus offline reload; eight illustrated-deed journeys; ten ownership/trading journeys. The new journeys cover owned and bank filters, highlight toggle, missing-deed shortcut, disabled developed deeds, complete-set preview, review/edit preservation, actual bot acceptance, incoming offer comparison/acceptance, and responsive layouts. Zero page exceptions. Desktop turn controls fit within the 1440�960 viewport; narrow layouts have no horizontal overflow at 390�844, 375�812, 844�390 and 768�1024. Screenshots were visually inspected. SwiftShader rendering was additionally inspected after its initial draw and zoom; the board remains visible.

Independent review found an incoming debt-trade explanation gap; its condition now covers debt-resuming incoming trades. Reviewer confirmed the repair and 7/7 helper tests; no unresolved material findings. Physical-device and other-browser limitations above still apply.


2026-10-09 compact turn controls: 46 automated tests, strict TypeScript and production builds passed. All three production browser scripts and offline resume passed. Assertions confirm the initial roll control has one button and no large heading, roll messages render separately in the overview, and the waiting LAN player has no action bar. Purchase, auction, management, debt trade and incoming trade acceptance continue to work. Responsive checks passed with no page errors.
