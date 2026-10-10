"""Focused real-time Chrome/SwiftShader timing probe; comparative, not hardware FPS."""
import json, sys
from pathlib import Path
from playwright.sync_api import sync_playwright

out = Path('test-artifacts')
fixtures = json.loads((out / 'browser-fixtures.json').read_text(encoding='utf-8'))
with sync_playwright() as p:
    browser = p.chromium.launch(channel='chrome', headless=True,
        args=['--use-angle=swiftshader', '--disable-background-timer-throttling'])
    try:
        page = browser.new_page(viewport={'width': 1000, 'height': 700})
        page.goto('http://127.0.0.1:5173')
        page.wait_for_load_state('networkidle')
        setup = page.evaluate(r'''async fixtures => {
            const {BoardView} = await import('/src/board-view.ts');
            window.probeDicePlanner=(await import('/src/dice-physics.ts')).planDiceRoll;
            const nativeFrame = BoardView.prototype.frame;
            BoardView.prototype.frame = function(){if(this === window.probeBoard) return nativeFrame.call(this)};
            const host = document.createElement('div');
            Object.assign(host.style,{position:'fixed',inset:0,zIndex:1000,background:'#eee'});
            document.body.append(host);
            const board = new BoardView(host,()=>{},{speed:'normal',quality:'low',sound:false});
            window.probeBoard = board;
            board.update(fixtures.management,false);
            const gl=board.renderer.getContext(), ext=gl.getExtension('WEBGL_debug_renderer_info');
            window.probeFixtures = fixtures;
            return {renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),
                reduced:board.motionPreference.matches,pixelRatio:devicePixelRatio};
        }''', fixtures)
        results=[]
        if '--focused' in sys.argv:
            result=page.evaluate(r'''async()=>{
                const b=probeBoard;
                b.renderer.setAnimationLoop(null);
                const actual=b.renderer.render.bind(b.renderer),nativeNow=performance.now.bind(performance);
                b.renderer.render=()=>{};
                const cadence=[];let now=0;
                Object.defineProperty(performance,'now',{configurable:true,value:()=>now});
                for(const quality of ['low','medium','high']){
                    b.configure({speed:'normal',quality,sound:false});b.cityLife.last=null;b.cityLife.elapsed=0;
                    let renders=0,updates=0;const update=b.cityLife.update.bind(b.cityLife);
                    b.renderer.render=()=>renders++;b.cityLife.update=t=>{const did=update(t);if(did)updates++;return did};
                    for(let i=0;i<=120;i++){now=i*(1000/60);b.frame()}
                    cadence.push({quality,rafHz:60,durationMs:2000,updates,renders,advanceMs:b.cityLife.elapsed});
                    b.cityLife.update=update;
                }
                Object.defineProperty(performance,'now',{configurable:true,value:nativeNow});
                b.renderer.render=actual;b.configure({speed:'normal',quality:'high',sound:false});
                b.renderer.setSize(320,240,false);
                const gl=b.renderer.getContext(),cost=[];
                for(const shadows of [false,true,false,true]){
                    b.renderer.shadowMap.enabled=shadows;b.renderer.shadowMap.needsUpdate=true;
                    actual(b.scene,b.camera);gl.finish();
                    const durations=[];
                    for(let i=0;i<3;i++){b.renderer.shadowMap.needsUpdate=true;const start=nativeNow();actual(b.scene,b.camera);gl.finish();durations.push(nativeNow()-start)}
                    cost.push({shadows,mapSize:2048,pixels:[320,240],durations});
                }
                return{cadence,cost};
            }''')
            (out/'performance-focused.json').write_text(json.dumps({'setup':setup,**result},indent=2),encoding='utf-8')
            print(json.dumps(result),flush=True)
            browser.close()
            sys.exit()
        for quality,mode,no_shadows in [('low','idle',False),('medium','idle',False),('high','idle',False),
            ('high','roll',False),('high','roll',True),('low','roll',False),('high','reduced',False)]:
            sample=page.evaluate(r'''async ({quality,mode,noShadows})=>{
                const b=probeBoard;
                b.configure({speed:mode==='reduced'?'reduced':'normal',quality,sound:false});
                if(noShadows)b.renderer.shadowMap.enabled=false;
                b.update(probeFixtures.management,false);
                await new Promise(r=>setTimeout(r,500));
                const start=performance.now(),cityStart=b.cityLife.elapsed;
                const render=b.renderer.render.bind(b.renderer),city=b.cityLife.update.bind(b.cityLife);
                const frame=b.frame.bind(b);let frames=[],renders=[],cityTimes=[],cityChanges=0,shadowRenders=0,calls=[];
                let priorFrame=start,previousRoll=0;
                b.renderer.render=(...a)=>{const t=performance.now();if(b.renderer.shadowMap.enabled&&b.renderer.shadowMap.needsUpdate)shadowRenders++;render(...a);renders.push(performance.now()-t);calls.push(b.renderer.info.render.calls)};
                b.cityLife.update=n=>{const t=performance.now(),changed=city(n);cityTimes.push(performance.now()-t);if(changed)cityChanges++;return changed};
                b.frame=()=>{const now=performance.now();frames.push(now-priorFrame);priorFrame=now;
                    if(mode==='roll'&&now-previousRoll>900){previousRoll=now;b.diceStarted=now;b.diceUntil=now+950;b.dicePlan=probeDicePlanner(b.dice.map(d=>({x:d.position.x,z:d.position.z,yaw:d.rotation.y})));b.diceRest=b.dicePlan.rest;}
                    return frame()};
                await new Promise(r=>setTimeout(r,3500));
                const duration=performance.now()-start,elapsed=b.cityLife.elapsed-cityStart;
                b.frame=frame;b.cityLife.update=city;b.renderer.render=render;b.diceUntil=0;
                const stats=a=>{const s=[...a].sort((a,b)=>a-b);return{count:a.length,mean:a.reduce((x,y)=>x+y,0)/a.length,p50:s[Math.floor(s.length*.5)],p95:s[Math.floor(s.length*.95)],max:s.at(-1)}};
                return {quality,mode,noShadows,duration,frames:stats(frames),renders:stats(renders),cityUpdate:stats(cityTimes),cityChanges,cityHz:cityChanges/(duration/1000),renderHz:renders.length/(duration/1000),elapsed,elapsedRatio:elapsed/duration,shadowRenders,drawCalls:stats(calls)};
            }''', {'quality':quality,'mode':mode,'noShadows':no_shadows})
            results.append(sample)
            print(json.dumps(sample),flush=True)
        clock=page.evaluate('''()=>{const c=probeBoard.cityLife;c.configure(false,'low');c.last=null;c.elapsed=0;c.update(0);c.update(1000);return{inputMs:1000,advanceMs:c.elapsed};}''')
        result={'setup':setup,'samples':results,'clockLoss':clock}
        (out/'performance-baseline.json').write_text(json.dumps(result,indent=2),encoding='utf-8')
        print(json.dumps({'setup':setup,'clockLoss':clock}),flush=True)
        page.evaluate('probeBoard.renderer.setAnimationLoop(null);probeBoard.controls.dispose();probeBoard.renderer.dispose()')
    finally:
        browser.close()
