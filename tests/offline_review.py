"""Inspect the actual service-worker cache and restore a solo save offline."""
import json,os
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
base=os.environ.get('EMPIRE_URL','http://127.0.0.1:3001')
fixture=json.loads(Path('test-artifacts/browser-fixtures.json').read_text())['purchase']
with sync_playwright() as p:
 browser=p.chromium.launch(channel='chrome',headless=True,args=['--use-angle=swiftshader'])
 try:
  context=browser.new_context(viewport={'width':640,'height':480})
  context.add_init_script("localStorage.setItem('empire-settings',JSON.stringify({speed:'reduced',quality:'low',sound:false}))")
  page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(base);page.wait_for_load_state('networkidle')
  page.wait_for_function('navigator.serviceWorker.controller!==null')
  cache=page.evaluate('''async()=>{const keys=await caches.keys();return Promise.all(keys.map(async key=>({key,files:(await(await caches.open(key)).keys()).map(r=>new URL(r.url).pathname)})))}''')
  assert cache and all(any('/assets/index-' in name and name.endswith('.js') for name in item['files']) for item in cache),cache
  print(json.dumps({'cache':cache}),flush=True)
  page.evaluate('''async game=>{const db=await new Promise(r=>{const q=indexedDB.open('property-empire-saves',1);q.onupgradeneeded=()=>q.result.createObjectStore('saves');q.onsuccess=()=>r(q.result)});await new Promise(r=>{const t=db.transaction('saves','readwrite');t.objectStore('saves').put({savedAt:Date.now(),game},'current');t.oncomplete=r});db.close()}''',fixture)
  context.set_offline(True);page.reload(wait_until='domcontentloaded',timeout=45000)
  page.get_by_role('button',name='Continue Saved Game',exact=True).click();expect(page.locator('#match-banner')).to_contain_text('Ada')
  page.get_by_role('button',name='Buy for $60',exact=True).click();expect(page.locator('[data-player="human"] .player-cash')).to_contain_text('$1,440')
  assert not errors,errors
  print(json.dumps({'result':'PASS','offline_resume_and_purchase':True,'page_errors':errors}),flush=True)
 finally:browser.close()
