import { validateGame } from '../../../packages/core/index';
import type { Game } from '../../../packages/core/types';
function database():Promise<IDBDatabase>{return new Promise((resolve,reject)=>{const request=indexedDB.open('property-empire-saves',1);request.onupgradeneeded=()=>request.result.createObjectStore('saves');request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});}
let pending=Promise.resolve();
export async function saveGame(g:Game):Promise<void>{const snapshot=validateGame(structuredClone(g));const work=pending.then(async()=>{const db=await database();try{await new Promise<void>((resolve,reject)=>{const tx=db.transaction('saves','readwrite'),store=tx.objectStore('saves'),old=store.get('current');old.onsuccess=()=>{if(old.result)store.put(old.result,'backup');store.put({savedAt:Date.now(),game:snapshot},'current');};tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});}finally{db.close();}});pending=work.catch(()=>{});return work;}
export async function loadGame(backup=false):Promise<Game|null>{const db=await database();try{return await new Promise((resolve,reject)=>{const tx=db.transaction('saves','readonly'),request=tx.objectStore('saves').get(backup?'backup':'current');request.onsuccess=()=>{try{resolve(request.result?validateGame(request.result.game):null);}catch{reject(new Error('This save is incompatible or damaged. Try the backup save.'));}};request.onerror=()=>reject(request.error);});}finally{db.close();}}
export interface SaveSummary {savedAt:number;turn:number;players:number;finished:boolean}
/** Lightweight look at the current save for the main menu; never throws. */
export async function saveSummary():Promise<SaveSummary|null>{
 try{await pending;const db=await database();try{return await new Promise(resolve=>{const request=db.transaction('saves','readonly').objectStore('saves').get('current');request.onsuccess=()=>{const value=request.result;resolve(value?.game?{savedAt:Number(value.savedAt)||0,turn:Number(value.game.turn)||1,players:Array.isArray(value.game.players)?value.game.players.length:0,finished:value.game.phase==='ended'}:null);};request.onerror=()=>resolve(null);});}finally{db.close();}}catch{return null;}
}

export interface Settings {
 speed:'normal'|'fast';
 reducedMotion:boolean;
 quality:'low'|'medium'|'high';
 sound:boolean;
 haptics:boolean;
 camera:'gentle'|'normal'|'quick';
 textSize:'default'|'large'|'larger';
 highlightMine:boolean;
}
export const systemReducedMotion=()=>typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches;
export const isReduced=(settings:Settings)=>settings.reducedMotion||systemReducedMotion();
export function defaultSettings():Settings{return{speed:'normal',reducedMotion:false,quality:'medium',sound:true,haptics:true,camera:'normal',textSize:'default',highlightMine:true};}
/** Accepts current settings and the earlier {speed:'normal'|'fast'|'reduced',quality,sound} format. */
export function normalizeSettings(value:unknown):Settings{
 const d=defaultSettings(),v=(value&&typeof value==='object'?value:{}) as Record<string,unknown>;
 const pick=<T extends string>(key:string,options:readonly T[],fallback:T)=>options.includes(v[key] as T)?v[key] as T:fallback;
 return{
  speed:v.speed==='fast'?'fast':'normal',
  reducedMotion:typeof v.reducedMotion==='boolean'?v.reducedMotion:v.speed==='reduced',
  quality:pick('quality',['low','medium','high'] as const,d.quality),
  sound:typeof v.sound==='boolean'?v.sound:d.sound,
  haptics:typeof v.haptics==='boolean'?v.haptics:d.haptics,
  camera:pick('camera',['gentle','normal','quick'] as const,d.camera),
  textSize:pick('textSize',['default','large','larger'] as const,d.textSize),
  highlightMine:typeof v.highlightMine==='boolean'?v.highlightMine:d.highlightMine
 };
}
export function readSettings():Settings{try{return normalizeSettings(JSON.parse(localStorage.getItem('empire-settings')||'null'));}catch{return defaultSettings();}}
export function writeSettings(settings:Settings){try{localStorage.setItem('empire-settings',JSON.stringify(settings));}catch{/* storage blocked: settings last for this session */}}
