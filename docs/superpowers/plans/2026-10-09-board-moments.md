# Board moments and card reading implementation plan

**Goal:** Make transactions, ownership, cards and match results clear and animated without moving the page layout.

**Design:** Keep the warm tabletop style, compact stable turn row and centered tools. Put owner plaques outside tiles toward the board rim. Project rent and purchase effects into screen space from their property; label actual paid rent with payer and recipient. Read Chance/Community Chest from the physical deck before resolving money, movement, jail or debt. Each of the 32 cards has its own illustrated scene and motion. Show winner/loser results with rankings and finite celebratory effects. Honor reduced motion and keyboard access.

**Architecture:** Add an authoritative saved `card` phase and `resolveCard` action to the shared engine, validated on LAN as well as solo. Pending cards hold the drawn card outside its deck until resolution. Tag rent payments with property/from/to/amount instead of inferring an obligation was paid. Keep cosmetic board effects, card designs and results rendering separate from turn rules. Reuse the Three camera to project deck/property anchors and maintain them when the camera moves.

**Execution:** Implement directly in the existing authorized workspace. No additional design permission round is needed for the user's explicit changes.

- [x] Write real-engine regressions for delayed card cash/movement, chained cards, held cards, permission checks, saved pending cards and actual rent metadata. Verify failure, implement, then update prior expectations for the new read step.
- [x] Integrate readable pending-card decisions and bot/LAN read delays; verify effects start only after Continue and animations settle before the next popup.
- [x] Add 32 distinct card illustrations/motions and flight from projected deck position; verify identity uniqueness and reduced-motion behavior.
- [x] Add spatial rent labels, purchase seals and accepted-trade animations; owner plaques outside property edges; richer tile materials/details without undeveloped buildings.
- [x] Add winner/loser results with standings and finite effects; center tools and refine the UI without introducing layout shift.
- [x] Run unit/core/LAN checks, production builds and Chrome journeys; inspect desktop/mobile screenshots and obtain independent review. Document results, commit, and leave the production host updated.

Verification complete: 105 automated tests; strict production builds; eleven production browser scripts plus reduced-motion checks; real-time card readability; inspected desktop/mobile screenshots; independent review with confirmed repairs. See TEST_RESULTS.md. Temporary development server stopped; production remains healthy on port 3001. Verified sources are included in the delivery commit.
