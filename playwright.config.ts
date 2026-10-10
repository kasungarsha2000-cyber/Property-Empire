import {defineConfig,devices} from '@playwright/test';

/**
 * Browser end-to-end suite. Runs the production build served by the real LAN host, so solo play,
 * saves and multiplayer are exercised exactly as players use them. Build first (`npm run build`).
 * On a new machine install the browser once with `npx playwright install chromium`.
 */
const PORT=Number(process.env.E2E_PORT||3199);
export default defineConfig({
 testDir:'tests/e2e',
 timeout:90_000,
 expect:{timeout:10_000},
 fullyParallel:true,
 workers:process.env.CI?1:2,
 retries:0,
 reporter:[['list'],['html',{outputFolder:'test-artifacts/e2e-report',open:'never'}]],
 outputDir:'test-artifacts/e2e-results',
 use:{
  baseURL:`http://127.0.0.1:${PORT}`,
  trace:'retain-on-failure',
  screenshot:'only-on-failure',
  // Software WebGL keeps the 3D board working on headless machines without a GPU.
  launchOptions:{args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']}
 },
 projects:[
  {name:'phone',use:{...devices['Pixel 7'],viewport:{width:393,height:852},deviceScaleFactor:1}}
 ],
 webServer:{
  command:'node apps/server/dist/index.js',
  url:`http://127.0.0.1:${PORT}/health`,
  env:{PORT:String(PORT),HOST:'127.0.0.1',SAVE_DIR:'test-artifacts/e2e-saves'},
  reuseExistingServer:false,
  timeout:30_000
 }
});
