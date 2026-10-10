import {test,expect,fastSettings,continueGame,noHorizontalOverflow,dock,sheet} from './helpers';
import {fixture} from './fixtures';
import {createGame} from '../../packages/core/index';

const SIZES=[{name:'compact phone',width:360,height:640},{name:'tall phone',width:412,height:915},{name:'tablet',width:800,height:1280},{name:'desktop',width:1280,height:800}];

for(const size of SIZES){
 test(`screens fit without horizontal scrolling on a ${size.name}`,async({page})=>{
  await fastSettings(page);await page.setViewportSize({width:size.width,height:size.height});
  await page.goto('/');await noHorizontalOverflow(page);
  await expect(page.getByRole('button',{name:/Play solo/})).toBeInViewport();
  await page.getByRole('button',{name:/Play solo/}).click();await noHorizontalOverflow(page);
  await expect(page.getByRole('button',{name:/Start game/})).toBeInViewport();
  await continueGame(page,fixture('purchase'));await noHorizontalOverflow(page);
  const buy=page.locator('.panel.purchase').getByRole('button',{name:'Buy for $60'});
  await expect(buy).toBeInViewport();
  await buy.click();
  for(const name of ['Properties','Trade','Bank','Menu']){const tool=dock(page).getByRole('button',{name});await expect(tool).toBeInViewport();expect((await tool.boundingBox())!.height).toBeGreaterThanOrEqual(44);}
  const primary=dock(page).locator('.dock-primary');expect((await primary.boundingBox())!.height).toBeGreaterThanOrEqual(48);
  await dock(page).getByRole('button',{name:'Properties'}).click();await noHorizontalOverflow(page);
  await expect(sheet(page).getByRole('button',{name:'Close'})).toBeInViewport();
 });
}

test('player chips keep the current player visible with eight players',async({page})=>{
 await fastSettings(page);
 const eight=createGame({players:Array.from({length:8},(_,i)=>({id:i?`bot-${i}`:'human',name:i?`Rival ${i}`:'Ada',bot:i>0,token:i}))},42);eight.current=6;
 await continueGame(page,JSON.parse(JSON.stringify(eight)));
 await expect(page.locator('.chip-player')).toHaveCount(8);
 await expect(page.locator('.chip-player.active')).toBeInViewport();
 await noHorizontalOverflow(page);
});
