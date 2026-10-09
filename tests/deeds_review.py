"""Visual and interaction checks for illustrated deeds and board properties."""
import json, os
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

out=Path('test-artifacts')
fixture=json.loads((out/'browser-fixtures.json').read_text())['management']
for index in [6,8,9,5,15,25,12,28,31,32,34,37,39]:
    fixture['properties'][index]['owner']='human'
for index in [31,32,34]:
    fixture['properties'][index]['level']=2
for index in [37,39]:
    fixture['properties'][index]['level']=5
fixture['houses']=26
fixture['hotels']=10
with sync_playwright() as p:
    browser=p.chromium.launch(channel='chrome',headless=True,args=['--use-angle=swiftshader'])
    context=browser.new_context(viewport={'width':1440,'height':960})
    page=context.new_page()
    errors=[]
    page.on('pageerror',lambda error:errors.append(str(error)))
    page.goto(os.environ.get('EMPIRE_URL','http://127.0.0.1:5173'))
    page.wait_for_load_state('networkidle')
    page.wait_for_function('document.fonts.status === "loaded"')
    expect(page.locator('.context-error')).to_have_count(0)
    page.screenshot(path=str(out/'property-board.png'),full_page=True)
    page.evaluate('''async game=>{
      const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('property-empire-saves',1);r.onupgradeneeded=()=>r.result.createObjectStore('saves');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
      await new Promise((resolve,reject)=>{const t=db.transaction('saves','readwrite');t.objectStore('saves').put({savedAt:Date.now(),game},'current');t.oncomplete=resolve;t.onerror=()=>reject(t.error);});db.close();
    }''',fixture)
    page.get_by_role('button',name='Continue Saved Game',exact=True).click()
    expect(page.locator('#game-info')).to_contain_text('Ada')
    def select(name):
        if page.locator('#dialog').is_visible():page.get_by_role('button',name='Close dialog',exact=True).click()
        page.get_by_role('button',name='Properties',exact=True).click()
        page.get_by_role('dialog').get_by_role('button',name=name,exact=False).click()
        expect(page.locator('.title-deed')).to_be_visible()
    page.get_by_role('button',name='Properties',exact=True).click()
    expect(page.locator('.deed-preview')).to_have_count(28)
    page.screenshot(path=str(out/'deed-gallery-desktop.png'),full_page=True)
    page.get_by_role('dialog').get_by_role('button',name='Copper Lane',exact=False).click()
    expect(page.locator('.deed-figures')).to_contain_text('$4')
    expect(page.locator('.deed-rents .current-rent')).to_contain_text('Full color group')
    page.screenshot(path=str(out/'deed-copper-desktop.png'),full_page=True)
    page.get_by_role('button',name='Focus this property',exact=True).click()
    page.wait_for_timeout(300)
    page.screenshot(path=str(out/'property-close-up.png'),full_page=True)
    page.get_by_role('button',name='Reset camera',exact=True).click()
    select('Copper Lane')
    page.get_by_role('button',name='Mortgage',exact=True).click()
    expect(page.locator('.mortgage-stamp')).to_have_text('Mortgaged')
    expect(page.locator('.deed-figures')).to_contain_text('$0')
    page.get_by_role('button',name='Lift mortgage ($33)',exact=True).click()
    expect(page.locator('.mortgage-stamp')).to_have_count(0)
    for name,amount in [('South Station','$100'),('Solar Works','10×'),('Summit Plaza','$2,000'),('Harbor Walk','$12')]:
        select(name)
        expect(page.locator('.deed-figures')).to_contain_text(amount)
        expect(page.locator('#dialog svg.property-art')).to_have_count(1)
        page.screenshot(path=str(out/f'deed-{name.lower().replace(" ","-")}.png'),full_page=True)
    for width,height in [(390,844),(375,812),(844,390),(768,1024)]:
        page.set_viewport_size({'width':width,'height':height})
        page.wait_for_timeout(200)
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
        if width==390:
            page.locator('.title-deed').screenshot(path=str(out/'deed-mobile.png'))
            page.get_by_role('button',name='Close dialog',exact=True).click()
            page.get_by_role('button',name='Properties',exact=True).click()
            page.screenshot(path=str(out/'deed-gallery-mobile.png'),full_page=True)
            page.get_by_role('dialog').get_by_role('button',name='Copper Lane',exact=False).click()
    assert not errors,errors
    print(json.dumps({'result':'PASS','deeds':28,'page_errors':errors,'flows':['illustrated gallery','color-group rent','mortgage status','station rent','utility multiplier','hotel rent','property focus','responsive layouts']}))
    browser.close()
