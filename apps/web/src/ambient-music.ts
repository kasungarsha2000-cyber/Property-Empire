/**
 * Quiet generative background music: slow pad chords synthesised with Web Audio, so no audio files ship
 * with the game. Off by default; it never starts before a user gesture and stops when the app is hidden.
 */
const CHORDS=[[261.63,329.63,392,493.88],[220,261.63,329.63,392],[174.61,220,261.63,329.63],[196,246.94,293.66,392]];
const BAR=4.8;

export class AmbientMusic{
 private context:AudioContext|null=null;
 private master:GainNode|null=null;
 private timer:ReturnType<typeof setTimeout>|null=null;
 private bar=0;
 private unlocked=false;
 private hidden=false;
 constructor(private enabled:boolean){}
 get playing(){return !!this.timer;}
 setEnabled(enabled:boolean){this.enabled=enabled;if(enabled)this.start();else this.stop();}
 /** Call from a user gesture; browsers keep audio locked until then. */
 unlock(){this.unlocked=true;if(this.enabled)this.start();}
 pause(){this.hidden=true;this.stop();}
 resume(){this.hidden=false;if(this.enabled)this.start();}
 private start(){
  if(!this.unlocked||this.hidden||this.timer)return;
  try{
   this.context??=new AudioContext();
   if(!this.master){const filter=this.context.createBiquadFilter();filter.type='lowpass';filter.frequency.value=1600;this.master=this.context.createGain();this.master.gain.value=0;this.master.connect(filter);filter.connect(this.context.destination);}
   void this.context.resume().catch(()=>{});
   const now=this.context.currentTime;this.master.gain.cancelScheduledValues(now);this.master.gain.setValueAtTime(this.master.gain.value,now);this.master.gain.linearRampToValueAtTime(.05,now+2.5);
   this.schedule();
  }catch{/* Web Audio unavailable: stay silent */}
 }
 private stop(){
  if(this.timer)clearTimeout(this.timer);this.timer=null;
  if(this.context&&this.master){const now=this.context.currentTime;this.master.gain.cancelScheduledValues(now);this.master.gain.setValueAtTime(this.master.gain.value,now);this.master.gain.linearRampToValueAtTime(0,now+.6);const context=this.context;setTimeout(()=>{if(!this.timer)void context.suspend().catch(()=>{});},800);}
 }
 private schedule(){
  const ctx=this.context!,master=this.master!,at=ctx.currentTime+.05,chord=CHORDS[this.bar%CHORDS.length];
  for(const [i,frequency] of chord.entries()){
   for(const detune of [-4,4]){
    const oscillator=ctx.createOscillator(),gain=ctx.createGain();oscillator.type=i===0?'sine':'triangle';oscillator.frequency.value=i===0?frequency/2:frequency;oscillator.detune.value=detune;
    gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(i===0?.5:.22,at+1.6);gain.gain.linearRampToValueAtTime(0,at+BAR+1.4);
    oscillator.connect(gain);gain.connect(master);oscillator.start(at);oscillator.stop(at+BAR+1.5);oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};
   }
  }
  // A sparse bell note on alternate bars keeps the loop from feeling static.
  if(this.bar%2===1){const bell=ctx.createOscillator(),gain=ctx.createGain(),note=chord[(this.bar>>1)%chord.length]*2;bell.type='sine';bell.frequency.value=note;gain.gain.setValueAtTime(0,at+1.2);gain.gain.linearRampToValueAtTime(.12,at+1.25);gain.gain.exponentialRampToValueAtTime(.0001,at+3.6);bell.connect(gain);gain.connect(master);bell.start(at+1.2);bell.stop(at+3.7);bell.onended=()=>{bell.disconnect();gain.disconnect();};}
  this.bar++;
  this.timer=setTimeout(()=>{this.timer=null;if(this.enabled&&!this.hidden)this.schedule();},BAR*1000);
 }
}
