# Property Empire 3D

An original 3D property-trading game for a solo player with bots or friends on a local network. Built with strict TypeScript, Three.js, Vite and an authoritative Node WebSocket server. No accounts or cloud service. Fonts and artwork are local; the board, city, pawns and dice use procedural geometry.

## Start playing on this PC

Double-click **Start Property Empire.cmd** in the parent folder, or run:

```powershell
cd "D:\Other\Monopoly Game\PropertyEmpire3D"
npm run start:lan
```

Open **http://localhost:3001**. Production bundles have already been built. Keep the server terminal running while playing LAN games. For a new installation, use Node.js 24 LTS, then `npm install` and `npm run build` first. Ctrl+C stops the server.

## Solo play

Choose **Play Solo**, your name and pawn, and one to seven bot opponents. Easy, Medium and Hard use different reserves, auctions, trades and building heuristics. Classic plays to the last surviving player; Quick ends after 80 turns and compares net worth. Starting cash and the optional tax jackpot can be changed.

Solo uses the rules engine in the browser and does not open a WebSocket connection. To serve only the frontend, run `npm run dev` and visit **http://localhost:5173**, or serve `apps/web/dist` with any static HTTP server. A LAN game server is unnecessary for solo.

Solo saves automatically after accepted actions in this browser's IndexedDB database `property-empire-saves`. **Save game** also saves manually. **Continue Saved Game** resumes the full phase, random generator, decks and held cards. Settings offers **Restore previous solo save**. Each browser profile and URL origin has separate saves.

The production service worker precaches the HTML, scripts, fonts and styles. After a successful load on **localhost or HTTPS**, cached solo play survives an offline reload. Service workers are normally unavailable on plain HTTP Wi-Fi IP addresses. On those addresses, serve the files locally whenever opening the game; internet access is still unnecessary. Clearing site data removes browser saves and cached assets.

## Host a game over Wi-Fi or hotspot

1. Put the computer and phones on the same reachable Wi-Fi network or hotspot.
2. Run `npm run start:lan` on the computer. It serves both the browser app and `/ws` on port **3001**, bound to `0.0.0.0`.
3. Open the printed **Wi-Fi IP URL** on every device. At delivery, this computer's Wi-Fi URL was **http://192.168.1.222:3001**. The address can change; the launcher prints current addresses. Ignore virtual-adapter addresses such as the WSL network if using Wi-Fi phones.
4. One player chooses **Create LAN Game**, configures bots and the match, and creates a room.
5. Friends choose **Join LAN Game**, enter the six-character room code, and select **Ready to play**. A shared `?room=CODE` invite opens the join screen directly.
6. The host chooses **Start match** once 2–8 connected players are ready. The host can update bot opponents in the lobby; this resets the other humans' readiness.

Copy the invite while using the **Wi-Fi URL**. A phone's `localhost` means that phone, not the host computer. The optional Server address field supports manual addresses such as `ws://192.168.1.222:3001/ws`. The default is derived from the page's own origin.

The server owns dice, actions and bot decisions. All human clients receive canonical snapshots and revisions. Losing a connection pauses any decision awaiting that human. The client retries, and **Rejoin LAN Game** restores the original seat after a reload. Opening the same saved seat in another tab replaces its previous connection. A reconnect secret is stored only in the browser; invite links contain only the room code.

Host snapshots and previous backups are stored in `data/saves/` using atomic writes. Restarting the server loads compatible rooms. Players rejoin using their existing browser profile and original URL. **Save game** in LAN mode waits for a successful host write. A corrupt host snapshot is ignored with a console notice; a previous `.json.bak` can be restored by copying it over its matching `.json` with the server stopped.

## Game rules

- Original 40-space board, starting cash $1,500 and $200 salary for passing or landing on Start. Salary is awarded once per crossing.
- Two six-sided dice. Doubles earn another roll; three consecutive doubles send the player to jail.
- Buy unowned property or auction it. Every active player, including the declining player, may bid. Passing withdraws that bidder for this auction. Bids cannot exceed available cash; highest remaining bidder wins.
- Automatic rent. Complete undeveloped street groups pay double base rent. Stations pay $25, $50, $100 or $200 based on ownership count. Utilities pay 4× or 10× the dice total. Mortgaged deeds charge no rent. Opportunity movement cards can change these multipliers.
- Own the complete street group, clear every group mortgage, and build evenly. Four houses on each street unlock hotels. The bank supplies 32 houses and 12 hotels. A sold hotel needs four replacement houses; **Sell group buildings** liquidates the entire developed group if replacement stock is unavailable. Buildings sell at half their total cost.
- Mortgage value is half the deed's purchase price. Sell all group buildings first. Lifting a mortgage costs its value plus rounded-up 10% interest. A transferred mortgaged deed remains mortgaged and charges its receiver 10% transfer interest; later lifting it has the normal cost.
- Trade cash, undeveloped deeds and held jail cards by mutual agreement. Developed groups cannot be traded. Offers lock the decision phase and revalidate funds on acceptance. One offer per turn; no loans.
- Jail: pay $50 before rolling, use a jail card, or attempt doubles for up to three turns. On the third failed roll, pay $50 and move using that roll. Doubles used to escape do not earn another roll. Rent collection and asset management continue in jail.
- Opportunity and City Fund each contain 16 original cards, shuffled per match and drawn without replacement within a cycle. Held jail cards return to their source deck when used.
- Mandatory debt pauses play for mortgages, building sales or negotiation. Choosing bankruptcy forfeits the player's cash and deeds to the creditor; bank bankruptcy returns and auctions deeds. The last remaining player wins immediately. Other players going bankrupt do not cancel the current player's doubles.
- Free Parking is a rest space by default. The optional jackpot collects board taxes, rather than unrelated fees.
- Quick games rank surviving players by cash plus deed value (mortgage value for mortgaged deeds) and construction cost. Ties keep the existing player order.

