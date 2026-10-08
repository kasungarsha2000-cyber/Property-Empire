# Camera, scrolling and game events

The user wants wheel zoom aimed at the mouse pointer, the board to stay visible while scrolling elsewhere, and game-style popups for purchases, rent and special events.

1. Enable the installed OrbitControls cursor zoom and board-plane targeting. Keep wheel events scoped to the canvas, retain reset and touch controls, and permit right-button panning.
2. Keep the desktop match inside the viewport, independently scroll the side panels, and keep the board sticky within the mobile/tablet page. Remove the desktop minimum height that forces page scrolling on short displays.
3. Add a separate event presenter. Critical purchase, auction, debt, jail and incoming trade decisions show a dismissible popup with the existing validated action controls. Informational rent/payment, purchase confirmation, cards, salary and jail notices are queued and dismiss automatically. Hide duplicate board controls only while a decision popup is visible. Other dialogs take precedence.
4. Derive new notices from authoritative state/log transitions, never replay an old save's cash events, preserve other players' turn authorization and keep the engine/network protocol unchanged.
5. Verify event derivation with regression tests, cursor anchoring numerically in the browser, scrolling/resize on short screens, real popup actions, mobile layout and the existing gameplay/LAN/offline journeys. Review the result independently and rebuild the production app.

Review focus: reconnect/duplicate snapshots; cash owed versus cash actually paid; multiple card payments; stale popup actions; close/reopen behavior; screen resize after zoom; controls over the WebGL canvas; keyboard dismissal and reduced motion.

Implemented and verified on 2026-10-09. All 58 automated tests pass, including 12 event regressions. Production gameplay, deeds, ownership/trades and event browser journeys passed with offline resume and two-client LAN. The cursor probe measured normalized screen drift below 0.0001 and preserved its target on resize. Short mobile notice bounds and reachable detail text passed at 390×390. Independent review identified card-triggered rent classification and short-screen notice clipping; both were repaired, reproduced in regression tests and confirmed by review.
