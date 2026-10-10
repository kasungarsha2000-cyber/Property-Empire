# Progress

2026-10-09 follow-up: Small rent/money notices now expire after 2.2 seconds and trade confirmations after 2.8 seconds. The previous cosmetic receipt clears as the next pawn starts moving; new receipts still wait for arrival. Purchase, Chance and Community Chest decisions sit at the board's right edge with reachable sticky actions on short screens. Cards still wait for Continue. Continue Saved Game and Rejoin LAN Game are separate labeled menu buttons. Front-page credit: Developed by Kasun Samarasinghe.

Design source: supplied JSON; user authorized implementation.

- Workspace inspection: empty; Node 24.21.0 and npm 11.19.0 available.
- Design and implementation plan recorded.
- Task 1: complete — shared engine and bots, including full classic match simulations.
- Task 2: complete — authoritative LAN host, disk saves, reconnect and real WS tests.
- Task 3: complete — 3D renderer, responsive controls, IndexedDB saves, offline production cache and Chrome gameplay tests.
- Task 4: complete — production-browser and offline verification passed; final independent review has no unresolved material findings; launch documentation delivered.

Ruling: implement directly in the requested empty directory; there is no existing checkout to isolate.
Ruling: user's build instruction and detailed supplied specification provide scope and implementation authorization; proceed without additional design approval rounds.
Ruling: native TypeScript tests plus installed Chrome via Python Playwright avoid a browser download.

Independent review found debt/auction sequencing, off-turn doubles, cashless trade UI eligibility, corrupt references and disk-save acknowledgment defects. Regression tests were written and the defects repaired. Seller-aware bot pricing resolved classic matches that previously never assembled color groups.

Ruling: Free Parking's optional jackpot includes only board taxes, matching the supplied tax-jackpot wording.
Ruling: sellGroup permits complete building liquidation when a hotel cannot be replaced due to bank house shortages.
Ruling: the last surviving player wins immediately; further inherited-mortgage paperwork does not prolong a finished match.
Ruling: limited building stock is allocated in authoritative turn order. There is no concurrent player building command to contest stock in this implementation.

Final verification: npm test 34/34; strict TypeScript and both production builds passed; 13 Chrome journeys plus offline resume and additional responsive viewports passed with zero page exceptions; full npm audit zero vulnerabilities. HTTP and WebSocket ping succeeded via 192.168.1.222:3001 from this host. Independent reviewer also completed classic Easy-bot matches at four and eight players for seeds 12, 73 and 211.

Delivery: production server left running on port 3001; browser panel requested; README, test report and Windows launcher supplied. Source kept on build/property-empire in this newly initialized repository.

Graphics follow-up: replaced the placeholder city/pawns with a detailed tabletop board and eight miniature tokens; added filmic lighting, reflections, textured materials, rounded dice and responsive camera fitting. Production browser/offline verification passed after renderer changes. See GRAPHICS_UPGRADE.md for implementation and verification details.


Ownership/trading overhaul completed: a persistent district portfolio, owned/available deed filters, board owner names and Yours labels, ownership highlight toggle, missing-deed trade shortcut, illustrated give/receive selection, exact acceptance preview, edit/review/send steps, and incoming-offer comparison. Desktop actions fit the viewport and mobile puts the board first. Verification: 46 tests and production build passed; all three browser scripts (13 + 8 + 10 journeys) and offline resume passed with no page errors. Independent incoming debt explanation finding repaired with red/green regression. Production on port 3001 updated.


2026-10-09 quieter receipts and negotiation: purchase/rent confirmations now use compact three-second receipts. Owned properties get gold outlines, a high-contrast YOURS badge, stronger portfolio labels and camera focus from a selected owned deed. Fullscreen matches hide the website header and expose exit/settings/help in the side tools. Declining a trade offers a reviewed counteroffer or final decline; bots can propose legal cash revisions. Recipient-only counter actions retain the original phase/debt and cap negotiations at three counters. Live trade payloads match restored saves. Automated core/helper/server tests: 78 passed; production build and strict TypeScript passed. Independent review has no findings.