## Controls

Drag the board to orbit, scroll or pinch to zoom, or use **+ / −**. **Reset camera** restores the view. Click/tap a tile, or open **Properties** to choose any space with a keyboard. The inspector shows its rent and available asset actions. The turn panel handles rolls, purchases, auctions, debt and trades. Settings offers normal/fast/reduced motion, three graphics quality levels, and optional sounds. Touch layouts support portrait and landscape; native dialogs provide keyboard focus containment. If 3D cannot initialize, the property list and turn controls remain available.

## Development and production

```powershell
npm install
npm run dev        # Solo frontend, localhost:5173
npm run dev:lan    # Vite frontend :5173 + Node WS host :3001
npm run typecheck
npm test
npm run build
npm run start:lan  # Production frontend + WS on :3001
```

Development uses Vite's `/ws` proxy. Production uses one Node HTTP/WS origin. Output: `apps/web/dist/` and `apps/server/dist/index.js`. `PORT` and `HOST` may override defaults. `ALLOWED_ORIGINS` supplies an explicit comma-separated WS origin allowlist when using an HTTPS reverse proxy. For external HTTPS deployment, serve `/ws` through a reverse proxy that supports WebSocket upgrades and use `wss://`; solo static assets may be hosted independently. No remote hosting was configured.

## Run browser tests

The supplied `.venv` has Python Playwright, and the tests use installed Google Chrome. Start the production server, then run:

```powershell
$env:EMPIRE_URL="http://127.0.0.1:3001"
$env:EMPIRE_OFFLINE="1"
npm run test:browser
```

For a fresh environment: `python -m venv .venv`, then `.\.venv\Scripts\python.exe -m pip install playwright`. The launcher detects this project environment. Alternatively set `EMPIRE_PYTHON` to a Python executable with Playwright installed. The test runner writes validated fixtures and screenshots under `test-artifacts/`. No browser binaries need downloading when Chrome is installed.

See [test results](docs/TEST_RESULTS.md), [build status](docs/BUILD_STATUS.md) and [progress](docs/PROGRESS.md).

## Troubleshooting

- **A phone cannot reach the URL:** verify the Wi-Fi address printed by the host, keep the terminal open, and use the computer's address rather than `localhost`. Windows Firewall must allow the Node process on the intended Private network. Guest Wi-Fi and some hotspots isolate devices; try a regular router or an alternative hotspot. This project does not change firewall settings.
- **Port already in use:** stop the earlier game terminal with Ctrl+C, or set `$env:PORT='3002'` before `npm run start:lan`, then use that port's printed URL.
- **A LAN room seems missing:** check that all clients use the same host process and port. Restart from the project directory so `data/saves/` resolves correctly. Resume in the same browser profile that created the seat.
- **Connecting from HTTPS:** insecure `ws://` is blocked. Use a secure reverse-proxied `wss://` endpoint and its allowed origin.
- **Slow graphics:** choose Low quality or Fast/Reduced motion, close heavy background tabs, or enable browser hardware acceleration. Context loss gives a reload recovery notice; accepted game actions were saved separately from rendering.
- **Save error:** check browser storage permissions for solo or available disk space and `data/saves/` access for LAN. A host save failure produces an error, never a success acknowledgment.

## Credits and verification limits

Original board names, event wording, brand and geometry. Three.js, ws, Zod and the build tools retain their upstream licenses. Nunito and Fredoka are bundled through Fontsource; retain their font licenses when distributing assets.

Automated verification used Chrome on this Windows computer, including two isolated client profiles, responsive viewports and offline caching. Physical phones, router-to-phone gameplay, hotspots, real low-end GPU performance, Firefox and Safari have not been tested. There is no claim of universal 60 fps. Limited building stock is allocated through serialized turns, so no simultaneous stock contention occurs in this version.
