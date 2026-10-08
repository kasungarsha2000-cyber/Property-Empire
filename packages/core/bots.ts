import { BOARD, groupSpaces } from './board';
import { applyAction, playerById } from './engine';
import type { Game, Action, Player } from './types';
export function actionPlayer(g:Game):string|null {if(g.phase==='ended')return null;return g.trade?.to??g.auction?.turn??g.debt?.player??g.players[g.current].id;}
const reserve=(p:Player)=>p.difficulty==='easy'?70:p.difficulty==='hard'?220:150;
function value(g:Game,p:Player,i:number):number{const s=BOARD[i],own=groupSpaces(i).filter(s=>g.properties[s.index].owner===p.id).length;return s.price*(1+own*.45)+(s.type==='street'?s.rents[3]*.12:0);}
function legal(g:Game,id:string,a:Action):boolean {try{applyAction(g,id,a);return true;}catch{return false;}}
export function botDecision(g:Game):{playerId:string;action:Action}|null {
 const id=actionPlayer(g);if(!id)return null;const p=playerById(g,id);if(!p.bot)return null;let action:Action={type:'end'};const assets=BOARD.filter(s=>g.properties[s.index].owner===id);
 if(g.phase==='roll'){action=p.jailed&&p.cards.length?{type:'jailCard'}:p.jailed&&p.cash>reserve(p)+50&&p.difficulty==='hard'?{type:'bail'}:{type:'roll'};}
 else if(g.phase==='purchase'){const i=g.pendingProperty!,s=BOARD[i],own=groupSpaces(i).some(s=>g.properties[s.index].owner===id),mistake=p.difficulty==='easy'&&(g.rng%5===0);action=!mistake&&p.cash>=s.price&&(p.cash-s.price>=reserve(p)||own)?{type:'buy'}:{type:'decline'};}
 else if(g.phase==='auction'){const a=g.auction!,cap=Math.min(p.cash,Math.floor(value(g,p,a.property)*(p.difficulty==='easy'?.7:1))-reserve(p)/2),bid=a.bid+Math.max(1,Math.min(25,Math.floor(BOARD[a.property].price/10)));action=bid<=cap?{type:'bid',amount:bid}:{type:'pass'};}
 else if(g.phase==='debt'){const developed=assets.filter(s=>g.properties[s.index].level>0).sort((a,b)=>g.properties[b.index].level-g.properties[a.index].level);const sell=developed.map(s=>({type:'sell' as const,property:s.index})).find(a=>legal(g,id,a));const mortgage=assets.filter(s=>!g.properties[s.index].mortgaged).sort((a,b)=>a.price-b.price).map(s=>({type:'mortgage' as const,property:s.index})).find(a=>legal(g,id,a));action=sell??mortgage??{type:'bankrupt'};}
 else if(g.phase==='trade'){const t=g.trade!,gain=t.give.reduce((v,i)=>v+value(g,p,i),0)+t.giveCash+t.giveCards*50,cost=t.receive.reduce((v,i)=>v+value(g,p,i),0)+t.receiveCash+t.receiveCards*50;action=gain>=cost*(p.difficulty==='hard'?1.1:.9)&&legal(g,id,{type:'acceptTrade'})?{type:'acceptTrade'}:{type:'rejectTrade'};}
 else if(g.phase==='manage'){
  const build=assets.filter(s=>s.type==='street').sort((a,b)=>(b.rents[Math.min(5,g.properties[b.index].level+1)]-b.rents[g.properties[b.index].level])/b.buildCost-(a.rents[Math.min(5,g.properties[a.index].level+1)]-a.rents[g.properties[a.index].level])/a.buildCost).map(s=>({type:'build' as const,property:s.index})).find(a=>p.cash-BOARD[a.property].buildCost>=reserve(p)&&legal(g,id,a));
  const lift=assets.filter(s=>g.properties[s.index].mortgaged).map(s=>({type:'unmortgage' as const,property:s.index})).find(a=>p.cash-Math.ceil(BOARD[a.property].mortgage*1.1)>reserve(p)&&legal(g,id,a));action=build??lift??{type:'end'};
  if(!build&&!lift&&!g.tradeOffered&&p.difficulty!=='easy'){
   for(const s of BOARD.filter(s=>s.type==='street'&&g.properties[s.index].owner&&g.properties[s.index].owner!==id)){const group=groupSpaces(s.index);if(group.filter(v=>g.properties[v.index].owner===id).length!==group.length-1)continue;const offer=Math.ceil(s.price*1.35);if(p.cash-offer<reserve(p))continue;const trade:Action={type:'offerTrade',to:g.properties[s.index].owner!,give:[],receive:[s.index],giveCash:offer,receiveCash:0,giveCards:0,receiveCards:0};if(legal(g,id,trade)){action=trade;break;}}
  }
 }
 if(!legal(g,id,action))throw new Error(`Bot ${p.name} generated illegal ${action.type} in ${g.phase}`);
 return{playerId:id,action};
}
