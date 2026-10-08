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

## Not executed

Physical phones or tablets, real router/hotspot peer communication from another device, Firefox, Safari, real low-end GPU frame-rate/thermal measurements, HTTPS reverse proxy and remote production deployment. Local network URLs are detected from interfaces; these tests establish local process/browser behavior, not physical-device reachability.
