# Property Empire

An original 3D property-trading game played on a miniature city board: solo against computer rivals, pass-and-play with friends on one device, or over a local network. Built with strict TypeScript, Three.js, Vite and an authoritative Node WebSocket host, and packaged for Android with Capacitor. No accounts or cloud service; fonts and artwork are local and the board, city, pawns and dice are procedural geometry.

## Start playing on this PC

Double-click **setup.bat** once, then **run.bat** in the game folder. Setup downloads a supported Node.js runtime into `.runtime/node`, verifies its official SHA256 checksum, and prepares missing dependencies/builds. It needs no administrator rights or global installation. The launcher starts a hidden local host and opens **http://localhost:3001**.

For development, you can also run:

```powershell
cd "D:\Other\Monopoly Game\PropertyEmpire3D"
npm run start:lan
```

This terminal command keeps the server in the foreground; Ctrl+C stops it. Production bundles have already been built.

The batch launcher rebuilds changed source and reuses a host from the same folder. If another copy occupies port 3001, close its host or set `PORT` to a different number. Logs are in `data/launcher-*.log`. `run.bat -NoBrowser` starts the host without opening a browser.

## Play on Android

The `android/` folder is a Capacitor project around the same web build. Build and install it with Android Studio or `npm run android:build`; requirements, LAN setup on phones, the device test checklist and current limits are in [docs/ANDROID.md](docs/ANDROID.md). The APK has not been built in this repository's CI environment because the Android SDK could not be downloaded there.

## Send the game to a friend

Send **PropertyEmpire3D-Windows.zip** from the parent folder. Your friend should extract the whole ZIP into any folder, open its **PropertyEmpire3D** folder, run **setup.bat** once, then use **run.bat** to play. Keep the folder together when moving it. A Windows x64 runtime and production dependencies are included in this package, so the extracted version can launch offline; setup downloads a matching runtime if needed on another supported architecture. A source-only copy needs internet access for first setup. Your saves and host data are excluded from the ZIP.

To prepare a fresh share package yourself:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/package-game.ps1 -IncludeRuntime
```

This packages source, local assets, current builds and production dependencies. It refuses to overwrite an existing ZIP unless you pass `-Force`. `-SkipBuild` is available after a fresh manual build; stale bundles are rejected.

## Solo and pass-and-play

Choose **Play solo**, enter your name and token, and pick 0–7 computer opponents (Easy, Medium or Hard). Under **Players on this device** add friends who share the phone or computer; the game asks you to hand the device over whenever another person must act. Rules: starting cash, Classic (last player standing), Quick (80 turns) or Extended (160 turns) by net worth, and the optional Free Parking jackpot, which is labelled as a house rule.

Solo games run entirely in the browser or app, work offline, and save after every accepted action in this browser's or app's IndexedDB (`property-empire-saves`). **Continue saved game** on the main menu shows the turn and when it was saved; **Settings → Restore previous solo save** loads the save before the latest one. Each browser profile, URL origin and the Android app keep separate saves.

The production service worker precaches the app on `localhost` and HTTPS origins so cached solo play survives an offline reload. It is not used inside the Android app, where all files are bundled.

## Host a game over Wi-Fi or hotspot

1. Put the host computer and every phone on the same reachable Wi-Fi network or hotspot.
2. Run **run.bat** (or `npm run start:lan`) on the computer. It serves the browser app and `/ws` on port **3001** and prints its **Wi-Fi IP URL**, for example `http://192.168.1.222:3001`.
3. Browser players open that URL. Android players enter the address (for example `192.168.1.222:3001`) under **Host computer**; the app remembers it.
4. One player chooses **Host LAN game**, sets computer opponents and rules, and creates the room. **Share invite** sends the room code and host address.
5. Friends choose **Join LAN game**, enter the six-character room code and press **I'm ready**. A `?room=CODE` link opens the join screen directly.
6. The host presses **Start match** when 2–8 connected players are ready. Changing opponents in the lobby asks guests to confirm again.

The server owns dice, actions and bot decisions; every client renders the same canonical state and revision. Commands carry an id and the revision they were made against, so double taps and retries cannot apply twice, and the UI locks a button until the host answers. Losing a connection pauses only decisions waiting on that player; the client retries automatically and **Rejoin LAN game** restores the original seat after a reload. An unreachable address or a wrong room code returns to the form with the reason.

