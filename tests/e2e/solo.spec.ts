import {test,expect,fastSettings,continueGame,chipCash,dock,sheet} from './helpers';
import {fixture} from './fixtures';

test.beforeEach(async({page})=>{await fastSettings(page);});

test('buying a property charges the price and adds it to the portfolio',async({page})=>{
 await continueGame(page,fixture('purchase'));
 const panel=page.locator('.panel.purchase');
 await expect(panel).toContainText('Copper Lane');
 await expect(panel).toContainText('$1,440');
 await panel.getByRole('button',{name:'Buy for $60'}).click();
 await expect(panel).toBeHidden();
 await expect(chipCash(page,'human')).toHaveText('$1,440');
 await expect(dock(page).getByRole('button',{name:'End turn'})).toBeEnabled();
 await dock(page).getByRole('button',{name:'Properties'}).click();
 await expect(sheet(page)).toContainText('Copper Lane');
 await expect(sheet(page)).toContainText('1/2');
});

test('declining opens an auction that the highest bidder wins',async({page})=>{
 await continueGame(page,fixture('auction'));
 await page.locator('.panel.purchase').getByRole('button',{name:'Auction'}).click();
 const auction=page.locator('.panel.auction');
 await expect(auction).toContainText('No bids');
 await auction.locator('[data-bid-add="10"]').click();
 await expect(auction.getByRole('button',{name:'Bid $10'})).toBeEnabled();
 await auction.getByRole('button',{name:'Bid $10'}).click();
 // Ben has no cash and passes; the property is sold to Ada for her bid.
 await expect(auction).toBeHidden();
 await expect(chipCash(page,'human')).toHaveText('$1,490');
});

test('a minimised decision stays pending and reopens from the dock',async({page})=>{
 await continueGame(page,fixture('purchase'));
 await page.getByRole('button',{name:'Hide panel and view the board'}).click();
 await expect(page.locator('.panel.purchase')).toBeHidden();
 await dock(page).getByRole('button',{name:'Review purchase'}).click();
 await expect(page.locator('.panel.purchase')).toBeVisible();
 // Back minimises again rather than declining.
 await page.goBack();
 await expect(page.locator('.panel.purchase')).toBeHidden();
 await expect(dock(page)).toContainText('Copper Lane is for sale');
});

test('a Chance card waits for Continue, then moves the pawn and charges double rent',async({page})=>{
 await continueGame(page,fixture('chance'));
 await dock(page).getByRole('button',{name:'Roll dice'}).click();
 const card=page.locator('#card-layer .card-stage');
 await expect(card).toContainText('Catch the train');
 await expect(card).toContainText('$50 due to Ben');
 await expect(chipCash(page,'human')).toHaveText('$1,500');
 await card.getByRole('button',{name:'Continue'}).click();
 await expect(card).toBeHidden();
 await expect(chipCash(page,'human')).toHaveText('$1,650');
 await expect(chipCash(page,'bot')).toHaveText('$1,550');
});

test('a Community Chest card can be hidden to view the board and reopened',async({page})=>{
 await continueGame(page,fixture('community'));
 await dock(page).getByRole('button',{name:'Roll dice'}).click();
 const card=page.locator('#card-layer .card-stage');
 await expect(card).toContainText('City grant');
 await card.getByRole('button',{name:'View board'}).click();
 await expect(card).toBeHidden();
 await dock(page).getByRole('button',{name:'Read card'}).click();
 await card.getByRole('button',{name:'Continue'}).click();
 await expect(chipCash(page,'human')).toHaveText('$1,700');
});

test('jail offers the fine and explains the missing card',async({page})=>{
 await continueGame(page,fixture('jail'));
 const panel=page.locator('.panel.jail');
 await expect(panel).toContainText('Attempt 2 of 3');
 await expect(panel.getByRole('button',{name:/Use Get Out of Jail Free/})).toBeDisabled();
 await expect(panel).toContainText('do not hold');
 await panel.getByRole('button',{name:'Pay $50 fine'}).click();
 await expect(panel).toBeHidden();
 await expect(chipCash(page,'human')).toHaveText('$1,450');
 await expect(dock(page).getByRole('button',{name:'Roll dice'})).toBeEnabled();
});

test('debt can be reduced by mortgaging and ends in a confirmed bankruptcy',async({page})=>{
 await continueGame(page,fixture('debt'));
 const panel=page.locator('.panel.debt');
 await expect(panel).toContainText('Raise $50');
 await panel.getByRole('button',{name:'Sell or mortgage'}).click();
 await sheet(page).getByRole('button',{name:'Mortgage Copper Lane for $30'}).click();
 await expect(chipCash(page,'human')).toHaveText('$30');
 await sheet(page).getByRole('button',{name:'Close'}).click();
 await expect(panel).toContainText('Raise $20');
 await panel.getByRole('button',{name:'Declare bankruptcy'}).click();
 const dialog=page.getByRole('alertdialog');
 await expect(dialog).toContainText('auctioned');
 await dialog.getByRole('button',{name:'Declare bankruptcy'}).click();
 await expect(page.locator('.match-finale')).toContainText('Ben wins!');
 await expect(page.locator('.match-finale')).toContainText('Bankrupt');
});

