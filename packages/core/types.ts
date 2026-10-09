export type Difficulty='easy'|'medium'|'hard';
export type Phase='roll'|'card'|'purchase'|'auction'|'manage'|'debt'|'trade'|'ended';
export interface PlayerInput {id:string;name:string;bot:boolean;difficulty?:Difficulty;token?:number}
export interface Config {players:PlayerInput[];startingCash?:number;turnLimit?:number;jackpot?:boolean}
export interface Player extends PlayerInput {cash:number;position:number;jailed:boolean;jailTurns:number;cards:('chance'|'community')[];bankrupt:boolean;rentPaid:number;rentEarned:number}
export interface Property {owner:string|null;level:number;mortgaged:boolean}
export interface Auction {property:number;bid:number;leader:string|null;active:string[];turn:string;resume:Phase}
export interface Debt {player:string;amount:number;creditor:string|null;tax?:boolean;rentProperty?:number}
export interface PendingCard {deck:'chance'|'community';id:number;player:string;source:number;event:number}
export interface Payment {from:string;to:string|null;amount:number;property?:number}
export interface Trade {from:string;to:string;give:number[];receive:number[];giveCash:number;receiveCash:number;giveCards:number;receiveCards:number;resume:Phase;round?:number}
export type Effect = {type:'pay';player:string;amount:number;creditor:string|null;tax?:boolean;rentProperty?:number}|{type:'move';player:string;to:number;salary:boolean;rentMultiplier?:number}|{type:'back';player:string;steps:number};
export interface Game {version:1;config:{startingCash:number;turnLimit:number;jackpot:boolean};rng:number;revision:number;players:Player[];properties:Property[];current:number;phase:Phase;dice:[number,number];doubles:number;extraRoll:boolean;pendingProperty:number|null;auction:Auction|null;auctionQueue:number[];debt:Debt|null;trade:Trade|null;tradeOffered:boolean;effects:Effect[];decks:{chance:number[];community:number[]};houses:number;hotels:number;pot:number;turn:number;winner:string|null;log:{id:number;text:string;kind:string;payment?:Payment}[];eventSeq:number;lastCard:string|null;pendingCard?:PendingCard|null}
export type Action = {type:'resolveCard'|'roll'|'buy'|'decline'|'pass'|'end'|'bail'|'jailCard'|'bankrupt'|'acceptTrade'|'rejectTrade'}|{type:'bid';amount:number}|{type:'build'|'sell'|'sellGroup'|'mortgage'|'unmortgage';property:number}|{type:'offerTrade';to:string;give:number[];receive:number[];giveCash:number;receiveCash:number;giveCards:number;receiveCards:number}|{type:'counterTrade';to:string;give:number[];receive:number[];giveCash:number;receiveCash:number;giveCards:number;receiveCards:number};
