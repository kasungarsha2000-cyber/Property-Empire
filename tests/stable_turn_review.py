"""Keep the board and controls still across roll and arrival state changes."""
import os,json
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
fixtures=json.loads(Path('test-artifacts/browser-fixtures.json').read_text(encoding='utf-8'))
with sync_playwright() as p:
    browser=p.chromium.launch(channel='chrome',headless=True,args=['--use-angle=swiftshader'])
    try:
        page=browser.new_page(viewport={'width':1440,'height':720})
        page.add_init_script("localStorage.setItem('empire-settings',JSON.stringify({speed:'normal',quality:'low',sound:false}))")
        page.clock.install();page.goto(os.environ.get('EMPIRE_URL','http://127.0.0.1:3001'));page.wait_for_load_state('networkidle')
        page.clock.pause_at((page.evaluate('Date.now()')+2000)/1000)
        def geometry():return page.evaluate("Object.fromEntries(['stage','game-toolbar','match-banner'].map(id=>{const r=document.getElementById(id).getBoundingClientRect();return[id,{x:r.x,y:r.y,width:r.width,height:r.height}]}))")
        for width,height in [(1440,720),(1024,650),(390,844)]:
            page.set_viewport_size({'width':width,'height':height})
            page.evaluate('''async game=>{const db=await new Promise(r=>{const q=indexedDB.open('property-empire-saves',1);q.onupgradeneeded=()=>q.result.createObjectStore('saves');q.onsuccess=()=>r(q.result)});await new Promise(r=>{const t=db.transaction('saves','readwrite');t.objectStore('saves').put({savedAt:Date.now(),game},'current');t.oncomplete=r});db.close()}''',fixtures['animatedRoll'])
            page.get_by_role('button',name='Continue Saved Game',exact=True).click()
            expect(page.get_by_role('region',name='Match overview')).to_be_visible()
            page.clock.fast_forward(100);before=geometry();page.get_by_role('button',name='Roll dice',exact=True).click();rolling=geometry()
            page.clock.fast_forward(3000);arrived=geometry()
            print(json.dumps({'viewport':[width,height],'before':before,'rolling':rolling,'arrived':arrived}),flush=True)
            for state in [rolling,arrived]:
                for key in before:
                    for dimension in ['x','y','width','height']:assert abs(before[key][dimension]-state[key][dimension])<1,(key,dimension,before,state)
            expect(page.locator('#event-popup')).to_contain_text('Pier Avenue')
            page.get_by_role('button',name='Main menu',exact=True).click()
        print('PASS: no roll/arrival layout shift')
    finally:browser.close()