test('an incoming offer can be accepted and transfers assets atomically',async({page})=>{
 await continueGame(page,fixture('incomingTrade'));
 const panel=page.locator('.panel.trade-offer');
 await expect(panel).toContainText('Ben proposes');
 await expect(panel).toContainText('You give $100. You receive Copper Lane.');
 await panel.getByRole('button',{name:'Accept'}).click();
 await expect(panel).toBeHidden();
 await expect(chipCash(page,'human')).toHaveText('$1,400');
 await expect(chipCash(page,'bot')).toHaveText('$1,600');
});

test('the trade builder reviews and sends an offer that the bot answers',async({page})=>{
 await continueGame(page,fixture('management'));
 await dock(page).getByRole('button',{name:'Trade'}).click();
 const builder=sheet(page);
 await expect(builder.getByRole('heading',{name:'New trade'})).toBeVisible();
 await expect(builder.getByRole('button',{name:'Review offer'})).toBeDisabled();
 await builder.locator('[data-step-field="giveCash"][data-step="100"]').click();
 await expect(builder.locator('.trade-footer')).toContainText('You give $100. You receive nothing.');
 await builder.getByRole('button',{name:'Review offer'}).click();
 await expect(builder).toContainText('Your cash after');
 await builder.getByRole('button',{name:'Send offer'}).click();
 await expect(sheet(page)).toBeHidden();
 // A free $100 is worth accepting for the bot.
 await expect(chipCash(page,'bot')).toHaveText('$1,600');
 await expect(chipCash(page,'human')).toHaveText('$1,400');
 await expect(dock(page).getByRole('button',{name:'Trade'})).toBeDisabled();
});

test('properties sheet builds and sells evenly with live reasons',async({page})=>{
 await continueGame(page,fixture('management'));
 await dock(page).getByRole('button',{name:'Properties'}).click();
 await sheet(page).getByRole('button',{name:'Build a house on Copper Lane for $50'}).click();
 await expect(chipCash(page,'human')).toHaveText('$1,450');
 await expect(sheet(page).getByRole('button',{name:'Build a house on Copper Lane for $50'})).toBeDisabled();
 await sheet(page).getByRole('button',{name:/Cedar Row/}).first().click();
 await expect(sheet(page).getByRole('heading',{name:'Title deed'})).toBeVisible();
 await expect(sheet(page)).toContainText('Cedar Row');
 await sheet(page).getByRole('button',{name:/Build house · \$50/}).click();
 await expect(chipCash(page,'human')).toHaveText('$1,400');
 await expect(sheet(page).locator('.stat-row')).toContainText('1 house');
 await sheet(page).getByRole('button',{name:'Back'}).click();
 await expect(sheet(page).getByRole('heading',{name:'Properties'})).toBeVisible();
});

test('tapping the board shows a compact preview that opens the full deed',async({page})=>{
 await continueGame(page,fixture('management'));
 const canvas=page.locator('#board canvas'),box=(await canvas.boundingBox())!,preview=page.locator('.preview');
 // Walk along the near edge of the board until a tap lands on a property tile.
 for(const x of [.62,.5,.38,.7,.3,.56,.44]){
  await page.mouse.click(box.x+box.width*x,box.y+box.height*.7);
  if(await preview.getByRole('button',{name:'Details'}).isVisible())break;
 }
 await expect(preview).toBeVisible();
 await preview.getByRole('button',{name:'Details'}).click();
 await expect(sheet(page).getByRole('heading',{name:'Title deed'})).toBeVisible();
 await expect(sheet(page).locator('.rent-table')).toBeVisible();
});

test('bank history and player overview reflect the purchase',async({page})=>{
 await continueGame(page,fixture('purchase'));
 await page.locator('.panel.purchase').getByRole('button',{name:'Buy for $60'}).click();
 await dock(page).getByRole('button',{name:'Bank'}).click();
 await expect(sheet(page)).toContainText('Ada buys Copper Lane for $60.');
 await expect(sheet(page)).toContainText('−$60');
 await sheet(page).getByRole('button',{name:'Close'}).click();
 await page.locator('.chip-player[data-player="bot"]').click();
 await expect(sheet(page)).toContainText('Medium bot');
 await expect(sheet(page).getByRole('button',{name:'Trade with Ben'})).toBeEnabled();
});
