"""Readable portfolio/deeds, player profiles/trades, real audio and pawn poses."""
import os,json,re
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
out=Path('test-artifacts');fixtures=json.loads((out/'browser-fixtures.json').read_text(encoding='utf-8'))
base=os.environ.get('EMPIRE_URL','http://127.0.0.1:5173')
with sync_playwright() as p:
    browser=p.chromium.launch(channel='chrome',headless=True,args=['--use-angle=swiftshader'])
    try:
        page=browser.new_page(viewport={'width':1440,'height':720});errors=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.add_init_script('''localStorage.setItem('empire-settings',JSON.stringify({speed:'reduced',quality:'low',sound:false}));
          window.audioCalls=[];const Native=window.AudioContext;window.AudioContext=class extends Native{
            createOscillator(){const o=super.createOscillator(),start=o.start.bind(o);o.start=(...args)=>{audioCalls.push('tone');start(...args)};return o;}
            createBufferSource(){const o=super.createBufferSource(),start=o.start.bind(o);o.start=(...args)=>{audioCalls.push('noise');start(...args)};return o;}
          };''')
        page.goto(base);page.wait_for_load_state('networkidle')
        def load(g):
            page.evaluate('''async game=>{const db=await new Promise(r=>{const q=indexedDB.open('property-empire-saves',1);q.onupgradeneeded=()=>q.result.createObjectStore('saves');q.onsuccess=()=>r(q.result)});await new Promise(r=>{const t=db.transaction('saves','readwrite');t.objectStore('saves').put({savedAt:Date.now(),game},'current');t.oncomplete=r});db.close()}''',g)
            page.get_by_role('button',name='Continue Saved Game',exact=True).click()
        g=json.loads(json.dumps(fixtures['management']))
        for i in [6,8,9,11,13,14,21,23,24,31,32,34]:g['properties'][i]['owner']='human'
        g['properties'][16]['owner']='bot';load(g)
        assert page.locator('.portfolio-scroll').evaluate('(e)=>e.scrollHeight<=e.clientHeight+1'),'Nested property scroller still clips deeds'
        assert page.locator('.portfolio-property').first.bounding_box()['height']>=80
        page.get_by_role('button',name='Inspect your Copper Lane',exact=True).click()
        expect(page.locator('#dialog')).to_have_class(re.compile(r'\bdeed-dialog\b'))
        expect(page.locator('#dialog')).to_have_class(re.compile(r'\bdeed-reduced\b'))
        expect(page.locator('#dialog .deed-rents')).to_contain_text('Hotel')
        expect(page.locator('#dialog .deed-costs')).to_contain_text('Mortgage value')
        popup=page.locator('#dialog').bounding_box();actions=page.locator('#dialog .asset-actions').bounding_box()
        assert actions['y']+actions['height']<=popup['y']+popup['height'],'Deed actions clipped on desktop'
        page.screenshot(path=str(out/'readable-deed-desktop.png'))
        page.locator('#dialog').get_by_role('button',name='Build',exact=True).click()
        expect(page.locator('#dialog .deed-development')).to_have_text('1 house')
        assert page.evaluate('audioCalls.length')==0,'Muted game played audio'
        page.get_by_role('button',name='Close dialog',exact=True).click()
        page.get_by_role('button',name='Sound off',exact=True).click()
        assert page.evaluate('audioCalls.length')>=3,'Audio did not start from a real user gesture'
        page.get_by_role('button',name='View Ben player details',exact=True).click()
        expect(page.locator('#player-profile')).to_contain_text('Net worth')
        expect(page.locator('.profile-deeds button')).to_have_count(1)
        page.screenshot(path=str(out/'player-profile-desktop.png'))
        page.get_by_role('button',name='Trade with Ben',exact=True).click()
        expect(page.locator('#trade-partner')).to_have_value('bot')
        page.locator('input[name=giveCash]').fill('300')
        page.locator('input[name=receive][value="16"]').check()
        page.get_by_role('button',name='Review trade',exact=True).click()
        page.get_by_role('button',name='Offer trade',exact=True).click()
        expect(page.locator('.portfolio-property[data-space="16"]')).to_be_visible(timeout=15000)
        page.get_by_role('button',name='Sound on',exact=True).click()
        muted=page.evaluate('audioCalls.length')
        page.get_by_role('button',name='Inspect your Copper Lane',exact=True).click()
        page.locator('#dialog').get_by_role('button',name='Sell building',exact=True).click()
        expect(page.locator('#dialog .deed-development')).to_have_text('Unimproved')
        assert page.evaluate('audioCalls.length')==muted,'Mute failed for later actions'
        page.set_viewport_size({'width':390,'height':844})
        page.screenshot(path=str(out/'readable-deed-mobile.png'),full_page=True)
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
        page.get_by_role('button',name='Close dialog',exact=True).click()
        page.get_by_role('button',name='View Ben player details',exact=True).click()
        expect(page.get_by_role('button',name='Trade with Ben',exact=True)).to_be_disabled()
        expect(page.locator('.profile-trade')).to_contain_text('used your trade offer')
        page.screenshot(path=str(out/'player-profile-mobile.png'),full_page=True)
        page.get_by_role('button',name='Close dialog',exact=True).click()
        page.get_by_role('button',name='Main menu',exact=True).click()
        load(fixtures['animatedRoll'])
        page.get_by_role('button',name='Sound off',exact=True).click()
        page.get_by_role('button',name='Roll dice',exact=True).click()
        page.wait_for_function("audioCalls.includes('noise')",timeout=3000)
        page.clock.install()
        page.clock.pause_at((page.evaluate('Date.now()')+100)/1000)
        # A bot arrival must not silently replace the deed being read.
        page.get_by_role('button',name='Main menu',exact=True).click()
        other_turn=json.loads(json.dumps(fixtures['management']));other_turn['current']=1;other_turn['phase']='roll'
        load(other_turn)
        page.get_by_role('button',name='Inspect your Copper Lane',exact=True).click()
        expect(page.locator('#dialog .deed-header h2')).to_have_text('Copper Lane')
        page.clock.fast_forward(350)
        expect(page.locator('#turn-status')).to_contain_text('Pier Avenue')
        expect(page.locator('#dialog .deed-header h2')).to_have_text('Copper Lane')
        page.get_by_role('button',name='Close dialog',exact=True).click()
        page.get_by_role('button',name='Main menu',exact=True).click()
        load(fixtures['community'])
        page.get_by_role('button',name='Settings',exact=True).click()
        page.get_by_label('Animation speed').select_option('normal')
        page.get_by_role('button',name='Save settings',exact=True).click()
        page.get_by_role('button',name='Roll dice',exact=True).click()
        tones=page.evaluate("audioCalls.filter(v=>v==='tone').length")
        page.get_by_role('button',name='Settings',exact=True).click()
        page.get_by_label('Animation speed').select_option('reduced')
        page.get_by_role('button',name='Save settings',exact=True).click()
        expect(page.locator('#event-popup')).to_contain_text('Community Chest')
        assert page.evaluate("audioCalls.filter(v=>v==='tone').length")>=tones+2,'Reduced motion lost queued card sounds'
        expect(page.locator('#player-ledger .player-row').first).to_contain_text('$1,500')
        page.get_by_role('button',name='Continue',exact=True).click()
        assert page.evaluate("audioCalls.filter(v=>v==='tone').length")>=tones+4,'Card payout sound did not wait for Continue'
        if ':5173' in base:
            result=page.evaluate('''async({before,after})=>{
              const {BoardView}=await import('/src/board-view.ts');const host=document.createElement('div');Object.assign(host.style,{position:'fixed',width:'600px',height:'400px',left:'0',top:'0'});document.body.append(host);
              const view=new BoardView(host,()=>{},{speed:'normal',quality:'low',sound:false});view.renderer.setAnimationLoop(null);view.update(before,false);view.update(after,true);let steps=0;view.onStep=()=>steps++;
              const path=view.paths.get('human');view.diceUntil=0;path.start=performance.now()-90;view.frame();const token=view.tokens.get('human');const mid={height:token.position.y,scaleY:token.scale.y,angle:token.rotation.y,steps};
              view.configure({speed:'reduced',quality:'low',sound:false});view.frame();const end={busy:view.isAnimating,height:token.position.y,scaleY:token.scale.y,lean:token.rotation.z};view.controls.dispose();view.renderer.dispose();host.remove();return{mid,end};
            }''',{'before':fixtures['animatedRoll'],'after':fixtures['pawnRoll']})
            assert result['mid']['height']>.95 and result['mid']['scaleY']>1.1 and result['mid']['steps']==1,result
            assert not result['end']['busy'] and abs(result['end']['height']-.68)<.001 and result['end']['scaleY']==1 and result['end']['lean']==0,result
            print(json.dumps({'pawn_pose':result}))
        assert not errors,errors
        print(json.dumps({'result':'PASS','flows':['single portfolio scroll','readable deed popup and live build/sell','player profile and actual trade','sound unlock and mute','dice sound','mobile dialogs and unavailable-trade explanation','stable deed during opponent arrival','reduced motion flushes arrival sound'],'page_errors':errors}))
    finally:browser.close()
