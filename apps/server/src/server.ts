import { createServer } from 'node:http';
import { WebSocketServer, WebSocket } from 'ws';
import { randomBytes,createHash } from 'node:crypto';
import { mkdir,readdir,readFile,writeFile,rename,copyFile } from 'node:fs/promises';
import { resolve,join,extname } from 'node:path';
import { z } from 'zod';
import { applyAction,createGame,botDecision,actionPlayer,validateGame,actionSchema } from '../../../packages/core/index';
import type {Game,Difficulty} from '../../../packages/core/types';

interface Member {id:string;name:string;token:number;bot:boolean;difficulty:Difficulty;ready:boolean;secretHash:string;socket:WebSocket|null}
interface Room {code:string;host:string;members:Member[];game:Game|null;config:{startingCash:number;turnLimit:number;jackpot:boolean};seen:Set<string>;timer:ReturnType<typeof setTimeout>|null}
export interface ServerOptions {port?:number;host?:string;saveDir?:string;webDir?:string;botDelay?:number;allowedOrigins?:string[]}
const name=z.string().trim().min(1).max(24),code=z.string().regex(/^[A-Z0-9]{6}$/),token=z.number().int().min(0).max(7),botCount=z.number().int().min(0).max(7),difficulty=z.enum(['easy','medium','hard']);
const settings=z.object({startingCash:z.number().int().min(500).max(10000).optional(),turnLimit:z.number().int().min(0).max(2000).optional(),jackpot:z.boolean().optional()});
const messageSchema=z.union([
 z.object({type:z.literal('CREATE'),name,token,botCount:botCount.optional(),difficulty:difficulty.optional(),config:settings.optional()}).strict(),
 z.object({type:z.literal('JOIN'),code,name,token}).strict(),
 z.object({type:z.literal('RESUME'),code,token:z.string().regex(/^[a-f0-9]{64}$/)}).strict(),
 z.object({type:z.literal('READY'),ready:z.boolean()}).strict(),
 z.object({type:z.literal('CONFIG'),botCount,difficulty,config:settings}).strict(),
 z.object({type:z.enum(['START','SYNC','SAVE','LEAVE','PING'])}).strict(),
 z.object({type:z.literal('ACTION'),id:z.string().min(1).max(64),revision:z.number().int().min(0),action:actionSchema}).strict()
]);
const hash=(secret:string)=>createHash('sha256').update(secret).digest('hex');
export async function startServer(options:ServerOptions={}){
 const rooms=new Map<string,Room>(),connections=new Map<WebSocket,{room:Room;member:Member}>();
 const saveDir=resolve(options.saveDir??'data/saves'),webDir=resolve(options.webDir??'apps/web/dist');await mkdir(saveDir,{recursive:true});
 let writes=Promise.resolve(),closed=false;
 const send=(ws:WebSocket|null,v:unknown)=>{if(ws?.readyState===WebSocket.OPEN)ws.send(JSON.stringify(v));};
 function publicRoom(r:Room){return{code:r.code,host:r.host,config:r.config,started:!!r.game,members:r.members.map(m=>({id:m.id,name:m.name,token:m.token,bot:m.bot,difficulty:m.difficulty,ready:m.ready,connected:m.bot||m.socket?.readyState===WebSocket.OPEN}))};}
 function persist(r:Room){const data=JSON.stringify({version:1,code:r.code,host:r.host,config:r.config,game:r.game,members:r.members.map(({socket,...m})=>m)});const target=join(saveDir,`${r.code}.json`);const task=writes.then(async()=>{await writeFile(target+'.tmp',data,'utf8');await copyFile(target,target+'.bak').catch(()=>{});await rename(target+'.tmp',target);});writes=task.catch(e=>{console.error('Save failed:',e.message);r.members.forEach(m=>send(m.socket,{type:'ERROR',error:'Host save failed. Check disk space and data/saves permissions.'}));});return task.then(()=>true,()=>false);}
 function broadcast(r:Room,withState=true){for(const m of r.members){send(m.socket,{type:'ROOM',room:publicRoom(r)});if(withState&&r.game)send(m.socket,{type:'STATE',game:r.game});}persist(r);schedule(r);}
 function schedule(r:Room){if(r.timer){clearTimeout(r.timer);r.timer=null;}if(closed||!r.game||r.game.phase==='ended')return;const who=actionPlayer(r.game),member=r.members.find(m=>m.id===who);if(!member?.bot)return;r.timer=setTimeout(()=>{r.timer=null;try{const decision=botDecision(r.game!);if(decision){r.game=applyAction(r.game!,decision.playerId,decision.action);broadcast(r);}}catch(e){console.error('Bot stopped:',e instanceof Error?e.message:'unknown');r.members.forEach(m=>send(m.socket,{type:'ERROR',error:'Bot could not continue. The host save is retained.'}));}},options.botDelay??550);}
 for(const file of(await readdir(saveDir)).filter(f=>/^[A-Z0-9]{6}\.json$/.test(f))){try{const data=JSON.parse(await readFile(join(saveDir,file),'utf8'));if(data.version!==1||!Array.isArray(data.members)||data.members.length>8)continue;const game=data.game?validateGame(data.game):null;const members:Member[]=data.members.map((m:any)=>({id:z.string().min(1).max(64).parse(m.id),name:name.parse(m.name),token:token.parse(m.token),bot:z.boolean().parse(m.bot),difficulty:difficulty.parse(m.difficulty),ready:z.boolean().parse(m.ready),secretHash:z.string().regex(/^[a-f0-9]{64}$/).parse(m.secretHash),socket:null}));if(!members.some(m=>m.id===data.host)||new Set(members.map(m=>m.id)).size!==members.length)continue;if(game&&game.players.some(p=>!members.some(m=>m.id===p.id)))continue;rooms.set(code.parse(data.code),{code:data.code,host:data.host,members,game,config:{startingCash:1500,turnLimit:0,jackpot:false,...settings.parse(data.config)},seen:new Set(),timer:null});}catch{console.warn('Ignored incompatible host save:',file);}}
 const mime:Record<string,string>={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.woff2':'font/woff2','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon'};
 const http=createServer(async(req,res)=>{try{const pathname=decodeURIComponent(new URL(req.url??'/',`http://${req.headers.host}`).pathname);if(pathname==='/health'){res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({ok:true,rooms:rooms.size}));return;}const relative=pathname==='/'?'index.html':pathname.slice(1);const path=resolve(webDir,relative);if(!path.startsWith(webDir+'\\')&&!path.startsWith(webDir+'/')){res.writeHead(403);res.end();return;}const body=await readFile(path);res.writeHead(200,{'Content-Type':mime[extname(path)]??'application/octet-stream','X-Content-Type-Options':'nosniff','Cache-Control':extname(path)==='.html'||pathname==='/sw.js'?'no-cache':'public, max-age=3600'});res.end(body);}catch{res.writeHead(404,{'Content-Type':'text/plain'});res.end('Not found. Build the browser app with npm run build, or use the Vite URL during development.');}});
 const wss=new WebSocketServer({noServer:true,maxPayload:16*1024});
 http.on('upgrade',(req,socket,head)=>{let allowed=false;try{const origin=new URL(req.headers.origin??''),requestHost=new URL(`http://${req.headers.host}`);const actualPort=(http.address() as {port:number})?.port;allowed=options.allowedOrigins?.includes(origin.origin)??(origin.hostname===requestHost.hostname&&['http:','https:'].includes(origin.protocol)&&[String(actualPort),'5173'].includes(origin.port));}catch{}if(req.url!=='/ws'||!allowed){socket.write('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');socket.destroy();return;}wss.handleUpgrade(req,socket,head,ws=>wss.emit('connection',ws,req));});
 function detach(ws:WebSocket,leave=false){const conn=connections.get(ws);if(!conn)return;connections.delete(ws);if(conn.member.socket!==ws)return;conn.member.socket=null;if(leave&&!conn.room.game){conn.room.members=conn.room.members.filter(m=>m!==conn.member);if(conn.room.host===conn.member.id)conn.room.host=conn.room.members.find(m=>!m.bot)?.id??'';}broadcast(conn.room,false);}
 function authenticate(ws:WebSocket,r:Room,m:Member,secret:string){if(m.socket&&m.socket!==ws){connections.delete(m.socket);m.socket.close(4001,'Seat reconnected in another tab');}m.socket=ws;connections.set(ws,{room:r,member:m});send(ws,{type:'SESSION',code:r.code,playerId:m.id,token:secret});broadcast(r);}
 function bots(r:Room,count:number,level:Difficulty){const humans=r.members.filter(m=>!m.bot);if(humans.length+count>8)throw new Error('A room supports up to eight players');r.members=humans;for(let i=0;i<count;i++){const available=[0,1,2,3,4,5,6,7].find(t=>!r.members.some(m=>m.token===t))!;r.members.push({id:randomBytes(8).toString('hex'),name:['Milo','Cleo','Jasper','Nova','Otis','Ivy','Theo'][i],token:available,bot:true,difficulty:level,ready:true,secretHash:hash(randomBytes(32).toString('hex')),socket:null});}}
 wss.on('connection',ws=>{let window=Date.now(),count=0;ws.on('error',()=>{});ws.on('message',data=>{try{if(Date.now()-window>1000){window=Date.now();count=0;}if(++count>25)throw new Error('Too many commands; wait a moment');const m=messageSchema.parse(JSON.parse(data.toString()));if(m.type==='PING'){send(ws,{type:'PONG'});return;}
  const conn=connections.get(ws);
  if(m.type==='CREATE'||m.type==='JOIN'||m.type==='RESUME'){
   if(conn)throw new Error('Leave your current room first');
   if(m.type==='RESUME'){const r=rooms.get(m.code);if(!r)throw new Error('Room was not found on this host');const member=r.members.find(p=>!p.bot&&p.secretHash===hash(m.token));if(!member)throw new Error('Reconnect token is invalid');authenticate(ws,r,member,m.token);return;}
   let r:Room;if(m.type==='CREATE'){if(rooms.size>=100)throw new Error('Host room limit reached');let roomCode='';do{roomCode=randomBytes(3).toString('hex').toUpperCase();}while(rooms.has(roomCode));r={code:roomCode,host:'',members:[],game:null,config:{startingCash:1500,turnLimit:0,jackpot:false,...m.config},seen:new Set(),timer:null};rooms.set(roomCode,r);}else{const found=rooms.get(m.code);if(!found)throw new Error('Room not found. Check the code and host address');r=found;if(r.game)throw new Error('This match has started. Rejoin using your saved session');if(r.members.length>=8)throw new Error('This room is full');}
   const seat=[m.token,...[0,1,2,3,4,5,6,7]].find(t=>!r.members.some(p=>p.token===t))!;const secret=randomBytes(32).toString('hex'),member:Member={id:randomBytes(8).toString('hex'),name:m.name,token:seat,bot:false,difficulty:'medium',ready:m.type==='CREATE',secretHash:hash(secret),socket:null};r.members.push(member);if(m.type==='CREATE'){r.host=member.id;bots(r,m.botCount??1,m.difficulty??'medium');}authenticate(ws,r,member,secret);return;
  }
  if(!conn)throw new Error('Join a room first');const {room:r,member:p}=conn;
  if(m.type==='SYNC'){send(ws,{type:'ROOM',room:publicRoom(r)});if(r.game)send(ws,{type:'STATE',game:r.game});return;}
  if(m.type==='SAVE'){void persist(r).then(ok=>{if(ok)send(ws,{type:'SAVED'});});return;}
  if(m.type==='LEAVE'){detach(ws,true);send(ws,{type:'LEFT'});return;}
  if(m.type==='READY'){if(r.game)throw new Error('The match has already started');p.ready=m.ready;broadcast(r,false);return;}
  if(m.type==='CONFIG'){if(r.host!==p.id||r.game)throw new Error('Only the lobby host can change settings');bots(r,m.botCount,m.difficulty);r.config={...r.config,...m.config};r.members.filter(v=>!v.bot&&v.id!==r.host).forEach(v=>v.ready=false);broadcast(r,false);return;}
  if(m.type==='START'){if(r.host!==p.id)throw new Error('Only the host can start');if(r.game)throw new Error('The match has already started');if(r.members.length<2||r.members.some(v=>!v.ready||(!v.bot&&v.socket?.readyState!==WebSocket.OPEN)))throw new Error('Need 2–8 connected and ready players');r.game=createGame({players:r.members.map(({id,name,bot,difficulty,token})=>({id,name,bot,difficulty,token})),...r.config},randomBytes(4).readUInt32LE());broadcast(r);return;}
  if(m.type==='ACTION'){if(!r.game)throw new Error('Match has not started');if(r.seen.has(p.id+':'+m.id))throw new Error('Duplicate command');if(m.revision!==r.game.revision)throw new Error('State changed. Sync and try again');r.game=applyAction(r.game,p.id,m.action);r.seen.add(p.id+':'+m.id);if(r.seen.size>10000)r.seen.delete(r.seen.values().next().value!);broadcast(r);}
 }catch(e){send(ws,{type:'ERROR',error:e instanceof z.ZodError?'Invalid message or action':e instanceof Error?e.message:'Command failed'});}});ws.on('close',()=>detach(ws));});
 await new Promise<void>((ok,fail)=>{http.once('error',fail);http.listen(options.port??3001,options.host??'0.0.0.0',()=>ok());});
 const port=(http.address() as {port:number}).port;
 return{port,async close(){closed=true;rooms.forEach(r=>{if(r.timer)clearTimeout(r.timer);persist(r);});wss.clients.forEach(ws=>ws.terminate());await new Promise<void>(ok=>wss.close(()=>ok()));await new Promise<void>(ok=>http.close(()=>ok()));await writes;}};
}
