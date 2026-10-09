# Turn animations and drawn cards

Requested behavior: show destination popups after pawn arrival, vary dice tumble/landing positions, leave property squares empty until actual houses/hotels are built, and display Chance/Community Chest cards with clear annotations.

The renderer reports active dice and pawn playback. While playback is active, popups stay hidden and human actions and local bots wait. Settlement rerenders the current authoritative state; reduced motion resolves immediately. Movement follows recorded arrivals and backward/jail card effects, including repeated board-space names and chained draws. Cosmetic dice randomness is independent of the rules RNG, with bounds that contain the entire rotated die footprint inside the tray felt.

Property landmarks are no longer instantiated. Ownership labels and title deeds remain visible; construction levels create actual houses or a hotel and selling the last building clears its geometry.

Drawn cards use separate purple Chance and gold Community Chest faces, print the original rule, and add destination, rent modifier, money/repair or held-card explanations. Continue or Escape acknowledges a card before normal destination decisions/actions return. Cards opens a catalog of both 16-card decks. Reconnect attribution follows the actor at each turn-log event and does not guess ambiguous names. Engine effects, card order and network protocol remain authoritative.

Verification covers exact movement routes, backward/chained cards, reconnect attribution, all 32 card explanations, repair arithmetic and rotated dice footprint. Browser checks hold the clock during dice playback, advance to arrival, exercise actual card acknowledgment/catalog, inspect mobile bounds, and switch to reduced motion during both purchase and card movement. A renderer probe verifies empty properties, actual houses/hotel/sale geometry, and settling after a real animation.