2026-10-09 readable deeds, player profiles and game feel: the portfolio uses one sidebar scroll instead of a squeezed inner container; owned deeds open a larger dialog with live management controls. Clickable player rows open asset/cash/net-worth/rent profiles with a validated trade shortcut. Distinct synthesized sound effects replace the generic beep, with a visible mute toggle and user-gesture unlock. Pawns face their travel direction, hop with squash/stretch and briefly celebrate assets. Reduced motion retains instant arrival. Both root/project run.bat launchers were tested for cold start and reuse, leaving one host on port 3001. Independent review identified selected-deed switching, reduced-motion sound queues and public-asset freshness gaps; all were repaired and confirmed. New browser regressions failed before repair and passed after it.

2026-10-09 compact match and personal feedback: the tool buttons follow turn/dice information inside the overview panel, with the separate toolbar card removed. The right column is removed and the board expands beside the portfolio. Actual board clicks and gallery choices open live deed dialogs, with a header focus button. Bank building stock is available in the gallery. Short coin/balance and warning effects follow personal gains, acquisitions, payments, jail and debt after pawn arrival; reduced motion suppresses the effects. Review caught unpaid birthday collection feedback and pending feedback surviving a save restore. Both have regression coverage and confirmed repairs. All 86 automated tests and strict production builds pass; Chrome's new direct board-click, compact geometry, settled rent, fullscreen and responsive checks pass.

Final compact-match verification: all eight production Chrome scripts and the separate reduced-motion run pass with no page exceptions. Deed management, player profiles, sounds, purchases/auctions, trading/counteroffers, cards, camera behavior and LAN reconnect remain working. Updated screenshots were inspected and the production host remains healthy on port 3001.

2026-10-09 stable rolls, opponent popups and miniature redesign completed: a persistent, bounded status row removes the first-roll 60-pixel layout shift; payment pulses no longer jiggle balances. Opponent arrivals, purchases, cards, financial events, development, debt and bankruptcy use compact, named, scrollable notifications after movement. They dismiss automatically and allow bots to continue, while personal cards and decisions retain priority. Earlier-save restoration clears discarded observer notices. All eight pawns gain distinct miniature details and owner-colored enamel/brass bases; houses gain eaves, chimneys and entrance/window details; hotels gain stepped floors, glazing, canopy/columns and signage. Undeveloped property tiles remain empty.

Verification: 94 automated tests, strict TypeScript and production builds passed. All ten production Chrome scripts and the separate reduced-motion check passed across the verification cycle, including zero-shift geometry at desktop/tablet/mobile sizes and nonblocking opponent card/purchase flows. The development probe confirmed bounded pawn/building footprints and the model sheet/board close-ups were inspected. Test-clock units and asynchronous fixture restoration were corrected so bot timing assertions observe actual gameplay. Independent review confirmed the reconnect bank-payment repair; the final restoration guard has a manually audited regression. The production host remains on port 3001.

2026-10-09 spatial transactions, read-first cards and results completed: actual rent amounts and payer/recipient names appear near the property; purchases use a deed seal and accepted trades animate exchanging deeds. Owner plaques move outside tiles toward the rim, and district lettering, borders and brass details refine the board. Tools are centered within the stable turn panel. All 32 cards have separate art and motion, fly from the physical deck after pawn arrival and await Continue before their rule effect; unread cards persist in solo saves and authoritative LAN snapshots. Chained cards each wait for reading. Winner/loser results show rankings with finite trophy/confetti or loss effects, mobile scrolling and reduced-motion support.

