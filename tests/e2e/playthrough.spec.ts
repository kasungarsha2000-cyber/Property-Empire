import {test,expect,fastSettings} from './helpers';
import type {Page} from '@playwright/test';

/** Press whatever the UI offers, as a player would, and make sure the match keeps moving. */
async function step(page:Page){
 const tryClick=async(selector:string)=>{const target=page.locator(selector).first();if(await target.isVisible().catch(()=>false)&&await target.isEnabled().catch(()=>false)){await target.click();return true;}return false;};
 for(const selector of ['#card-layer.modal [data-action*="resolveCard"]','.dialog [data-do="bankrupt"]','.panel.purchase [data-action*="\\"buy\\""]','.panel.purchase [data-action*="decline"]','.panel.auction [data-action*="pass"]','.panel.jail [data-action*="roll"]','.panel.trade-offer [data-action*="rejectTrade"]'])if(await tryClick(selector))return true;
 if(await page.locator('.panel.debt').isVisible().catch(()=>false)){
  await page.locator('.panel.debt [data-do="properties"]').click();
  const raised=await tryClick('#sheet-layer [data-action*="sell"]')||await tryClick('#sheet-layer [data-action*="mortgage"]');
  await page.getByRole('button',{name:'Close'}).click();
  if(!raised)await page.locator('.panel.debt [data-do="confirm-bankrupt"]').click();
  return true;
 }
 return tryClick('.dock-primary');
}

test('a solo match keeps progressing through the real UI',async({page})=>{
 test.setTimeout(240_000);
 await fastSettings(page);
 await page.goto('/');
 await page.getByRole('button',{name:/Play solo/}).click();
 await page.locator('[data-form-step="bots"][data-step="-1"]').click();
 await page.getByRole('button',{name:/Start game/}).click();
 const turn=async()=>Number((await page.locator('.hud-line .round').textContent())?.match(/\d+/)?.[0]??0);
 let idle=0;
 for(let i=0;i<180&&await turn()<16;i++){
  if(await page.locator('.match-finale:not([hidden])').isVisible())break;
  idle=await step(page)?0:idle+1;
  expect(idle,'the match stalled').toBeLessThan(60);
  await page.waitForTimeout(idle?200:60);
 }
 expect(await turn()).toBeGreaterThanOrEqual(8);
});
