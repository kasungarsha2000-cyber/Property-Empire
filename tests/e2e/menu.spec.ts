import {test,expect,fastSettings,continueGame,noHorizontalOverflow,sheet} from './helpers';
import {fixture} from './fixtures';

test.beforeEach(async({page})=>{await fastSettings(page);});

test('main menu leads with Play solo and disables Continue without a save',async({page})=>{
 await page.goto('/');
 await expect(page.getByRole('heading',{name:'PROPERTY EMPIRE'})).toBeVisible();
 await expect(page.getByRole('button',{name:/Play solo/})).toBeEnabled();
 await expect(page.getByRole('button',{name:/Host LAN game/})).toBeVisible();
 await expect(page.getByRole('button',{name:/Join LAN game/})).toBeVisible();
 await expect(page.getByRole('button',{name:/Continue saved game/})).toBeDisabled();
 await expect(page.getByRole('button',{name:/Rejoin LAN game/})).toHaveCount(0);
 await expect(page.getByText('Developed by')).toBeVisible();
 await noHorizontalOverflow(page);
});

test('setup summarises choices and starts a solo game with the chosen opponents',async({page})=>{
 await page.goto('/');
 await page.getByRole('button',{name:/Play solo/}).click();
 await page.getByLabel('Name').fill('Ada');
 await page.locator('[data-form-step="bots"][data-step="-1"]').click();
 await page.locator('[data-form-step="bots"][data-step="-1"]').click();
 await page.getByRole('radio',{name:'Hard'}).check();
 await page.getByRole('radio',{name:'Quick'}).check();
 await expect(page.locator('[data-setup-summary]')).toHaveText('You and 1 hard bot · $1,500 · Quick');
 await page.getByRole('button',{name:/Start game/}).click();
 await expect(page.locator('.chip-player')).toHaveCount(2);
 await expect(page.locator('.hud-line')).toContainText('of 80');
 await noHorizontalOverflow(page);
});

test('browser Back walks back through screens and layers without leaving the game',async({page})=>{
 await page.goto('/');
 await page.getByRole('button',{name:/Play solo/}).click();
 await expect(page.getByRole('heading',{name:'New game'})).toBeVisible();
 await page.goBack();
 await expect(page.getByRole('button',{name:/Play solo/})).toBeVisible();

 await continueGame(page,fixture('management'));
 await page.getByRole('button',{name:'Properties'}).click();
 await expect(sheet(page)).toBeVisible();
 await page.goBack();
 await expect(sheet(page)).toBeHidden();
 await expect(page.locator('.hud')).toBeVisible();
 // With nothing left to close, Back opens the game menu instead of leaving the match.
 await page.goBack();
 await expect(page.getByRole('heading',{name:'Game menu'})).toBeVisible();
 await page.keyboard.press('Escape');
 await expect(sheet(page)).toBeHidden();
});

test('leaving a match keeps the save and Continue resumes it',async({page})=>{
 await continueGame(page,fixture('management'));
 await page.getByRole('button',{name:'Menu'}).click();
 await page.getByRole('button',{name:/Leave match/}).click();
 await expect(page.getByRole('alertdialog')).toContainText('saved on this device');
 await page.getByRole('button',{name:'Leave match',exact:true}).click();
 const resume=page.getByRole('button',{name:/Continue saved game/});
 await expect(resume).toBeEnabled();
 await expect(resume).toContainText('Turn 1');
 await resume.click();
 await expect(page.locator('.chip-player[data-player="human"]')).toBeVisible();
});

test('settings apply immediately and persist after a reload',async({page})=>{
 await page.goto('/');
 await page.getByRole('button',{name:'Settings'}).click();
 await page.getByRole('radio',{name:'Larger'}).click();
 await expect(page.locator('html')).toHaveAttribute('data-text-size','larger');
 await page.getByRole('radio',{name:'High'}).click();
 await page.reload();
 await expect(page.locator('html')).toHaveAttribute('data-text-size','larger');
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('empire-settings')!));
 expect(saved).toMatchObject({textSize:'larger',quality:'high'});
});

test('rules sheet explains play and lists both card decks',async({page})=>{
 await page.goto('/');
 await page.getByRole('button',{name:'How to play'}).click();
 await expect(sheet(page)).toContainText('three doubles in a row');
 await page.getByText('All Chance and Community Chest cards').click();
 await expect(sheet(page).locator('.card-face')).toHaveCount(32);
});

test('pass and play hands the device to the next human player',async({page})=>{
 await page.goto('/');
 await page.getByRole('button',{name:/Play solo/}).click();
 await page.getByLabel('Name').fill('Ada');
 await page.getByRole('button',{name:/Add a player/}).click();
 await page.getByLabel('Name of player 2').fill('Cleo');
 for(let i=0;i<3;i++)await page.locator('[data-form-step="bots"][data-step="-1"]').click();
 await expect(page.locator('[data-setup-summary]')).toHaveText('2 players on this device · $1,500 · Classic');
 await page.getByRole('button',{name:/Start game/}).click();
 await expect(page.locator('.chip-player')).toHaveCount(2);
 // The game first asks for whoever starts, then hands over after that turn ends.
 const first=(await page.locator('.chip-player.active .cp-text b').textContent())!.trim(),second=first==='Ada'?'Cleo':'Ada';
 await page.getByRole('button',{name:`I’m ${first} · continue`}).click();
 await expect(page.locator('.dock-status')).toContainText(`${first}’s turn`);
 await page.locator('.dock-primary').click();
 for(let i=0;i<80;i++){
  if(await page.getByRole('heading',{name:`Pass the device to ${second}`}).isVisible())break;
  // Auctions hand the device round for bids and then back to the current player.
  const other=page.locator('[data-do="take-seat"]');if(await other.isVisible()){await other.click();continue;}
  const card=page.locator('#card-layer.modal [data-action*="resolveCard"]'),buy=page.locator('.panel.purchase [data-action*="decline"]'),pass=page.locator('.panel.auction [data-action*="pass"]'),jail=page.locator('.panel.jail [data-action*="roll"]'),primary=page.locator('.dock-primary:not([disabled])');
  for(const target of [card,buy,pass,jail,primary])if(await target.isVisible().catch(()=>false)){await target.click();break;}
  await page.waitForTimeout(150);
 }
 await page.getByRole('button',{name:`I’m ${second} · continue`}).click();
 await expect(page.locator('.dock-status')).toContainText(second);
});
