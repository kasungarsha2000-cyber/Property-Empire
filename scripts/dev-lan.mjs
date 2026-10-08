import { spawn } from 'node:child_process';
import { networkInterfaces } from 'node:os';
const children=[spawn(process.execPath,['--import','tsx','apps/server/src/index.ts'],{stdio:'inherit'}),spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','0.0.0.0'],{stdio:'inherit'})];
console.log('Open http://localhost:5173 to play.');
for(const values of Object.values(networkInterfaces()))for(const v of values??[])if(v.family==='IPv4'&&!v.internal)console.log(`Phone / LAN URL: http://${v.address}:5173`);
let stopping=false;function stop(){if(stopping)return;stopping=true;children.forEach(c=>c.kill());setTimeout(()=>process.exit(),500);}
process.on('SIGINT',stop);process.on('SIGTERM',stop);children.forEach(c=>c.on('exit',stop));
