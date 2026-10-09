"""Observer activities keep bots moving; miniature close-ups and geometry constraints."""
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
        page.clock.install();page.goto(base);page.wait_for_load_state('networkidle')
        # Freeze on the menu before a restored bot turn can start. Numeric clock times are seconds.
        page.clock.pause_at((page.evaluate('Date.now()')+2000)/1000)
        def load(game):
            page.evaluate('''async game=>{const db=await new Promise(r=>{const q=indexedDB.open('property-empire-saves',1);q.onupgradeneeded=()=>q.result.createObjectStore('saves');q.onsuccess=()=>r(q.result)});await new Promise(r=>{const t=db.transaction('saves','readwrite');t.objectStore('saves').put({savedAt:Date.now(),game},'current');t.oncomplete=r});db.close()}''',game)
            page.get_by_role('button',name='Continue Saved Game',exact=True).click()
            expect(page.get_by_role('region',name='Match overview')).to_be_visible()
        def menu():page.get_by_role('button',name='Main menu',exact=True).click()
        g=json.loads(json.dumps(fixtures['community']));g['current']=1;g['players'][0]['position']=0;g['players'][1]['position']=24;load(g)
        page.clock.fast_forward(1000)
        expect(page.locator('#event-popup')).to_be_hidden();page.clock.fast_forward(3000)
        expect(page.locator('.event-observer')).to_contain_text('Ben · Community Chest');expect(page.locator('.event-observer')).to_contain_text('+$200')
        expect(page.locator('.event-observer')).to_have_attribute('role','status')
        expect(page.locator('.event-observer button')).to_have_count(1)
        page.clock.run_for(50)
        page.screenshot(path=str(out/'opponent-community.png'),animations='disabled')
        page.set_viewport_size({'width':1440,'height':600});page.clock.fast_forward(100)
        observer=page.locator('.event-observer');expect(observer).to_be_visible()
        assert observer.evaluate("e=>getComputedStyle(e).pointerEvents==='auto'")
        assert observer.evaluate('e=>e.scrollHeight>e.clientHeight')
        observer.hover();page.mouse.wheel(0,350);page.clock.fast_forward(100)
        assert observer.evaluate('e=>e.scrollTop>0'),'Opponent card annotations cannot be scrolled'
        page.set_viewport_size({'width':1440,'height':960})
        observer.hover();page.clock.fast_forward(5000)
        expect(observer).to_contain_text('Ben · Community Chest')
        expect(page.locator('#player-ledger .player-row').nth(1)).to_contain_text('$1,500')
        page.clock.fast_forward(5000);page.clock.fast_forward(1000);expect(observer).to_be_visible()
        expect(page.locator('#player-ledger')).to_contain_text('$1,700')
        page.mouse.move(5,5);expect(page.get_by_role('button',name='Roll dice',exact=True)).to_be_enabled()
        page.get_by_role('button',name='Roll dice',exact=True).click();page.clock.fast_forward(3000)
        expect(page.locator('#event-popup')).to_contain_text('Gallery Street');expect(page.get_by_role('button',name='Buy for $140',exact=True)).to_be_visible()
        menu();g=json.loads(json.dumps(fixtures['animatedRoll']));g['current']=1;load(g)
        page.clock.fast_forward(1000);expect(page.locator('#event-popup')).to_be_hidden();page.clock.fast_forward(3000)
        expect(page.locator('#event-popup')).to_be_hidden()
        expect(page.locator('.moment-purchase')).to_have_count(0)
        page.clock.fast_forward(220)
        page.screenshot(path=str(out/'opponent-arrival.png'),animations='disabled')
        page.clock.fast_forward(1000);expect(page.locator('.moment-purchase')).to_contain_text('Ben owns Pier Avenue');expect(page.locator('.moment-purchase')).to_contain_text('$120');expect(page.locator('#event-popup')).to_be_hidden()
        expect(page.locator('#player-ledger')).to_contain_text('$1,380')
        page.clock.fast_forward(220)
        page.screenshot(path=str(out/'opponent-purchase.png'),animations='disabled')
        page.clock.fast_forward(5000);expect(page.locator('.moment-purchase')).to_be_visible();page.clock.fast_forward(3200);expect(page.locator('.moment-purchase')).to_have_count(0)
        menu();g=json.loads(json.dumps(fixtures['management']));g['properties'][1]['level']=g['properties'][3]['level']=4;g['houses']=24
        for i in [6,8,9]:g['properties'][i]['owner']='bot';g['properties'][i]['level']=5
        g['hotels']=9;load(g)
        page.get_by_role('button',name='Inspect your Copper Lane',exact=True).click();page.get_by_role('button',name='Focus this property',exact=True).click();page.clock.fast_forward(100)
        page.screenshot(path=str(out/'houses-board-closeup.png'))
        page.get_by_role('button',name='Properties',exact=True).click();page.get_by_role('dialog').get_by_role('button',name='Pier Avenue',exact=False).click()
        page.get_by_role('button',name='Focus this property',exact=True).click();page.clock.fast_forward(100);page.screenshot(path=str(out/'hotel-board-closeup.png'))
        if ':5173' in base:
            result=page.evaluate(r'''async()=>{
              const source=await(await fetch('/src/scene-assets.ts')).text(),url=source.match(/import \* as THREE from \"([^\"]+)\"/)[1];const [T,{SceneAssets,TOKEN_NAMES}]=await Promise.all([import(url),import('/src/scene-assets.ts')]);
              const assets=new SceneAssets(),scene=new T.Scene();scene.background=new T.Color('#F6F1E7');scene.add(new T.HemisphereLight('#fff5db','#69877d',3));const light=new T.DirectionalLight('#fff2d4',4);light.position.set(4,10,6);scene.add(light);
              const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setSize(1200,800);renderer.setPixelRatio(1);renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
              const host=document.createElement('div');host.id='miniature-sheet';Object.assign(host.style,{position:'fixed',inset:'0',zIndex:'100',background:'#F6F1E7'});host.append(renderer.domElement);document.body.append(host);
              const camera=new T.PerspectiveCamera(36,1.5,.1,100);camera.position.set(8,10,13);camera.lookAt(0,.5,.6);camera.zoom=1.6;camera.updateProjectionMatrix();
              const floor=new T.Mesh(new T.PlaneGeometry(25,25),new T.MeshStandardMaterial({color:'#F6F1E7',roughness:.8}));floor.rotation.x=-Math.PI/2;floor.position.y=-.05;scene.add(floor);
              const label=(text,x,z)=>{const c=document.createElement('canvas');c.width=512;c.height=80;const ctx=c.getContext('2d');ctx.font='800 38px Nunito';ctx.fillStyle='#24443F';ctx.textAlign='center';ctx.fillText(text,256,53);const map=new T.CanvasTexture(c),sprite=new T.Sprite(new T.SpriteMaterial({map,depthTest:false}));sprite.position.set(x,1.12,z);sprite.scale.set(1.55,.245,1);scene.add(sprite);};
              const colors=['#4798D4','#EA7774','#91AD68','#B293CA','#E0B46A','#77BCC9','#D69BAD','#AEC1D3'],sizes=[];
              for(let i=0;i<8;i++){const token=assets.makeToken(i,colors[i]);token.position.set((i%4-1.5)*2.2,0,Math.floor(i/4)*2.4-2.4);scene.add(token);label(TOKEN_NAMES[i],token.position.x,token.position.z);sizes.push(new T.Box3().setFromObject(token).getSize(new T.Vector3()).toArray());}
              const house=assets.house(1),hotel=assets.house(5),houseSize=new T.Box3().setFromObject(house).getSize(new T.Vector3()).toArray(),hotelSize=new T.Box3().setFromObject(hotel).getSize(new T.Vector3()).toArray();
              for(let i=0;i<4;i++){const h=assets.house(1);h.scale.setScalar(2.8);h.position.set(-2.1+(i-1.5)*.22*2.8,0,2.6);scene.add(h);}hotel.scale.setScalar(1.7);hotel.position.set(2.2,0,2.6);scene.add(hotel);label('Four houses',-2.1,3.25);label('Hotel',2.2,3.25);renderer.render(scene,camera);window.miniatureRenderer=renderer;return{sizes,houseSize,hotelSize};
            }''')
            assert result['houseSize'][0]<=.22 and result['hotelSize'][0]<.7 and result['hotelSize'][1]>.6,result
            assert all(s[0]<.8 and s[2]<.8 for s in result['sizes']),result
            page.locator('#miniature-sheet canvas').screenshot(path=str(out/'miniatures-contact-sheet.png'))
            page.evaluate("miniatureRenderer.dispose();document.getElementById('miniature-sheet').remove()")
            print(json.dumps({'miniature_geometry':result}),flush=True)
        assert not errors,errors
        print(json.dumps({'result':'PASS','flows':['opponent card after arrival','observer card does not pause bots','own purchase preempts observer card','opponent property arrival and purchase','observer auto-dismiss','house and hotel board closeups'],'page_errors':errors}))
    finally:browser.close()
