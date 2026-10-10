"""Cash nametags, readable trade/cards and real renderer integration regressions."""
import copy,json,os
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
out=Path('test-artifacts');fixtures=json.loads((out/'browser-fixtures.json').read_text(encoding='utf-8'))
base=os.environ.get('EMPIRE_URL','http://127.0.0.1:5173')
with sync_playwright() as p:
 browser=p.chromium.launch(channel='chrome',headless=True,args=['--use-angle=swiftshader'])
 try:
  page=browser.new_page(viewport={'width':1440,'height':900});errors=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.add_init_script("localStorage.setItem('empire-settings',JSON.stringify({speed:'normal',quality:'low',sound:false}))")
  page.clock.install();page.goto(base);page.wait_for_load_state('networkidle');page.clock.pause_at((page.evaluate('Date.now()')+2000)/1000)
  def load(game):
   page.evaluate('''async game=>{const db=await new Promise(r=>{const q=indexedDB.open('property-empire-saves',1);q.onupgradeneeded=()=>q.result.createObjectStore('saves');q.onsuccess=()=>r(q.result)});await new Promise(r=>{const t=db.transaction('saves','readwrite');t.objectStore('saves').put({savedAt:Date.now(),game},'current');t.oncomplete=r});db.close()}''',game)
   page.get_by_role('button',name='Continue Saved Game',exact=True).click();expect(page.locator('#match-banner')).to_be_visible()
  def menu():page.get_by_role('button',name='Main menu',exact=True).click()
  def capture(name):
   page.clock.run_for(35)
   page.locator('.ledger-delta,.trade-confirmation,.trade-transfer,.trade-settled,.feedback-label,.moment-copy,#event-popup').evaluate_all('els=>els.forEach(e=>e.getAnimations().forEach(a=>{a.pause();a.currentTime=1000}))')
   page.screenshot(path=str(out/name),animations='disabled')
  load(fixtures['purchase']);before=page.locator('#match-banner').bounding_box();page.get_by_role('button',name='Buy for $60',exact=True).click()
  expect(page.locator('[data-player="human"] .ledger-loss')).to_contain_text('−$60');after=page.locator('#match-banner').bounding_box();assert before==after,(before,after)
  capture('polished-purchase-cash.png');page.get_by_role('button',name='Sound off',exact=True).click();expect(page.locator('[data-player="human"] .ledger-loss')).to_contain_text('−$60')
  page.clock.fast_forward(3000);expect(page.locator('.ledger-delta')).to_have_count(0)
  menu();rent=copy.deepcopy(fixtures['animatedRoll']);rent['properties'][9]['owner']='bot';load(rent)
  page.get_by_role('button',name='Roll dice',exact=True).click();expect(page.locator('.ledger-delta')).to_have_count(0);expect(page.locator('#event-popup')).to_be_hidden()
  page.clock.fast_forward(3000);expect(page.locator('[data-player="human"] .ledger-loss')).to_be_visible();expect(page.locator('[data-player="bot"] .ledger-gain')).to_be_visible()
  expect(page.locator('.feedback-label')).to_contain_text('Ada pays Ben');capture('polished-rent-two-nametags.png')
  menu();load(fixtures['incomingCounter']);page.get_by_role('button',name='Accept trade',exact=True).click()
  expect(page.locator('.trade-confirmation')).to_contain_text('Trade completed');expect(page.locator('.trade-mini-deed')).to_contain_text('Copper Lane');expect(page.locator('.trade-mini-cash')).to_contain_text('$100')
  expect(page.locator('.ledger-loss')).to_contain_text('−$100');expect(page.locator('.ledger-gain')).to_contain_text('+$100');expect(page.locator('#event-popup')).to_be_hidden();capture('polished-trade-exchange.png')
  page.clock.fast_forward(2400);expect(page.locator('.trade-confirmation')).to_be_visible();page.clock.fast_forward(500);expect(page.locator('.trade-confirmation')).to_have_count(0)
  menu();bot=copy.deepcopy(fixtures['community']);bot['current']=1;bot['players'][0]['position']=0;bot['players'][1]['position']=24;load(bot)
  page.clock.fast_forward(1000);expect(page.locator('#event-popup')).to_be_hidden();page.clock.fast_forward(3000)
  expect(page.locator('#event-popup.event-observer')).to_contain_text('Community Chest');expect(page.locator('[data-player="bot"] .player-cash')).to_contain_text('$1,500');capture('polished-bot-card-continue.png')
  observer=page.locator('#event-popup').bounding_box();stage=page.locator('#stage').bounding_box();assert 9<=stage['x']+stage['width']-observer['x']-observer['width']<=15,(observer,stage)
  page.locator('#event-popup').get_by_role('button',name='Continue',exact=True).click();expect(page.locator('[data-player="bot"] .player-cash')).to_contain_text('$1,700');expect(page.locator('[data-player="bot"] .ledger-gain')).to_contain_text('+$200')
  menu();load(fixtures['community']);page.get_by_role('button',name='Roll dice',exact=True).click();page.emulate_media(reduced_motion='reduce')
  expect(page.locator('#event-popup')).to_contain_text('Community Chest');expect(page.locator('#event-popup')).to_contain_text('City grant')
  page.locator('#event-popup').get_by_role('button',name='Continue',exact=True).click();expect(page.locator('.ledger-gain')).to_contain_text('+$200');assert page.locator('.ledger-gain').evaluate("e=>getComputedStyle(e).animationName==='none'")
  menu();page.emulate_media(reduced_motion='no-preference');load(fixtures['community']);page.set_viewport_size({'width':390,'height':844});page.get_by_role('button',name='Roll dice',exact=True).click();page.clock.fast_forward(3000)
  card=page.locator('#event-popup')
  # The mocked JS clock does not advance the compositor's card flight.
  # Measure the panel and sticky action at the same settled animation frame.
  card.evaluate('e=>e.getAnimations().forEach(a=>a.finish())')
  bounds=card.bounding_box();stage=page.locator('#stage').bounding_box();assert bounds['x']>=stage['x'] and bounds['y']>=stage['y'] and bounds['x']+bounds['width']<=stage['x']+stage['width']+1 and bounds['y']+bounds['height']<=stage['y']+stage['height']+1,(bounds,stage)
  continue_button=card.get_by_role('button',name='Continue',exact=True);expect(continue_button).to_be_visible();button_bounds=continue_button.bounding_box();assert button_bounds['y']+button_bounds['height']<=bounds['y']+bounds['height']+1,(button_bounds,bounds)
  capture('polished-mobile-card.png');assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
  page.set_viewport_size({'width':1440,'height':900});menu()
  probe=None
  if ':5173' in base:
   probe=page.evaluate(r'''async fixtures=>{
    const source=await(await fetch('/src/board-view.ts')).text(),threeURL=source.match(/import \* as THREE from "([^"]+)"/)[1];
    const [T,{BoardView},{planDiceRoll,sampleDiceRoll,DICE_FIELD},{applyAction}]=await Promise.all([import(threeURL),import('/src/board-view.ts'),import('/src/dice-physics.ts'),import('/@fs/D:/Other/Monopoly%20Game/PropertyEmpire3D/packages/core/engine.ts')]);
    const host=document.createElement('div');Object.assign(host.style,{position:'fixed',inset:0,zIndex:1000,background:'#F5F0E6'});document.body.append(host);
    const board=new BoardView(host,()=>{},{speed:'normal',quality:'medium',sound:false});board.renderer.setAnimationLoop(null);board.update(fixtures.management,false);board.frame();window.polishBoard=board;
    const ctx=board.assets.labels.find(l=>l.index===1).mesh.material.map.image.getContext('2d'),border=[...ctx.getImageData(16,256,1,1).data];
    const batch=board.scene.getObjectByName('static-batch-0'),calls=board.renderer.info.render.calls;
    board.scene.updateMatrixWorld(true);const tile=board.assets.tiles[1],center=new T.Vector3();tile.getWorldPosition(center);const ray=new T.Raycaster(center.clone().add(new T.Vector3(0,3,0)),new T.Vector3(0,-1,0));const picked=ray.intersectObjects([tile],true)[0].object.userData.index;
    let overlays=0;board.onFrame=()=>overlays++;board.overlayDirty=false;const realNow=performance.now.bind(performance);let now=1000;
    Object.defineProperty(performance,'now',{configurable:true,value:()=>now});board.cityLife.last=null;for(let i=0;i<5;i++){now+=20;board.frame()}const idleOverlays=overlays;
    board.dicePlan=planDiceRoll();board.diceRest=board.dicePlan.rest;board.diceStarted=now;board.diceUntil=now+1150;now+=575;board.frame();const diceMid=board.dice.map(d=>d.position.toArray());
    now=board.diceUntil;board.lastSunShadow=now-1;let finalShadow=false;const render=board.renderer.render.bind(board.renderer);board.renderer.render=(...args)=>{finalShadow=board.renderer.shadowMap.needsUpdate;render(...args)};board.frame();board.renderer.render=render;
    let settled=0;board.onSettled=()=>settled++;board.update(fixtures.animatedRoll,false);board.update(applyAction(fixtures.animatedRoll,'human',{type:'roll'}));board.configure({speed:'reduced',quality:'medium',sound:false});await Promise.resolve();const reducedSettled=settled;
    Object.defineProperty(performance,'now',{configurable:true,value:realNow});board.configure({speed:'normal',quality:'high',sound:false});board.update(fixtures.management,false);board.cityLife.resetClock();board.cityLife.update(0);board.cityLife.update(1000);board.frame();
    return{batch:!!batch,calls,picked,border,initialBuildings:board.buildings.size,idleOverlays,diceMid,finalShadow,reducedSettled,floor:DICE_FIELD.floor};
   }''',fixtures)
   assert probe['batch'] and probe['picked']==1 and probe['initialBuildings']==0,probe
   assert probe['calls']<350 and probe['idleOverlays']==0,probe
   assert probe['finalShadow'] and probe['reducedSettled']==1,probe
   assert probe['border'][:3]==[184,117,56],probe
   page.screenshot(path=str(out/'polished-city-day.png'))
   page.evaluate('''()=>{const b=polishBoard;b.cityLife.last=null;b.cityLife.elapsed=129000;b.cityLife.update(0);b.cityLife.update(1000);b.renderer.shadowMap.needsUpdate=true;b.renderer.render(b.scene,b.camera)}''');page.screenshot(path=str(out/'polished-city-night.png'))
   page.evaluate('polishBoard.renderer.setAnimationLoop(null);polishBoard.controls.dispose();polishBoard.renderer.dispose()')
  assert not errors,errors
  print(json.dumps({'result':'PASS','probe':probe,'page_errors':errors}),flush=True)
 finally:browser.close()
