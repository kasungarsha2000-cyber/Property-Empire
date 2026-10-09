import { it,expect } from 'vitest';
import { WebSocket } from 'ws';
import { mkdtemp,rm,writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { startServer } from '../apps/server/src/server';
async function client(port:number){const ws=new WebSocket(`ws://127.0.0.1:${port}/ws`,{origin:`http://127.0.0.1:${port}`});const messages:any[]=[];ws.on('message',d=>messages.push(JSON.parse(d.toString())));await new Promise<void>((ok,fail)=>{ws.once('open',()=>ok());ws.once('error',fail);});return{ws,messages,send:(v:any)=>ws.send(JSON.stringify(v)),async wait(type:string,predicate:(v:any)=>boolean=()=>true){const end=Date.now()+5000;while(Date.now()<end){const i=messages.findIndex(v=>v.type===type&&predicate(v));if(i>=0)return messages.splice(i,1)[0];await new Promise(r=>setTimeout(r,10));}throw new Error(`No ${type}; received ${messages.map(m=>m.type+':'+(m.error||'')).join(',')}`);}};}
it('LAN peers counter, restore a pending negotiation and accept the revised terms',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'empire-'));
 let s=await startServer({port:0,host:'127.0.0.1',saveDir:dir});
 let a=await client(s.port),b=await client(s.port);
 try{
  a.send({type:'CREATE',name:'Ada',token:0,botCount:0});const authA=await a.wait('SESSION');await a.wait('ROOM');
  b.send({type:'JOIN',code:authA.code,name:'Ben',token:1});const authB=await b.wait('SESSION');await b.wait('ROOM');
  b.send({type:'READY',ready:true});await a.wait('ROOM',m=>m.room.members.some((p:any)=>p.id===authB.playerId&&p.ready));
  a.send({type:'START'});const initial=(await a.wait('STATE')).game;await b.wait('STATE');
  const firstId=initial.players[initial.current].id,secondId=initial.players.find((p:any)=>p.id!==firstId).id;
  const first=firstId===authA.playerId?a:b,second=first===a?b:a;
  first.send({type:'ACTION',id:'offer',revision:0,action:{type:'offerTrade',to:secondId,give:[],receive:[],giveCash:100,receiveCash:20,giveCards:0,receiveCards:0}});
  await first.wait('STATE',m=>m.game.revision===1);await second.wait('STATE',m=>m.game.revision===1);
  first.send({type:'ACTION',id:'unauthorized-counter',revision:1,action:{type:'counterTrade',to:secondId,give:[],receive:[],giveCash:90,receiveCash:20,giveCards:0,receiveCards:0}});
  expect((await first.wait('ERROR')).error).toMatch(/recipient/i);
  second.send({type:'ACTION',id:'counter',revision:1,action:{type:'counterTrade',to:firstId,give:[],receive:[],giveCash:20,receiveCash:90,giveCards:0,receiveCards:0}});
  const revised=(await first.wait('STATE',m=>m.game.revision===2)).game;
  expect((await second.wait('STATE',m=>m.game.revision===2)).game).toEqual(revised);
  expect(revised.trade).toMatchObject({from:secondId,to:firstId,round:1,resume:'roll'});
  a.ws.close();b.ws.close();await s.close();
  s=await startServer({port:0,host:'127.0.0.1',saveDir:dir});a=await client(s.port);b=await client(s.port);
  a.send({type:'RESUME',code:authA.code,token:authA.token});await a.wait('SESSION');expect((await a.wait('STATE')).game).toEqual(revised);
  b.send({type:'RESUME',code:authB.code,token:authB.token});await b.wait('SESSION');expect((await b.wait('STATE')).game).toEqual(revised);
  const accepting=firstId===authA.playerId?a:b;
  accepting.send({type:'ACTION',id:'accept',revision:2,action:{type:'acceptTrade'}});
  const accepted=(await a.wait('STATE',m=>m.game.revision===3)).game;
  expect((await b.wait('STATE',m=>m.game.revision===3)).game).toEqual(accepted);
  expect(accepted.phase).toBe('roll');expect(accepted.trade).toBeNull();
  expect(accepted.players.find((p:any)=>p.id===firstId).cash).toBe(1430);
  expect(accepted.players.find((p:any)=>p.id===secondId).cash).toBe(1570);
 }finally{a.ws.close();b.ws.close();await s.close();await rm(dir,{recursive:true,force:true});}
});
it('real peers share a match, reject impersonation and duplicates, and reconnect to their original seat',async()=>{const dir=await mkdtemp(join(tmpdir(),'empire-'));const s=await startServer({port:0,host:'127.0.0.1',saveDir:dir,botDelay:5});const a=await client(s.port),b=await client(s.port);let c:Awaited<ReturnType<typeof client>>|null=null;try{a.send({type:'CREATE',name:'Ada',token:0,botCount:0});const authA=await a.wait('SESSION');const room=(await a.wait('ROOM')).room;expect(room.members).toHaveLength(1);b.send({type:'JOIN',code:room.code,name:'Ben',token:1});const authB=await b.wait('SESSION');await b.wait('ROOM',m=>m.room.members.length===2);b.send({type:'READY',ready:true});await a.wait('ROOM',m=>m.room.members.some((p:any)=>p.id===authB.playerId&&p.ready));a.send({type:'START'});const sa=await a.wait('STATE'),sb=await b.wait('STATE');expect(sa.game).toEqual(sb.game);const game=sa.game;const current=game.players[game.current].id;const actor=current===authA.playerId?a:b,other=actor===a?b:a;other.send({type:'ACTION',id:'spoof',revision:0,playerId:current,action:{type:'roll'}});expect((await other.wait('ERROR')).error).toBeTruthy();actor.send({type:'ACTION',id:'roll-1',revision:0,action:{type:'roll'}});const nextA=await a.wait('STATE',m=>m.game.revision===1),nextB=await b.wait('STATE',m=>m.game.revision===1);expect(nextA.game).toEqual(nextB.game);actor.send({type:'ACTION',id:'roll-1',revision:0,action:{type:'roll'}});expect((await actor.wait('ERROR')).error).toMatch(/duplicate/i);b.ws.close();await a.wait('ROOM',m=>m.room.members.some((p:any)=>p.id===authB.playerId&&!p.connected));c=await client(s.port);c.send({type:'RESUME',code:room.code,token:authB.token});expect((await c.wait('SESSION')).playerId).toBe(authB.playerId);expect((await c.wait('STATE')).game.revision).toBe(1);c.send({type:'SYNC'});expect((await c.wait('ROOM')).room.members).toHaveLength(2);}finally{a.ws.close();b.ws.close();c?.ws.close();await s.close();await rm(dir,{recursive:true,force:true});}});
it('origin checks reject an unrelated web page',async()=>{const dir=await mkdtemp(join(tmpdir(),'empire-'));const s=await startServer({port:0,host:'127.0.0.1',saveDir:dir});try{const ws=new WebSocket(`ws://127.0.0.1:${s.port}/ws`,{origin:'https://unrelated.example'});const result=await new Promise<string>(resolve=>{ws.on('unexpected-response',(_r,response)=>{response.resume();resolve(String(response.statusCode));});ws.on('error',()=>resolve('error'));ws.on('open',()=>{ws.close();resolve('open');});});expect(result).toBe('403');}finally{await s.close();await rm(dir,{recursive:true,force:true});}});
it('a server restart restores the saved room and reconnect identity',async()=>{const dir=await mkdtemp(join(tmpdir(),'empire-'));let s=await startServer({port:0,host:'127.0.0.1',saveDir:dir});let a=await client(s.port);try{a.send({type:'CREATE',name:'Ada',token:0,botCount:0});const auth=await a.wait('SESSION');await a.wait('ROOM');a.send({type:'SAVE'});await a.wait('SAVED');a.ws.close();await s.close();s=await startServer({port:0,host:'127.0.0.1',saveDir:dir});a=await client(s.port);a.send({type:'RESUME',code:auth.code,token:auth.token});expect((await a.wait('SESSION')).playerId).toBe(auth.playerId);expect((await a.wait('ROOM')).room.host).toBe(auth.playerId);}finally{a.ws.close();await s.close();await rm(dir,{recursive:true,force:true});}});
it('disk-save failure is reported without a false success acknowledgment',async()=>{const dir=await mkdtemp(join(tmpdir(),'empire-'));const s=await startServer({port:0,host:'127.0.0.1',saveDir:dir});const a=await client(s.port);try{a.send({type:'CREATE',name:'Ada',token:0,botCount:0});await a.wait('SESSION');await a.wait('ROOM');a.send({type:'SAVE'});await a.wait('SAVED');await rm(dir,{recursive:true,force:true});await writeFile(dir,'not a directory');a.send({type:'SAVE'});expect((await a.wait('ERROR')).error).toMatch(/save failed/i);await new Promise(r=>setTimeout(r,100));expect(a.messages.filter(m=>m.type==='SAVED')).toHaveLength(0);}finally{a.ws.close();await s.close();await rm(dir,{force:true});}});
