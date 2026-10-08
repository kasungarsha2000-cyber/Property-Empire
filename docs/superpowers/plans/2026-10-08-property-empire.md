# Property Empire 3D Implementation Plan

> Execute task-by-task in this session using test-driven development and verification-before-completion. Keep progress in docs/PROGRESS.md.

**Goal:** A playable 3D property-trading browser game, offline bots, saves, and LAN multiplayer.

**Architecture:** Shared pure TypeScript engine; Three.js plus DOM browser client; authoritative Node WS server. Identical commands and game state in solo and LAN.

**Tech Stack:** TypeScript strict, Vite, Three.js, Node, ws, Zod, Vitest, Playwright.

**Spec:** ../specs/2026-10-08-property-empire-design.md and docs/SOURCE_SPEC.json.

## Global constraints
Original assets and names. No accounts, cloud, Android, external runtime assets or public exposure. Two to eight players. Classic defaults, editable economics. Human input is validated. Money uses safe integers.

## Review focus
Corrupt saves cannot crash or silently replace a current game. Reconnect restores the same seat. Bots must make progress through auctions and debt. Trade participants cannot spend pledged cash during acceptance. Small-screen actions remain reachable.

### Task 1: Shared rules and bots
Files: packages/core/{board,types,engine,bots,validation}.ts; tests/core.test.ts.
Produces createGame(config,seed):Game, applyAction(game,playerId,action):Game, botDecision(game):{playerId,action}|null and validateGame(value):Game.
- [ ] Write failing tests for turn ownership, purchase/rent, auctions, even building, mortgages, trades, debt, jail and seeded full matches.
- [ ] Run `npm test`; inspect the missing-feature failures.
- [ ] Implement data, command reducer, decks, constraints and heuristic bots.
- [ ] Run `npm test`; correct actual failures.

### Task 2: Authoritative LAN server
Files: apps/server/src/{server,index}.ts; tests/server.test.ts; scripts/dev-lan.mjs.
Consumes core commands and validation; exposes startServer({port,host,saveDir}) and WS /ws.
- [ ] Write and run failing real-client create/join/start/action/reconnect tests.
- [ ] Implement rooms, session tokens, readiness, bots, disk resume, origin/size/rate limits and unique command IDs.
- [ ] Run real WS tests, ensure synchronized revisions and identity enforcement.

### Task 3: Browser experience
Files: apps/web/{index.html,public/sw.js,src/{main,board-view,storage,network,styles}}.
Consumes core and canonical LAN snapshots.
- [ ] Write browser journeys for menu, solo, roll, purchase/auction, save/resume, room invite and mobile layout.
- [ ] Implement tactile board, animated dice/pawns, responsive DOM controls, accessible dialogs, settings and local fonts.
- [ ] Implement IndexedDB persistence and local asset caching; reconnecting WS client.
- [ ] Run Chrome journeys and inspect desktop/mobile screenshots.

### Task 4: Delivery and review
Files: README.md and docs/{PROGRESS,BUILD_STATUS,TEST_RESULTS,BLOCKERS,NEXT_STEPS}.md.
- [ ] Run `npm run check` and production-browser journeys.
- [ ] Review complete implementation, resolve important defects, rerun affected checks.
- [ ] Write exact solo/LAN launch commands and verified URLs. Record physical-device limits accurately.
