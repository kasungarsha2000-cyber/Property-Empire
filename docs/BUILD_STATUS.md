# Build status

Final `npm run check`: Vitest, strict TypeScript, Vite production frontend, offline cache manifest and tsup Node server passed.

- `apps/web/dist/index.html` and bundled local assets exist.
- App script: about 162 KB raw / 51 KB gzip.
- Three.js renderer chunk: about 499 KB raw / 125 KB gzip.
- Local font files and stylesheet are bundled; no external runtime downloads.
- `apps/web/dist/sw.js` precaches 16 generated local assets plus the root route.
- `apps/server/dist/index.js`: about 52 KB ESM (runtime dependencies resolved from installed node_modules).
- Verified runtime: Node 24.21.0, npm 11.19.0, Windows, installed Google Chrome.

Vite reports two upstream Zod comment-annotation warnings; it removes the comments and builds successfully. No build or type errors remain. The earlier chunk-size warning was resolved by separating the Three.js renderer chunk.

Production launch: `npm run start:lan`; browser http://localhost:3001. The host prints network IP URLs.
