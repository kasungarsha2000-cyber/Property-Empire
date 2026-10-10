import type {Game} from '../../../packages/core/types';
export type SoundCue='dice'|'step'|'purchase'|'money'|'card'|'build'|'trade'|'jail'|'victory'|'bid'|'bankrupt';
export function soundCues(before:Game|null,after:Game):SoundCue[]{
 if(!before||after.eventSeq<=before.eventSeq)return[];
 const cues=new Set<SoundCue>();
 for(const event of after.log.filter(e=>e.id>before.eventSeq)){
  const cue=({roll:'dice',purchase:'purchase',payment:'money',salary:'money',card:'card',build:'build',trade:'trade',jail:'jail',winner:'victory',auction:'bid',bankruptcy:'bankrupt'} as Record<string,SoundCue>)[event.kind];
  if(cue)cues.add(cue);
 }
 if(after.players.some(p=>p.cash>(before.players.find(old=>old.id===p.id)?.cash??p.cash)))cues.add('money');
 return[...cues];
}

/** Local Web Audio cues: no downloaded assets, and no autoplay before a gesture. */
export class GameSounds{
 private context:AudioContext|null=null;
 private previous:Game|null=null;
 private pending:SoundCue[]=[];
 private enabled:boolean;
 private lastStep=0;
 private unlocked=false;
 constructor(enabled:boolean){this.enabled=enabled;}
 setEnabled(enabled:boolean){this.enabled=enabled;if(!enabled){this.pending=[];if(this.context)void this.context.suspend().catch(()=>{});}else this.unlock();}
 unlock(){if(!this.enabled)return;try{this.context??=new AudioContext();this.unlocked=true;void this.context.resume().catch(()=>{});}catch{}}
 reset(){this.previous=null;this.pending=[];}
 observe(game:Game,moving:boolean,animate=true){
  const cues=animate?soundCues(this.previous,game):[];this.previous=game;
  if(!this.enabled)return;
  for(const cue of cues){if(cue==='dice')this.play(cue);else if(moving)this.pending.push(cue);else this.play(cue);}
  this.pending=this.pending.slice(-12);
 }
 settle(){const pending=this.pending;this.pending=[];pending.forEach((cue,i)=>this.play(cue,i*.12));}
 play(cue:SoundCue,delay=0){
  if(!this.enabled||!this.unlocked||!this.context)return;
  if(this.context.state!=='running'){
   const context=this.context;if(context.state==='suspended')void context.resume().then(()=>{if(context.state==='running')this.play(cue,delay);}).catch(()=>{});
   return;
  }
  const ctx=this.context,now=ctx.currentTime+delay;
  if(cue==='step'){if(now-this.lastStep<.06)return;this.lastStep=now;}
  const tone=(frequency:number,at:number,duration=.12,type:OscillatorType='sine',volume=.035)=>{
   const oscillator=ctx.createOscillator(),gain=ctx.createGain();oscillator.type=type;oscillator.frequency.setValueAtTime(frequency,at);
   gain.gain.setValueAtTime(.0001,at);gain.gain.exponentialRampToValueAtTime(volume,at+.012);gain.gain.exponentialRampToValueAtTime(.0001,at+duration);
   oscillator.connect(gain);gain.connect(ctx.destination);oscillator.start(at);oscillator.stop(at+duration+.02);oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};
  };
  if(cue==='dice'){
   const buffer=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*.5),ctx.sampleRate),data=buffer.getChannelData(0);
   for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*Math.exp(-i/data.length*5)*(.25+Math.abs(Math.sin(i/ctx.sampleRate*45))*.75);
   const source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();source.buffer=buffer;filter.type='highpass';filter.frequency.value=800;gain.gain.value=.06;
   source.connect(filter);filter.connect(gain);gain.connect(ctx.destination);source.start(now);source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();};return;
  }
  const notes:Record<Exclude<SoundCue,'dice'>,number[]>={step:[160],purchase:[523,659,784],money:[880,1175],card:[440,660],build:[330,440,660],trade:[392,523],jail:[330,220],victory:[523,659,784,1047],bid:[740],bankrupt:[392,330,262]};
  notes[cue].forEach((note,i)=>tone(note,now+i*(cue==='step'?0:.09),cue==='step'?.06:cue==='victory'?.24:.14,cue==='step'?'triangle':'sine',cue==='step'?.022:.035));
 }
}
