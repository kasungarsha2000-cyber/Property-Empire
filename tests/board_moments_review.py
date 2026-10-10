"""Read first, then apply cards; spatial transactions, centered tools and match results."""
import os,json
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
out=Path('test-artifacts');fixtures=json.loads((out/'browser-fixtures.json').read_text(encoding='utf-8'))
base=os.environ.get('EMPIRE_URL','http://127.0.0.1:5173')
with sync_playwright() as p:
    browser=p.chromium.launch(channel='chrome',headless=True,args=['--use-angle=swiftshader'])
    try:
        page=browser.new_page(viewport={'width':1440,'height':960});errors=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.add_init_script("localStorage.setItem('empire-settings',JSON.stringify({speed:'normal',quality:'low',sound:false}))")
        page.clock.install();page.goto(base);page.wait_for_load_state('networkidle');page.clock.pause_at((page.evaluate('Date.now()')+2000)/1000)
        def load(game):
            page.evaluate('''async game=>{const db=await new Promise(r=>{const q=indexedDB.open('property-empire-saves',1);q.onupgradeneeded=()=>q.result.createObjectStore('saves');q.onsuccess=()=>r(q.result)});await new Promise(r=>{const t=db.transaction('saves','readwrite');t.objectStore('saves').put({savedAt:Date.now(),game},'current');t.oncomplete=r});db.close()}''',game)
            page.get_by_role('button',name='Continue Saved Game',exact=True).click();expect(page.get_by_role('region',name='Match overview')).to_be_visible()
        def menu():page.locator('#game-toolbar').get_by_role('button',name='Main menu',exact=True).click()
        def capture(name):
            if not page.locator('.match-finale').is_visible():page.get_by_role('button',name='Zoom in',exact=True).click()
            page.clock.run_for(240);page.screenshot(path=str(out/name))
        load(fixtures['community']);page.get_by_role('button',name='Roll dice',exact=True).click();page.clock.fast_forward(1000);expect(page.locator('#event-popup')).to_be_hidden();page.clock.fast_forward(2000)
        expect(page.locator('#event-popup')).to_contain_text('City grant');expect(page.locator('#player-ledger .player-row').first).to_contain_text('$1,500')
        expect(page.locator('.moment-card')).to_have_count(0);expect(page.locator('[data-card="community-2"]')).to_have_count(1)
        capture('card-read-before-effect.png');page.locator('#event-popup').get_by_role('button',name='Continue',exact=True).click()
        expect(page.locator('#player-ledger .player-row').first).to_contain_text('$1,700');expect(page.locator('.moment-card .resolved-card-art')).to_be_visible();expect(page.locator('.moment-card .moment-copy')).to_have_count(0);expect(page.locator('.moment-card')).not_to_contain_text('City grant');expect(page.locator('#event-popup')).to_contain_text('+$200')
        page.locator('#event-popup .event-close').focus();page.clock.fast_forward(1500)
        expect(page.locator('#event-popup')).to_be_visible()
        page.locator('#event-popup .event-close').evaluate('e=>e.blur()');page.mouse.move(5,5)
        page.clock.fast_forward(800);expect(page.locator('#event-popup')).to_be_hidden()
        menu();load(fixtures['chance']);page.get_by_role('button',name='Roll dice',exact=True).click();page.clock.fast_forward(3000)
        expect(page.locator('#event-popup')).to_contain_text('Catch the train');expect(page.locator('#event-popup')).to_contain_text('Drawn at Opportunity');expect(page.locator('#player-ledger .player-row').first).to_contain_text('$1,500')
        page.locator('#event-popup').get_by_role('button',name='Continue',exact=True).click();page.clock.fast_forward(2200)
        expect(page.locator('.feedback-burst[data-property="5"] .feedback-label')).to_contain_text('Ada pays Ben $50.')
        rent=page.locator('.feedback-burst[data-property="5"] .feedback-label');assert rent.evaluate("e=>e.parentElement.style.left.endsWith('px')")
        capture('rent-at-property.png');page.clock.fast_forward(500);expect(rent).to_be_visible();page.clock.fast_forward(2000);expect(rent).to_have_count(0)
        menu();load(fixtures['purchase']);page.get_by_role('button',name='Buy for $60',exact=True).click();expect(page.locator('.moment-purchase')).to_contain_text('Ada owns Copper Lane');capture('property-purchase-seal.png')
        menu();load(fixtures['incomingCounter']);page.get_by_role('button',name='Accept trade',exact=True).click();expect(page.locator('.moment-trade')).to_contain_text('Copper Lane → Ada');capture('trade-deeds-exchanged.png')
        menu();g=json.loads(json.dumps(fixtures['animatedRoll']));g['phase']='ended';g['winner']='human';g['players'][1]['bankrupt']=True;g['players'][1]['cash']=0;load(g)
        expect(page.locator('.match-finale')).to_contain_text('You won the empire!');expect(page.locator('.finale-standings li').first).to_contain_text('Ada');capture('winner-results.png')
        page.get_by_role('button',name='Close results',exact=True).click();expect(page.locator('.match-finale')).to_be_hidden();page.get_by_role('button',name='View results',exact=True).click();expect(page.locator('.match-finale')).to_be_visible()
        page.get_by_role('button',name='Close results',exact=True).click();menu();g['winner']='bot';g['players'][0]['bankrupt']=True;g['players'][0]['cash']=0;g['players'][1]['bankrupt']=False;g['players'][1]['cash']=2000;load(g)
        expect(page.locator('.match-finale')).to_contain_text('Ben wins!');expect(page.locator('.finale-standings li').first).to_contain_text('Ben');capture('loser-results.png')
        page.set_viewport_size({'width':390,'height':844});page.clock.fast_forward(100);result=page.locator('.finale-card');assert result.evaluate('e=>e.clientHeight<=e.parentElement.clientHeight')
        page.screenshot(path=str(out/'results-mobile.png'),full_page=True,animations='disabled');page.get_by_role('button',name='Close results',exact=True).click();menu();load(fixtures['community'])
        page.locator('.header-actions').get_by_role('button',name='Settings',exact=True).click();page.get_by_label('Animation speed').select_option('reduced');page.get_by_role('button',name='Save settings',exact=True).click();page.get_by_role('button',name='Roll dice',exact=True).click()
        expect(page.locator('#event-popup')).to_contain_text('City grant');assert page.locator('#event-popup .card-hero').evaluate("e=>getComputedStyle(e).animationName==='none'")
        bounds=page.locator('#event-popup').bounding_box();stage=page.locator('#stage').bounding_box();assert bounds['x']>=stage['x'] and bounds['y']>=stage['y'] and bounds['x']+bounds['width']<=stage['x']+stage['width']+1 and bounds['y']+bounds['height']<=stage['y']+stage['height']+1,(bounds,stage)
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
        assert page.locator('#game-toolbar .game-tools').evaluate('e=>e.scrollWidth>e.clientWidth')
        expect(page.locator('#player-ledger .player-row').first).to_contain_text('$1,500');page.locator('#event-popup').get_by_role('button',name='Continue',exact=True).click();expect(page.locator('#player-ledger .player-row').first).to_contain_text('$1,700')
        assert page.locator('.moment-card .card-spark').first.evaluate("e=>getComputedStyle(e).animationName==='none'")
        page.set_viewport_size({'width':1440,'height':960});page.clock.fast_forward(3500)
        center=page.locator('#game-toolbar .game-tools').evaluate("e=>{const r=e.getBoundingClientRect(),b=[...e.querySelectorAll('button')].map(e=>e.getBoundingClientRect());return Math.abs((b[0].left+b.at(-1).right)/2-(r.left+r.width/2))}");assert center<2,center
        if ':5173' in base:
            result=page.evaluate(r'''async()=>{const source=await(await fetch('/src/scene-assets.ts')).text(),url=source.match(/import \* as THREE from \"([^\"]+)\"/)[1];const [T,{SceneAssets}]=await Promise.all([import(url),import('/src/scene-assets.ts')]);const assets=new SceneAssets();assets.buildBoard(new T.Scene());return [...assets.ownershipLabels.values()].map(label=>({z:label.position.z,width:label.geometry.parameters.width}));}''')
            assert len(result)==28 and all(v['z']>.52 and v['width']<1.1 for v in result),result
        assert not errors,errors
        print(json.dumps({'result':'PASS','flows':['cards wait for Continue','card effect animation after reading','spatial named rent','purchase seal','accepted deed trade','winner and loser standings','reopen results','mobile results','reduced motion cards','centered controls','outer ownership signs'],'page_errors':errors}),flush=True)
    finally:browser.close()
