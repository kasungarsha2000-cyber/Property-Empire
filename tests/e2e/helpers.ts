import {test as base,expect,type Page} from '@playwright/test';
import type {Game} from '../../packages/core/types';

/** Every test fails on uncaught page errors or console errors. */
export const test=base.extend<{errors:string[]}>({
 errors:[async({page},use)=>{
  const errors:string[]=[];
  page.on('pageerror',error=>errors.push(`pageerror: ${error.message}`));
  page.on('console',message=>{if(message.type()==='error')errors.push(`console: ${message.text()}`);});
  await use(errors);
  expect(errors,'page errors').toEqual([]);
 },{auto:true}]
});
export {expect};

export async function fastSettings(page:Page,extra:Record<string,unknown>={}){
 await page.addInitScript(value=>{if(!sessionStorage.getItem('e2e-settings')){localStorage.setItem('empire-settings',JSON.stringify(value));sessionStorage.setItem('e2e-settings','1');}},{speed:'fast',reducedMotion:true,quality:'low',sound:false,haptics:false,...extra});
}

/** Write a save from a same-origin page that does not run the game, then continue it from the menu. */
export async function continueGame(page:Page,game:Game){
 await page.goto('/health');
 await page.evaluate(async save=>{
  const db=await new Promise<IDBDatabase>(resolve=>{const request=indexedDB.open('property-empire-saves',1);request.onupgradeneeded=()=>request.result.createObjectStore('saves');request.onsuccess=()=>resolve(request.result);});
  await new Promise(resolve=>{const tx=db.transaction('saves','readwrite');tx.objectStore('saves').put({savedAt:Date.now(),game:save},'current');tx.oncomplete=resolve;});db.close();
 },game);
 await page.goto('/');
 await page.getByRole('button',{name:/Continue saved game/}).click();
 await expect(page.locator('.hud')).toBeVisible();
}

export const dock=(page:Page)=>page.locator('.dock');
export const chipCash=(page:Page,id:string)=>page.locator(`.chip-player[data-player="${id}"] .player-cash`);
export const sheet=(page:Page)=>page.locator('#sheet-layer:not([hidden]) .sheet');

export async function noHorizontalOverflow(page:Page){
 const overflow=await page.evaluate(()=>Math.max(document.documentElement.scrollWidth,document.body.scrollWidth)-window.innerWidth);
 expect(overflow,'horizontal overflow in px').toBeLessThanOrEqual(0);
}
