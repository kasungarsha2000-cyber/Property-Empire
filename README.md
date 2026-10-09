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

## Find your properties and make a trade

**Your properties** groups your deeds by district, shows progress toward each color set, and labels mortgages and buildings. **Highlight mine on board** marks your spaces, and owned spaces show **Yours** on the board. Select an owned property to inspect and manage it. In **Properties**, use **Your properties** or **Available from bank** to filter the title deeds.

If you are one deed short of a street group, the portfolio shows its name and owner. **Trade for this property** starts an offer with that deed selected. You can also choose **Trade** during your turn, before or after rolling or while resolving debt. Choose a player, select illustrated cards under **You give** and **You receive**, and enter cash or jail cards. Developed groups explain why their deeds cannot be selected.

**Review trade** shows each player's items, cash after acceptance, mortgage transfer fees, debt repayment and any newly completed color sets. **Edit offer** preserves your selections; **Offer trade** sends it for the other player's decision. Incoming offers show the same comparison, with **Accept trade** and **Decline trade** beneath the board. Each turn permits one offer.

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

Drag the board to orbit, right-drag to pan, and point the mouse at a board location before scrolling to zoom toward it. Touch supports pinch zoom; **+ / −** adjusts zoom and **Reset camera** restores the view. Click/tap a tile, or open **Properties** to choose any space with a keyboard. A deed popup shows its owner, rent and available asset actions; **Focus this property** closes the popup and locates the tile. The board fills the available match area. Building stock is shown in the Properties gallery. Purchases, auctions, debt, jail and incoming trades appear in decision popups. Closing one returns its actions to the floating turn controls. Destination popups wait for dice and pawn movement to finish. Dice tumble to varied positions in their tray. Property squares have buildings only after houses or hotels are built. Chance and Community Chest draws show card faces with exact instructions and effect annotations; Continue applies the card. Closing it leaves Continue in the turn controls. **Cards** opens both complete decks. Rent, salary and purchase confirmations appear as separate, brief notices; Escape dismisses them. The board stays in view on desktop and remains sticky while scrolling on mobile. Settings offers normal/fast/reduced motion, three graphics quality levels, and optional sounds. Native dialogs provide keyboard focus containment. If 3D cannot initialize, the property list and turn controls remain available.

Your tiles have gold outlines and a **✓ YOURS** badge. Click a deed in **Your properties** to focus the board camera on it. Purchase and rent receipts use a compact notice that disappears after three seconds. Game tools sit directly after the dice and turn information within the same panel, with a compact line of buttons. Fullscreen hides the website header and adds Exit fullscreen, Settings and How to Play to that line. Narrow screens scroll within the controls. Declining an incoming trade offers **Build counteroffer** or **Decline without counteroffer**. Counteroffers start with the reversed current terms and require review before sending. Bots propose feasible revised cash terms when rejecting an offer. Each negotiation allows up to three counteroffers, then an accept or decline decision.

Properties opens the full deed gallery with ownership filters and full-height deed rows. Selecting an owned deed opens a larger popup with all rents, costs and live building/mortgage controls. Click a player's name/card in the match overview to see their cash, net worth, rent totals, location, jail cards and properties; **Trade with…** opens the trade builder for that player when allowed. **Sound on/off** mutes or enables local dice, step, purchase, money, card, building, trade, jail and victory effects. New browser profiles start with sound enabled after an interaction; saved mute preferences are kept. Pawns hop, face their route and briefly celebrate purchases/building. Personal gains and acquisitions have a brief coin effect and balance pulse; payments, jail and debt use a warning effect. Effects wait for pawn arrival, leave controls clickable and use actual payments rather than unpaid card obligations. Reduced motion suppresses these effects and keeps arrivals instant.

Double-click **run.bat** in `D:\Other\Monopoly Game` or the project folder to launch. It checks Node, installs dependencies and builds if needed, starts a hidden game server, then opens the browser. Running it again reopens the existing server. Logs are in `PropertyEmpire3D/data/launcher-server.log` and `launcher-error.log`. Your saves stay in place.

The turn/dice row keeps the same size before rolling, during movement and after arrival, so the board and toolbar stay still. Tools are centered after the turn information; narrow screens scroll within that row. Opponents' arrivals, purchases, payments, salaries, buildings, jail/debt and card draws appear in named popups after their pawns settle. Opponent cards use the same card faces and annotations, support scrolling, and dismiss automatically; bots pause briefly to read before continuing. Your own decisions and cards take priority. Earlier-save restoration clears discarded activity.

Chance and Community Chest cards fly from their physical board decks after the pawn arrives. All 32 cards have distinct illustrated scenes and animations. Read the instructions, then choose **Continue** to apply money, movement, jail or other effects. Unread cards are saved and synchronized across LAN clients; their effects cannot be claimed twice. Movement cards can lead to another card, which also waits to be read. Card receipts describe the completed effect separately.

Paid rent appears beside its property with the amount, payer and recipient. Buying a property adds an animated ownership seal, and accepted trades show exchanging deed cards. Outer-edge owner plaques identify **YOURS** or the other owner's name. Refined tile borders, district lettering and brass details improve the tabletop appearance. Match results show the winner, your position and standings, with a trophy/confetti celebration or a quieter loss animation; results can be reopened after dismissal. Reduced motion keeps static labels and results while disabling decorative motion.

All eight pawns have owner-colored enamel bases, brass rims and distinctive details. Houses have pitched roofs, eaves, windows, doors, chimneys and entrance steps. Hotels use taller stepped architecture, rows of windows, a canopy and HOTEL signage. Undeveloped properties remain empty.

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
