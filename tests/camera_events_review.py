"""Cursor anchor, stable scrolling and actual game popup interactions."""
import os,json
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
out=Path('test-artifacts');fixtures=json.loads((out/'browser-fixtures.json').read_text())
base=os.environ.get('EMPIRE_URL','http://127.0.0.1:5173')
with sync_playwright() as p:
    browser=p.chromium.launch(channel='chrome',headless=True,args=['--use-angle=swiftshader'])
    try:
        page=browser.new_page(viewport={'width':1440,'height':960});errors=[]
        page.on('pageerror',lambda error:errors.append(str(error)))
        page.goto(base);page.wait_for_load_state('networkidle')
        def load(game):
            page.evaluate('''async game=>{const db=await new Promise(r=>{const q=indexedDB.open('property-empire-saves',1);q.onupgradeneeded=()=>q.result.createObjectStore('saves');q.onsuccess=()=>r(q.result)});await new Promise(r=>{const t=db.transaction('saves','readwrite');t.objectStore('saves').put({savedAt:Date.now(),game},'current');t.oncomplete=r});db.close()}''',game)
            page.get_by_role('button',name='Continue Saved Game',exact=True).click()
        load(fixtures['purchase'])
        expect(page.locator('#event-popup')).to_contain_text('Copper Lane')
        expect(page.locator('#turn-panel button')).to_have_count(0)
        page.wait_for_timeout(1200);page.screenshot(path=str(out/'event-purchase-desktop.png'))
        page.get_by_role('button',name='Close event popup',exact=True).click()
        expect(page.locator('#turn-panel button')).to_have_count(2)
        page.get_by_role('button',name='Buy for $60',exact=True).click()
        expect(page.locator('#event-popup')).to_contain_text('Property purchased')
        expect(page.locator('#event-popup')).to_contain_text('$60')
        page.set_viewport_size({'width':390,'height':390})
        page.wait_for_timeout(200)
        popup=page.locator('#event-popup').bounding_box();stage=page.locator('#stage').bounding_box()
        assert popup['y']+popup['height']<=stage['y']+stage['height'],'Notice clipped on short mobile screen'
        page.locator('#event-popup').evaluate('(element)=>element.scrollTop=element.scrollHeight')
        detail=page.locator('#event-popup>p').bounding_box()
        assert detail['y']+detail['height']<=popup['y']+popup['height'],'Notice detail unreachable'
        page.get_by_role('button',name='Close event popup',exact=True).click()
        for width,height in [(1440,960),(1024,650),(1440,600)]:
            page.set_viewport_size({'width':width,'height':height});page.wait_for_timeout(200)
            before=page.locator('#stage').bounding_box()
            page.mouse.move(width-80,height//2);page.mouse.wheel(0,700);page.wait_for_timeout(150)
            assert page.evaluate('scrollY')==0,'Game page scrolled away'
            after=page.locator('#stage').bounding_box()
            assert abs(before['y']-after['y'])<1
            assert after['y']+after['height']<=height,'Board clipped by short viewport'
        page.set_viewport_size({'width':390,'height':844})
        page.locator('#left').scroll_into_view_if_needed();page.wait_for_timeout(200)
        rect=page.locator('#stage').bounding_box();assert rect['y']>=0 and rect['y']+rect['height']<=844
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
        page.get_by_role('button',name='Main menu',exact=True).click()
        load(fixtures['incomingTrade'])
        expect(page.locator('#event-popup')).to_contain_text('Ben gives')
        page.get_by_role('button',name='Accept trade',exact=True).click()
        expect(page.locator('.portfolio')).to_contain_text('Copper Lane')
        page.get_by_role('button',name='Main menu',exact=True).click()
        load(fixtures['auction'])
        page.get_by_role('button',name='Send to auction',exact=True).click()
        expect(page.locator('#event-popup')).to_contain_text('Auction: Copper Lane')
        page.get_by_label('Your bid',exact=True).fill('10')
        page.get_by_role('button',name='Place bid',exact=True).click()
        expect(page.locator('#player-ledger')).to_contain_text('$1,490',timeout=15000)
        page.get_by_role('button',name='Main menu',exact=True).click()
        rent=json.loads(json.dumps(fixtures['management']));rent['phase']='roll';rent['current']=1;rent['properties'][9]['owner']='human'
        load(rent)
        expect(page.locator('#event-popup')).to_contain_text('Rent collected',timeout=15000)
        expect(page.locator('#event-popup')).to_contain_text('+$8')
        page.screenshot(path=str(out/'event-rent-mobile.png'),full_page=True)
        page.get_by_role('button',name='Close event popup',exact=True).click()
        assert not errors,errors
        if ':5173' in base:
            page.set_viewport_size({'width':1440,'height':960})
            result=page.evaluate(r'''async()=>{
              const source=await(await fetch('/src/board-view.ts')).text(),threeUrl=source.match(/import \* as THREE from \"([^\"]+)\"/)[1];
              const [{BoardView},T]=await Promise.all([import('/src/board-view.ts'),import(threeUrl)]);
              const host=document.createElement('div');Object.assign(host.style,{position:'fixed',left:'20px',top:'20px',width:'800px',height:'500px',zIndex:'100'});document.body.append(host);
              const view=new BoardView(host,()=>{},{speed:'reduced',quality:'low',sound:false});view.reset();
              const camera=view.camera,controls=view.controls,canvas=host.querySelector('canvas'),rect=canvas.getBoundingClientRect();
              const mouse=new T.Vector2(.55,.1),ray=new T.Raycaster();ray.setFromCamera(mouse,camera);
              const anchor=ray.ray.intersectPlane(new T.Plane(new T.Vector3(0,1,0),-.8),new T.Vector3());
              const oldDistance=camera.position.distanceTo(controls.target),oldTarget=controls.target.clone();
              canvas.dispatchEvent(new WheelEvent('wheel',{clientX:rect.x+(mouse.x+1)*rect.width/2,clientY:rect.y+(1-mouse.y)*rect.height/2,deltaY:-120,bubbles:true,cancelable:true}));controls.update();
              const screen=anchor.clone().project(camera),drift=Math.hypot(screen.x-mouse.x,screen.y-mouse.y),newDistance=camera.position.distanceTo(controls.target);
              const targetBeforeResize=controls.target.clone();host.style.height='420px';view.resize();const resizeTargetDrift=targetBeforeResize.distanceTo(controls.target);
              view.renderer.setAnimationLoop(null);controls.dispose();view.renderer.dispose();host.remove();
              return{drift,oldDistance,newDistance,resizeTargetDrift,targetMoved:oldTarget.distanceTo(controls.target)};
            }''')
            assert result['drift']<.0001 and result['resizeTargetDrift']<.0001,result
            assert result['newDistance']<result['oldDistance'] and result['targetMoved']>.01,result
            print(json.dumps({'cursor_anchor':result}))
        print(json.dumps({'result':'PASS','page_errors':errors,'flows':['purchase popup and dismissal','purchase confirmation','fixed desktop scrolling','sticky mobile board','incoming trade popup','auction popup','rent collection popup']}))
    finally:browser.close()