Host snapshots and their previous backups are stored in `data/saves/` (or `SAVE_DIR`) using atomic writes; restarting the server reloads compatible rooms. **Save game** in a LAN match waits for the host to confirm the write.

## Playing on a phone

- **Top:** turn number and compact player chips with cash, the active player highlighted, and badges for bots, jail and disconnected players. Tap a chip for that player's overview and, on your turn, **Trade with…**.
- **Board:** drag to rotate, pinch to zoom, two-finger drag to pan; the round button resets the camera. Tap a tile for a quick preview without interrupting play; **Details** opens the full title deed.
- **Dock:** one large button shows the only valid next step (Roll dice, End turn, Roll again, Review purchase, Read card…). Beside it are **Properties**, **Trade**, **Bank** and **Menu**.
- **Decisions** rise from the bottom: buying (with *Raise cash* when short), auctions with quick bid increments, jail options with reasons for unavailable ones, debt with what you can still raise, and incoming offers with **Accept / Counter / Decline**. The arrow hides a decision to look at the board without declining it.
- **Chance and Community Chest** cards rise and flip, show their rules and amounts, and apply when you press **Continue**. Computer players' cards appear smaller with their own Continue.
- **Properties** groups deeds by colour set with progress and one-tap build, sell and mortgage buttons that the rules engine checks. **Trade** opens a two-sided builder (You give / You receive), a plain-language summary and a review step. **Bank** lists balances and money history.
- **Back** (Android button, browser Back or Escape) closes the top layer first, minimises decisions instead of declining them, and opens the game menu when nothing else is open.
- **Settings:** sound effects, music, haptics, animation speed, reduced motion, graphics quality, camera sensitivity, text size and highlighting your tiles.

On tablets and computers the same layout uses a floating dock, side sheets and decision panels on the right.

## Game rules

- Original 40-space board, starting cash $1,500 and $200 salary for passing or landing on Start. Salary is awarded once per crossing.
- Two six-sided dice. Doubles earn another roll; three consecutive doubles send the player to jail.
- Buy unowned property or auction it. While deciding you may mortgage or sell buildings to raise the price. Every active player, including the declining player, may bid. Passing withdraws that bidder for this auction. Bids cannot exceed available cash; highest remaining bidder wins.
- Automatic rent. Complete undeveloped street groups pay double base rent. Stations pay $25, $50, $100 or $200 based on ownership count. Utilities pay 4× or 10× the dice total. Mortgaged deeds charge no rent. Opportunity movement cards can change these multipliers.
- Own the complete street group, clear every group mortgage, and build evenly. Four houses on each street unlock hotels. The bank supplies 32 houses and 12 hotels. A sold hotel needs four replacement houses; **Sell group buildings** liquidates the entire developed group if replacement stock is unavailable. Buildings sell at half their total cost.
- Mortgage value is half the deed's purchase price. Sell all group buildings first. Lifting a mortgage costs its value plus rounded-up 10% interest. A transferred mortgaged deed remains mortgaged and charges its receiver 10% transfer interest; later lifting it has the normal cost.
- Trade cash, undeveloped deeds and held jail cards by mutual agreement. Developed groups cannot be traded. Offers lock the decision phase and revalidate funds on acceptance; the offering player can withdraw an unanswered offer (useful if a LAN player has left). One offer per turn; no loans.
- Jail: pay $50 before rolling, use a jail card, or attempt doubles for up to three turns. On the third failed roll, pay $50 and move using that roll. Doubles used to escape do not earn another roll. Rent collection and asset management continue in jail.
- Opportunity and City Fund each contain 16 original cards, shuffled per match and drawn without replacement within a cycle. Held jail cards return to their source deck when used.
- Mandatory debt pauses play for mortgages, building sales or negotiation. Choosing bankruptcy forfeits the player's cash and deeds to the creditor; bank bankruptcy returns and auctions deeds. The last remaining player wins immediately. Other players going bankrupt do not cancel the current player's doubles.
- Free Parking is a rest space by default. The optional jackpot collects board taxes, rather than unrelated fees.
- Quick games rank surviving players by cash plus deed value (mortgage value for mortgaged deeds) and construction cost. Ties keep the existing player order.

