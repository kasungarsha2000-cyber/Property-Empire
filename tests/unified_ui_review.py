"""Unified match rail, complete deeds and stable roll geometry in real Chrome."""
import copy,json,os
from pathlib import Path
from playwright.sync_api import sync_playwright,expect

out=Path('test-artifacts')
fixtures=json.loads((out/'browser-fixtures.json').read_text(encoding='utf-8'))
with sync_playwright() as p:
    browser=p.chromium.launch(channel='chrome',headless=True,args=['--use-angle=swiftshader'])
    try:
        page=browser.new_page(viewport={'width':1440,'height':720});errors=[];measurements=[]
        page.on('pageerror',lambda error:errors.append(str(error)))
        page.add_init_script("localStorage.setItem('empire-settings',JSON.stringify({speed:'normal',quality:'low',sound:false}))")
        page.clock.install();page.goto(os.environ.get('EMPIRE_URL','http://127.0.0.1:5173'))
        page.wait_for_load_state('networkidle');page.wait_for_function('document.fonts.status === "loaded"')
        page.clock.pause_at((page.evaluate('Date.now()')+2000)/1000)
        def load(game):
            page.evaluate('''async game=>{const db=await new Promise(r=>{const q=indexedDB.open('property-empire-saves',1);q.onupgradeneeded=()=>q.result.createObjectStore('saves');q.onsuccess=()=>r(q.result)});await new Promise(r=>{const t=db.transaction('saves','readwrite');t.objectStore('saves').put({savedAt:Date.now(),game},'current');t.oncomplete=r});db.close()}''',game)
            page.get_by_role('button',name='Continue Saved Game',exact=True).click()
            expect(page.get_by_role('region',name='Match overview')).to_be_visible()
            page.clock.fast_forward(100)
        def geometry():
            return page.evaluate("Object.fromEntries(['stage','match-banner','turn-status','game-toolbar'].map(id=>{const r=document.getElementById(id).getBoundingClientRect();return[id,{x:r.x,y:r.y,width:r.width,height:r.height}]}))")
        for width,height in [(1440,720),(1024,650),(768,1024),(390,844)]:
            page.set_viewport_size({'width':width,'height':height});load(fixtures['animatedRoll'])
            before=geometry()
            assert page.locator('#game-toolbar').evaluate("e=>e.parentElement.id==='turn-status'")
            if width>650:
                row=page.locator('#turn-status').evaluate("e=>[...e.children].map(c=>{const r=c.getBoundingClientRect();return {id:c.id||c.className,center:r.y+r.height/2,x:r.x,right:r.right}})")
                assert max(v['center'] for v in row)-min(v['center'] for v in row)<1,row
                assert row[0]['right']<=row[1]['x'] and row[1]['right']<=row[2]['x'],row
                assert before['turn-status']['height']==52,before
            else:assert before['turn-status']['height']==102,before
            page.get_by_role('button',name='Roll dice',exact=True).click();rolling=geometry()
            page.clock.fast_forward(3000);arrived=geometry()
            expect(page.locator('#event-popup .title-deed')).to_be_visible()
            expect(page.locator('#event-popup .deed-rents')).to_contain_text('Hotel')
            expect(page.locator('#event-popup [data-action]').filter(has_text='Buy for $120')).to_have_count(1)
            assert page.locator('#event-popup').evaluate("e=>e.scrollHeight>=e.clientHeight&&e.getBoundingClientRect().width<=document.getElementById('stage').getBoundingClientRect().width")
            for state in [rolling,arrived]:
                for key in before:
                    for dimension in before[key]:
                        assert abs(before[key][dimension]-state[key][dimension])<1,(key,dimension,before,state)
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
            toolbar=page.locator('#game-toolbar').evaluate("e=>({width:e.clientWidth,scroll:e.querySelector('.game-tools').scrollWidth,contained:e.getBoundingClientRect().right<=document.getElementById('turn-status').getBoundingClientRect().right})")
            assert toolbar['contained'],toolbar
            measurements.append({'viewport':[width,height],'geometry':before,'toolbar':toolbar})
            page.screenshot(path=str(out/f'unified-rail-{width}.png'),animations='disabled')
            page.locator('#event-popup').evaluate('e=>e.scrollTop=e.scrollHeight')
            expect(page.locator('#event-popup .deed-costs')).to_be_in_viewport()
            expect(page.locator('#event-popup').get_by_role('button',name='Buy for $120',exact=True)).to_be_in_viewport()
            if width==1440:
                page.locator('#event-popup').evaluate('e=>e.scrollTop=0')
                page.locator('#event-popup .deed-locate').click()
                expect(page.locator('#event-popup')).to_be_hidden()
                expect(page.locator('#turn-panel').get_by_role('button',name='Buy for $120',exact=True)).to_be_visible()
            page.get_by_role('button',name='Main menu',exact=True).click()
        page.set_viewport_size({'width':1440,'height':720});load(fixtures['management'])
        page.get_by_role('button',name='Properties',exact=True).click()
        page.get_by_role('dialog').get_by_role('button',name='Copper Lane',exact=False).click()
        expect(page.locator('#dialog .deed-header h2')).to_have_text('Copper Lane')
        expect(page.locator('.deed-dialog-body')).to_have_attribute('data-deed-index','1')
        expect(page.locator('#dialog .deed-header h2')).to_have_count(1)
        expect(page.locator('#dialog [data-do="read-deed"]')).to_have_count(0)
        expect(page.locator('#dialog .deed-rents')).to_contain_text('Hotel')
        expect(page.locator('#dialog .deed-costs')).to_contain_text('Mortgage value')
        assert page.locator('#dialog .title-deed').evaluate("e=>getComputedStyle(e).borderTopWidth==='0px'&&getComputedStyle(e).boxShadow==='none'")
        page.get_by_role('button',name='Mortgage',exact=True).click()
        expect(page.locator('#dialog .mortgage-stamp')).to_have_text('Mortgaged')
        expect(page.locator('#dialog .deed-figures')).to_contain_text('$0')
        page.get_by_role('button',name='Lift mortgage ($33)',exact=True).click()
        expect(page.locator('#dialog .mortgage-stamp')).to_have_count(0)
        page.get_by_role('button',name='Build',exact=True).click()
        expect(page.locator('#dialog .deed-development')).to_have_text('1 house')
        expect(page.locator('#dialog .deed-rents .current-rent')).to_contain_text('1 house')
        page.get_by_role('button',name='Sell building',exact=True).click()
        expect(page.locator('#dialog .deed-development')).to_have_text('Unimproved')
        page.screenshot(path=str(out/'unified-deed-desktop.png'),animations='disabled')
        page.set_viewport_size({'width':390,'height':844});page.clock.fast_forward(100)
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
        page.screenshot(path=str(out/'unified-deed-mobile.png'),animations='disabled')
        page.locator('.dialog-head [data-do="focus"]').click();expect(page.locator('#dialog')).to_be_hidden()
        page.get_by_role('button',name='Main menu',exact=True).click()
        purchase=copy.deepcopy(fixtures['management']);purchase['phase']='purchase';purchase['pendingProperty']=9;purchase['properties'][9]['owner']=None
        load(purchase);page.get_by_role('button',name='Properties',exact=True).click()
        page.get_by_role('dialog').get_by_role('button',name='Pier Avenue',exact=False).click()
        expect(page.locator('#dialog').get_by_role('button',name='Buy for $120',exact=True)).to_be_enabled()
        page.locator('#dialog').get_by_role('button',name='Buy for $120',exact=True).click()
        expect(page.locator('#dialog .deed-yours')).to_contain_text('Your property')
        expect(page.locator('#dialog').get_by_role('button',name='Mortgage',exact=True)).to_be_visible()
        assert not errors,errors
        print(json.dumps({'result':'PASS','measurements':measurements,'flows':['one desktop control rail','bounded two-row mobile rail','stable roll geometry','full live deed finances','mortgage and lift','header focus','purchase from full deed'],'page_errors':errors}))
    finally:browser.close()