Verification: 105 automated tests, strict TypeScript and production builds pass. All eleven production Chrome scripts plus the reduced-motion run passed across the final cycle, including offline reload, LAN synchronization/reconnect, card sequencing, spatial transactions and results. A short clock-freeze deadline in an older test was corrected by freezing before saved-game restoration; affected checks were rerun successfully. Real-time card readability and desktop/mobile screenshots were inspected. Independent review repairs are confirmed with no unresolved material findings. The updated production host remains healthy on port 3001.

2026-10-09 living-city and presentation follow-up: compact status, centered tools and dice occupy one desktop row. Property inspection and buying use one complete deed. Landscaped plots retain grass/paths/flowers/shrubs, and the user's later request adds a thin district-colored perimeter. Undeveloped plots remain empty. Dice have separated lanes and rotated-footprint tray clearance. Cars, pedestrians, signals, an aircraft, clouds/rain and solar/window lighting animate independently of turns; reduced motion freezes the city at a readable day.

Financial confirmations are consolidated: one purchase/build/trade board receipt, one named property rent label, and one income/payment notice. Text remains for eight seconds, with hover/focus pausing event notices. Card effects are decorative after reading, without a second financial explanation. Bots allow nine seconds in solo and twelve on LAN. Property purchases/transfers/rent pulse the actual tile; new houses/hotels rise into place. Queue retention and movement gates preserve rent notices until arrival. All 131 automated tests, strict TypeScript/builds and seven targeted development Chrome scripts pass. Independent receipt repairs are confirmed.

Final production verification: all thirteen Chrome scripts and the separate reduced-motion check passed across the final cycle, including offline resume, LAN synchronization/reconnect, no-shift rolls, single/readable notifications, unified deeds, sound/trading and results. A real-time purchase receipt stayed readable beyond four seconds and its screenshot was inspected. The latest production bundles include the colored tile perimeter and the host remains healthy on port 3001.

2026-10-09 cash, dice, city and distribution update: each player’s nametag animates booked money gains/losses after arrival and survives UI rerenders. Accepted trades show the named illustrated assets and a settled confirmation. Popups use refined ivory/forest/brass styling; own and opponent cards keep a visible Continue button, and bot cards can be resolved sooner in solo or through an authenticated authoritative LAN message. The original card-reading rule remains intact for humans.

Dice now travel across the full foreground felt with fixed-step gravity/rebounds, deck and pair collisions, independent of render cadence. Vibrant district borders frame landscaped properties. City roofs, windows, storefronts and park details are enhanced. Repeated static meshes are instanced without changing original tile picking; city timing retains dropped-frame time, shadows are refreshed at bounded cadence and final settlement, and pawn travel avoids the exaggerated stop/hop at each square. OS reduced motion snaps and flushes the normal arrival sequence.

Portable setup installs a verified supported Node runtime into the game folder, uses local npm caching and preserves saves. run.bat works after extraction/moving, detaches the host and checks folder/process ownership. The package script includes production dependencies and optional runtime while excluding saves/dev files; stale build certification and changed bundle content are rejected. All 160 automated tests and production builds pass; development Chrome flows and screenshots were verified.

The actual 50.2 MB Windows ZIP passed moved/extracted-folder launch with no global Node/npm on PATH, built-asset serving, LAN save persistence and same-host reuse. A fresh browser service-worker inspection and offline solo resume/purchase passed. Physical clean-PC and ARM64 tests remain unperformed.

## 2026-10-10 — Android UI redesign

- Audit and implementation plan: `docs/android-ui-audit.md`, `docs/android-ui-implementation-plan.md`.
- Rules regression suite (48 tests); raising funds is now allowed while deciding on a purchase.
- New mobile-first interface on design tokens: HUD with player chips, full-height board with portrait framing,
  contextual dock, decision panels, card reveal, tile preview and full deed, properties, trade builder, bank history,
  settings, game menu, menus and setup, results; one Back path; pass-and-play; music; haptics.
- Capacitor Android project with original icon and splash, LAN support from the app, lifecycle handling.
- Playwright browser suite replaces the Windows-only Python scripts.
- Report: `docs/android-ui-report.md`.

