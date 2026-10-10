import {it,expect} from 'vitest';
import {WebSocket} from 'ws';
import {createHash} from 'node:crypto';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createGame,applyAction} from '../packages/core';
import {startServer} from '../apps/server/src/server';
async function client(port:number){
 const ws=new WebSocket(`ws://127.0.0.1:${port}/ws`,{origin:`http://127.0.0.1:${port}`}),messages:any[]=[];ws.on('message',data=>messages.push(JSON.parse(data.toString())));
 await new Promise<void>((ok,fail)=>{ws.once('open',()=>ok());ws.once('error',fail);});
 return {ws,send:(message:unknown)=>ws.send(JSON.stringify(message)),async wait(type:string,predicate:(message:any)=>boolean=()=>true){const until=Date.now()+4000;while(Date.now()<until){const index=messages.findIndex(message=>message.type===type&&predicate(message));if(index>=0)return messages.splice(index,1)[0];await new Promise(ok=>setTimeout(ok,5));}throw new Error(`Missing ${type}: ${JSON.stringify(messages)}`);}};
}
async function fixture(botCard=true){
 const dir=await mkdtemp(join(tmpdir(),'empire-bot-card-')),players=[{id:'ada',name:'Ada',bot:false,token:0},{id:'ben',name:'Ben',bot:false,token:1},{id:'bot',name:'Milo',bot:true,token:2}],secrets=['a'.repeat(64),'b'.repeat(64),'c'.repeat(64)],code='BOT123';
 let game=createGame({players},42);game.current=botCard?2:0;game.players[game.current].position=24;game.decks.community=[2,...game.decks.community.filter(id=>id!==2)];game=applyAction(game,players[game.current].id,{type:'roll'});
 const file=join(dir,`${code}.json`);await writeFile(file,JSON.stringify({version:1,code,host:'ada',config:game.config,game,members:players.map((p,index)=>({...p,difficulty:'medium',ready:true,secretHash:createHash('sha256').update(secrets[index]).digest('hex')}))}));
 const server=await startServer({port:0,host:'127.0.0.1',saveDir:dir,botDelay:30000}),clients:Awaited<ReturnType<typeof client>>[]=[];
 async function connect(index?:number){const connection=await client(server.port);clients.push(connection);if(index!==undefined){connection.send({type:'RESUME',code,token:secrets[index]});await connection.wait('SESSION');await connection.wait('STATE');}return connection;}
 return {game,file,connect,async close(){clients.forEach(connection=>connection.ws.close());await server.close();await rm(dir,{recursive:true,force:true});}};
}
it('lets seated LAN humans resolve the matching bot card once and broadcasts and saves its booked effect',async()=>{
 const f=await fixture();try{
  const a=await f.connect(0),b=await f.connect(1),event=f.game.pendingCard!.event;
  a.send({type:'CONTINUE_BOT_CARD',event});const resolved=(await a.wait('STATE',m=>m.game.revision===2)).game;expect((await b.wait('STATE',m=>m.game.revision===2)).game).toEqual(resolved);expect(resolved.pendingCard).toBeNull();expect(resolved.players[2].cash).toBe(1700);expect(resolved.phase).toBe('manage');
  b.send({type:'CONTINUE_BOT_CARD',event});expect((await b.wait('ERROR')).error).toMatch(/card.*changed|no.*bot.*card/i);b.send({type:'SYNC'});expect((await b.wait('STATE',m=>m.game.revision===2)).game.players[2].cash).toBe(1700);
  a.send({type:'SAVE'});await a.wait('SAVED');expect(JSON.parse(await readFile(f.file,'utf8')).game).toEqual(resolved);
 }finally{await f.close();}
});
it('rejects stale card events and extra fields without changing the bot card',async()=>{
 const f=await fixture();try{const a=await f.connect(0),event=f.game.pendingCard!.event;
  a.send({type:'CONTINUE_BOT_CARD',event:event-1});expect((await a.wait('ERROR')).error).toMatch(/card.*changed/i);
  for(const message of [{type:'CONTINUE_BOT_CARD',event,playerId:'bot'},{type:'CONTINUE_BOT_CARD',event,revision:1},{type:'CONTINUE_BOT_CARD',event:event+.5}]){a.send(message);expect((await a.wait('ERROR')).error).toBe('Invalid message or action');}
  a.send({type:'SYNC'});expect((await a.wait('STATE',m=>m.game.revision===1)).game).toEqual(f.game);
 }finally{await f.close();}
});
it('rejects unauthenticated observers and invalid reconnect credentials',async()=>{
 const f=await fixture();try{const unauthenticated=await f.connect();unauthenticated.send({type:'CONTINUE_BOT_CARD',event:f.game.pendingCard!.event});expect((await unauthenticated.wait('ERROR')).error).toBe('Join a room first');
  const wrongSecret=await f.connect();wrongSecret.send({type:'RESUME',code:'BOT123',token:'d'.repeat(64)});expect((await wrongSecret.wait('ERROR')).error).toMatch(/token.*invalid/i);wrongSecret.send({type:'CONTINUE_BOT_CARD',event:f.game.pendingCard!.event});expect((await wrongSecret.wait('ERROR')).error).toBe('Join a room first');
 }finally{await f.close();}
});
it('never overrides a human card and leaves the existing owner Continue action available',async()=>{
 const f=await fixture(false);try{const owner=await f.connect(0),observer=await f.connect(1),event=f.game.pendingCard!.event;
  observer.send({type:'CONTINUE_BOT_CARD',event});expect((await observer.wait('ERROR')).error).toMatch(/bot/i);owner.send({type:'CONTINUE_BOT_CARD',event});expect((await owner.wait('ERROR')).error).toMatch(/bot/i);
  observer.send({type:'ACTION',id:'wrong-reader',revision:1,action:{type:'resolveCard'}});expect((await observer.wait('ERROR')).error).toMatch(/drawing player/i);
  owner.send({type:'ACTION',id:'own-continue',revision:1,action:{type:'resolveCard'}});const resolved=(await owner.wait('STATE',m=>m.game.revision===2)).game;expect(resolved.players[0].cash).toBe(1700);expect(resolved.pendingCard).toBeNull();expect((await observer.wait('STATE',m=>m.game.revision===2)).game).toEqual(resolved);
 }finally{await f.close();}
});
