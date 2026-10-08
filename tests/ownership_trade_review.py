"""Exercise the owned-property portfolio, filters and reviewable visual trading."""
import os,json
from pathlib import Path
from playwright.sync_api import sync_playwright,expect

out=Path('test-artifacts')
g=json.loads((out/'browser-fixtures.json').read_text())['management']
for prop in g['properties']:
    prop.update(owner=None,level=0,mortgaged=False)
for index in [1,6,8,11,39]:
    g['properties'][index]['owner']='human'
for index in [3,9,16,18,19,28]:
    g['properties'][index]['owner']='bot'
for index in [16,18,19]:
    g['properties'][index]['level']=1
g['properties'][39]['mortgaged']=True
g['houses']=29
g['hotels']=12

with sync_playwright() as p:
    browser=p.chromium.launch(channel='chrome',headless=True,args=['--use-angle=swiftshader'])
    context=browser.new_context(viewport={'width':1440,'height':960})
    page=context.new_page()
    errors=[]
    page.on('pageerror',lambda error:errors.append(str(error)))
    page.goto(os.environ.get('EMPIRE_URL','http://127.0.0.1:5173'))
    page.wait_for_load_state('networkidle')
    page.evaluate('''async game=>{
      const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('property-empire-saves',1);r.onupgradeneeded=()=>r.result.createObjectStore('saves');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
      await new Promise((resolve,reject)=>{const t=db.transaction('saves','readwrite');t.objectStore('saves').put({savedAt:Date.now(),game},'current');t.oncomplete=resolve;t.onerror=()=>reject(t.error);});db.close();
    }''',g)
    page.get_by_role('button',name='Continue Saved Game',exact=True).click()
    expect(page.locator('.property-count')).to_have_text('5')
    expect(page.locator('.portfolio')).to_contain_text('Summit Plaza')
    expect(page.locator('.portfolio')).to_contain_text('Mortgaged')
    assert page.locator('#turn-panel').bounding_box()['y']+page.locator('#turn-panel').bounding_box()['height']<=960,'Turn controls below viewport'
    page.get_by_role('button',name='Highlight mine on board',exact=True).click()
    expect(page.get_by_role('button',name='Highlight mine on board')).to_have_attribute('aria-pressed','false')
    page.get_by_role('button',name='Highlight mine on board',exact=True).click()
    page.get_by_role('button',name='Inspect your Copper Lane',exact=True).click()
    expect(page.locator('.deed-yours')).to_have_text('✓ Your property')
    page.wait_for_timeout(1500)
    page.screenshot(path=str(out/'ui-portfolio-desktop.png'))
    page.get_by_role('button',name='Properties',exact=True).click()
    page.get_by_role('button',name='Your properties',exact=True).click()
    expect(page.locator('.deed-gallery .deed-preview')).to_have_count(5)
    expect(page.locator('.deed-gallery')).to_contain_text('Yours')
    page.get_by_role('button',name='Available from bank',exact=True).click()
    expect(page.locator('.deed-gallery .deed-preview')).to_have_count(17)
    page.get_by_role('button',name='Close dialog',exact=True).click()
    oldtown=page.locator('.portfolio-group').filter(has_text='Old town')
    oldtown.get_by_role('button',name='Trade for this property',exact=True).click()
    expect(page.locator('input[name=receive][value="3"]')).to_be_checked()
    expect(page.locator('input[name=receive][value="16"]')).to_be_disabled()
    page.locator('input[name=giveCash]').fill('200')
    expect(page.locator('#trade-live-summary')).to_contain_text('Completes Old town')
    page.screenshot(path=str(out/'ui-trade-builder-desktop.png'))
    page.get_by_role('button',name='Review trade',exact=True).click()
    expect(page.locator('#dialog-title')).to_have_text('Review your trade')
    expect(page.locator('.trade-summary')).to_contain_text('$1,300')
    page.screenshot(path=str(out/'ui-trade-review-desktop.png'))
    page.get_by_role('button',name='Edit offer',exact=True).click()
    expect(page.locator('input[name=giveCash]')).to_have_value('200')
    expect(page.locator('input[name=receive][value="3"]')).to_be_checked()
    page.set_viewport_size({'width':390,'height':844})
    page.screenshot(path=str(out/'ui-trade-mobile.png'),full_page=True)
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
    page.get_by_role('button',name='Review trade',exact=True).click()
    page.get_by_role('button',name='Offer trade',exact=True).click()
    expect(oldtown.locator('.group-progress')).to_contain_text('2/2',timeout=15000)
    expect(page.locator('.portfolio')).to_contain_text('Cedar Row')
    for width,height in [(390,844),(375,812),(844,390),(768,1024),(1440,960)]:
        page.set_viewport_size({'width':width,'height':height})
        page.wait_for_timeout(200)
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'),f'Overflow at {width}x{height}'
        expect(page.locator('.context-error')).to_have_count(0)
        if width==390:
            page.screenshot(path=str(out/'ui-portfolio-mobile.png'),full_page=True)
    assert not errors,errors
    page.get_by_role('button',name='Main menu',exact=True).click()
    incoming=json.loads((out/'browser-fixtures.json').read_text())['incomingTrade']
    page.evaluate('''async game=>{
      const db=await new Promise(resolve=>{const r=indexedDB.open('property-empire-saves',1);r.onsuccess=()=>resolve(r.result);});
      await new Promise(resolve=>{const t=db.transaction('saves','readwrite');t.objectStore('saves').put({savedAt:Date.now(),game},'current');t.oncomplete=resolve;});db.close();
    }''',incoming)
    page.get_by_role('button',name='Continue Saved Game',exact=True).click()
    expect(page.locator('.trade-inbox')).to_contain_text('Trade from Ben')
    expect(page.locator('.trade-inbox')).to_contain_text('$50 debt payment')
    expect(page.locator('.trade-inbox')).to_contain_text('$20')
    expect(page.locator('.trade-inbox')).to_contain_text('$1,430')
    expect(page.get_by_role('button',name='Trade',exact=True)).to_be_disabled()
    page.wait_for_timeout(1500)
    page.screenshot(path=str(out/'ui-incoming-trade.png'))
    page.get_by_role('button',name='Accept trade',exact=True).click()
    expect(page.locator('.portfolio')).to_contain_text('Copper Lane')
    expect(page.locator('.portfolio-money')).to_contain_text('$1,430')
    assert not errors,errors
    print(json.dumps({'result':'PASS','page_errors':errors,'flows':['owned portfolio','ownership highlight','owned/available filters','missing-deed trade shortcut','blocked developed deeds','set-completion preview','review and edit','bot accepts trade','responsive layouts','incoming offer comparison and acceptance']}))
    browser.close()
