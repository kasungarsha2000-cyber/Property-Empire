# Build status

Final `npm run check`: Vitest, strict TypeScript, Vite production frontend, offline cache manifest and tsup Node server passed.

- `apps/web/dist/index.html` and bundled local assets exist.
- App script: 286.11 KB raw / 93.23 KB gzip, including the cosmetic living city, short receipts and front-page resume buttons.
- Stylesheet: 105.36 KB raw / 21.61 KB gzip, including right-side decisions and front-page developer credit.
- Three.js renderer chunk: 542.54 KB raw / 138.09 KB gzip including environment lighting and shared miniature ring geometry.
- Local font files and stylesheet are bundled; gameplay makes no external asset requests.
- `apps/web/dist/sw.js` precaches 16 generated local assets plus the root route.
- `apps/server/dist/index.js`: 56.24 KB ESM (runtime dependencies resolved from installed node_modules).
- Verified runtime: Node 24.21.0, npm 11.19.0, Windows, installed Google Chrome.

Vite reports two upstream Zod comment-annotation warnings; it removes the comments and builds successfully. No build or type errors remain. The dedicated Three.js renderer chunk now exceeds Vite's 500 KB advisory size threshold after adding environment lighting.

Production launch: `npm run start:lan`; browser http://localhost:3001. The host prints network IP URLs.

2026-10-09: 161 tests in 21 files pass, including portable launcher/package, authoritative bot-card Continue and short receipt/movement regressions. Fixed-step dice, player cash nametags, refined card/trade UI, enhanced city geometry and static batching are included. The Windows share package includes a verified local Node runtime and production dependencies. Purchase/card decisions now sit on the right; the front page includes separate resume buttons and “Developed by Kasun Samarasinghe.”
