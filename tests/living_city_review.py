"""Settled, readable single receipts and a real Three city/property integration probe."""
import copy,json,os,time
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
        page.clock.install();page.goto(base);page.wait_for_load_state('networkidle')
        page.clock.pause_at((page.evaluate('Date.now()')+2000)/1000)
        def load(game):
            page.evaluate('''async game=>{const db=await new Promise(r=>{const q=indexedDB.open('property-empire-saves',1);q.onupgradeneeded=()=>q.result.createObjectStore('saves');q.onsuccess=()=>r(q.result)});await new Promise(r=>{const t=db.transaction('saves','readwrite');t.objectStore('saves').put({savedAt:Date.now(),game},'current');t.oncomplete=r});db.close()}''',game)
            page.get_by_role('button',name='Continue Saved Game',exact=True).click()
            expect(page.get_by_role('region',name='Match overview')).to_be_visible()
        def menu():page.get_by_role('button',name='Main menu',exact=True).click()
        load(fixtures['animatedRoll']);page.get_by_role('button',name='Roll dice',exact=True).click()
        expect(page.locator('#event-popup')).to_be_hidden();page.clock.fast_forward(3000)
        expect(page.locator('#event-popup .title-deed')).to_be_visible()
        page.locator('#event-popup').get_by_role('button',name='Buy for $120',exact=True).click()
        expect(page.locator('.moment-purchase .moment-copy')).to_contain_text('Ada owns Pier Avenue')
        expect(page.locator('#event-popup')).to_be_hidden();expect(page.locator('.feedback-label')).to_have_count(0)
        # Jump to the reading checkpoint; rendering every synthetic animation
        # frame queues GPU work in SwiftShader without testing receipt timing.
        page.clock.fast_forward(400)
        # Playwright's timer clock and the CSS animation timeline are separate.
        page.locator('.moment-copy').evaluate('e=>e.getAnimations().forEach(a=>{a.pause();a.currentTime=1000})')
        page.clock.run_for(35)
        page.screenshot(path=str(out/'living-purchase-board.png'),animations='disabled')
        page.clock.fast_forward(1300)
        expect(page.locator('.moment-purchase')).to_be_visible()
        appearance=page.locator('.moment-copy').evaluate("e=>({opacity:getComputedStyle(e).opacity,name:getComputedStyle(e).animationName,duration:getComputedStyle(e).animationDuration,current:e.getAnimations().map(a=>a.currentTime)})")
        assert appearance['name']=='readable-moment' and appearance['duration']=='2.2s',appearance
        page.locator('.moment-copy').evaluate('e=>e.getAnimations().forEach(a=>a.currentTime=1800)')
        assert float(page.locator('.moment-copy').evaluate('e=>getComputedStyle(e).opacity'))>.99
        page.clock.fast_forward(500);expect(page.locator('.moment-purchase')).to_have_count(0)
        menu();page.emulate_media(reduced_motion='no-preference')
        rent=copy.deepcopy(fixtures['animatedRoll']);rent['current']=1;rent['properties'][9]['owner']='human';load(rent)
        page.clock.fast_forward(1000);expect(page.locator('.feedback-label')).to_have_count(0)
        page.emulate_media(reduced_motion='reduce');page.clock.fast_forward(3000)
        expect(page.locator('.feedback-label')).to_contain_text('Ben pays Ada')
        expect(page.locator('.feedback-label')).to_be_visible();expect(page.locator('#event-popup')).to_be_hidden()
        assert page.locator('.event-feedback').evaluate("e=>getComputedStyle(e).display!=='none'")
        assert page.locator('.feedback-particle').first.evaluate("e=>getComputedStyle(e).display==='none'")
        page.clock.run_for(35)
        page.screenshot(path=str(out/'living-reduced-rent.png'),animations='disabled')
        menu();page.emulate_media(reduced_motion='no-preference');load(fixtures['community'])
        page.get_by_role('button',name='Roll dice',exact=True).click();page.clock.fast_forward(3000)
        expect(page.locator('#event-popup')).to_contain_text('Community Chest')
        page.locator('#event-popup').get_by_role('button',name='Continue',exact=True).click()
        expect(page.locator('#event-popup.event-notice')).to_contain_text('+$200')
        expect(page.locator('.moment-card .moment-copy')).to_have_count(0);expect(page.locator('.feedback-label')).to_have_count(0)
        page.locator('#event-popup').hover();page.clock.fast_forward(1500)
        expect(page.locator('#event-popup')).to_be_visible()
        page.mouse.move(5,5);page.clock.fast_forward(800);expect(page.locator('#event-popup')).to_be_hidden()
        menu()
        # Use a fresh, unmocked browser clock for the real reading-time check.
        page.close();page=browser.new_page(viewport={'width':1440,'height':900})
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.add_init_script("localStorage.setItem('empire-settings',JSON.stringify({speed:'normal',quality:'low',sound:false}))")
        page.goto(base);page.wait_for_load_state('networkidle');load(fixtures['purchase'])
        purchased_at=time.monotonic()
        page.get_by_role('button',name='Buy for $60',exact=True).click()
        page.wait_for_function("document.querySelector('.moment-copy')&&Number(getComputedStyle(document.querySelector('.moment-copy')).opacity)>.99")
        remaining=1000-(time.monotonic()-purchased_at)*1000
        if remaining>0:page.wait_for_timeout(remaining)
        expect(page.locator('.moment-purchase .moment-copy')).to_contain_text('Ada owns Copper Lane')
        assert float(page.locator('.moment-copy').evaluate('e=>getComputedStyle(e).opacity'))>.99
        remaining=2600-(time.monotonic()-purchased_at)*1000
        if remaining>0:page.wait_for_timeout(remaining)
        expect(page.locator('.moment-purchase')).to_have_count(0)
        menu()
        probe=None
        if ':5173' in base:
            probe=page.evaluate(r'''async fixtures=>{
              const source=await(await fetch('/src/board-view.ts')).text(),threeURL=source.match(/import \* as THREE from \"([^\"]+)\"/)[1];
              const coreURL=source.match(/from \"([^\"]+packages\/core\/board[^\"]+)\"/)[1].replace(/board\.ts.*$/,'index.ts');
              const [T,{BoardView},{applyAction}]=await Promise.all([import(threeURL),import('/src/board-view.ts'),import(coreURL)]);
              const host=document.createElement('div');host.id='living-probe';Object.assign(host.style,{position:'fixed',inset:'0',zIndex:'100',background:'#F6F1E7'});
              const stage=document.createElement('div');Object.assign(stage.style,{width:'100%',height:'100%',position:'relative'});host.append(stage);document.body.append(host);
              const board=new BoardView(stage,()=>{},{speed:'normal',quality:'low',sound:false});board.renderer.setAnimationLoop(null);board.update(fixtures.management,false);
              const initialBuildings=board.buildings.size,districts=board.assets.tiles.filter(t=>t.parent.children.some(c=>Object.hasOwn(c.userData,'district'))).length;
              const face=board.assets.tiles[1].parent.children.find(c=>c.material?.map),ctx=face.material.map.image.getContext('2d');
              const border=Array.from(ctx.getImageData(16,256,1,1).data),grass=Array.from(ctx.getImageData(120,120,1,1).data);
              const car=board.scene.getObjectByName('city-traffic'),person=board.scene.getObjectByName('city-pedestrians'),aircraft=board.scene.getObjectByName('city-aircraft');
              board.cityLife.update(1000);const before={cars:Array.from(car.instanceMatrix.array),people:Array.from(person.instanceMatrix.array),plane:aircraft.position.toArray()};
              for(let i=1;i<=30;i++)board.cityLife.update(1000+i*70);
              const changed={cars:before.cars.some((v,i)=>v!==car.instanceMatrix.array[i]),people:before.people.some((v,i)=>v!==person.instanceMatrix.array[i]),plane:before.plane.some((v,i)=>v!==aircraft.position.toArray()[i])};
              const built=applyAction(fixtures.management,'human',{type:'build',property:1});board.update(built);const effect=board.propertyEffects.get(1),height=effect.growing[0].scale.y;
              const growth={before:height,kind:effect.motion.kind,blocksTurn:board.isAnimating};effect.start-=600;board.frame();growth.during=effect.growing[0].scale.y;
              effect.start-=1000;board.frame();growth.after=board.buildings.get(1).group.children[0].scale.y;
              board.update(fixtures.purchase,false);const bought=applyAction(fixtures.purchase,'human',{type:'buy'});board.update(bought);const ownership=board.propertyEffects.get(1)?.motion.kind;
              board.frame();board.renderer.render(board.scene,board.camera);
              window.livingProbe={board,host,setCycle(seconds){board.cityLife.elapsed=seconds*1000;board.cityLife.resetClock();board.cityLife.update(5000);board.renderer.shadowMap.needsUpdate=true;board.frame();board.renderer.render(board.scene,board.camera);return{status:board.cityLife.status,rain:board.scene.getObjectByName('city-rain').visible};}};
              return{initialBuildings,districts,border,grass,changed,growth,ownership};
            }''',fixtures)
            assert probe['initialBuildings']==0 and probe['districts']==28,probe
            assert probe['border'][:3]==[184,117,56] and probe['grass'][1]>probe['grass'][0],probe
            assert all(probe['changed'].values()),probe
            assert probe['growth']['kind']=='build' and not probe['growth']['blocksTurn'],probe
            assert probe['growth']['before']<.01 and .5<probe['growth']['during']<1 and probe['growth']['after']==1,probe
            assert probe['ownership']=='ownership',probe
            for name,seconds in [('day',0),('night-rain',130),('dawn',195)]:
                cycle=page.evaluate('s=>livingProbe.setCycle(s)',seconds)
                if name=='night-rain':assert cycle['status']=='Night · Rain' and cycle['rain'],cycle
                page.locator('#living-probe canvas').screenshot(path=str(out/f'living-city-{name}.png'))
            page.evaluate("livingProbe.board.focus(1);livingProbe.board.renderer.render(livingProbe.board.scene,livingProbe.board.camera)")
            page.locator('#living-probe canvas').screenshot(path=str(out/'landscaped-property-closeup.png'))
            page.evaluate("livingProbe.board.cityLife.configure(true,'low');livingProbe.board.cityLife.update(6000)")
            assert page.evaluate("livingProbe.board.cityLife.status==='Day · Clear'&&!livingProbe.board.scene.getObjectByName('city-rain').visible")
            page.evaluate("livingProbe.board.renderer.dispose();livingProbe.host.remove()")
        assert not errors,errors
        print(json.dumps({'result':'PASS','probe':probe,'flows':['one readable purchase receipt','OS reduced-motion rent remains visible','one card income receipt','hover pauses reading timer','live city and property renderer'],'page_errors':errors}))
    finally:browser.close()
