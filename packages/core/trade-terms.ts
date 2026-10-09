import type {Action,Trade} from './types';
export const MAX_COUNTER_OFFERS=3;
export function reverseTrade(trade:Trade):Extract<Action,{type:'counterTrade'}>{
 return{type:'counterTrade',to:trade.from,give:[...trade.receive],receive:[...trade.give],giveCash:trade.receiveCash,receiveCash:trade.giveCash,giveCards:trade.receiveCards,receiveCards:trade.giveCards};
}
