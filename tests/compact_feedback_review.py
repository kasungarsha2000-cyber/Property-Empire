"""Compact turn tools, real board picking, settled cash effects and motion settings."""
import os,json,math
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
out=Path('test-artifacts');fixtures=json.loads((out/'browser-fixtures.json').read_text(encoding='utf-8'))
with sync_playwright() as p:
    browser=p.chromium.launch(channel='chrome',headless=True,args=['--use-angle=swiftshader'])
    try:
        page=browser.new_page(viewport={'width':1440,'height':720});errors=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.add_init_script("localStorage.setItem('empire-settings',JSON.stringify({speed:'normal',quality:'low',sound:false}))")
        page.clock.install();page.goto(os.environ.get('EMPIRE_URL','http://127.0.0.1:5173'));page.wait_for_load_state('networkidle')
        page.clock.pause_at((page.evaluate('Date.now()')+2000)/1000)
        def load(game):
            page.evaluate('''async game=>{const db=await new Promise(r=>{const q=indexedDB.open('property-empire-saves',1);q.onupgradeneeded=()=>q.result.createObjectStore('saves');q.onsuccess=()=>r(q.result)});await new Promise(r=>{const t=db.transaction('saves','readwrite');t.objectStore('saves').put({savedAt:Date.now(),game},'current');t.oncomplete=r});db.close()}''',game)
            page.get_by_role('button',name='Continue Saved Game',exact=True).click()
            expect(page.get_by_role('region',name='Match overview')).to_be_visible()
        def menu():page.get_by_role('button',name='Main menu',exact=True).click()
        load(fixtures['management'])
        expect(page.locator('#right')).to_have_count(0)
        assert page.locator('#game-toolbar').evaluate("e=>e.parentElement.id==='match-banner'&&e.previousElementSibling.id==='turn-status'")
        geometry=page.locator('#game-toolbar').evaluate("e=>({height:e.getBoundingClientRect().height,border:getComputedStyle(e).borderTopWidth,buttons:[...e.querySelectorAll('button')].map(b=>({y:b.getBoundingClientRect().y,height:b.getBoundingClientRect().height}))})")
        assert geometry['height']<=37 and geometry['border']=='0px',geometry
        stage=page.locator('#stage').bounding_box();layout=page.locator('#layout').bounding_box()
        assert stage['width']>layout['width']*.75 and stage['y']+stage['height']<=720,stage
        page.get_by_role('button',name='Reset camera',exact=True).click();page.clock.fast_forward(100)
        # Project the center of Copper Lane from the reset perspective camera,
        # then perform an actual pointer click on the WebGL canvas.
        box=page.locator('#board canvas').bounding_box();aspect=box['width']/box['height'];tan=math.tan(math.radians(20))
        def norm(v):return [x/math.sqrt(sum(y*y for y in v)) for x in v]
        def dot(a,b):return sum(x*y for x,y in zip(a,b))
        d=norm([12,15,16]);right=norm([d[2],0,-d[0]])
        up=norm([d[1]*right[2],d[2]*right[0]-d[0]*right[2],-d[1]*right[0]])
        required=max(max(dot([x,y-.8,z],d)+abs(dot([x,y-.8,z],right))/(tan*aspect),dot([x,y-.8,z],d)+abs(dot([x,y-.8,z],up))/tan) for x in [-6.7,6.7] for y in [-.35,1.1] for z in [-6.7,6.7])
        target=[4.4,.55-.8,5.5];depth=required*1.06-dot(target,d)
        page.mouse.click(box['x']+box['width']*(1+dot(target,right)/(depth*tan*aspect))/2,box['y']+box['height']*(1-dot(target,up)/(depth*tan))/2)
        expect(page.locator('#dialog .deed-header h2')).to_have_text('Copper Lane')
        expect(page.locator('#dialog .deed-rents')).to_contain_text('Hotel')
        page.screenshot(path=str(out/'board-click-deed.png'))
        page.get_by_role('button',name='Focus this property',exact=True).click();expect(page.locator('#dialog')).to_be_hidden()
        page.get_by_role('button',name='Fullscreen',exact=True).click();expect(page.locator('.topbar')).to_be_hidden()
        page.get_by_role('button',name='Reset camera',exact=True).click();page.clock.fast_forward(100)
        assert page.locator('#game-toolbar button').count()==9
        assert len(set(page.locator('#game-toolbar button').evaluate_all('bs=>bs.map(b=>b.getBoundingClientRect().y)')))==1
        page.screenshot(path=str(out/'compact-fullscreen.png'))
        page.get_by_role('button',name='Exit fullscreen',exact=True).click()
        menu();rent=json.loads(json.dumps(fixtures['animatedRoll']));rent['properties'][9]['owner']='bot';load(rent)
        page.get_by_role('button',name='Roll dice',exact=True).click()
        expect(page.locator('.feedback-burst')).to_have_count(0);page.clock.fast_forward(950)
        expect(page.locator('.feedback-burst')).to_have_count(0);page.clock.fast_forward(2000)
        expect(page.locator('.feedback-negative')).to_contain_text('Rent paid')
        expect(page.locator('.feedback-negative')).to_contain_text('−$8')
        expect(page.locator('.balance-negative')).to_have_count(1)
        assert page.locator('.event-feedback').evaluate("e=>getComputedStyle(e).pointerEvents==='none'")
        page.screenshot(path=str(out/'rent-loss-feedback.png'))
        page.clock.fast_forward(1500);expect(page.locator('.feedback-burst')).to_have_count(0)
        menu();rent['current']=1;rent['properties'][9]['owner']='human';load(rent)
        page.clock.fast_forward(1000);expect(page.locator('.feedback-burst')).to_have_count(0)
        page.clock.fast_forward(3000)
        expect(page.locator('.feedback-positive')).to_contain_text('Rent collected')
        expect(page.locator('.feedback-positive')).to_contain_text('+$8')
        expect(page.locator('.balance-positive')).to_have_count(1)
        page.screenshot(path=str(out/'rent-gain-feedback.png'))
        menu();load(fixtures['community']);page.get_by_role('button',name='Roll dice',exact=True).click()
        page.get_by_role('button',name='Settings',exact=True).click();page.get_by_label('Animation speed').select_option('reduced')
        page.get_by_role('button',name='Save settings',exact=True).click()
        expect(page.locator('#event-popup')).to_contain_text('Community Chest');expect(page.locator('.feedback-burst')).to_have_count(0)
        page.get_by_role('button',name='Continue',exact=True).click()
        for width,height in [(1440,600),(1024,650),(390,844)]:
            page.set_viewport_size({'width':width,'height':height});page.clock.fast_forward(100)
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
            if width>650:
                bounds=page.locator('#stage').bounding_box();assert bounds['y']+bounds['height']<=height,bounds
            else:page.screenshot(path=str(out/'compact-mobile.png'),full_page=True)
        assert not errors,errors
        print(json.dumps({'result':'PASS','toolbar':geometry,'flows':['compact tools after dice','wide board without sidebar','actual canvas click opens deed','fullscreen tool line','rent loss after arrival','rent income after opponent arrival','automatic effect cleanup','reduced motion suppresses effects','responsive bounds'],'page_errors':errors}))
    finally:browser.close()
