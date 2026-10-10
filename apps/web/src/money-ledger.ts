import type {Game} from '../../../packages/core/types';
export type CashDelta={player:string;name:string;amount:number};
type CashSnapshot=Pick<Game,'eventSeq'|'revision'> & {players:Pick<Game['players'][number],'id'|'name'|'cash'>[]};
/** Booked balances include fees and partial settlements; log promises do not. */
export function cashDeltas(before:CashSnapshot|null,after:CashSnapshot):CashDelta[]{
 if(!before||after.eventSeq<before.eventSeq||after.revision<before.revision||before.players.length!==after.players.length||before.players.some(p=>!after.players.some(next=>next.id===p.id)))return [];
 return after.players.flatMap(player=>{const amount=player.cash-before.players.find(p=>p.id===player.id)!.cash;return amount?[{player:player.id,name:player.name,amount}]:[];});
}
type ActiveChange={delta:CashDelta;node:HTMLSpanElement|null;timer:ReturnType<typeof setTimeout>};
export class MoneyLedger{
 private previous:CashSnapshot|null=null;
 private pending=new Map<string,CashDelta>();
 private active=new Map<string,ActiveChange>();
 private moving=false;
 constructor(private host?:HTMLElement,private reduced:()=>boolean=()=>false){}
 get changes():CashDelta[]{return Array.from(this.active.values(),change=>({...change.delta}));}
 observe(game:Game,moving:boolean,animate=true){
  const restored=this.previous&&(game.eventSeq<this.previous.eventSeq||game.revision<this.previous.revision||game.players.length!==this.previous.players.length||game.players.some(p=>!this.previous!.players.some(old=>old.id===p.id)));
  if(!animate||restored)this.reset();
  else for(const delta of cashDeltas(this.previous,game)){const pending=this.pending.get(delta.player);this.pending.set(delta.player,{...delta,amount:delta.amount+(pending?.amount??0)});}
  // Copy values: a caller can mutate or replace its state after this observation.
  this.previous={eventSeq:game.eventSeq,revision:game.revision,players:game.players.map(({id,name,cash})=>({id,name,cash}))};
  this.moving=moving;if(!moving)this.settle();else this.refresh();
 }
 settle(arrived=true){
  if(arrived)this.moving=false;if(this.moving)return;
  const pulsing=new Set<string>();
  for(const delta of this.pending.values()){
   if(!delta.amount)continue;const prior=this.active.get(delta.player),sameDirection=prior&&Math.sign(prior.delta.amount)===Math.sign(delta.amount),amount=delta.amount+(sameDirection?prior.delta.amount:0);
   if(prior){clearTimeout(prior.timer);prior.node?.remove();this.active.delete(delta.player);}
   if(!amount)continue;
   const change:ActiveChange={delta:{...delta,amount},node:null,timer:setTimeout(()=>{this.active.get(delta.player)?.node?.remove();this.active.delete(delta.player);},2800)};
   this.active.set(delta.player,change);pulsing.add(delta.player);
  }
  this.pending.clear();this.refresh();
  if(!this.reduced())for(const row of this.rows())if(pulsing.has(row.dataset.player??'')){
   row.querySelector<HTMLElement>('.player-cash')?.animate?.([{color:'var(--ledger-pulse)',transform:'scale(1.06)'},{color:'inherit',transform:'scale(1)'}],{duration:420,easing:'cubic-bezier(.2,.8,.2,1)'});
  }
 }
 /** Reattach the same effect nodes after the main UI replaces player rows. */
 refresh(host?:HTMLElement){
  if(host)this.host=host;
  for(const row of this.rows()){
   const change=this.active.get(row.dataset.player??'');if(!change)continue;
   if(!change.node){const doc=row.ownerDocument;change.node=doc.createElement('span');change.node.className=`ledger-delta ${change.delta.amount<0?'ledger-loss':'ledger-gain'}`;change.node.setAttribute('role','status');change.node.setAttribute('aria-live','polite');
    const amount=change.delta.amount,copy=`${amount<0?'−':'+'}$${Math.abs(amount).toLocaleString('en-US')}`;
    change.node.setAttribute('aria-label',`${change.delta.name} ${amount<0?'paid':'received'} $${Math.abs(amount).toLocaleString('en-US')}`);
    change.node.innerHTML=`<span class="ledger-coins" aria-hidden="true"><i></i><i></i><i></i></span><span class="ledger-delta-copy">${copy}</span>`;
   }
   row.style.setProperty('--ledger-pulse',change.delta.amount<0?'#9b513b':'#2a7355');row.style.setProperty('--ledger-distance',`${Math.max(30,row.clientWidth-94)}px`);change.node.classList.toggle('ledger-reduced',this.reduced());
   if(change.node.parentElement!==row)row.append(change.node);
  }
 }
 reposition(){this.refresh();}
 configure(){this.refresh();if(this.reduced())for(const row of this.rows())row.querySelector<HTMLElement>('.player-cash')?.getAnimations?.().forEach(animation=>animation.cancel());}
 reset(){for(const change of this.active.values()){clearTimeout(change.timer);change.node?.remove();}this.active.clear();this.pending.clear();this.previous=null;this.moving=false;}
 private rows():HTMLElement[]{const root=this.host??(typeof document!=='undefined'?document.querySelector<HTMLElement>('#player-ledger'):null);return root?Array.from(root.querySelectorAll<HTMLElement>('[data-player]')):[];}
}
