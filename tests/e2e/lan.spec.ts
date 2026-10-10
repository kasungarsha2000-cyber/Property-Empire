import {test,expect,fastSettings,chipCash} from './helpers';
import type {Browser,Page} from '@playwright/test';

async function player(browser:Browser){
 const context=await browser.newContext({viewport:{width:393,height:852},isMobile:true,hasTouch:true});
 const page=await context.newPage();await fastSettings(page);
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 return{context,page,errors};
}
/** The seat whose dock offers Roll dice right now. */
async function roller(pages:Page[]){
 for(let i=0;i<60;i++){for(const page of pages)if(await page.locator('.dock-primary',{hasText:'Roll dice'}).isEnabled().catch(()=>false))return page;await pages[0].waitForTimeout(250);}
 throw new Error('Nobody could roll');
}

test('host and guest share one authoritative match, then the guest rejoins after a reload',async({browser})=>{
 const host=await player(browser),guest=await player(browser);
 try{
  await host.page.goto('/');
  await host.page.getByRole('button',{name:/Host LAN game/}).click();
  await host.page.getByLabel('Name').fill('Hana');
  for(let i=0;i<1;i++)await host.page.locator('[data-form-step="bots"][data-step="-1"]').click();
  await expect(host.page.locator('[data-setup-summary]')).toContainText('0 medium bots');
  await host.page.getByRole('button',{name:/Create room/}).click();
  const code=(await host.page.locator('#room-code').textContent())!.trim();
  expect(code).toMatch(/^[A-Z0-9]{6}$/);
  await expect(host.page.getByRole('button',{name:/Start match/})).toBeDisabled();

  await guest.page.goto('/');
  await guest.page.getByRole('button',{name:/Join LAN game/}).click();
  await guest.page.getByLabel('Name').fill('Gus');
  await guest.page.locator('.token-option').nth(3).click();
  await guest.page.getByLabel('Room code').fill(code.toLowerCase());
  await guest.page.getByRole('button',{name:/Join room/}).click();
  await expect(guest.page.locator('.member')).toHaveCount(2);
  await guest.page.getByRole('button',{name:'I’m ready'}).click();
  await expect(host.page.locator('.member',{hasText:'Gus'})).toContainText('Ready');
  await host.page.getByRole('button',{name:/Start match/}).click();

  for(const page of [host.page,guest.page]){await expect(page.locator('.chip-player')).toHaveCount(2);await expect(page.locator('.hud-line')).toContainText(`Room ${code}`);await expect(page.locator('.hud-line .conn')).toContainText('Connected');}
  const first=await roller([host.page,guest.page]),other=first===host.page?guest.page:host.page;
  await expect(other.locator('.dock-primary')).toHaveCount(0);
  await first.locator('.dock-primary').click();
  // Both clients render the same authoritative result of that roll.
  await expect(other.locator('.dock-status')).not.toContainText('Getting ready to roll');
  const ids=await host.page.locator('.chip-player').evaluateAll(chips=>chips.map(c=>(c as HTMLElement).dataset.player!));
  for(const id of ids)await expect(chipCash(guest.page,id)).toHaveText((await chipCash(host.page,id).textContent())!);

  await guest.page.reload();
  const rejoin=guest.page.getByRole('button',{name:/Rejoin LAN game/});
  await expect(rejoin).toContainText(code);
  await rejoin.click();
  await expect(guest.page.locator('.hud-line')).toContainText(`Room ${code}`);
  await expect(guest.page.locator('.chip-player.mine')).toHaveCount(1);
  expect([...host.errors,...guest.errors]).toEqual([]);
 }finally{await host.context.close();await guest.context.close();}
});

test('joining a missing room returns to the form with the host message',async({browser})=>{
 const guest=await player(browser);
 try{
  await guest.page.goto('/');
  await guest.page.getByRole('button',{name:/Join LAN game/}).click();
  await guest.page.getByLabel('Room code').fill('ZZZZZZ');
  await guest.page.getByRole('button',{name:/Join room/}).click();
  await expect(guest.page.locator('[data-connect-error]')).toContainText('Room not found');
  await expect(guest.page.getByRole('heading',{name:'Join a LAN game'})).toBeVisible();
 }finally{await guest.context.close();}
});

test('an unreachable host address explains the problem instead of spinning',async({browser})=>{
 const guest=await player(browser);
 try{
  await guest.page.goto('/');
  await guest.page.getByRole('button',{name:/Join LAN game/}).click();
  await guest.page.getByText('Host address').click();
  await guest.page.getByLabel('Address').fill('127.0.0.1:9');
  await guest.page.getByLabel('Room code').fill('ABC123');
  await guest.page.getByRole('button',{name:/Join room/}).click();
  await expect(guest.page.locator('[data-connect-error]')).toContainText('Could not reach the host at 127.0.0.1:9',{timeout:20_000});
 }finally{await guest.context.close();}
});
