"""Production menu, responsive right-side decisions and short nonblocking receipts."""
import copy,json,os
from pathlib import Path
from playwright.sync_api import sync_playwright,expect

out=Path('test-artifacts')
fixtures=json.loads((out/'browser-fixtures.json').read_text(encoding='utf-8'))
base=os.environ.get('EMPIRE_URL','http://127.0.0.1:3001')
with sync_playwright() as p:
 browser=p.chromium.launch(channel='chrome',headless=True,args=['--use-angle=swiftshader'])
 try:
  page=browser.new_page(viewport={'width':1440,'height':900});errors=[];measurements=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.add_init_script("localStorage.setItem('empire-settings',JSON.stringify({speed:'normal',quality:'low',sound:false}));localStorage.setItem('empire-session',JSON.stringify({code:'TEST',playerId:'human',token:'test-token',url:'ws://127.0.0.1:3001/ws'}))")
  page.clock.install();page.goto(base);page.wait_for_load_state('networkidle');page.clock.pause_at((page.evaluate('Date.now()')+2000)/1000)
  def load(game):
   page.evaluate('''async game=>{const db=await new Promise(r=>{const q=indexedDB.open('property-empire-saves',1);q.onupgradeneeded=()=>q.result.createObjectStore('saves');q.onsuccess=()=>r(q.result)});await new Promise(r=>{const t=db.transaction('saves','readwrite');t.objectStore('saves').put({savedAt:Date.now(),game},'current');t.oncomplete=r});db.close()}''',game)
   page.get_by_role('button',name='Continue Saved Game',exact=True).click();expect(page.locator('#match-banner')).to_be_visible()
  def menu():page.get_by_role('button',name='Main menu',exact=True).click()
  def geometry():return page.locator('#stage').bounding_box()
  def right_bounds(viewport,kind):
   popup=page.locator('#event-popup');expect(popup).to_be_visible();bounds=popup.bounding_box();stage=geometry()
   assert 9<=stage['x']+stage['width']-bounds['x']-bounds['width']<=15,(viewport,kind,bounds,stage)
   assert bounds['y']>=stage['y'] and bounds['y']+bounds['height']<=stage['y']+stage['height']+1,(viewport,kind,bounds,stage)
   actions=popup.locator('.asset-actions' if kind=='purchase' else '.event-actions')
   expect(actions).to_be_visible();a=actions.bounding_box();assert a['y']>=bounds['y'] and a['y']+a['height']<=bounds['y']+bounds['height']+1,(kind,a,bounds)
   measurements.append({'viewport':viewport,'kind':kind,'bounds':bounds})
  for size in [(1440,900),(390,844)]:
   page.set_viewport_size({'width':size[0],'height':size[1]});expect(page.locator('.developer-credit')).to_have_text('Developed by Kasun Samarasinghe')
   buttons=page.locator('.menu-resume-actions button');expect(buttons).to_have_count(2)
   boxes=[buttons.nth(i).bounding_box() for i in range(2)];assert boxes[0]['x']+boxes[0]['width']+5<=boxes[1]['x'],boxes
   assert all(b['height']>=44 for b in boxes);assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
  page.set_viewport_size({'width':1440,'height':900});page.screenshot(path=str(out/'home-resume-credit.png'),animations='disabled')
  for size in [(1440,900),(1024,650),(390,844),(844,390)]:
   page.set_viewport_size({'width':size[0],'height':size[1]});page.emulate_media(reduced_motion='reduce')
   load(fixtures['purchase']);right_bounds(size,'purchase');menu()
   for kind in ['chance','community']:
    load(fixtures[kind]);before=geometry();page.get_by_role('button',name='Roll dice',exact=True).click();right_bounds(size,kind)
    assert geometry()==before,(size,before,geometry())
    page.clock.fast_forward(12000);expect(page.locator('#event-popup')).to_be_visible();expect(page.locator('[data-player="human"] .player-cash')).to_contain_text('$1,500')
    if size==(1440,900) and kind=='community':page.screenshot(path=str(out/'right-side-community-card.png'),animations='disabled')
    page.locator('#event-popup').get_by_role('button',name='Continue',exact=True).click();menu()
  page.set_viewport_size({'width':1440,'height':900});page.emulate_media(reduced_motion='no-preference')
  rent=copy.deepcopy(fixtures['animatedRoll']);rent['properties'][9]['owner']='bot';load(rent)
  page.get_by_role('button',name='Roll dice',exact=True).click();expect(page.locator('.feedback-label')).to_have_count(0);page.clock.fast_forward(3000)
  expect(page.locator('.feedback-label')).to_contain_text('Ada pays Ben');page.clock.fast_forward(1500);expect(page.locator('.feedback-label')).to_be_visible();page.clock.fast_forward(800);expect(page.locator('.feedback-label')).to_have_count(0);menu()
  trade=copy.deepcopy(fixtures['incomingCounter']);trade['current']=0
  load(trade);page.get_by_role('button',name='Accept trade',exact=True).click();expect(page.locator('.trade-confirmation')).to_be_visible();page.clock.fast_forward(2799);expect(page.locator('.trade-confirmation')).to_be_visible();page.clock.fast_forward(1);expect(page.locator('.trade-confirmation')).to_have_count(0);menu()
  load(trade);page.get_by_role('button',name='Accept trade',exact=True).click();expect(page.locator('.trade-confirmation')).to_be_visible()
  page.get_by_role('button',name='End turn',exact=True).click();page.clock.fast_forward(1000);expect(page.locator('.trade-confirmation')).to_have_count(0)
  expect(page.locator('#event-popup')).to_be_hidden();page.clock.fast_forward(3000)
  assert not errors,errors
  print(json.dumps({'result':'PASS','right_popups':measurements,'page_errors':errors}),flush=True)
 finally:browser.close()
