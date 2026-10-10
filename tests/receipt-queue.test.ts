import {it,expect,vi} from 'vitest';
import {createGame,applyAction,type Game} from '../packages/core';
import {EventFeedback} from '../apps/web/src/event-feedback';
import {BoardMoments} from '../apps/web/src/board-moments';
function dom(){
 const layers:any[]=[];
 const document={createElement:()=>{const layer={innerHTML:'',className:'',parentElement:null,setAttribute(){},replaceChildren(){this.innerHTML='';},querySelector(selector:string){return selector==='.feedback-label'&&this.innerHTML.includes('class="feedback-label"')?{}:null;},querySelectorAll(){return[];},get childElementCount(){return this.innerHTML?1:0;}};layers.push(layer);return layer;},querySelector:()=>null,querySelectorAll:()=>[]};
 const stage={clientWidth:800,clientHeight:500,append(layer:any){layer.parentElement=this;}} as unknown as HTMLElement;
 vi.stubGlobal('document',document);return{layers,stage};
}
function snapshots(){
 let g=createGame({players:['Ada','Ben','Cleo','Dina'].map((name,i)=>({id:String(i),name,bot:i>0}))},42);g.current=1;g.properties[9].owner='0';
 // Pick a real engine seed producing the same board destination for each payer.
 let rollSeed=0;for(;rollSeed<10000;rollSeed++){const trial=structuredClone(g);trial.rng=rollSeed;const rolled=applyAction(trial,'1',{type:'roll'});if(rolled.players[1].position===9)break;}
 const baseline=structuredClone(g),states:Game[]=[];
 for(const payer of [1,2,1]){g=structuredClone(g);g.current=payer;g.phase='roll';g.players[payer].position=0;g.rng=rollSeed;g=applyAction(g,String(payer),{type:'roll'});states.push(g);}
 return{baseline,states};
}
it('retains every queued personal rent and waits for pawn arrival when a timer expires',()=>{
 vi.useFakeTimers();const {layers,stage}=dom();try{
  const feedback=new EventFeedback(stage,false),{baseline,states}=snapshots();feedback.observe(baseline,'0',false,false);
  feedback.observe(states[0],'0',false);expect(layers[0].innerHTML).toContain('Ben pays Ada');
  feedback.observe(states[1],'0',true);expect(layers[0].innerHTML).toBe('');feedback.observe(states[2],'0',true);vi.advanceTimersByTime(2200);expect(layers[0].innerHTML).toBe('');
  feedback.settle();expect(layers[0].innerHTML).toContain('Cleo pays Ada');vi.advanceTimersByTime(2200);expect(layers[0].innerHTML).toContain('Ben pays Ada');
  vi.advanceTimersByTime(2200);expect(layers[0].innerHTML).toBe('');feedback.reset();
 }finally{vi.unstubAllGlobals();vi.useRealTimers();}
});
it('keeps a queued third-party board receipt hidden until the next pawn settles',()=>{
 vi.useFakeTimers();const {layers,stage}=dom();try{
  const moments=new BoardMoments(stage,()=>null,()=>false),{baseline,states}=snapshots();moments.observe(baseline,'3',false,false);
  moments.observe(states[0],'3',false);expect(layers[0].innerHTML).toContain('Ben → Ada');moments.observe(states[1],'3',true);
  expect(layers[0].innerHTML).toBe('');vi.advanceTimersByTime(2200);expect(layers[0].innerHTML).toBe('');moments.settle();expect(layers[0].innerHTML).toContain('Cleo → Ada');vi.advanceTimersByTime(2199);expect(layers[0].innerHTML).toContain('Cleo → Ada');vi.advanceTimersByTime(1);expect(layers[0].innerHTML).toBe('');moments.reset();
 }finally{vi.unstubAllGlobals();vi.useRealTimers();}
});
