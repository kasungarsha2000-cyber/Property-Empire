# Build status

Final `npm run check`: Vitest, strict TypeScript, Vite production frontend, offline cache manifest and tsup Node server passed.

- `apps/web/dist/index.html` and bundled local assets exist.
- App script: about 179 KB raw / 58 KB gzip after the graphics upgrade.
- Three.js renderer chunk: about 539 KB raw / 138 KB gzip including environment lighting.
- Local font files and stylesheet are bundled; no external runtime downloads.
- `apps/web/dist/sw.js` precaches 16 generated local assets plus the root route.
- `apps/server/dist/index.js`: about 52 KB ESM (runtime dependencies resolved from installed node_modules).
- Verified runtime: Node 24.21.0, npm 11.19.0, Windows, installed Google Chrome.

Vite reports two upstream Zod comment-annotation warnings; it removes the comments and builds successfully. No build or type errors remain. The dedicated Three.js renderer chunk now exceeds Vite's 500 KB advisory size threshold after adding environment lighting.

Production launch: `npm run start:lan`; browser http://localhost:3001. The host prints network IP URLs.
