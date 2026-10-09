"""Real turn timing, cards, empty properties and randomized dice presentation."""
import os,json
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
out=Path('test-artifacts');fixtures=json.loads((out/'browser-fixtures.json').read_text())
base=os.environ.get('EMPIRE_URL','http://127.0.0.1:5173')
with sync_playwright() as p:
    browser=p.chromium.launch(channel='chrome',headless=True,args=['--use-angle=swiftshader'])
    try:
        page=browser.new_page(viewport={'width':1440,'height':960});errors=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.clock.install()
        page.goto(base);page.wait_for_load_state('networkidle')
        def speed(value):
            page.get_by_role('button',name='Settings',exact=True).click()
            page.get_by_label('Animation speed').select_option(value)
            page.get_by_label('Graphics quality').select_option('low')
            page.get_by_role('button',name='Save settings',exact=True).click()
        speed('normal')
        page.clock.pause_at((page.evaluate('Date.now()')+2000)/1000)
        def load(game):
            page.evaluate('''async game=>{const db=await new Promise(r=>{const q=indexedDB.open('property-empire-saves',1);q.onupgradeneeded=()=>q.result.createObjectStore('saves');q.onsuccess=()=>r(q.result)});await new Promise(r=>{const t=db.transaction('saves','readwrite');t.objectStore('saves').put({savedAt:Date.now(),game},'current');t.oncomplete=r});db.close()}''',game)
            page.get_by_role('button',name='Continue Saved Game',exact=True).click()
            expect(page.get_by_role('region',name='Match overview')).to_be_visible()
        load(fixtures['animatedRoll'])
        page.get_by_role('button',name='Roll dice',exact=True).click()
        if os.environ.get('EMPIRE_TEST_REDUCED_ONLY'):
            speed('reduced')
            expect(page.locator('#event-popup')).to_be_visible()
            expect(page.locator('#event-popup')).to_contain_text('Pier Avenue')
            page.get_by_role('button',name='Main menu',exact=True).click()
            speed('normal');load(fixtures['chance'])
            page.get_by_role('button',name='Roll dice',exact=True).click();speed('reduced')
            expect(page.locator('#event-popup')).to_be_visible()
            expect(page.locator('#event-popup')).to_contain_text('Chance')
            print(json.dumps({'result':'PASS','flows':['reduced motion during purchase move','reduced motion during card move']}))
            raise SystemExit(0)
        expect(page.locator('#event-popup')).to_be_hidden()
        expect(page.locator('#turn-panel button')).to_have_count(0)
        page.clock.fast_forward(950)
        expect(page.locator('#event-popup')).to_be_hidden()
        page.clock.fast_forward(2000)
        expect(page.locator('#event-popup')).to_contain_text('Pier Avenue',timeout=15000)
        expect(page.locator('#event-popup')).to_be_visible()
        page.screenshot(path=str(out/'arrival-purchase-desktop.png'),animations='disabled')
        page.get_by_role('button',name='Main menu',exact=True).click()
        load(fixtures['chance'])
        page.get_by_role('button',name='Roll dice',exact=True).click()
        expect(page.locator('#event-popup')).to_be_hidden()
        page.clock.fast_forward(5000)
        expect(page.locator('#event-popup')).to_contain_text('Chance',timeout=15000)
        expect(page.locator('#event-popup')).to_contain_text('2× station rent: $50')
        expect(page.locator('#event-popup')).to_contain_text('South Station')
        expect(page.get_by_role('button',name='Trade',exact=True)).to_be_disabled()
        page.screenshot(path=str(out/'chance-card-desktop.png'),animations='disabled')
        page.get_by_role('button',name='Continue',exact=True).click()
        page.get_by_role('button',name='Main menu',exact=True).click()
        load(fixtures['community'])
        page.get_by_role('button',name='Roll dice',exact=True).click()
        page.clock.fast_forward(3000)
        expect(page.locator('#event-popup')).to_contain_text('Community Chest',timeout=15000)
        expect(page.locator('#event-popup')).to_contain_text('+$200')
        page.set_viewport_size({'width':390,'height':844});page.wait_for_timeout(300)
        popup=page.locator('#event-popup').bounding_box();stage=page.locator('#stage').bounding_box()
        assert popup['y']>=stage['y'] and popup['y']+popup['height']<=stage['y']+stage['height']+1
        page.screenshot(path=str(out/'community-card-mobile.png'),full_page=True,animations='disabled')
        page.get_by_role('button',name='Continue',exact=True).click()
        page.get_by_role('button',name='Cards',exact=True).click()
        expect(page.locator('#dialog .deck-card')).to_have_count(32)
        expect(page.locator('#dialog')).to_contain_text('Pay $40 for each house')
        page.get_by_role('button',name='Close dialog',exact=True).click()
        if ':5173' in base:
            page.clock.resume()
            page.evaluate('(g)=>window.presentationFixture=g',fixtures['animatedRoll'])
            probe=page.evaluate(r'''async()=>{
              const {BoardView}=await import('/src/board-view.ts');const {applyAction}=await import('/@fs/D:/Other/Monopoly%20Game/PropertyEmpire3D/packages/core/engine.ts');
              const host=document.createElement('div');Object.assign(host.style,{position:'fixed',width:'800px',height:'500px'});document.body.append(host);
              const view=new BoardView(host,()=>{},{speed:'normal',quality:'low',sound:false});
              const fixture=window.presentationFixture;view.update(fixture,false);
              const initialBuildings=view.buildings.size,landmarks=view.assets.landmarks.size;
              const next=applyAction(fixture,'human',{type:'roll'});view.update(next);
              const busy=view.isAnimating;await new Promise((resolve,reject)=>{view.onSettled=resolve;setTimeout(()=>reject(new Error('Playback did not settle')),15000)});
              const after=view.isAnimating;const positions=view.dice.map(d=>({x:d.position.x,z:d.position.z}));
              const developed=structuredClone(next);developed.properties[9].level=2;view.update(developed,false);const houses=view.buildings.get(9).group.children.length;
              developed.properties[9].level=5;view.update(developed,false);const hotel=view.buildings.get(9).group.children.length;
              developed.properties[9].level=0;view.update(developed,false);const sold=view.buildings.size;
              view.renderer.setAnimationLoop(null);view.controls.dispose();view.renderer.dispose();host.remove();
              return{initialBuildings,landmarks,busy,after,positions,houses,hotel,sold};
            }''')
            assert probe['initialBuildings']==0 and probe['landmarks']==0,probe
            assert probe['busy'] and not probe['after'],probe
            assert probe['houses']==2 and probe['hotel']==1 and probe['sold']==0,probe
            print(json.dumps({'scene_probe':probe}))
        assert not errors,errors
        print(json.dumps({'result':'PASS','flows':['arrival popup timing','chance rent annotations','community cash card','card catalog','mobile card layout'],'page_errors':errors}))
    finally:browser.close()
