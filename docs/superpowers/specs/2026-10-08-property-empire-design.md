# Property Empire 3D design

The supplied Property_Empire_3D_Browser_Claude_Code_Prompt (15).json is the design authority. The user requested building the game. Deliver an original, local-first browser board game for friends, with bots and authoritative LAN rooms.

## Architecture
Strict TypeScript shared core has serializable state, seeded random numbers, validated commands and event history. Solo runs the core locally; Node owns room state, randomness, identities and bots for multiplayer. Three.js renders procedural board, city, pawns, buildings and dice. DOM UI remains usable by keyboard and touch. Vite bundles local fonts and assets.

## Rules and interactions
40 spaces, 2–8 players, cash 1500, salary 200, original streets and two shuffled event decks. Purchase or auction; automatic street/transport/utility rent; doubles and jail; even construction and selling with 32 houses and 12 hotels; mortgages and transfer interest; two-party cash/property/jail-card trades; debt recovery and creditor bankruptcy. Classic last-player-standing and optional quick net-worth game. Difficulty heuristics consider reserves, monopolies and building return.

## Persistence and transport
Versioned validated IndexedDB solo saves and backup, autosave after changes. Atomic Node snapshots include canonical room state and reconnect identities. Room codes and invite URLs contain no reconnect secrets. WS commands carry revision and unique ID, are size/rate/schema checked, and operate only for their authenticated seat. Disconnected current humans pause; reconnect recovers their seat. Same-origin WS proxy avoids hardcoded browser localhost.

## Presentation
Cream #F5F0E6, ink #253344, blue #4B91D1, mint #55B98A, orange #EFB15E and board #EFE4CB. Fredoka display and Nunito body fonts bundled locally. Central tactile isometric city board, quiet ledger, focused turn panel. Tile selection via raycasting and keyboard property list. Orbit, zoom and reset; normal, fast and reduced motion. Responsive portrait and landscape.

## Validation
Vitest deterministic rules and complete bot matches; real WS integration including invalid actions, reconnect and synchronization; Chrome Playwright solo, save/resume and two-client LAN journeys at desktop/mobile sizes. Typecheck and production frontend/server builds. Physical phone, router/hotspot, Safari and Firefox tests reported separately from automated local verification.
