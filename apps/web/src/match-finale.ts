import type {Game} from '../../../packages/core/types';
import {netWorth} from '../../../packages/core/engine';
import {PLAYER_COLORS} from '../../../packages/core/board';
import {esc as e} from './ui/dom';
export function matchStandings(game:Game){return [...game.players].sort((a,b)=>a.id===game.winner?-1:b.id===game.winner?1:Number(a.bankrupt)-Number(b.bankrupt)||netWorth(game,b)-netWorth(game,a)).map((p,i)=>({id:p.id,name:p.name,rank:i+1,worth:netWorth(game,p),deeds:game.properties.filter(v=>v.owner===p.id).length,cash:p.cash,rentEarned:p.rentEarned,bankrupt:p.bankrupt,color:PLAYER_COLORS[p.token??game.players.indexOf(p)]}));}
export class MatchFinale{
 private host:HTMLElement;private key='';private dismissed='';private priorFocus:HTMLElement|null=null;
 constructor(stage:HTMLElement,private reduced:()=>boolean){this.host=document.createElement('section');this.host.className='match-finale';this.host.hidden=true;this.host.setAttribute('role','dialog');this.host.setAttribute('aria-labelledby','finale-title');stage.append(this.host);}
 get visible(){return !this.host.hidden;}
 update(game:Game,viewer:string){
  this.host.classList.toggle('finale-reduced',this.reduced());
  const me=game.players.find(p=>p.id===viewer),ended=game.phase==='ended',out=!!me?.bankrupt;if(!ended&&!out){this.reset();return;}
  const key=ended?`ended:${game.winner}`:`out:${viewer}`;if(this.dismissed===key)return;if(this.key===key)return;this.key=key;this.priorFocus=document.activeElement as HTMLElement;
  const won=ended&&game.winner===viewer,winner=game.players.find(p=>p.id===game.winner),standings=matchStandings(game),mine=standings.find(p=>p.id===viewer);
  this.host.className=`match-finale ${won?'finale-won':'finale-lost'}${this.reduced()?' finale-reduced':''}`;
  const trophy='<svg viewBox="0 0 140 120" aria-hidden="true"><path d="M39 15h62v25c0 28-14 44-31 44S39 68 39 40Z" fill="#d7b263"/><path d="M39 24H15v14c0 24 17 27 30 27m56-41h24v14c0 24-17 27-30 27" stroke="#b58e43" fill="none" stroke-width="8"/><path d="M65 81h10v18h22v13H43V99h22Z" fill="#b58e43"/><path d="m70 28 6 12 13 2-10 10 2 13-11-6-11 6 2-13-10-10 13-2Z" fill="#fff0ba"/></svg>';
  this.host.innerHTML=`<div class="finale-atmosphere" aria-hidden="true">${Array.from({length:36},(_,i)=>`<i style="--x:${(i*37)%100}%;--delay:${i%9*.1}s;--drift:${(i%2?1:-1)*(20+i%5*12)}px;--color:${['#e2be72','#75b292','#d88b79','#f2e4bf'][i%4]}"></i>`).join('')}</div><div class="finale-card"><button class="finale-close" data-do="dismiss-finale" aria-label="Close results">×</button><div class="finale-trophy">${trophy}</div><span class="finale-eyebrow">${ended?'The city has its champion':'Your empire, remembered'}</span><h2 id="finale-title">${won?'You won the empire!':ended?`${e(winner!.name)} wins!`:'Your run ends here.'}</h2><p>${won?'Every street, every deal, every bold move led here.':ended?`${e(winner!.name)} takes the crown. Your next empire awaits.`:'You have been eliminated. Stay at the table and watch the remaining players.'}</p>${mine?`<div class="finale-result"><strong>${won?'CHAMPION':ended?'MATCH COMPLETE':'ELIMINATED'}</strong><span>${ended?`Your place: ${mine.rank} / ${game.players.length}`:'You can keep watching'}</span></div>`:''}<ol class="finale-standings">${standings.map(p=>`<li class="${p.id===game.winner?'finale-champion':''}"><b>${p.rank}</b><i style="background:${p.color}"></i><span><strong>${e(p.name)}${p.id===viewer?' · You':''}</strong><small>${p.bankrupt?'Bankrupt':`${p.deeds} deeds · $${p.cash.toLocaleString('en-US')} cash · $${p.rentEarned.toLocaleString('en-US')} rent earned`}</small></span><em>$${p.worth.toLocaleString('en-US')}</em></li>`).join('')}</ol><div class="finale-actions">${ended?'<button class="primary" data-nav="solo">Play again</button>':'<button class="primary" data-do="dismiss-finale">Keep watching</button>'}<button data-nav="menu">Main menu</button></div></div>`;
  this.host.hidden=false;this.host.querySelector<HTMLButtonElement>('.finale-actions button')?.focus({preventScroll:true});
 }
 dismiss(){this.dismissed=this.key;this.host.hidden=true;if(this.priorFocus?.isConnected)this.priorFocus.focus({preventScroll:true});}
 reopen(){this.dismissed='';this.key='';}
 reset(){this.host.hidden=true;this.key='';this.dismissed='';this.priorFocus=null;}
}
