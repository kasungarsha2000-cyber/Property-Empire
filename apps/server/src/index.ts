import { networkInterfaces } from 'node:os';
import { startServer } from './server';
const port=Number(process.env.PORT||3001);
const server=await startServer({port,host:process.env.HOST||'0.0.0.0',allowedOrigins:process.env.ALLOWED_ORIGINS?.split(',')});
console.log(`Property Empire LAN host: http://localhost:${server.port}`);
for(const values of Object.values(networkInterfaces()))for(const v of values??[])if(v.family==='IPv4'&&!v.internal)console.log(`LAN URL: http://${v.address}:${server.port}`);
console.log('Use the Vite URL on port 5173 during development. Ctrl+C stops the host.');
for(const signal of ['SIGINT','SIGTERM'] as const)process.on(signal,()=>{void server.close().then(()=>process.exit(0));});