## Development and production

```bash
npm ci
npm run dev           # solo frontend, http://localhost:5173
npm run dev:lan       # Vite frontend :5173 + Node WS host :3001
npm run typecheck
npm test              # Vitest: rules engine, UI state and markup, server, storage
npm run build         # typecheck, web build, offline cache manifest, server bundle
npm run start:lan     # production frontend + WS host on :3001
npm run test:browser  # Playwright end-to-end suite against the production build (build first)
npm run android:sync  # build and copy the web app into android/
npm run android:build # debug APK (needs the Android SDK)
```

Development uses Vite's `/ws` proxy; production serves the web app and `/ws` from one Node origin. Output: `apps/web/dist/` and `apps/server/dist/index.js`. `PORT`, `HOST`, `SAVE_DIR` and `ALLOWED_ORIGINS` (comma-separated WebSocket origins for an HTTPS reverse proxy; include `http://localhost` for the Android app) configure the host.

Code map: `packages/core` is the rules engine, validation and bots shared by browser, app and host. `apps/web/src/ui` holds the interface (design tokens in `tokens.css`, turn state and dock logic in `turn-state.ts`, panels, sheets and screens); `board-view.ts` and `scene-assets.ts` draw the 3D board; `platform.ts` bridges Android. Design decisions are recorded in `docs/android-ui-audit.md` and `docs/android-ui-implementation-plan.md`.

## Browser tests

`npm run test:browser` runs `tests/e2e` with Playwright: it starts the production host on port 3199 with a temporary save folder and drives a phone-sized Chromium with touch emulation through menus, every decision panel, trading, properties, saves, Back navigation, LAN host/guest/rejoin, connection errors, layouts from 360 px phones to desktop and an automated play-through. Install the browser once with `npx playwright install chromium`. Reports go to `test-artifacts/e2e-report`.

## Troubleshooting

- **A phone cannot reach the URL:** verify the Wi-Fi address printed by the host, keep the terminal open, and use the computer's address rather than `localhost`. Windows Firewall must allow the Node process on the intended Private network. Guest Wi-Fi and some hotspots isolate devices; try a regular router or an alternative hotspot. This project does not change firewall settings.
- **Port already in use:** stop the earlier game terminal with Ctrl+C, or set `$env:PORT='3002'` before `npm run start:lan`, then use that port's printed URL.
- **A LAN room seems missing:** check that all clients use the same host process and port. Restart from the project directory so `data/saves/` resolves correctly. Resume in the same browser profile that created the seat.
- **Connecting from HTTPS:** insecure `ws://` is blocked. Use a secure reverse-proxied `wss://` endpoint and its allowed origin.
- **Slow graphics:** choose Low quality or Fast/Reduced motion, close heavy background tabs, or enable browser hardware acceleration. Context loss gives a reload recovery notice; accepted game actions were saved separately from rendering.
- **Save error:** check browser storage permissions for solo or available disk space and `data/saves/` access for LAN. A host save failure produces an error, never a success acknowledgment.
- **The Android app cannot reach the host:** enter the computer's Wi-Fi address with the port (for example `192.168.1.5:3001`), keep the host running, and if you configured `ALLOWED_ORIGINS`, add `http://localhost`.
- **The 3D board does not appear in the Android app:** update *Android System WebView* and Chrome from the Play Store; the app needs WebView 111 or newer.

## Credits and verification limits

Original board names, card wording, artwork, icons, sounds and music (synthesised in the browser). Three.js, ws, Zod, Capacitor and the build tools keep their upstream licenses. Inter, Nunito and Fredoka are bundled through Fontsource under the SIL Open Font License; retain their licenses when distributing.

Verified in this repository: Vitest unit tests, strict TypeScript, production builds and the Playwright suite in headless Chromium (software WebGL) at phone, tablet and desktop sizes, including two LAN clients against the real host. Not verified: physical Android devices, an Android emulator, the Gradle/APK build (Android SDK unavailable in the build environment), Safari, Firefox, router-to-phone or hotspot play, and frame rates on real low-end GPUs. See [docs/android-ui-report.md](docs/android-ui-report.md).
